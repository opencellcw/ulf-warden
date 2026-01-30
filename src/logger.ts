import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = process.env.LOGS_DIR || path.join(process.env.DATA_DIR || './data', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ulfberht-warden' },
  transports: [
    // Console output (for development and Render logs)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      )
    }),

    // File output (for persistent logs)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'ulf.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add helper methods
export const log = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),

  // Specific logging methods
  session: (action: string, userId: string, meta?: any) => {
    logger.info(`[Session] ${action}`, { userId, ...meta });
  },

  tool: (action: string, toolName: string, userId: string, meta?: any) => {
    logger.info(`[Tool] ${action}`, { toolName, userId, ...meta });
  },

  platform: (platform: string, action: string, meta?: any) => {
    logger.info(`[${platform}] ${action}`, meta);
  },

  agent: (action: string, meta?: any) => {
    logger.info(`[Agent] ${action}`, meta);
  },

  persistence: (action: string, meta?: any) => {
    logger.info(`[Persistence] ${action}`, meta);
  }
};

export default logger;
