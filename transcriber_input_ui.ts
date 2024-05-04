import { App, Modal, Notice, TextComponent, ButtonComponent } from 'obsidian';

import TranscriberPlugin from "./main"
import {processAudio} from "./process_audio"

import { isValidYouTubeUrl, isValidMP3, logDebug } from './utils';  // Assuming validators are defined separately

export class TranscriberInputUI extends Modal {
    constructor(app: App, plugin: TranscriberPlugin) {
        super(app);
        this.plugin = plugin;
    }
    plugin: TranscriberPlugin;



    onOpen() {
        logDebug(`Opening the TranscriberInputUI modal dialog.`);
        console.log(`Endpoint URL: ${this.plugin.settings.endpointUrl}`);
        let { contentEl } = this;
        contentEl.createEl('h3', { text: 'Enter MP3 file path or YouTube URL:' });

        let input = new TextComponent(contentEl)
            .setPlaceholder("Enter path or URL here...");

        new ButtonComponent(contentEl)
            .setButtonText('Submit')
            .onClick(() => this.handleSubmit(input.getValue()));
    }

    onClose() {
        logDebug(`Closing the TranscriberInputUI modal dialog.`);
        this.contentEl.empty();
    }

    private handleSubmit(inputValue: string) {
        if (isValidMP3(inputValue) || isValidYouTubeUrl(inputValue)) {
            logDebug(`eiher valid mp3 or youtube url. On to processing audio.`)
            processAudio(inputValue, this.plugin.settings.endpointUrl // Ensure you have this endpointUrl in your plugin settings
            );
            this.close();
        } else {
            logDebug(`Invalid input received.`);
            new Notice('Please enter a valid MP3 file path or YouTube URL.');
        }
    }
}
