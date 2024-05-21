import { createLogger, format, transports } from 'winston';
import { Vault } from 'obsidian';
import { ObsidianTransport } from './obsidian_transport';

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
    format.colorize()
  ),
  transports: [new transports.Console()]
});

export function initializeLogger(vault: Vault, logDir: string, logFilename: string) {
  const logfilePath = `${logDir}/${logFilename}`;
  logger.add(new ObsidianTransport({
    vault,
    logFilePath: logfilePath,
    format: format.combine(
      format.uncolorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.json(),
      format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
    )
  }));
}

export { logger };
