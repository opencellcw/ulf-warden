"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeShell = executeShell;
exports.writeFile = writeFile;
exports.readFile = readFile;
exports.listDirectory = listDirectory;
exports.getProcessInfo = getProcessInfo;
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const COMMAND_TIMEOUT = 30000; // 30s
const MAX_OUTPUT_LENGTH = 4000; // chars
// Mask sensitive data in output
function maskSecrets(text) {
    return text
        .replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-***MASKED***')
        .replace(/xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g, 'xoxb-***MASKED***')
        .replace(/xapp-[0-9]+-[A-Z0-9]+-[0-9]+-[a-f0-9]+/g, 'xapp-***MASKED***')
        .replace(/(password|token|secret|key)[\s=:]+[^\s\n]+/gi, '$1=***MASKED***');
}
// Truncate long output
function truncateOutput(text, maxLength = MAX_OUTPUT_LENGTH) {
    if (text.length <= maxLength)
        return text;
    const half = Math.floor(maxLength / 2);
    return text.slice(0, half) + '\n\n... [OUTPUT TRUNCATED] ...\n\n' + text.slice(-half);
}
async function executeShell(command) {
    try {
        console.log(`[Executor] Running: ${command}`);
        const { stdout, stderr } = await execAsync(command, {
            timeout: COMMAND_TIMEOUT,
            maxBuffer: 10 * 1024 * 1024, // 10MB
        });
        const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
        const masked = maskSecrets(output);
        const truncated = truncateOutput(masked);
        console.log(`[Executor] Success: ${command.substring(0, 50)}...`);
        return truncated || '[Command executed successfully - no output]';
    }
    catch (error) {
        console.error(`[Executor] Error: ${error.message}`);
        if (error.killed) {
            throw new Error(`Command timeout after ${COMMAND_TIMEOUT}ms`);
        }
        const errorMsg = error.message || error.stderr || 'Command failed';
        throw new Error(maskSecrets(errorMsg));
    }
}
async function writeFile(filePath, content) {
    try {
        // Ensure directory exists
        const dir = path_1.default.dirname(filePath);
        await promises_1.default.mkdir(dir, { recursive: true });
        // Write file
        await promises_1.default.writeFile(filePath, content, 'utf-8');
        console.log(`[Executor] File written: ${filePath}`);
        return `File written successfully: ${filePath}`;
    }
    catch (error) {
        console.error(`[Executor] Write error: ${error.message}`);
        throw new Error(`Failed to write file: ${error.message}`);
    }
}
async function readFile(filePath) {
    try {
        const content = await promises_1.default.readFile(filePath, 'utf-8');
        const truncated = truncateOutput(content);
        console.log(`[Executor] File read: ${filePath}`);
        return truncated;
    }
    catch (error) {
        console.error(`[Executor] Read error: ${error.message}`);
        throw new Error(`Failed to read file: ${error.message}`);
    }
}
async function listDirectory(dirPath = '.') {
    try {
        const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true });
        const lines = entries.map(entry => {
            const type = entry.isDirectory() ? 'DIR ' : 'FILE';
            return `${type} ${entry.name}`;
        });
        console.log(`[Executor] Listed directory: ${dirPath}`);
        return lines.join('\n') || '[Empty directory]';
    }
    catch (error) {
        console.error(`[Executor] List error: ${error.message}`);
        throw new Error(`Failed to list directory: ${error.message}`);
    }
}
async function getProcessInfo() {
    try {
        const { stdout } = await execAsync('ps aux --sort=-%mem | head -20');
        return truncateOutput(stdout);
    }
    catch (error) {
        throw new Error(`Failed to get process info: ${error.message}`);
    }
}
