import TransportStream, { TransportStreamOptions } from 'winston-transport';
import { Vault, TFile } from 'obsidian';

interface CustomTransportOptions extends TransportStreamOptions {
  //  Identify the options that can be passed to the Obsidian custom transport.
  vault: Vault;
  logFilePath: string;
}

class ObsidianTransport extends TransportStream {
  private vault: Vault;
  private logFilePath: string;

  constructor(opts: CustomTransportOptions) {
    // Initialize the instance of ObsidianTransport with the vault and logFilePath.
    super(opts);
    this.vault = opts.vault;
    this.logFilePath = opts.logFilePath;

    // Clear and initialize the log file at the start of each run
    this.initializeLogFile().catch(error => console.error('Error initializing log file:', error));
  }

  async initializeLogFile() {
    const yamlHeader = `---\ntags: log_file\nlog_entries:\n---\n`;
    let file = this.vault.getAbstractFileByPath(this.logFilePath) as TFile;
    if (file) {
      // If the file exists, clear its contents
      await this.vault.modify(file, yamlHeader);
    } else {
      // If the file does not exist, create it
      await this.vault.create(this.logFilePath, yamlHeader);
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
        const content = await this.vault.read(file);

        // Delete the Last Line (which contains '---') and add the new log message, then put back the '---'
        const updatedContent = content.replace(/\n---\n$/, '') + '\n' + logEntry + '---\n';
        await this.vault.modify(file, updatedContent);
      } catch (error) {
        console.error('Error writing log entry to Obsidian vault:', error);
      }
    })();

    callback();
  }
}

export { ObsidianTransport };
export type { CustomTransportOptions };
