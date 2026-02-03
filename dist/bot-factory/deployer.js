"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.botDeployer = exports.BotDeployer = void 0;
const fs = __importStar(require("fs/promises"));
const executor_1 = require("../tools/executor");
const logger_1 = require("../logger");
const TEMP_DIR = '/tmp';
const NAMESPACE = 'agents';
class BotDeployer {
    async deploy(botId, helmValues) {
        logger_1.log.info('[BotDeployer] Starting deployment', { botId });
        try {
            // 1. Write Helm values to temporary file
            const valuesPath = `${TEMP_DIR}/${botId}-values.yaml`;
            await fs.writeFile(valuesPath, helmValues);
            logger_1.log.info('[BotDeployer] Helm values written', { path: valuesPath });
            // 2. Execute Helm install/upgrade
            const helmCmd = `helm upgrade --install ${botId} ./infra/helm/agent \
        -f ${valuesPath} \
        --namespace ${NAMESPACE} \
        --create-namespace \
        --wait \
        --timeout 5m`;
            logger_1.log.info('[BotDeployer] Executing Helm command', { botId });
            const helmOutput = await (0, executor_1.executeShell)(helmCmd);
            logger_1.log.info('[BotDeployer] Helm command completed', { botId, output: helmOutput.substring(0, 200) });
            // 3. Get pod status
            const statusCmd = `kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/instance=${botId} -o json`;
            const statusOutput = await (0, executor_1.executeShell)(statusCmd);
            const podStatus = this.parseK8sStatus(JSON.parse(statusOutput));
            // 4. Clean up temporary file
            await fs.unlink(valuesPath).catch(() => {
                logger_1.log.warn('[BotDeployer] Failed to clean up temp file', { path: valuesPath });
            });
            logger_1.log.info('[BotDeployer] Deployment successful', {
                botId,
                podName: podStatus.podName,
                status: podStatus.status
            });
            return {
                success: true,
                status: podStatus.status,
                podName: podStatus.podName
            };
        }
        catch (error) {
            logger_1.log.error('[BotDeployer] Deployment failed', {
                botId,
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    async delete(botId) {
        logger_1.log.info('[BotDeployer] Deleting bot', { botId });
        try {
            await (0, executor_1.executeShell)(`helm uninstall ${botId} --namespace ${NAMESPACE}`);
            logger_1.log.info('[BotDeployer] Bot deleted from cluster', { botId });
        }
        catch (error) {
            logger_1.log.error('[BotDeployer] Delete failed', {
                botId,
                error: error.message
            });
            throw error;
        }
    }
    async getStatus(botId) {
        try {
            const statusCmd = `kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/instance=${botId} -o json`;
            const output = await (0, executor_1.executeShell)(statusCmd);
            return this.parseK8sStatus(JSON.parse(output));
        }
        catch (error) {
            logger_1.log.error('[BotDeployer] Failed to get status', {
                botId,
                error: error.message
            });
            return { status: 'unknown', ready: false };
        }
    }
    parseK8sStatus(k8sResponse) {
        const items = k8sResponse.items || [];
        if (items.length === 0) {
            return { status: 'no pods found', ready: false };
        }
        const pod = items[0];
        const podName = pod.metadata?.name;
        const phase = pod.status?.phase || 'Unknown';
        // Check container statuses
        const containerStatuses = pod.status?.containerStatuses || [];
        const ready = containerStatuses.every((cs) => cs.ready === true);
        return {
            status: phase,
            podName,
            ready
        };
    }
}
exports.BotDeployer = BotDeployer;
// Singleton instance
exports.botDeployer = new BotDeployer();
