import { App, Modal, Notice, TextComponent, ButtonComponent } from 'obsidian';
import TranscriberPlugin from "./main";
import {processAudio} from "./process_audio"

import { isValidMP3, isValidYouTubeUrl, logDebug} from 'utils';

export class TranscriberInputUI extends Modal {
    plugin: TranscriberPlugin;
    fileInput: HTMLInputElement;

    constructor(app: App, plugin: TranscriberPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        let { contentEl } = this;
        contentEl.createEl('h3', { text: 'Submit YouTube URL or MP3 File' });
        contentEl.createEl('p', { text: 'Please enter a YouTube URL'});

        // Create a text input for YouTube URL
        let urlInput = new TextComponent(contentEl)
            .setPlaceholder("Enter YouTube URL here...");
        contentEl.createEl('p', { text: '- OR -'});
        contentEl.createEl('p', { text: 'Enter the path to an mp3 file: '});
        // Create file input element for uploading MP3 files
        this.fileInput = contentEl.createEl('input', {
            type: 'file',
            attr: {
                accept: '.mp3', // Only accept .mp3 files
                id: 'mp3-file-upload'
            }
        });
        logDebug(`fileInput: ${this.fileInput}`);
        // Add a button to handle the input or file submission
        new ButtonComponent(contentEl)
            .setButtonText('Submit')
            .onClick(() => {
                logDebug(`fileInput: ${this.fileInput}`);
                // Check if a file is selected first
                if (this.fileInput.files && this.fileInput.files.length > 0 && urlInput.getValue().trim() !== "") {
                    new Notice('Please use only one input method: either a URL or a file.');
                } else if (this.fileInput.files && this.fileInput.files.length > 0) {
                    const file = this.fileInput.files[0];
                    this.handleFileUpload(file); // Process the file upload
                } else if (urlInput.getValue().trim() !== "") {
                    this.handleUrlInput(urlInput.getValue()); // Process the URL input
                } else {
                    new Notice('Please enter a URL or select a file.');
                }
            });

        contentEl.createEl('p', { text: 'Click "Submit" after entering a URL or selecting a file.' });
    }

    onClose() {
        this.contentEl.empty();
    }

    private handleFileUpload(file: File) {
        console.log(`File selected: ${file.name}`);
        if (isValidMP3(file.name)) {
            if (this.fileInput.files && this.fileInput.files.length > 0) {
                const file = this.fileInput.files[0]
                const transcriberApiUrl = this.plugin.settings.transcriberApiUrl;
                processAudio(file, transcriberApiUrl);
            }
        } else {
            new Notice('No file selected.');
        }
    }


    private handleUrlInput(url: string) {
        console.log(`URL entered: ${url}`);

        if (isValidYouTubeUrl(url)) {
            const transcriberApiUrl = this.plugin.settings.transcriberApiUrl;
            processAudio(url, transcriberApiUrl);
        } else {
            new Notice('Invalid YouTube URL.');
        }
    }
}
