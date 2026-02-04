import { z } from 'zod';
import fs from 'fs/promises';
import { ToolHandler } from '../../core/tool-registry';

// Input schema
const ReadFileInputSchema = z.object({
  path: z.string().min(1, 'File path is required')
});

// Output schema
const ReadFileOutputSchema = z.object({
  content: z.string(),
  size: z.number(),
  truncated: z.boolean()
});

const MAX_OUTPUT_LENGTH = 4000; // chars

/**
 * Truncate long output
 */
function truncateOutput(text: string, maxLength: number = MAX_OUTPUT_LENGTH): string {
  if (text.length <= maxLength) return text;
  const half = Math.floor(maxLength / 2);
  return text.slice(0, half) + '\n\n... [OUTPUT TRUNCATED] ...\n\n' + text.slice(-half);
}

/**
 * Read file implementation
 */
async function readFileHandler(
  input: z.infer<typeof ReadFileInputSchema>,
  context: any
): Promise<string> {
  try {
    const content = await fs.readFile(input.path, 'utf-8');
    const truncated = content.length > MAX_OUTPUT_LENGTH;
    const output = truncateOutput(content);

    console.log(`[ReadFile] File read: ${input.path} (${content.length} bytes, truncated: ${truncated})`);

    return output;
  } catch (error: any) {
    console.error(`[ReadFile] Error: ${error.message}`);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

// Export tool handler for auto-discovery
export const toolHandler: ToolHandler = {
  metadata: {
    name: 'read_file',
    description: 'Read contents of a file from the filesystem. Returns the file content as text. Large files will be truncated.',
    category: 'files',
    inputSchema: ReadFileInputSchema,
    tags: ['filesystem', 'read', 'io'],
    enabled: true,
    security: {
      idempotent: true, // Reading is safe to retry
      requiresApproval: false, // Low risk operation
      riskLevel: 'low'
    },
    examples: [
      {
        input: { path: '/tmp/example.txt' },
        output: 'File content here...'
      },
      {
        input: { path: './package.json' },
        output: '{\n  "name": "my-app",\n  ...\n}'
      }
    ]
  },
  execute: readFileHandler
};
