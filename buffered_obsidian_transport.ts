import TransportStream, { TransportStreamOptions } from 'winston-transport';
import { Vault, TFile } from 'obsidian';

interface CustomTransportOptions extends TransportStreamOptions {
  vault: Vault;
  logFilePath: string;
}

class BufferedObsidianTransport extends TransportStream {
  private vault: Vault;
  private logFilePath: string;
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(opts: CustomTransportOptions) {
    super(opts);
    this.vault = opts.vault;
    this.logFilePath = opts.logFilePath;

    // Clear and initialize the log file at the start of each run
    this.initializeLogFile().catch(error => console.error('Error initializing log file:', error));

    // Set up a periodic flush interval (e.g., every 5 seconds)
    this.flushInterval = setInterval(() => this.flushBuffer(), 5000);

    // Ensure buffer is flushed on exit
    process.on('exit', () => this.flushBuffer());
    process.on('SIGINT', () => { this.flushBuffer(); process.exit(); });
    process.on('SIGTERM', () => { this.flushBuffer(); process.exit(); });
  }

  async initializeLogFile() {
    const yamlHeader = `---\ntags: log_file\nlog_entries:\n---\n`;
    console.log('using BufferedObsidianTransport...')
    try {
      let file = this.vault.getAbstractFileByPath(this.logFilePath) as TFile;
      if (file) {
        await this.vault.modify(file, yamlHeader);
      } else {
        await this.vault.create(this.logFilePath, yamlHeader);
      }
    } catch (error) {
      console.error('Error initializing log file:', error);
    }
  }

  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info));
    const logEntry = `  - timestamp: "${info.timestamp}"
    level: "${info.level}"
    message: "${info.message}"\n`;

    this.buffer.push(logEntry);
    callback();
  }

  async flushBuffer() {
    if (this.buffer.length === 0) return;
    try {
      let file = this.vault.getAbstractFileByPath(this.logFilePath) as TFile;
      const content = await this.vault.read(file);
      const updatedContent = content.replace(/\n---\n$/, '') + '\n' + this.buffer.join('\n') + '\n---\n';
      await this.vault.modify(file, updatedContent);
      this.buffer = []; // Clear buffer after flushing
    } catch (error) {
      console.error('Error flushing log buffer to Obsidian vault:', error);
    }
  }
}

export { BufferedObsidianTransport };
export type { CustomTransportOptions };
