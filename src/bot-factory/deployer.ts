import * as fs from 'fs/promises';
import { executeShell } from '../tools/executor';
import { DeploymentResult } from './types';
import { log } from '../logger';

const TEMP_DIR = '/tmp';
const NAMESPACE = 'agents';

export class BotDeployer {
  async deploy(botId: string, helmValues: string): Promise<DeploymentResult> {
    log.info('[BotDeployer] Starting deployment', { botId });

    try {
      // 1. Write Helm values to temporary file
      const valuesPath = `${TEMP_DIR}/${botId}-values.yaml`;
      await fs.writeFile(valuesPath, helmValues);
      log.info('[BotDeployer] Helm values written', { path: valuesPath });

      // 2. Execute Helm install/upgrade
      const helmCmd = `helm upgrade --install ${botId} ./infra/helm/agent \
        -f ${valuesPath} \
        --namespace ${NAMESPACE} \
        --create-namespace \
        --wait \
        --timeout 5m`;

      log.info('[BotDeployer] Executing Helm command', { botId });
      const helmOutput = await executeShell(helmCmd);
      log.info('[BotDeployer] Helm command completed', { botId, output: helmOutput.substring(0, 200) });

      // 3. Get pod status
      const statusCmd = `kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/instance=${botId} -o json`;
      const statusOutput = await executeShell(statusCmd);
      const podStatus = this.parseK8sStatus(JSON.parse(statusOutput));

      // 4. Clean up temporary file
      await fs.unlink(valuesPath).catch(() => {
        log.warn('[BotDeployer] Failed to clean up temp file', { path: valuesPath });
      });

      log.info('[BotDeployer] Deployment successful', {
        botId,
        podName: podStatus.podName,
        status: podStatus.status
      });

      return {
        success: true,
        status: podStatus.status,
        podName: podStatus.podName
      };

    } catch (error: any) {
      log.error('[BotDeployer] Deployment failed', {
        botId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async delete(botId: string): Promise<void> {
    log.info('[BotDeployer] Deleting bot', { botId });

    try {
      await executeShell(`helm uninstall ${botId} --namespace ${NAMESPACE}`);
      log.info('[BotDeployer] Bot deleted from cluster', { botId });
    } catch (error: any) {
      log.error('[BotDeployer] Delete failed', {
        botId,
        error: error.message
      });
      throw error;
    }
  }

  async getStatus(botId: string): Promise<{ status: string; podName?: string; ready: boolean }> {
    try {
      const statusCmd = `kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/instance=${botId} -o json`;
      const output = await executeShell(statusCmd);
      return this.parseK8sStatus(JSON.parse(output));
    } catch (error: any) {
      log.error('[BotDeployer] Failed to get status', {
        botId,
        error: error.message
      });
      return { status: 'unknown', ready: false };
    }
  }

  private parseK8sStatus(k8sResponse: any): { status: string; podName?: string; ready: boolean } {
    const items = k8sResponse.items || [];

    if (items.length === 0) {
      return { status: 'no pods found', ready: false };
    }

    const pod = items[0];
    const podName = pod.metadata?.name;
    const phase = pod.status?.phase || 'Unknown';

    // Check container statuses
    const containerStatuses = pod.status?.containerStatuses || [];
    const ready = containerStatuses.every((cs: any) => cs.ready === true);

    return {
      status: phase,
      podName,
      ready
    };
  }
}

// Singleton instance
export const botDeployer = new BotDeployer();
