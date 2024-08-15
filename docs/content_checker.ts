import { logger } from './logger';
import { processDoneMessage } from './process_audio';


export class ContentChecker {
    private contentCheckTimeoutId: NodeJS.Timeout | null = null;
    private attemptCounter: number = 0;
    private readonly MAX_ATTEMPTS: number = 5;
    private readonly TIMEOUT_MS: number;
    private readonly missingProperties: string[];
    private readonly plugin: any;
    private readonly stateManager: any;

    constructor() {
    }

    public async startContentCheckTimeout(timeoutMs: number=5000, maxAttempts: number=3, missingProperties: string[], plugin: any, stateManager: any) {
        logger.debug(`Starting content check timeout. Attempt: ${this.attemptCounter}. Timeout: ${timeoutMs}ms`);
        if (this.attemptCounter >= maxAttempts) {
            // Cleanup and fail gracefully
            logger.debug("Maximum attempts reached. Failing gracefully.");
            // Perform any necessary cleanup here
            this.contentCheckTimeoutId = null;
            return false;
        }

        this.attemptCounter++; // Increment the attempt counter

        this.contentCheckTimeoutId = setTimeout(async () => {
            logger.debug("Timeout logic executed");
            // Ask for the missing content.
            await processDoneMessage(plugin.settings.transcriberApiUrl, missingProperties, stateManager.getProperty('key'));
            // Reset the timeout ID after execution
            this.contentCheckTimeoutId = null;
            // Restart the timeout if necessary
            this.startContentCheckTimeout(undefined, undefined, missingProperties, plugin, stateManager);
        }, timeoutMs); // Time to wait in ms to see if more data messages are to arrive. If not,
    }

    public clearTimeout() {
        if (this.contentCheckTimeoutId !== null) {
            clearTimeout(this.contentCheckTimeoutId);
            this.contentCheckTimeoutId = null; // Reset the timeout ID
        }
    }




}
