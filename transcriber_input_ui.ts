import { Modal, Setting, App, ButtonComponent } from 'obsidian';

export class TranscriptionInputUI extends Modal {
    promiseResolve: (value: string | null) => void;

    constructor(app: App, resolve: (value: string | null) => void) {
        super(app);
        this.promiseResolve = resolve;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Enter YouTube URL, MP3 URL, or MP3 File Path' });

        let inputField: HTMLInputElement;

        new Setting(contentEl)
            .setName('Input')
            .addText(text => {
                text.setPlaceholder('https://youtube.com/watch?v=..., http://example.com/audio.mp3, or /path/to/file.mp3');
                inputField = text.inputEl; // Store input element reference
                text.onChange((value) => console.log('Current input: ' + value)); // Log input changes for debugging
            });

        new ButtonComponent(contentEl)
            .setButtonText('Submit')
            .onClick(() => {
                if (inputField.value) {
                    console.log('Submitting input: ' + inputField.value); // Log final input
                    this.promiseResolve(inputField.value.trim());
                    this.close();
                } else {
                    console.log('No input to submit'); // Log empty submission
                    this.promiseResolve(null);
                    this.close();
                }
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
