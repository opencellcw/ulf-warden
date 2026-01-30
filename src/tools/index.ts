import { executeShell, writeFile, readFile, listDirectory, getProcessInfo } from './executor';
import { TOOLS } from './definitions';

export { TOOLS };

export async function executeTool(toolName: string, toolInput: any): Promise<string> {
  try {
    switch (toolName) {
      case 'execute_shell':
        return await executeShell(toolInput.command);

      case 'write_file':
        return await writeFile(toolInput.path, toolInput.content);

      case 'read_file':
        return await readFile(toolInput.path);

      case 'list_directory':
        return await listDirectory(toolInput.path || '.');

      case 'get_processes':
        return await getProcessInfo();

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error: any) {
    console.error(`[Tools] Error executing ${toolName}:`, error);
    return `Error: ${error.message}`;
  }
}
