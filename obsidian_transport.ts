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

  async initializeLogFile() {
    const yamlHeader = `---
tags: log_file
log_entries:
`;

    let file = this.vault.getAbstractFileByPath(this.logFilePath) as TFile;
    if (!file) {
      await this.vault.create(this.logFilePath, yamlHeader + '---\n');
    } else {
      const content = await this.vault.read(file);
      if (!content.startsWith('---')) {
        await this.vault.modify(file, yamlHeader + content);
      }
    }
  }

  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info)); // Ensure 'logged' event is emitted
    const logEntry = `  - timestamp: "${info.timestamp}"
    level: "${info.level}"
    message: "${info.message}"\n`;

    (async () => {
      try {
        let file = this.vault.getAbstractFileByPath(this.logFilePath) as TFile;
        if (!file) {
          const yamlHeader = `---
tags: log_file
log_entries:
`;
          await this.vault.create(this.logFilePath, yamlHeader + logEntry + '---\n');
        } else {
          const content = await this.vault.read(file);
          const newContent = content.replace(/\n---\n$/, '') + '\n' + logEntry + '---\n';
          await this.vault.modify(file, newContent);
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
