/**
 * Git Setup for Self-Improvement
 *
 * Clones the bot's own repository to /data/repo for self-modification.
 * This allows the bot to:
 * - Modify its own code
 * - Commit changes
 * - Push to GitHub
 * - Trigger deploys
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { log } from '../logger';
import { generateSecurityTemplate } from '../security/repo-security-template';

const REPO_URL = 'https://github.com/opencellcw/ulf-warden.git';
const REPO_DIR = '/data/repo';
const GIT_USER_NAME = 'Ulf Bot';
const GIT_USER_EMAIL = 'bot@opencellcw.dev';

interface GitSetupResult {
  success: boolean;
  repoPath: string | null;
  error?: string;
}

/**
 * Setup git repository for self-improvement
 */
export async function setupGitRepo(): Promise<GitSetupResult> {
  try {
    // Check if /data exists and is writable
    if (!fs.existsSync('/data')) {
      log.warn('[GitSetup] /data directory does not exist - self-improvement disabled');
      return { success: false, repoPath: null, error: '/data not available' };
    }

    // Check if GITHUB_TOKEN is available
    const token = process.env.GITHUB_TOKEN;
    const username = process.env.GITHUB_USERNAME || 'opencellcw';

    if (!token) {
      log.warn('[GitSetup] GITHUB_TOKEN not set - self-improvement disabled');
      return { success: false, repoPath: null, error: 'GITHUB_TOKEN not configured' };
    }

    // Configure git credentials
    const repoUrlWithToken = `https://${username}:${token}@github.com/opencellcw/ulf-warden.git`;

    // Configure git globally
    execSync(`git config --global user.name "${GIT_USER_NAME}"`, { stdio: 'pipe' });
    execSync(`git config --global user.email "${GIT_USER_EMAIL}"`, { stdio: 'pipe' });
    execSync('git config --global credential.helper store', { stdio: 'pipe' });

    // Store credentials
    const credentialsPath = path.join(process.env.HOME || '/root', '.git-credentials');
    fs.writeFileSync(credentialsPath, `https://${username}:${token}@github.com\n`, { mode: 0o600 });

    // Clone or update repo
    if (fs.existsSync(REPO_DIR)) {
      // Repo exists - pull latest
      log.info('[GitSetup] Repository exists, pulling latest...');
      try {
        execSync('git fetch origin && git reset --hard origin/main', {
          cwd: REPO_DIR,
          stdio: 'pipe'
        });
        log.info('[GitSetup] Repository updated successfully');
      } catch (pullError: any) {
        log.warn('[GitSetup] Pull failed, re-cloning...', { error: pullError.message });
        fs.rmSync(REPO_DIR, { recursive: true, force: true });
        execSync(`git clone ${repoUrlWithToken} ${REPO_DIR}`, { stdio: 'pipe' });
      }
    } else {
      // Clone fresh
      log.info('[GitSetup] Cloning repository...');
      execSync(`git clone ${repoUrlWithToken} ${REPO_DIR}`, { stdio: 'pipe' });
      log.info('[GitSetup] Repository cloned successfully');
    }

    // Verify repo is working
    const gitStatus = execSync('git status --short', { cwd: REPO_DIR, encoding: 'utf-8' });
    const lastCommit = execSync('git log -1 --oneline', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();

    log.info('[GitSetup] Self-improvement repository ready', {
      path: REPO_DIR,
      lastCommit,
      status: gitStatus.trim() || 'clean'
    });

    // Ensure security template is present (idempotent)
    ensureSecurityFiles(REPO_DIR);

    return { success: true, repoPath: REPO_DIR };

  } catch (error: any) {
    log.error('[GitSetup] Failed to setup git repository', { error: error.message });
    return { success: false, repoPath: null, error: error.message };
  }
}

/**
 * Get the path to the self-improvement repo
 */
export function getSelfRepoPath(): string | null {
  if (fs.existsSync(REPO_DIR) && fs.existsSync(path.join(REPO_DIR, '.git'))) {
    return REPO_DIR;
  }
  return null;
}

/**
 * Check if self-improvement is available
 */
export function isSelfImprovementAvailable(): boolean {
  return getSelfRepoPath() !== null;
}

/**
 * Execute a git command in the self-improvement repo
 */
export function gitExec(command: string): string {
  const repoPath = getSelfRepoPath();
  if (!repoPath) {
    throw new Error('Self-improvement repository not available');
  }

  return execSync(command, {
    cwd: repoPath,
    encoding: 'utf-8',
    timeout: 60000
  });
}

/**
 * Commit and push changes
 */
export async function commitAndPush(
  message: string,
  files?: string[]
): Promise<{ success: boolean; commitHash?: string; error?: string }> {
  try {
    const repoPath = getSelfRepoPath();
    if (!repoPath) {
      return { success: false, error: 'Repository not available' };
    }

    // Add files
    if (files && files.length > 0) {
      for (const file of files) {
        gitExec(`git add ${file}`);
      }
    } else {
      gitExec('git add -A');
    }

    // Check if there are changes to commit
    const status = gitExec('git status --porcelain');
    if (!status.trim()) {
      return { success: false, error: 'No changes to commit' };
    }

    // Commit
    gitExec(`git commit -m "${message.replace(/"/g, '\\"')}"`);

    // Get commit hash
    const commitHash = gitExec('git rev-parse --short HEAD').trim();

    // Push
    gitExec('git push origin main');

    log.info('[GitSetup] Changes committed and pushed', { commitHash, message });

    return { success: true, commitHash };

  } catch (error: any) {
    log.error('[GitSetup] Failed to commit and push', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Pull latest changes
 */
export async function pullLatest(): Promise<{ success: boolean; error?: string }> {
  try {
    gitExec('git fetch origin && git reset --hard origin/main');
    log.info('[GitSetup] Pulled latest changes');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Ensure security files exist in a repo (idempotent)
 * Writes .githooks/pre-commit if missing, configures git hooks path
 */
function ensureSecurityFiles(repoDir: string): void {
  try {
    const hookDir = path.join(repoDir, '.githooks');
    const hookPath = path.join(hookDir, 'pre-commit');

    // Only write if pre-commit hook doesn't exist
    if (!fs.existsSync(hookPath)) {
      const files = generateSecurityTemplate({
        language: 'typescript',
        projectName: 'ulf-warden',
        gcpProject: process.env.GCP_PROJECT_ID || 'your-gcp-project',
        includeGcpSecretManager: false, // Main repo already has its own
        includePreCommitHook: true,
        includeSecurityConfig: false,
      });

      // Write only the pre-commit hook
      const hookFile = files.find(f => f.path.includes('pre-commit'));
      if (hookFile) {
        fs.mkdirSync(hookDir, { recursive: true });
        fs.writeFileSync(hookPath, hookFile.content, { mode: 0o755 });

        // Configure git to use .githooks
        try {
          execSync('git config core.hooksPath .githooks', { cwd: repoDir, stdio: 'pipe' });
        } catch {
          // Not critical
        }

        log.info('[GitSetup] Security pre-commit hook installed');
      }
    }
  } catch (error: any) {
    log.warn('[GitSetup] Failed to ensure security files (non-critical)', { error: error.message });
  }
}
