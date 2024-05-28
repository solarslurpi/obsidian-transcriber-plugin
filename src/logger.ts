import { createLogger, format, transports } from 'winston';
import { Vault } from 'obsidian';
import { BufferedObsidianTransport } from './buffered_obsidian_transport';

//The purpose of this file is to configure and initialize a Winston logger that logs messages to both the console and an Obsidian note, using a custom ObsidianTransport to handle the note logging.
const logger = createLogger({
  level: 'info', // Default level, will be updated by initializeLogger
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
    format.colorize()
  ),
  transports: [new transports.Console()]
});

export async function initializeLogger(vault: Vault, logDir: string, logFilename: string, logLevel: string) {
  logger.level = logLevel; // Update the logger level

  if (vault && logDir && logFilename) {
    const logFilePath = `${logDir}/${logFilename}`;
    const obsidianTransport = new BufferedObsidianTransport({
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
}

export { logger };
