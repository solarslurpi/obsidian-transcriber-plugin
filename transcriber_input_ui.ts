import { App, Modal, Notice, TextComponent, ButtonComponent, TFile, TFolder } from 'obsidian';
import TranscriberPlugin from "./main";
import { processAudio } from "./process_audio";
import { isValidMP3, isValidYouTubeUrl, logDebug } from './utils';

export class TranscriberInputUI extends Modal {
    plugin: TranscriberPlugin;
    fileInput: HTMLInputElement;

    constructor(app: App, plugin: TranscriberPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async ensureFolder(folderPath: string) {
        console.log("--> ensureFolder")
        console.log('folder path: ',folderPath)
        try {
            await this.app.vault.createFolder(folderPath);
            console.log("Transcripts folder created successfully.");
            return true;
        } catch (error) {
            // If the error was folder already exists, that's ok.
                console.log("ERROR: ",error.message);
                if (error.message.includes('Folder already exists.')) {
                    console.log("Folder already existed.");
                    return true;
                } else {
                    console.error("Failed to create transcripts folder:", error);
                    throw new Error("Failed to create transcripts folder: " + error.message);
                }
        }
    }

    onOpen() {
        let { contentEl } = this;
        contentEl.createEl('h3', { text: 'Submit YouTube URL or MP3 File' });
        contentEl.createEl('p', { text: 'Please enter a YouTube URL'});

        let urlInput = new TextComponent(contentEl)
            .setPlaceholder("Enter YouTube URL here...");
        contentEl.createEl('p', { text: '- OR -'});
        contentEl.createEl('p', { text: 'Enter the path to an mp3 file: '});

        this.fileInput = contentEl.createEl('input', {
            type: 'file',
            attr: {
                accept: '.mp3',
                id: 'mp3-file-upload'
            }
        });
        logDebug(this.plugin.settings.test_mode, `fileInput: ${this.fileInput}`);

        new ButtonComponent(contentEl)
            .setButtonText('Submit')
            .onClick(async () => {
                logDebug(this.plugin.settings.test_mode, `fileInput: ${this.fileInput}`);
                const transcripts_folder = this.plugin.settings.transcriptsFolder;
                try {
                    await this.ensureFolder(this.plugin.settings.transcriptsFolder);
                } catch (error) {
                    new Notice(`ERROR! Could not access the folder ${transcripts_folder}.  Error Message: ${error.message}`);
                    return;
                }

                if (this.fileInput.files && this.fileInput.files.length > 0 && urlInput.getValue().trim() !== "") {
                    new Notice('Please use only one input method: either a URL or a file.');
                } else if (this.fileInput.files && this.fileInput.files.length > 0) {
                    const file = this.fileInput.files[0];
                    this.handleFileUpload(file, this.plugin.settings.test_mode);
                } else if (urlInput.getValue().trim() !== "") {
                    this.handleUrlInput(urlInput.getValue(), this.plugin.settings.test_mode);
                } else {
                    new Notice('Please enter a URL or select a file.');
                }
            });

        contentEl.createEl('p', { text: 'Click "Submit" after entering a URL or selecting a file.' });
    }

    onClose() {
        this.contentEl.empty();
    }

    private handleFileUpload(file: File, test_mode: boolean) {
        console.log(`File selected: ${file.name}`);
        if (isValidMP3(file.name, test_mode)) {
            if (this.fileInput.files && this.fileInput.files.length > 0) {
                const file = this.fileInput.files[0];
                const transcriberApiUrl = this.plugin.settings.transcriberApiUrl;
                processAudio(file, transcriberApiUrl, this.plugin.settings.sseUrl, this.plugin.settings.transcriptsFolder, this.plugin.settings.test_mode);
            }
        } else {
            new Notice('No file selected.');
        }
    }

    private handleUrlInput(url: string, test_mode: boolean) {
        console.log(`URL entered: ${url}`);
        if (isValidYouTubeUrl(url, test_mode)) {
            const transcriberApiUrl = this.plugin.settings.transcriberApiUrl;
            processAudio(url, transcriberApiUrl, this.plugin.settings.sseUrl, this.plugin.settings.transcriptsFolder, test_mode);
        } else {
            new Notice('Invalid YouTube URL.');
        }
    }
}
