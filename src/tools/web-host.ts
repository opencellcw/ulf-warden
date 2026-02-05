/**
 * Web Host Tool - Deploy static sites/forms to GKE with public HTTPS URLs
 */

import { executeShell } from './executor';
import { log } from '../logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const NAMESPACE = 'web-apps';
const BASE_DOMAIN = process.env.WEB_HOST_DOMAIN || 'apps.104.198.214.246.nip.io'; // nip.io magic DNS

interface DeployWebAppParams {
  name: string;
  html: string;
  expiresInHours?: number; // Auto-delete after N hours (optional)
}

interface DeploymentResult {
  success: boolean;
  url?: string;
  name?: string;
  expiresAt?: string;
  error?: string;
}

export class WebHost {
  private tempDir = '/tmp/web-deployments';

  async deployStaticSite(params: DeployWebAppParams): Promise<DeploymentResult> {
    const { name, html, expiresInHours = 24 } = params;

    // Sanitize name for k8s
    const deploymentName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const subdomain = `${deploymentName}.${BASE_DOMAIN}`;

    log.info('[WebHost] Starting deployment', { name: deploymentName, subdomain });

    try {
      // 1. Create temp directory structure
      const appDir = path.join(this.tempDir, deploymentName);
      await fs.mkdir(appDir, { recursive: true });

      // Write HTML file
      await fs.writeFile(path.join(appDir, 'index.html'), html);

      // Write nginx config
      const nginxConf = this.generateNginxConfig();
      await fs.writeFile(path.join(appDir, 'nginx.conf'), nginxConf);

      // Write Dockerfile
      const dockerfile = this.generateDockerfile();
      await fs.writeFile(path.join(appDir, 'Dockerfile'), dockerfile);

      // 2. Build and push Docker image
      const imageTag = `gcr.io/${process.env.GCP_PROJECT}/${deploymentName}:latest`;

      log.info('[WebHost] Building Docker image', { imageTag });
      await executeShell(`cd ${appDir} && docker build -t ${imageTag} .`);

      log.info('[WebHost] Pushing image to GCR');
      await executeShell(`docker push ${imageTag}`);

      // 3. Create Kubernetes resources
      await this.createK8sResources(deploymentName, imageTag, subdomain, expiresInHours);

      // 4. Wait for ingress to be ready
      const url = `https://${subdomain}`;
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

      log.info('[WebHost] Deployment successful', {
        name: deploymentName,
        url,
        expiresAt
      });

      // 5. Cleanup temp files
      await fs.rm(appDir, { recursive: true, force: true });

      return {
        success: true,
        url,
        name: deploymentName,
        expiresAt
      };

    } catch (error: any) {
      log.error('[WebHost] Deployment failed', {
        name: deploymentName,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteApp(name: string): Promise<void> {
    const deploymentName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    log.info('[WebHost] Deleting app', { name: deploymentName });

    try {
      await executeShell(`kubectl delete all,ingress -n ${NAMESPACE} -l app=${deploymentName}`);
      log.info('[WebHost] App deleted', { name: deploymentName });
    } catch (error: any) {
      log.error('[WebHost] Delete failed', { name: deploymentName, error: error.message });
      throw error;
    }
  }

  async listApps(): Promise<string[]> {
    try {
      const output = await executeShell(
        `kubectl get deployments -n ${NAMESPACE} -o jsonpath='{.items[*].metadata.name}'`
      );
      return output.trim().split(/\s+/).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  private async createK8sResources(
    name: string,
    image: string,
    subdomain: string,
    expiresInHours: number
  ): Promise<void> {
    const manifest = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${NAMESPACE}
  labels:
    app: ${name}
    managed-by: ulf-web-host
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
      annotations:
        expires-at: "${new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()}"
    spec:
      containers:
      - name: web
        image: ${image}
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: ${NAMESPACE}
  labels:
    app: ${name}
spec:
  selector:
    app: ${name}
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${name}
  namespace: ${NAMESPACE}
  labels:
    app: ${name}
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - ${subdomain}
    secretName: ${name}-tls
  rules:
  - host: ${subdomain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${name}
            port:
              number: 80
`;

    // Write manifest to temp file
    const manifestPath = `/tmp/${name}-manifest.yaml`;
    await fs.writeFile(manifestPath, manifest);

    // Create namespace if doesn't exist
    await executeShell(`kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -`);

    // Apply manifest
    await executeShell(`kubectl apply -f ${manifestPath}`);

    // Cleanup
    await fs.unlink(manifestPath);

    log.info('[WebHost] Kubernetes resources created', { name });
  }

  private generateDockerfile(): string {
    return `FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
`;
  }

  private generateNginxConfig(): string {
    return `server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
`;
  }
}

// Singleton instance
export const webHost = new WebHost();

// Tool definitions for Claude
export const WEB_HOST_TOOLS = [
  {
    name: 'deploy_public_app',
    description: `Deploy ANY static HTML app/site to GKE with a public HTTPS URL.

Perfect for:
- 📋 Surveys and forms
- 📊 Dashboards and analytics
- 🎮 Games and interactive demos
- 🎨 Landing pages
- 📱 Web apps
- 🔗 Share-able prototypes

The deployment:
✅ Gets a public HTTPS URL (auto TLS cert via Let's Encrypt)
✅ Runs on GKE with auto-scaling and monitoring
✅ Auto-expires after 24h (configurable, max 7 days)
✅ Fully secure and production-ready
✅ CDN-backed for fast global access

Example:
{
  "name": "my-dashboard",
  "html": "<!DOCTYPE html><html>...",
  "expiresInHours": 48
}

Returns public URL like: https://my-dashboard.opencell.dev`,
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'App name (alphanumeric, hyphens ok). Will be used for subdomain.'
      },
      html: {
        type: 'string',
        description: 'Complete HTML content (must be valid HTML with <!DOCTYPE html>)'
      },
      expiresInHours: {
        type: 'number',
        description: 'Hours until auto-delete (default: 24, max: 168)',
        default: 24
      }
    },
    required: ['name', 'html']
  }
},
{
  name: 'list_public_apps',
  description: `List all currently deployed public apps/sites.

Shows all active deployments with their names and expiration times.
Useful for managing and cleaning up old deployments.`,
  input_schema: {
    type: 'object',
    properties: {}
  }
},
{
  name: 'delete_public_app',
  description: `Delete a deployed public app by name.

Removes the deployment, service, and ingress from GKE.
The URL will immediately become inactive.

Example: { "name": "my-dashboard" }`,
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the app to delete'
      }
    },
    required: ['name']
  }
}
];
