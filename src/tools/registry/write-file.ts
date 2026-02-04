import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { ToolHandler } from '../../core/tool-registry';

// Input schema
const WriteFileInputSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  content: z.string()
});

/**
 * Write file implementation
 */
async function writeFileHandler(
  input: z.infer<typeof WriteFileInputSchema>,
  context: any
): Promise<string> {
  try {
    // Ensure directory exists
    const dir = path.dirname(input.path);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(input.path, input.content, 'utf-8');

    console.log(`[WriteFile] File written: ${input.path} (${input.content.length} bytes)`);
    return `File written successfully: ${input.path}`;
  } catch (error: any) {
    console.error(`[WriteFile] Error: ${error.message}`);
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

// Export tool handler for auto-discovery
export const toolHandler: ToolHandler = {
  metadata: {
    name: 'write_file',
    description: 'Write or create a file with the specified content. Creates parent directories if they don\'t exist. Overwrites existing files.',
    category: 'files',
    inputSchema: WriteFileInputSchema,
    tags: ['filesystem', 'write', 'io', 'create'],
    enabled: true,
    security: {
      idempotent: true, // Overwriting is idempotent
      requiresApproval: false,
      riskLevel: 'medium' // Can overwrite files
    },
    examples: [
      {
        input: { path: '/tmp/hello.txt', content: 'Hello World!' },
        output: 'File written successfully: /tmp/hello.txt'
      },
      {
        input: {
          path: './src/new-file.ts',
          content: 'export const foo = "bar";'
        },
        output: 'File written successfully: ./src/new-file.ts'
      }
    ]
  },
  execute: writeFileHandler
};
