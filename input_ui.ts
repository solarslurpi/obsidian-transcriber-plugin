import { App, Modal, Notice, TextComponent, ButtonComponent } from 'obsidian';
import TranscriberPlugin from "./main";
import { processAudio } from "./process_audio";
import { isValidMP3, isValidYouTubeUrl, logDebug } from './utils';

export class InputUI extends Modal {
    plugin: TranscriberPlugin;
    fileInput: HTMLInputElement;
    healthCheckUrl: string;

    constructor(app: App, plugin: TranscriberPlugin) {
        super(app);
        this.plugin = plugin;

        // Initialize the health check URL based on the transcriber API URL
        const transcriberUrl = this.plugin.settings.transcriberApiUrl;
        const baseUrl = transcriberUrl.split('/').slice(0, -2).join('/'); // Get the base URL
        this.healthCheckUrl = new URL('/api/v1/health', baseUrl).toString();
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
                // First thing - check if the FastAPI transcriber service is
                // available. If not, then display an error message and return.
                console.log("onClick--> About to check service availability");
                const isServiceAvailable = await this.checkServiceAvailability();
                if (!isServiceAvailable) {
                    console.log("OnClick--> service not available");
                    new Notice('ERROR! The FastAPI service is not available.');
                    return;
                }
                console.log("onClick --> service is available");
                // The FastAPI service is available.  Do some input checking and
                // then start downloading YouTube (if starting with a YouTube URL)
                // or uploading the file (if starting with an mp3 file)....
                this.handleClick(urlInput);
            });

        contentEl.createEl('p', { text: 'Click "Submit" after entering a URL or selecting a file.' });
    }

    onClose() {
        this.contentEl.empty();
    }

    private async handleClick(urlInput : TextComponent){
        logDebug(this.plugin.settings.test_mode, `fileInput: ${this.fileInput}`);
        if (this.fileInput.files && this.fileInput.files.length > 0) {
            console.log(`this.fileInput.files[0]: ${this.fileInput.files[0]}`);
        }

        const transcripts_folder = this.plugin.settings.transcriptsFolder;
        try {
            await this.ensureFolder(this.plugin.settings.transcriptsFolder);
        } catch (error) {
            new Notice(`ERROR! Could not access the folder ${transcripts_folder}.  Error Message: ${error.message}`);
            return;
        }
        if (this.fileInput.files && this.fileInput.files.length > 0 && urlInput.getValue().trim() !== "") {

            new Notice('Please use only one input method: either a URL or a file.');
        // Handle an mp3 file upload.
        } else if (this.fileInput.files && this.fileInput.files.length > 0) {
            const file = this.fileInput.files[0];
            await this.handleFileUpload(file, this.plugin.settings.test_mode);
        // Handle a YouTube url.
        } else if (urlInput.getValue().trim() !== "") {
            await this.handleUrlInput(urlInput.getValue(), this.plugin.settings.test_mode);
        } else {
            new Notice('Please enter a URL or select a file.');
        }
    }

	private async handleFileUpload(file: File, test_mode: boolean) {
		console.log(`-> handleFileUpload - File selected: ${file.name}`);
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
				console.log(`Error attempting to processAudio. ${error}`);
			}
		}
	}

	private async handleUrlInput(url: string, test_mode: boolean) {
		console.log(`URL entered: ${url}`);
		if (isValidYouTubeUrl(url, test_mode)) {
			const transcriberApiUrl = this.plugin.settings.transcriberApiUrl;
			await processAudio(
				url,
				transcriberApiUrl,
				this.plugin.settings.transcriptsFolder,
				test_mode,
				this.plugin.settings.audioQuality
			);
		} else {
			new Notice("Invalid YouTube URL.");
		}
	}
	async ensureFolder(folderPath: string) {
		console.log("--> ensureFolder");
		console.log("folder path: ", folderPath);
		try {
			await this.app.vault.createFolder(folderPath);
			console.log("Transcripts folder created successfully.");
			return true;
		} catch (error) {
			// If the error was folder already exists, that's ok.
			console.log("ERROR: ", error.message);
			if (error.message.includes("Folder already exists.")) {
				console.log("Folder already existed.");
				return true;
			} else {
				console.error("Failed to create transcripts folder:", error);
				throw new Error(
					"Failed to create transcripts folder: " + error.message
				);
			}
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

}
