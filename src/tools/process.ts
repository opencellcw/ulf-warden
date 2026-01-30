import Anthropic from '@anthropic-ai/sdk';
import { execSync, spawn, ChildProcess } from 'child_process';
import { log } from '../logger';

// Store managed processes
const managedProcesses = new Map<string, ManagedProcess>();

interface ManagedProcess {
  name: string;
  process: ChildProcess;
  pid: number;
  command: string;
  startedAt: Date;
  restartCount: number;
  autoRestart: boolean;
}

export const PROCESS_TOOLS: Anthropic.Tool[] = [
  {
    name: 'process_start',
    description: `Start a process in the background and monitor it.

Examples:
- Start server: name="api", command="uvicorn main:app --host 0.0.0.0 --port 8000"
- With auto-restart: name="worker", command="python worker.py", auto_restart=true
- No monitoring: name="build", command="npm run build", auto_restart=false

Process will be monitored and can be managed with other process tools.`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to identify this process'
        },
        command: {
          type: 'string',
          description: 'Command to execute'
        },
        auto_restart: {
          type: 'boolean',
          description: 'Automatically restart if process exits (default: false)'
        }
      },
      required: ['name', 'command']
    }
  },
  {
    name: 'process_list',
    description: `List all managed processes with their status.

Shows: name, PID, command, uptime, restart count, status`,
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'process_stop',
    description: `Stop a managed process by name.

Examples:
- Stop process: name="api"
- Force kill: name="worker", force=true`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the process to stop'
        },
        force: {
          type: 'boolean',
          description: 'Force kill (SIGKILL) instead of graceful stop (SIGTERM)'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'process_restart',
    description: `Restart a managed process by name.

Example: name="api"`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the process to restart'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'process_logs',
    description: `Get recent logs from a managed process.

Example: name="api", lines=50`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the process'
        },
        lines: {
          type: 'number',
          description: 'Number of recent log lines to show (default: 20)'
        }
      },
      required: ['name']
    }
  }
];

export async function executeProcessTool(toolName: string, input: any): Promise<string> {
  try {
    switch (toolName) {
      case 'process_start':
        return await processStart(input);
      case 'process_list':
        return await processList(input);
      case 'process_stop':
        return await processStop(input);
      case 'process_restart':
        return await processRestart(input);
      case 'process_logs':
        return await processLogs(input);
      default:
        return `Unknown process tool: ${toolName}`;
    }
  } catch (error: any) {
    return `Error executing ${toolName}: ${error.message}`;
  }
}

async function processStart(input: any): Promise<string> {
  const { name, command, auto_restart = false } = input;

  // Check if process with this name already exists
  if (managedProcesses.has(name)) {
    return `Process "${name}" is already running. Stop it first or use a different name.`;
  }

  try {
    // Start the process
    const proc = spawn(command, {
      shell: true,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (!proc.pid) {
      return `Failed to start process "${name}": No PID assigned`;
    }

    // Store process info
    const managed: ManagedProcess = {
      name,
      process: proc,
      pid: proc.pid,
      command,
      startedAt: new Date(),
      restartCount: 0,
      autoRestart: auto_restart
    };

    managedProcesses.set(name, managed);

    // Handle process output
    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        log.info(`[Process:${name}] ${data.toString().trim()}`);
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        log.error(`[Process:${name}] ${data.toString().trim()}`);
      });
    }

    // Handle process exit
    proc.on('exit', (code, signal) => {
      log.info(`Process "${name}" exited`, { code, signal });

      if (auto_restart && code !== 0) {
        managed.restartCount++;
        log.warn(`Restarting process "${name}" (attempt ${managed.restartCount})...`);

        // Wait 2 seconds before restart
        setTimeout(() => {
          if (managedProcesses.has(name)) {
            managedProcesses.delete(name);
            processStart({ name, command, auto_restart }).then(result => {
              log.info(`Process "${name}" restarted: ${result}`);
            });
          }
        }, 2000);
      } else {
        managedProcesses.delete(name);
      }
    });

    return `✓ Process "${name}" started with PID ${proc.pid}\n` +
           `Command: ${command}\n` +
           `Auto-restart: ${auto_restart ? 'enabled' : 'disabled'}`;
  } catch (error: any) {
    return `Failed to start process: ${error.message}`;
  }
}

async function processList(input: any): Promise<string> {
  if (managedProcesses.size === 0) {
    return 'No managed processes running.';
  }

  const lines: string[] = ['Managed Processes:', ''];

  for (const [name, proc] of managedProcesses.entries()) {
    const uptime = Math.floor((Date.now() - proc.startedAt.getTime()) / 1000);
    const uptimeStr = formatUptime(uptime);
    const status = proc.process.exitCode === null ? 'running' : 'exited';

    lines.push(`• ${name}`);
    lines.push(`  PID: ${proc.pid}`);
    lines.push(`  Status: ${status}`);
    lines.push(`  Uptime: ${uptimeStr}`);
    lines.push(`  Restarts: ${proc.restartCount}`);
    lines.push(`  Auto-restart: ${proc.autoRestart ? 'yes' : 'no'}`);
    lines.push(`  Command: ${proc.command}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function processStop(input: any): Promise<string> {
  const { name, force = false } = input;

  const managed = managedProcesses.get(name);
  if (!managed) {
    return `Process "${name}" not found. Use process_list to see running processes.`;
  }

  try {
    // Disable auto-restart before killing
    managed.autoRestart = false;

    if (force) {
      managed.process.kill('SIGKILL');
      managedProcesses.delete(name);
      return `✓ Process "${name}" force killed (SIGKILL)`;
    } else {
      managed.process.kill('SIGTERM');
      managedProcesses.delete(name);
      return `✓ Process "${name}" stopped gracefully (SIGTERM)`;
    }
  } catch (error: any) {
    return `Failed to stop process: ${error.message}`;
  }
}

async function processRestart(input: any): Promise<string> {
  const { name } = input;

  const managed = managedProcesses.get(name);
  if (!managed) {
    return `Process "${name}" not found. Use process_list to see running processes.`;
  }

  const { command, autoRestart } = managed;

  // Stop the process
  await processStop({ name, force: false });

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Start it again
  return await processStart({ name, command, auto_restart: autoRestart });
}

async function processLogs(input: any): Promise<string> {
  const { name, lines = 20 } = input;

  const managed = managedProcesses.get(name);
  if (!managed) {
    return `Process "${name}" not found. Use process_list to see running processes.`;
  }

  // For now, we don't store logs in memory
  // In a production system, you'd want to store these in a log file or buffer
  return `Log streaming for "${name}" is not yet implemented.\n` +
         `You can use "execute_shell" with: journalctl -u ${name} -n ${lines}`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  }
}

// Export managed processes for daemon manager
export { managedProcesses };
