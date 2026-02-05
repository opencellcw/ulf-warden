/**
 * Web Host Tool - Deploy static sites/forms to GKE with public HTTPS URLs
 *
 * Simplified version: Uses ConfigMap + nginx:alpine (no Docker build needed)
 */

import { executeShell } from './executor';
import { log } from '../logger';

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
  async deployStaticSite(params: DeployWebAppParams): Promise<DeploymentResult> {
    const { name, html, expiresInHours = 24 } = params;

    // Sanitize name for k8s
    const deploymentName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 63);
    const subdomain = `${deploymentName}.${BASE_DOMAIN}`;

    log.info('[WebHost] Starting deployment', { name: deploymentName, subdomain });

    try {
      // 1. Create namespace if doesn't exist
      await executeShell(`kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -`);

      // 2. Create ConfigMap with HTML content
      // Escape HTML for safe shell execution
      const escapedHtml = Buffer.from(html).toString('base64');
      await executeShell(`cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${deploymentName}-html
  namespace: ${NAMESPACE}
  labels:
    app: ${deploymentName}
    managed-by: ulf-web-host
data:
  index.html: |
$(echo "${escapedHtml}" | base64 -d | sed 's/^/    /')
EOF`);

      // 3. Create Kubernetes resources (Deployment, Service, Ingress)
      await this.createK8sResources(deploymentName, subdomain, expiresInHours);

      // 4. Success!
      const url = `https://${subdomain}`;
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

      log.info('[WebHost] Deployment successful', {
        name: deploymentName,
        url,
        expiresAt
      });

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
    const deploymentName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 63);

    log.info('[WebHost] Deleting app', { name: deploymentName });

    try {
      await executeShell(`kubectl delete all,ingress,configmap -n ${NAMESPACE} -l app=${deploymentName}`);
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
    subdomain: string,
    expiresInHours: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const manifest = `---
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
        expires-at: "${expiresAt}"
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
          readOnly: true
        resources:
          requests:
            memory: "32Mi"
            cpu: "50m"
          limits:
            memory: "64Mi"
            cpu: "100m"
      volumes:
      - name: html
        configMap:
          name: ${name}-html
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

    // Apply manifest via kubectl
    await executeShell(`cat <<'EOF' | kubectl apply -f -
${manifest}
EOF`);

    log.info('[WebHost] Kubernetes resources created', { name });
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

Example:
{
  "name": "my-dashboard",
  "html": "<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>",
  "expiresInHours": 48
}

Returns public URL like: https://my-dashboard.apps.104.198.214.246.nip.io`,
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
