"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolHandler = void 0;
const zod_1 = require("zod");
const promises_1 = __importDefault(require("fs/promises"));
// Input schema
const ListDirectoryInputSchema = zod_1.z.object({
    path: zod_1.z.string().optional().default('.')
});
/**
 * List directory implementation
 */
async function listDirectoryHandler(input, context) {
    try {
        const dirPath = input.path || '.';
        const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true });
        const lines = entries.map(entry => {
            const type = entry.isDirectory() ? 'DIR ' : 'FILE';
            const name = entry.name;
            return `${type} ${name}`;
        });
        console.log(`[ListDirectory] Listed: ${dirPath} (${entries.length} entries)`);
        return lines.join('\n') || '[Empty directory]';
    }
    catch (error) {
        console.error(`[ListDirectory] Error: ${error.message}`);
        throw new Error(`Failed to list directory: ${error.message}`);
    }
}
// Export tool handler for auto-discovery
exports.toolHandler = {
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
