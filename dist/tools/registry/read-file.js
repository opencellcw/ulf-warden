"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolHandler = void 0;
const zod_1 = require("zod");
const promises_1 = __importDefault(require("fs/promises"));
// Input schema
const ReadFileInputSchema = zod_1.z.object({
    path: zod_1.z.string().min(1, 'File path is required')
});
// Output schema
const ReadFileOutputSchema = zod_1.z.object({
    content: zod_1.z.string(),
    size: zod_1.z.number(),
    truncated: zod_1.z.boolean()
});
const MAX_OUTPUT_LENGTH = 4000; // chars
/**
 * Truncate long output
 */
function truncateOutput(text, maxLength = MAX_OUTPUT_LENGTH) {
    if (text.length <= maxLength)
        return text;
    const half = Math.floor(maxLength / 2);
    return text.slice(0, half) + '\n\n... [OUTPUT TRUNCATED] ...\n\n' + text.slice(-half);
}
/**
 * Read file implementation
 */
async function readFileHandler(input, context) {
    try {
        const content = await promises_1.default.readFile(input.path, 'utf-8');
        const truncated = content.length > MAX_OUTPUT_LENGTH;
        const output = truncateOutput(content);
        console.log(`[ReadFile] File read: ${input.path} (${content.length} bytes, truncated: ${truncated})`);
        return output;
    }
    catch (error) {
        console.error(`[ReadFile] Error: ${error.message}`);
        throw new Error(`Failed to read file: ${error.message}`);
    }
}
// Export tool handler for auto-discovery
exports.toolHandler = {
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
