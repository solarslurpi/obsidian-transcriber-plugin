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

export async function initializeLogger(vault: Vault, logDir: string, logFilename: string) {
  const logFilePath = `${logDir}/${logFilename}`;

  const obsidianTransport = new ObsidianTransport({
    vault,
    logFilePath,
    format: format.combine(
      format.uncolorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.json(),
      format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
    )
  });

  // Initialize the log file with YAML frontmatter if it doesn't exist
  await obsidianTransport.initializeLogFile();

  // Add the Obsidian transport
  logger.add(obsidianTransport);
}

export { logger };
