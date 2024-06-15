import { App, Modal, Notice, TextComponent, ButtonComponent } from 'obsidian';
import TranscriberPlugin from "./main";
import { processAudio } from "./process_audio";
import { isValidMP3, isValidYouTubeUrl } from './utils';
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
        this.logger.debug("input_form.constructor: initialized.");
    }

    onOpen() {
        this.logger.debug("input_form.onOpen: start.");
        this.render();
    }

    onClose() {
        this.logger.debug('input_form.onClose: Closing input dialog form.')
        this.contentEl.empty();
    }

    private async handleClick() {
        this.logger.debug('input_form.handleClick:  start.');

        // Retrieve and log the URL input value after trimming
        const urlValue = this.urlInput.getValue().trim();

        // Check and log the file input
        const files = this.fileInput?.files;
        if (files && files.length > 0) {
            this.logger.debug(`input_form.handleClick.File Input: ${files[0].name} selected.`);
        } else {
            this.logger.debug('input_form.handleClick.File Input: No file selected.');
        }

        // Ensure only one input method is used
        if (files && files.length > 0 && urlValue !== "") {
            this.logger.debug('input_form.handleClick.Input Error: Detected both URL and file as input.');
            new Notice('Please use only one input method: either a URL or a file.');
        } else if (files && files.length > 0) {
            const file = files[0];
            this.logger.debug(`input_form.handleClick.Processing File Upload: ${file.name}`);
            await this.handleFileUpload(file);
        } else if (urlValue !== "") {
            this.logger.debug(`input_form.handleClick.Processing YouTube URL: ${urlValue}`);
            await this.handleUrlInput(urlValue);
        } else {
            // Handle case where no input was provided
            this.logger.debug('input_form.handleClick.Input Error: No YouTube URL or file selected.');
            new Notice('Please enter a URL or select a file.');
        }
    }
    private async handleFileUpload(file: File) {
        this.logger.debug(`input_form.handleFileUpload: ${file.name} selected..`);

        if (isValidMP3(file.name)) {
            this.logger.debug(`input_form.handleFileUpload: File is a valid MP3 - ${file.name}`);
            await this.processInput(file, 'file');
        } else {
            this.logger.debug(`input_form.handleFileUpload: Invalid MP3 file - ${file.name}`);
            new Notice(`Error: Invalid MP3 file: ${file.name}`, 0);
        }
    }

    private async handleUrlInput(url: string) {
        this.logger.debug(`input_form.handleUrlInput: ${url}`);

        if (isValidYouTubeUrl(url)) {
            this.logger.debug(`input_form.handleUrlInput: URL is a valid YouTube URL - ${url}`);
            await this.processInput(url, 'url');
        } else {
            this.logger.debug(`input_form.handleUrlInput: Error: Invalid YouTube URL - ${url}`);
            new Notice("Error: Invalid YouTube URL.", 0);
        }
    }

    private async processInput(input: File | string, type: 'file' | 'url') {
        let apiUrl = this.plugin.settings.transcriberApiUrl;
        let folderPath = this.plugin.settings.transcriptsFolder;
        let audioQuality = this.plugin.settings.audioQuality;
        let description = type === 'file' ? `audio file - ${(input as File).name}` : `YouTube URL - ${input}`;

        this.logger.debug(`input_form.processInput: Processing ${description}.`);

        try {
            let response;
            if (type === 'file') {
                response = await processAudio(
                    input as File,
                    apiUrl,
                    folderPath,
                    audioQuality
                );
            } else {
                response = await processAudio(
                    input as string,
                    apiUrl,
                    folderPath,
                    audioQuality
                );
            }

        } catch (error) {
            new Notice(`Error: Attempting to process ${description}. ${error}`, 0);
            this.logger.error(`input_form.processInput: Error attempting to process ${description}. Error: ${error}`);
        }
    }

    async checkServiceAvailability(): Promise<boolean> {
        this.logger.debug(`input_form.checkServiceAvailability:start`);
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

                // Ensure service availability before setting up SSE channel.
                if (!(await this.checkServiceAvailability())) {
                    this.logger.error('input_form.render:The FastAPI service is not available.');
                    new Notice('Error: The FastAPI service is not available.', 5000);
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
