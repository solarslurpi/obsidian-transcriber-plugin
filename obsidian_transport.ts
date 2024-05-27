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
    const yamlHeader = `---\ntags: log_file\nlog_entries:\n---\n`;
    let file = this.vault.getAbstractFileByPath(this.logFilePath) as TFile;
    if (!file) {
      // File doesn't exist, create it with the YAML header
      await this.vault.create(this.logFilePath, yamlHeader);
    } else {
      // File exists, check if it has the correct header
      const content = await this.vault.read(file);
      if (!content.startsWith('---\n')) {
        await this.vault.modify(file, yamlHeader + content);
      }
    }
  }
  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info)); // Ensure 'logged' event is emitted

    // Handle Incoming Log Messages
    const truncatedMessage = info.message.substring(0, 50); // Truncate the message to the first 50 characters

    const logEntry = `  - timestamp: "${info.timestamp}"
    level: "${info.level}"
    message: "${truncatedMessage}"\n`;

    (async () => {
      try {
        let file = this.vault.getAbstractFileByPath(this.logFilePath) as TFile;
        const content = await this.vault.read(file);

        // Delete the Last Line (which contains '---') and add the new Log message. Then put back the ---
        const updatedContent = content.replace(/\n---\n$/, '') + '\n' + logEntry + '---\n';
        await this.vault.modify(file, updatedContent);
      } catch (error) {
        console.error('Error writing log entry to Obsidian vault:', error);
      }
    })();

    callback();
  }


export { ObsidianTransport };
export type { CustomTransportOptions };
