import TransportStream, { TransportStreamOptions } from 'winston-transport';
import { Vault, TFile } from 'obsidian';
import * as path from 'path';


interface CustomTransportOptions extends TransportStreamOptions {
  vault: Vault;
  logFilePath: string;
}

class ObsidianTransport extends TransportStream {
  private vault: Vault;
  private logFilePath: string;

  constructor(opts: CustomTransportOptions) {
    super(opts);
    this.vault = opts.vault;
    this.logFilePath = opts.logFilePath;
  }

  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info)); // Ensure 'logged' event is emitted
    const logEntry = `${info.timestamp} ${info.level}: ${info.message}\n`;
    const logFolder = path.dirname(this.logFilePath);

    (async () => {
      try {
        // await ensureFolder(logFolder);
        let file = this.vault.getAbstractFileByPath(this.logFilePath) as TFile;
        if (!file) {
          await this.vault.create(this.logFilePath, logEntry);
        } else {
          const content = await this.vault.read(file);
          await this.vault.modify(file, content + logEntry);
        }
      } catch (error) {
        console.error('Error writing log entry to Obsidian vault:', error);
      }
    })();

    callback();
  }
}

export { ObsidianTransport };
export type { CustomTransportOptions };
