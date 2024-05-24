import { App, Modal, Notice, TextComponent, ButtonComponent } from 'obsidian';
import TranscriberPlugin from "./main";
import { processAudio } from "./process_audio";
import { isValidMP3, isValidYouTubeUrl, ensureFolder } from './utils';
import './styles';
import { Logger } from 'winston';

export class InputForm extends Modal {
    // Instance properties.
    plugin: TranscriberPlugin;
    // HTMLInputElement provides a way for users to select files from their local system.
    fileInput: HTMLInputElement;
    urlInput: TextComponent;
    healthCheckUrl: string;
    logger: Logger;

    constructor(app: App, plugin: TranscriberPlugin, logger:Logger) {
        super(app);
        this.plugin = plugin;
        this.logger = logger;

        // Initialize the health check URL based on the transcriber API URL
        const transcriberUrl = this.plugin.settings.transcriberApiUrl;
        const baseUrl = transcriberUrl.split('/').slice(0, -2).join('/'); // Get the base URL
        this.healthCheckUrl = new URL('/api/v1/health', baseUrl).toString();
    }

    onOpen() {
        this.logger.debug('onOpen: Opening input dialog form.')
        this.render();
    }

    onClose() {
        this.logger.debug('onClose: Closing input dialog form.')
        this.contentEl.empty();
    }

    private async handleClick() {
        this.logger.debug('handleClick:  invoked.');

        // Retrieve and log the URL input value after trimming
        const urlValue = this.urlInput.getValue().trim();
        this.logger.debug(`URL Input: "${urlValue}"`);

        // Check and log the file input
        const files = this.fileInput?.files;
        if (files && files.length > 0) {
            this.logger.debug(`File Input: ${files[0].name} selected.`);
        } else {
            this.logger.debug('File Input: No file selected.');
        }

        // Ensure only one input method is used
        if (files && files.length > 0 && urlValue !== "") {
            this.logger.debug('Input Error: Detected both URL and file as input.');
            new Notice('Please use only one input method: either a URL or a file.');
        } else if (files && files.length > 0) {
            const file = files[0];
            this.logger.debug(`Processing File Upload: ${file.name}`);
            await this.handleFileUpload(file);
        } else if (urlValue !== "") {
            this.logger.debug(`Processing YouTube URL: ${urlValue}`);
            await this.handleUrlInput(urlValue);
        } else {
            // Handle case where no input was provided
            this.logger.debug('Input Error: No YouTube URL or file selected.');
            new Notice('Please enter a URL or select a file.');
        }
    }
    private async handleFileUpload(file: File) {
        this.logger.debug('handleFileUpload: invoked.');
        this.logger.debug(`File Input: ${file.name} selected.`);

        // Make a string check if the name is valid.
        if (isValidMP3(file.name)) {
            this.logger.debug(`Validation: File is a valid MP3 - ${file.name}`);

            const apiUrl = this.plugin.settings.transcriberApiUrl;
            const folderPath = this.plugin.settings.transcriptsFolder;

            try {
                await processAudio(
                    file,
                    apiUrl,
                    folderPath,
                    this.plugin.settings.audioQuality
                );
                this.logger.debug(`Processing Success: File processed successfully - ${file.name}`);
            } catch (error) {
                new Notice(`Error: Attempting to process audio file - ${file.name}. ${error}`);
                this.logger.error(`Error: Attempting to process audio file - ${file.name}. Error: ${error}`);
            }
        } else {
            this.logger.debug(`Validation Error: Invalid MP3 file - ${file.name}`);
            new Notice(`Invalid MP3 file: ${file.name}`);
        }
    }

    private async handleUrlInput(url: string) {
        this.logger.debug('-> handleUrlInput invoked.');
        this.logger.debug(`URL Input: ${url}`);

        if (isValidYouTubeUrl(url)) {
            this.logger.debug(`Validation: URL is a valid YouTube URL - ${url}`);

            try {
                await processAudio(
                    url,
                    this.plugin.settings.transcriberApiUrl,
                    this.plugin.settings.transcriptsFolder,
                    this.plugin.settings.audioQuality
                );
                this.logger.debug(`Processing Success: YouTube URL processed successfully - ${url}`);
            } catch (error) {
                new Notice(`Error: Attempting to process YouTube URL - ${url}. ${error}`);
                this.logger.error(`Error: Attempting to process YouTube URL - ${url}. Error: ${error}`);
            }
        } else {
            this.logger.debug(`Validation Error: Invalid YouTube URL - ${url}`);
            new Notice("Invalid YouTube URL.");
        }
    }

    async checkServiceAvailability(): Promise<boolean> {
        try {
            const response = await fetch(this.healthCheckUrl);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    private render() {
        this.contentEl.classList.add('transcriber-container');

        const title = this.contentEl.createEl('h3', { text: 'Transcribe YouTube URL or MP3 File' });
        title.classList.add('transcriber-title');

        this.createFormGroup('Please enter a YouTube URL:');
        this.urlInput = new TextComponent(this.contentEl);
        this.urlInput.setPlaceholder("Enter YouTube URL here...");
        this.urlInput.inputEl.classList.add('transcriber-input', 'wide-input');

        this.createFormGroup('- OR -', 'transcriber-subtitle');
        this.createFormGroup('Enter the path to an mp3 file:');
        this.fileInput = this.contentEl.createEl('input', {
            type: 'file',
            attr: { accept: '.mp3', id: 'mp3-file-upload' }
        });
        this.fileInput.classList.add('transcriber-input');

        const buttonContainer = this.contentEl.createEl('div', { cls: 'button-container' });

        const submitButton = new ButtonComponent(buttonContainer)
            .setButtonText('Submit')
            .onClick(async () => {

                // Ensure service availability before proceeding
                if (!(await this.checkServiceAvailability())) {
                    this.logger.error('The FastAPI service is not available.');
                    new Notice('ERROR! The FastAPI service is not available.');
                    return;
                }

                // Close the modal
                this.close();

                // Delegate to handleClick for further processing
                await this.handleClick();
            });

        submitButton.buttonEl.classList.add('transcriber-button');

        this.createFormGroup('Click "Submit" after entering a URL or selecting a file.', 'transcriber-subtitle');
    }

    // Define the createFormGroup method
    private createFormGroup(text: string, className?: string) {
        const group = this.contentEl.createEl('div', { cls: 'form-group' });
        const paragraph = group.createEl('p', { text });
        paragraph.style.fontWeight = 'bold';
        if (className) {
            paragraph.classList.add(className);
        }
    }
}
