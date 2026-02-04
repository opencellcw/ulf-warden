"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolHandler = void 0;
const zod_1 = require("zod");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// Input schema
const WriteFileInputSchema = zod_1.z.object({
    path: zod_1.z.string().min(1, 'File path is required'),
    content: zod_1.z.string()
});
/**
 * Write file implementation
 */
async function writeFileHandler(input, context) {
    try {
        // Ensure directory exists
        const dir = path_1.default.dirname(input.path);
        await promises_1.default.mkdir(dir, { recursive: true });
        // Write file
        await promises_1.default.writeFile(input.path, input.content, 'utf-8');
        console.log(`[WriteFile] File written: ${input.path} (${input.content.length} bytes)`);
        return `File written successfully: ${input.path}`;
    }
    catch (error) {
        console.error(`[WriteFile] Error: ${error.message}`);
        throw new Error(`Failed to write file: ${error.message}`);
    }
}
// Export tool handler for auto-discovery
exports.toolHandler = {
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
