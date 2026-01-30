"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GITHUB_TOOLS = void 0;
exports.executeGitHubTool = executeGitHubTool;
const child_process_1 = require("child_process");
exports.GITHUB_TOOLS = [
    {
        name: 'github_clone',
        description: `Clone a GitHub repository to the local filesystem.

Examples:
- Clone a repo: repo="owner/repo" or repo="https://github.com/owner/repo"
- Custom path: repo="owner/repo", path="./projects/myrepo"

Automatically uses 'gh' CLI if available, falls back to 'git' otherwise.`,
        input_schema: {
            type: 'object',
            properties: {
                repo: {
                    type: 'string',
                    description: 'Repository URL or owner/repo format'
                },
                path: {
                    type: 'string',
                    description: 'Where to clone (default: ./<repo-name>)'
                }
            },
            required: ['repo']
        }
    },
    {
        name: 'github_search',
        description: `Search GitHub repositories or code using GitHub CLI.

Examples:
- Search repos: query="fastapi", type="repos"
- Search code: query="def main", type="code"
- Limit results: query="react", type="repos", limit=5`,
        input_schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query'
                },
                type: {
                    type: 'string',
                    enum: ['repos', 'code', 'issues', 'prs'],
                    description: 'What to search for'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (default: 10)'
                }
            },
            required: ['query', 'type']
        }
    },
    {
        name: 'github_issue',
        description: `Create or view GitHub issues using GitHub CLI.

Examples:
- Create issue: action="create", repo="owner/repo", title="Bug fix", body="Description"
- View issue: action="view", repo="owner/repo", issue_number=123
- List issues: action="list", repo="owner/repo"`,
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'view', 'list'],
                    description: 'Action to perform'
                },
                repo: {
                    type: 'string',
                    description: 'Repository in owner/repo format'
                },
                title: {
                    type: 'string',
                    description: 'Issue title (for create)'
                },
                body: {
                    type: 'string',
                    description: 'Issue body (for create)'
                },
                issue_number: {
                    type: 'number',
                    description: 'Issue number (for view)'
                }
            },
            required: ['action', 'repo']
        }
    },
    {
        name: 'github_pr',
        description: `Create or view GitHub pull requests using GitHub CLI.

Examples:
- View PR: action="view", repo="owner/repo", pr_number=42
- List PRs: action="list", repo="owner/repo"
- Create PR: action="create", repo="owner/repo", title="Feature", body="Description", base="main", head="feature-branch"`,
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'view', 'list'],
                    description: 'Action to perform'
                },
                repo: {
                    type: 'string',
                    description: 'Repository in owner/repo format'
                },
                title: {
                    type: 'string',
                    description: 'PR title (for create)'
                },
                body: {
                    type: 'string',
                    description: 'PR body (for create)'
                },
                base: {
                    type: 'string',
                    description: 'Base branch (for create)'
                },
                head: {
                    type: 'string',
                    description: 'Head branch (for create)'
                },
                pr_number: {
                    type: 'number',
                    description: 'PR number (for view)'
                }
            },
            required: ['action', 'repo']
        }
    }
];
// Check if gh CLI is available
function hasGhCli() {
    try {
        (0, child_process_1.execSync)('gh --version', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
async function executeGitHubTool(toolName, input) {
    try {
        switch (toolName) {
            case 'github_clone':
                return await githubClone(input);
            case 'github_search':
                return await githubSearch(input);
            case 'github_issue':
                return await githubIssue(input);
            case 'github_pr':
                return await githubPr(input);
            default:
                return `Unknown GitHub tool: ${toolName}`;
        }
    }
    catch (error) {
        return `Error executing ${toolName}: ${error.message}`;
    }
}
async function githubClone(input) {
    const { repo, path } = input;
    // Parse repo URL
    let repoUrl = repo;
    if (!repo.startsWith('http')) {
        repoUrl = `https://github.com/${repo}`;
    }
    // Determine target path
    const repoName = repo.split('/').pop()?.replace('.git', '') || 'repo';
    const targetPath = path || `./${repoName}`;
    try {
        // Try git clone
        const output = (0, child_process_1.execSync)(`git clone ${repoUrl} ${targetPath}`, {
            encoding: 'utf-8',
            timeout: 60000, // 1 minute
            maxBuffer: 10 * 1024 * 1024 // 10MB
        });
        return `✓ Repository cloned successfully to ${targetPath}\n\n${output}`;
    }
    catch (error) {
        return `Failed to clone repository: ${error.message}`;
    }
}
async function githubSearch(input) {
    const { query, type, limit = 10 } = input;
    if (!hasGhCli()) {
        return 'GitHub CLI (gh) is not installed. Install it to use search functionality.';
    }
    try {
        let command = '';
        switch (type) {
            case 'repos':
                command = `gh search repos "${query}" --limit ${limit}`;
                break;
            case 'code':
                command = `gh search code "${query}" --limit ${limit}`;
                break;
            case 'issues':
                command = `gh search issues "${query}" --limit ${limit}`;
                break;
            case 'prs':
                command = `gh search prs "${query}" --limit ${limit}`;
                break;
            default:
                return `Unknown search type: ${type}`;
        }
        const output = (0, child_process_1.execSync)(command, {
            encoding: 'utf-8',
            timeout: 30000,
            maxBuffer: 5 * 1024 * 1024
        });
        return output || 'No results found.';
    }
    catch (error) {
        return `Search failed: ${error.message}`;
    }
}
async function githubIssue(input) {
    const { action, repo, title, body, issue_number } = input;
    if (!hasGhCli()) {
        return 'GitHub CLI (gh) is not installed. Install it to use issue functionality.';
    }
    try {
        let command = '';
        switch (action) {
            case 'create':
                if (!title)
                    return 'Title is required to create an issue';
                command = `gh issue create --repo ${repo} --title "${title}" --body "${body || ''}"`;
                break;
            case 'view':
                if (!issue_number)
                    return 'Issue number is required to view an issue';
                command = `gh issue view ${issue_number} --repo ${repo}`;
                break;
            case 'list':
                command = `gh issue list --repo ${repo} --limit 10`;
                break;
            default:
                return `Unknown action: ${action}`;
        }
        const output = (0, child_process_1.execSync)(command, {
            encoding: 'utf-8',
            timeout: 30000,
            maxBuffer: 5 * 1024 * 1024
        });
        return output;
    }
    catch (error) {
        return `Issue operation failed: ${error.message}`;
    }
}
async function githubPr(input) {
    const { action, repo, title, body, base, head, pr_number } = input;
    if (!hasGhCli()) {
        return 'GitHub CLI (gh) is not installed. Install it to use PR functionality.';
    }
    try {
        let command = '';
        switch (action) {
            case 'create':
                if (!title || !base || !head) {
                    return 'Title, base, and head are required to create a PR';
                }
                command = `gh pr create --repo ${repo} --title "${title}" --body "${body || ''}" --base ${base} --head ${head}`;
                break;
            case 'view':
                if (!pr_number)
                    return 'PR number is required to view a PR';
                command = `gh pr view ${pr_number} --repo ${repo}`;
                break;
            case 'list':
                command = `gh pr list --repo ${repo} --limit 10`;
                break;
            default:
                return `Unknown action: ${action}`;
        }
        const output = (0, child_process_1.execSync)(command, {
            encoding: 'utf-8',
            timeout: 30000,
            maxBuffer: 5 * 1024 * 1024
        });
        return output;
    }
    catch (error) {
        return `PR operation failed: ${error.message}`;
    }
}
