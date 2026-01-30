"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_TOOLS = void 0;
exports.executeFileTool = executeFileTool;
const glob_1 = require("glob");
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
exports.FILE_TOOLS = [
    {
        name: 'file_search',
        description: `Search for files using glob patterns. Optionally search file contents.

Examples:
- Find Python files: pattern="**/*.py"
- Find in directory: pattern="src/**/*.ts"
- Search content: pattern="**/*.js", content="function main"
- Multiple patterns: pattern="*.{py,js,ts}"

Returns list of matching files with optional content matches.`,
        input_schema: {
            type: 'object',
            properties: {
                pattern: {
                    type: 'string',
                    description: 'Glob pattern (e.g., *.py, src/**/*.ts)'
                },
                content: {
                    type: 'string',
                    description: 'Optional: Search for this text in file contents'
                }
            },
            required: ['pattern']
        }
    },
    {
        name: 'file_diff',
        description: `Show differences between two files or versions using git diff.

Examples:
- Compare files: file1="old.py", file2="new.py"
- Show git changes: file="main.py" (shows unstaged changes)
- Compare with commit: file="main.py", commit="HEAD~1"`,
        input_schema: {
            type: 'object',
            properties: {
                file1: {
                    type: 'string',
                    description: 'First file path'
                },
                file2: {
                    type: 'string',
                    description: 'Second file path (for file comparison)'
                },
                file: {
                    type: 'string',
                    description: 'File to show git diff for'
                },
                commit: {
                    type: 'string',
                    description: 'Git commit to compare against (default: working tree)'
                }
            }
        }
    },
    {
        name: 'file_backup',
        description: `Create a backup of a file or directory.

Examples:
- Backup file: path="config.json"
- Backup directory: path="./src"
- Custom backup name: path="data.db", backup_path="./backups/data.db.bak"

Creates backup with .bak extension or copies to specified location.`,
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'File or directory to backup'
                },
                backup_path: {
                    type: 'string',
                    description: 'Optional: Custom backup path'
                }
            },
            required: ['path']
        }
    }
];
async function executeFileTool(toolName, input) {
    try {
        switch (toolName) {
            case 'file_search':
                return await fileSearch(input);
            case 'file_diff':
                return await fileDiff(input);
            case 'file_backup':
                return await fileBackup(input);
            default:
                return `Unknown file tool: ${toolName}`;
        }
    }
    catch (error) {
        return `Error executing ${toolName}: ${error.message}`;
    }
}
async function fileSearch(input) {
    const { pattern, content } = input;
    try {
        // Search for files matching pattern
        const files = await (0, glob_1.glob)(pattern, {
            ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
            nodir: true
        });
        if (files.length === 0) {
            return `No files found matching pattern: ${pattern}`;
        }
        // If content search is specified, filter by content
        if (content) {
            const matchingFiles = [];
            for (const file of files) {
                try {
                    const fileContent = fs_1.default.readFileSync(file, 'utf-8');
                    if (fileContent.includes(content)) {
                        // Find line numbers where content appears
                        const lines = fileContent.split('\n');
                        const matchingLines = [];
                        lines.forEach((line, index) => {
                            if (line.includes(content)) {
                                matchingLines.push(index + 1);
                            }
                        });
                        matchingFiles.push(`${file} (lines: ${matchingLines.join(', ')})`);
                    }
                }
                catch (err) {
                    // Skip files that can't be read (binary files, etc.)
                    continue;
                }
            }
            if (matchingFiles.length === 0) {
                return `Found ${files.length} files matching pattern, but none contain: "${content}"`;
            }
            return `Files containing "${content}":\n\n${matchingFiles.join('\n')}`;
        }
        // No content search - just return file list
        if (files.length > 50) {
            return `Found ${files.length} files (showing first 50):\n\n${files.slice(0, 50).join('\n')}\n\n... and ${files.length - 50} more`;
        }
        return `Found ${files.length} files:\n\n${files.join('\n')}`;
    }
    catch (error) {
        return `File search failed: ${error.message}`;
    }
}
async function fileDiff(input) {
    const { file1, file2, file, commit } = input;
    try {
        // Case 1: Compare two files
        if (file1 && file2) {
            if (!fs_1.default.existsSync(file1)) {
                return `File not found: ${file1}`;
            }
            if (!fs_1.default.existsSync(file2)) {
                return `File not found: ${file2}`;
            }
            try {
                const diff = (0, child_process_1.execSync)(`diff -u "${file1}" "${file2}"`, {
                    encoding: 'utf-8',
                    maxBuffer: 5 * 1024 * 1024
                });
                return diff || 'Files are identical';
            }
            catch (error) {
                // diff command exits with code 1 when files differ
                return error.stdout || 'Failed to compare files';
            }
        }
        // Case 2: Git diff for a file
        if (file) {
            if (!fs_1.default.existsSync(file)) {
                return `File not found: ${file}`;
            }
            try {
                let command = '';
                if (commit) {
                    command = `git diff ${commit} -- "${file}"`;
                }
                else {
                    command = `git diff -- "${file}"`;
                }
                const diff = (0, child_process_1.execSync)(command, {
                    encoding: 'utf-8',
                    maxBuffer: 5 * 1024 * 1024
                });
                return diff || 'No changes';
            }
            catch (error) {
                return `Git diff failed: ${error.message}. Is this a git repository?`;
            }
        }
        return 'Please specify either (file1 and file2) or (file)';
    }
    catch (error) {
        return `Diff failed: ${error.message}`;
    }
}
async function fileBackup(input) {
    const { path: targetPath, backup_path } = input;
    try {
        if (!fs_1.default.existsSync(targetPath)) {
            return `Path not found: ${targetPath}`;
        }
        // Determine backup path
        const backupPath = backup_path || `${targetPath}.bak`;
        // Check if target is file or directory
        const stats = fs_1.default.statSync(targetPath);
        if (stats.isDirectory()) {
            // Backup directory using cp -r
            (0, child_process_1.execSync)(`cp -r "${targetPath}" "${backupPath}"`, {
                timeout: 60000
            });
            return `✓ Directory backed up to: ${backupPath}`;
        }
        else {
            // Backup file
            fs_1.default.copyFileSync(targetPath, backupPath);
            const size = (fs_1.default.statSync(backupPath).size / 1024).toFixed(2);
            return `✓ File backed up to: ${backupPath} (${size} KB)`;
        }
    }
    catch (error) {
        return `Backup failed: ${error.message}`;
    }
}
