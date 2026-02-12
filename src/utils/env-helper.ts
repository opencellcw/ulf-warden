/**
 * Environment Variable Helper
 * 
 * Safe getters with fallback values and validation
 */

import { log } from '../logger';

// Required environment variables (bot crashes without these)
const REQUIRED_VARS = [
  'ANTHROPIC_API_KEY',
  'DISCORD_BOT_TOKEN',
] as const;

// Optional but important (warns if missing)
const IMPORTANT_VARS = [
  'SLACK_BOT_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'WHATSAPP_BOT_NUMBER',
  'REDIS_HOST',
  'DATABASE_URL',
  'PUBLIC_URL',
] as const;

/**
 * Get environment variable with fallback
 * 
 * @param key - Environment variable name
 * @param defaultValue - Fallback value if not set
 * @returns Environment variable value or default
 * 
 * @example
 * const apiKey = getEnv('API_KEY', 'default-key');
 * const port = getEnv('PORT', '3000');
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  const value = process.env[key];
  
  if (value === undefined || value === '') {
    // Check if this is a required var
    if (REQUIRED_VARS.includes(key as any)) {
      log.error(`❌ Required env var ${key} is missing!`, {
        key,
        required: true,
        action: 'CRASH'
      });
      throw new Error(`Required environment variable ${key} is not set`);
    }
    
    // Warn if important var is missing
    if (IMPORTANT_VARS.includes(key as any)) {
      log.warn(`⚠️  Important env var ${key} is missing, using default`, {
        key,
        defaultValue,
        important: true
      });
    }
    
    return defaultValue;
  }
  
  return value;
}

/**
 * Get required environment variable (throws if not set)
 * 
 * @param key - Environment variable name
 * @returns Environment variable value
 * @throws Error if variable is not set
 * 
 * @example
 * const apiKey = requireEnv('ANTHROPIC_API_KEY');
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  
  if (!value || value === '') {
    log.error(`❌ Required env var ${key} is not set!`, {
      key,
      required: true,
      action: 'CRASH'
    });
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value;
}

/**
 * Get environment variable as number
 * 
 * @param key - Environment variable name
 * @param defaultValue - Fallback value if not set or invalid
 * @returns Number value or default
 * 
 * @example
 * const port = getEnvNumber('PORT', 3000);
 * const timeout = getEnvNumber('TIMEOUT_MS', 5000);
 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = getEnv(key, String(defaultValue));
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    log.warn(`⚠️  Env var ${key} is not a valid number, using default`, {
      key,
      value,
      defaultValue
    });
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Get environment variable as boolean
 * 
 * @param key - Environment variable name
 * @param defaultValue - Fallback value if not set
 * @returns Boolean value or default
 * 
 * @example
 * const debugMode = getEnvBoolean('DEBUG', false);
 * const enabled = getEnvBoolean('FEATURE_ENABLED', true);
 */
export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = getEnv(key, String(defaultValue)).toLowerCase();
  
  if (value === 'true' || value === '1' || value === 'yes') {
    return true;
  }
  
  if (value === 'false' || value === '0' || value === 'no') {
    return false;
  }
  
  log.warn(`⚠️  Env var ${key} is not a valid boolean, using default`, {
    key,
    value,
    defaultValue
  });
  
  return defaultValue;
}

/**
 * Validate all required environment variables on startup
 * 
 * @throws Error if any required variable is missing
 * 
 * @example
 * validateEnv(); // Call on startup
 */
export function validateEnv(): void {
  log.info('🔍 Validating environment variables...');
  
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required vars
  for (const key of REQUIRED_VARS) {
    if (!process.env[key] || process.env[key] === '') {
      missing.push(key);
    }
  }
  
  // Check important vars
  for (const key of IMPORTANT_VARS) {
    if (!process.env[key] || process.env[key] === '') {
      warnings.push(key);
    }
  }
  
  // Report results
  if (missing.length > 0) {
    log.error('❌ Missing required environment variables:', {
      missing,
      count: missing.length
    });
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these in your .env file or environment.`
    );
  }
  
  if (warnings.length > 0) {
    log.warn('⚠️  Missing important environment variables:', {
      warnings,
      count: warnings.length,
      impact: 'Some features may not work'
    });
  }
  
  log.info('✅ Environment validation complete', {
    required: REQUIRED_VARS.length,
    important: IMPORTANT_VARS.length,
    missing: missing.length,
    warnings: warnings.length
  });
}

/**
 * Get all environment variables (for debugging)
 * Masks sensitive values
 */
export function debugEnv(): Record<string, string> {
  const debug: Record<string, string> = {};
  
  const sensitive = ['API_KEY', 'TOKEN', 'SECRET', 'PASSWORD'];
  
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    
    const isSensitive = sensitive.some(s => key.includes(s));
    debug[key] = isSensitive ? `${value.substring(0, 4)}***` : value;
  }
  
  return debug;
}
