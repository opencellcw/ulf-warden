import { z } from 'zod';
import fs from 'fs/promises';
import { ToolHandler } from '../../core/tool-registry';

// Input schema
const ListDirectoryInputSchema = z.object({
  path: z.string().optional().default('.')
});

/**
 * List directory implementation
 */
async function listDirectoryHandler(
  input: z.infer<typeof ListDirectoryInputSchema>,
  context: any
): Promise<string> {
  try {
    const dirPath = input.path || '.';
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const lines = entries.map(entry => {
      const type = entry.isDirectory() ? 'DIR ' : 'FILE';
      const name = entry.name;
      return `${type} ${name}`;
    });

    console.log(`[ListDirectory] Listed: ${dirPath} (${entries.length} entries)`);
    return lines.join('\n') || '[Empty directory]';
  } catch (error: any) {
    console.error(`[ListDirectory] Error: ${error.message}`);
    throw new Error(`Failed to list directory: ${error.message}`);
  }
}

// Export tool handler for auto-discovery
export const toolHandler: ToolHandler = {
  metadata: {
    name: 'list_directory',
    description: 'List contents of a directory. Shows files and subdirectories. Returns a list with FILE/DIR prefix for each entry.',
    category: 'files',
    inputSchema: ListDirectoryInputSchema,
    tags: ['filesystem', 'directory', 'list', 'ls'],
    enabled: true,
    security: {
      idempotent: true, // Reading directory is safe to retry
      requiresApproval: false,
      riskLevel: 'low'
    },
    examples: [
      {
        input: { path: '.' },
        output: 'DIR  src\nDIR  dist\nFILE package.json\nFILE README.md'
      },
      {
        input: { path: '/tmp' },
        output: 'FILE test.txt\nDIR  cache\n...'
      }
    ]
  },
  execute: listDirectoryHandler
};
