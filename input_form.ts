import { App, Modal, Notice, TextComponent, ButtonComponent } from 'obsidian';
import TranscriberPlugin from "./main";
import { processAudio } from "./process_audio";
import { isValidMP3, isValidYouTubeUrl, ensureFolder } from './utils';
import './styles';
import {logger} from './logger';
import { Logger } from 'winston';

export class InputForm extends Modal {
    // Instance properties.
    plugin: TranscriberPlugin;
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
        this.logger.debug('Opening the form.')
        this.render();
    }

    onClose() {
        this.logger.debug('Closing the form.')
        this.contentEl.empty();
    }

    private async handleClick() {
        this.logger.debug('-> handleClick.');

        if (this.fileInput) {
            this.logger.debug(`fileInput: ${this.fileInput}`);

            if (this.fileInput.files && this.fileInput.files.length > 0) {
                this.logger.debug(`this.fileInput.files[0]: ${this.fileInput.files[0]}`);
            }
        } else {
            this.logger.debug('fileInput is null.');
        }

        const urlValue = this.urlInput.getValue().trim();
        const files = this.fileInput?.files;

        if (files && files.length > 0 && urlValue !== "") {
            this.logger.debug('Detected both URL and file as input.');
            new Notice('Please use only one input method: either a URL or a file.');
        // Handle an mp3 file upload.
        } else if (files && files.length > 0) {
            this.logger.debug('Uploading file.');
            const file = files[0];
            await this.handleFileUpload(file, this.plugin.settings.test_mode);
        // Handle a YouTube url.
        } else if (urlValue !== "") {
            this.logger.debug('Downloading YouTube.');
            await this.handleUrlInput(urlValue, this.plugin.settings.test_mode);
        } else {
            this.logger.debug('Hit Submit without entering YouTube URL or file.');
            new Notice('Please enter a URL or select a file.');
        }
    }



    private async handleFileUpload(file: File, test_mode: boolean) {
        this.logger.debug(`-> handleFileUpload - File selected: ${file.name}`);
        // Make a string check if the name is valid.
        if (isValidMP3(file.name, test_mode)) {
            const apiUrl = this.plugin.settings.transcriberApiUrl;
            const folderPath = this.plugin.settings.transcriptsFolder;
            try {
                await processAudio(
                    file,
                    apiUrl,
                    folderPath,
                    test_mode,
                    this.plugin.settings.audioQuality
                );
            } catch (error) {
                new Notice(`Error attempting to processAudio. ${error}`);
                this.logger.error(`Error attempting to processAudio. ${error}`);
            }
        }
    }

    private async handleUrlInput(url: string, test_mode: boolean) {
        this.logger.debug(`URL entered: ${url}`);
        if (isValidYouTubeUrl(url, test_mode)) {
            await processAudio(
                url,
                this.plugin.settings.transcriberApiUrl,
                this.plugin.settings.transcriptsFolder,
                test_mode,
                this.plugin.settings.audioQuality
            );
        } else {
            this.logger.debug(`The YouTube URL: ${this.plugin.settings.transcriberApiUrl}`)
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
                this.logger.debug('Submit button clicked.');

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
