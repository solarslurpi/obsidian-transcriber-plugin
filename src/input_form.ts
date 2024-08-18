import { App, Modal, Notice, TextComponent, ButtonComponent, Setting } from 'obsidian';
import TranscriberPlugin from "./main";
import { processAudio } from "./process_audio";
import { isValidAudioFile, isValidYouTubeUrl } from './utils';
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
        // The submit button was clicked.  Handle the input and determine if the code
        // can proceed to transcribe based on the user entering either a YouTube url or file upload.
        this.logger.debug('input_form.handleClick:  start.');

        const urlValue = this.urlInput.getValue().trim();
        this.logger.debug(`input_form.handleClick.YOUTUBED URL Input: ${urlValue}`);

        const files = this.fileInput?.files;


        // Ensure only one input method is used
        if (files && files.length > 0 && urlValue !== "") {
            this.logger.debug('input_form.handleClick.Input Error: Detected both URL and file as input.');
            new Notice('Please enter EITHER a URL OR a file.');

        } else if (files && files.length > 0) {
            // FILE UPLOAD WILL BE PROCESSED
            const file = files[0];
            this.logger.debug(`input_form.handleClick.Processing File Upload: ${file.name}`);
            await this.handleFileUpload(file);
        } else if (urlValue !== "") {
            // YOUTUBE URL WILL BE PROCESSED
            this.logger.debug(`input_form.handleClick.Processing YouTube URL: ${urlValue}`);
            await this.handleUrlInput(urlValue);
        } else {
            // Handle case where no input was provided
            this.logger.debug('input_form.handleClick.Input Error: No YouTube URL or file selected.');
            new Notice('Please enter a URL or select a file.');
        }
    }
    private async handleFileUpload(file: File) {
        // Check if the file is a valid audio file before sending it for processing.
        this.logger.debug(`input_form.handleFileUpload: ${file.name} selected..`);

        if (isValidAudioFile(file.name)) {
            this.logger.debug(`input_form.handleFileUpload: File is a valid audio file - ${file.name}`);
            await this.processInput(file, 'file');
        } else {
            this.logger.debug(`input_form.handleFileUpload: Invalid Audio file - ${file.name}`);
            new Notice(`Error: Invalid audio file: ${file.name}`, 0);
        }
    }

    private async handleUrlInput(url: string) {
        // Do a check if valid YouTube URL before sending the audio for processing.
        this.logger.debug(`input_form.handleUrlInput: ${url}`);

        if (isValidYouTubeUrl(url)) {
            this.logger.debug(`input_form.handleUrlInput: URL is a valid YouTube URL - ${url}`);
            await this.processInput(url, 'url');
        } else {
            this.logger.debug(`input_form.handleUrlInput: Error: Invalid YouTube URL - ${url}`);
            new Notice("Error: Invalid YouTube URL.");
        }
    }

    private async processInput(input: File | string, type: 'file' | 'url') {
        let description = type === 'file' ? `audio file - ${(input as File).name}` : `YouTube URL - ${input}`;
        this.logger.debug(`input_form.processInput: Processing ${description}.`);

        try {
            if (type === 'file') {
                await processAudio(this.plugin, input as File, this.logger);
            } else {
                await processAudio(this.plugin, input as string, this.logger);
            }
        } catch (error) {
            new Notice(`Error: Attempting to process ${description}. ${error}`, 0);
            this.logger.error(`input_form.processInput: Error attempting to process ${description}. Error: ${error}`);
        }
    }



    private render() {
        // TITLE HEADER
        this.contentEl.createEl("h2", { text: "Enter EITHER a YouTube URL - OR - Upload an Audio File",cls: 'centered-content' });
        // YOUTUBE URL TEXT COMPONENT
        this.urlInput = new TextComponent(this.contentEl);
        this.urlInput.setPlaceholder("Enter YouTube URL here...");
        this.urlInput.inputEl.classList.add('youtube-url-input');
        this.contentEl.createEl("h2",{text: "         -OR-"})
        // AUDIO FILE BUTTON
        const uploadContainer = this.contentEl.createEl('div', { cls: 'file-upload-container' });
        const uploadButton = uploadContainer.createEl('button', {
            text: 'Choose Audio File',
            cls: 'file-upload-button',
            attr: { type: 'button' }
        });
        const fileNameDisplay = uploadContainer.createEl('span');

        // Create the hidden file input
        this.fileInput = uploadContainer.createEl('input', {
            type: 'file',
            attr: {
                accept: '.mp3, .m4a, .aac, .ogg, .wav, .flac, .opus',
                id: 'audio-file-upload',
                class: 'file-upload-input'
            }
        });
        // Add click event to the button to trigger file input
        uploadButton.addEventListener('click', () => {
            this.fileInput.click();
        });
        // Add change event to the file input to update the filename display
        this.fileInput.addEventListener('change', () => {
            if (this.fileInput.files && this.fileInput.files.length > 0) {
                fileNameDisplay.textContent = `   Selected file: ${this.fileInput.files[0].name}`;
            } else {
                fileNameDisplay.textContent = '';
            }
        });
        // SUBMIT BUTTON
        const submitContainer = this.contentEl.createEl('div', { cls: 'submit-container' });
        // Create a horizontal line
        submitContainer.createEl('hr');
        // Create the submit button
        const submitButton = submitContainer.createEl('button', {
            text: 'Submit',
            cls: 'file-upload-button',
        });

        // HANDLE CLICK
        submitButton.addEventListener('click', async () => {
            await this.handleClick();
        });
        this.addStyles();
    }




    private addStyles() {
        let style = document.createElement('style');
        style.textContent = `
            .centered-content {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
            }
            .setting-container {
                display: flex;
                align-items: center;
            }
            .modal-title {
                display: block;
                width: 100%;
                margin-bottom: 10px; /* Adjust the spacing as needed */
            }
             .submit-container {
                display: flex;
                justify-content: center;
                margin-top: 20px;
                gap: 20px;
            }
             }
             .file-upload-container {
                display: flex;
                justify-content: left;

            }
            .file-upload-input {
                display: none;
            }
            .file-upload-button {
                display: inline-block;
                padding: 0px 20px 0px 20px;
                background-color: #5c7cfa;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s ease;
            }
            .file-upload-button:hover {
                background-color: #4263eb;
            }
            .youtube-url-input {
                margin-bottom: 10px; /* Add margin spacing */
            }
        `;
        document.head.appendChild(style);
    }
}