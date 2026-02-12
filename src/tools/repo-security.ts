/**
 * Repository Security Tool
 *
 * Provides a tool for the agent to apply security best practices
 * to any repository (local or GitHub).
 */

import Anthropic from '@anthropic-ai/sdk';
import { executeShell, writeFile } from './executor';
import {
  generateSecurityTemplate,
  containsSecrets,
  RepoLanguage,
  GeneratedFile,
} from '../security/repo-security-template';
import { log } from '../logger';

export const REPO_SECURITY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'secure_repo',
    description: `Apply security best practices to a repository. Generates and writes:
- .gitignore (blocks secrets, credentials, env files)
- Pre-commit hook (detects API keys, tokens, private keys before commit)
- GCP Secret Manager integration (Python or TypeScript)
- Security config (IAM roles, monitoring, alerts)
- .env.example template

Use this AUTOMATICALLY when:
- Creating a new repository
- Setting up a new project
- User asks about security hardening

Examples:
- secure_repo path="/app/my-project" language="python"
- secure_repo path="/app/bot" language="typescript" gcp_project="my-gcp-proj"`,
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the repository root',
        },
        language: {
          type: 'string',
          enum: ['python', 'typescript', 'node', 'go', 'generic'],
          description: 'Primary language of the project',
        },
        project_name: {
          type: 'string',
          description: 'Project name (defaults to directory name)',
        },
        gcp_project: {
          type: 'string',
          description: 'GCP Project ID (for Secret Manager integration)',
        },
        skip_secret_manager: {
          type: 'boolean',
          description: 'Skip GCP Secret Manager files (default: false)',
        },
      },
      required: ['path', 'language'],
    },
  },
  {
    name: 'scan_repo_secrets',
    description: `Scan a repository for exposed secrets/credentials.
Checks staged git files and common config files for API keys, tokens, passwords.

Use this to audit a repository before pushing or when reviewing security.`,
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the repository root',
        },
      },
      required: ['path'],
    },
  },
];

/**
 * Execute repo security tools
 */
export async function executeRepoSecurityTool(
  toolName: string,
  input: any,
): Promise<string> {
  switch (toolName) {
    case 'secure_repo':
      return await secureRepo(input);
    case 'scan_repo_secrets':
      return await scanRepoSecrets(input);
    default:
      throw new Error(`Unknown repo security tool: ${toolName}`);
  }
}

async function secureRepo(input: any): Promise<string> {
  const {
    path: repoPath,
    language,
    project_name,
    gcp_project,
    skip_secret_manager,
  } = input;

  const projectName = project_name || repoPath.split('/').pop() || 'project';

  log.info('[RepoSecurity] Applying security template', {
    path: repoPath,
    language,
    projectName,
  });

  // Generate template files
  const files = generateSecurityTemplate({
    language: language as RepoLanguage,
    projectName,
    gcpProject: gcp_project || process.env.GCP_PROJECT_ID || 'your-gcp-project',
    includeGcpSecretManager: !skip_secret_manager,
    includePreCommitHook: true,
    includeSecurityConfig: true,
  });

  // Write all files
  const written: string[] = [];
  for (const file of files) {
    const fullPath = `${repoPath}/${file.path}`;
    await writeFile(fullPath, file.content);
    written.push(file.path);

    // Make hook executable
    if (file.executable) {
      try {
        await executeShell(`chmod +x "${fullPath}"`);
      } catch {
        // May fail on some systems
      }
    }
  }

  // Configure git to use custom hooks directory
  try {
    await executeShell(`cd "${repoPath}" && git config core.hooksPath .githooks 2>/dev/null || true`);
  } catch {
    // Not a git repo yet, that's fine
  }

  const report = [
    `🔒 **Security template applied to ${projectName}**`,
    '',
    '**Files created:**',
    ...written.map(f => `  ✅ ${f}`),
    '',
    '**What was configured:**',
    `  • .gitignore - blocks secrets, credentials, env files`,
    `  • Pre-commit hook - detects API keys/tokens before commit`,
    skip_secret_manager ? '' : `  • Secret Manager - ${language === 'python' ? 'Python' : 'TypeScript'} integration`,
    `  • Security config - IAM roles, monitoring policies`,
    `  • .env.example - template for environment variables`,
    '',
    '**Next steps:**',
    `  1. Copy .env.example to .env and fill in values`,
    `  2. Run: \`git config core.hooksPath .githooks\``,
    skip_secret_manager ? '' : `  3. Setup GCP Secret Manager for production secrets`,
  ].filter(Boolean).join('\n');

  return report;
}

async function scanRepoSecrets(input: any): Promise<string> {
  const { path: repoPath } = input;

  log.info('[RepoSecurity] Scanning repo for secrets', { path: repoPath });

  const issues: string[] = [];

  // 1. Check for dangerous files that shouldn't be committed
  const dangerousFiles = [
    '.env', '.env.local', '.env.production',
    'credentials.json', 'secrets.yaml', 'secrets.yml',
    'service-account.json', 'config.yaml', 'config.yml',
  ];

  for (const file of dangerousFiles) {
    try {
      const check = await executeShell(
        `cd "${repoPath}" && git ls-files --error-unmatch "${file}" 2>/dev/null && echo "TRACKED" || echo "NOT_TRACKED"`
      );
      if (check.includes('TRACKED')) {
        issues.push(`⚠️ **${file}** is tracked by git (may contain secrets)`);
      }
    } catch {
      // File doesn't exist or not a git repo
    }
  }

  // 2. Scan tracked files for secret patterns
  try {
    const trackedFiles = await executeShell(
      `cd "${repoPath}" && git ls-files | grep -v -E '\\.(png|jpg|gif|ico|svg|woff|ttf|pdf|zip|gz)$' | head -100`
    );

    for (const file of trackedFiles.split('\n').filter(Boolean)) {
      try {
        const content = await executeShell(`cd "${repoPath}" && cat "${file}" 2>/dev/null`);
        const result = containsSecrets(content);
        if (result.found) {
          issues.push(`🔴 **${file}** - secret pattern detected (${result.matches.length} match(es))`);
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    issues.push('⚠️ Could not scan tracked files (not a git repo?)');
  }

  // 3. Check .gitignore exists and covers basics
  try {
    const gitignore = await executeShell(`cd "${repoPath}" && cat .gitignore 2>/dev/null`);
    const missingPatterns: string[] = [];
    if (!gitignore.includes('.env')) missingPatterns.push('.env');
    if (!gitignore.includes('credentials')) missingPatterns.push('credentials files');
    if (!gitignore.includes('*.key') && !gitignore.includes('*.pem')) missingPatterns.push('private keys');

    if (missingPatterns.length > 0) {
      issues.push(`⚠️ **.gitignore** missing coverage for: ${missingPatterns.join(', ')}`);
    }
  } catch {
    issues.push('🔴 **No .gitignore found** - secrets could be committed');
  }

  // 4. Check for pre-commit hooks
  try {
    await executeShell(`cd "${repoPath}" && (test -f .githooks/pre-commit || test -f .git/hooks/pre-commit) && echo "FOUND"`);
  } catch {
    issues.push('⚠️ **No pre-commit hook** for secret detection');
  }

  // Build report
  if (issues.length === 0) {
    return `🔒 **Security scan: ${repoPath}**\n\n✅ No security issues found!`;
  }

  return [
    `🔍 **Security scan: ${repoPath}**`,
    '',
    `Found **${issues.length}** issue(s):`,
    '',
    ...issues,
    '',
    `💡 Run \`secure_repo\` to auto-fix these issues.`,
  ].join('\n');
}
