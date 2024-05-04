// main.ts
// Main entry point for the plug in.  Handles user input, settings, and managing workflow.
import { Plugin, Notice } from 'obsidian';
import { TranscriptionInputUI } from './transcriber_input_ui';
import { PluginSettings, DEFAULT_SETTINGS } from '././plugin_settings';
import { SettingsTab } from './settings_tab_ui';
import { processAudio} from './process_audio';

export default class TranscriberPlugin extends Plugin {
    settings: PluginSettings;

    async onload() {
        console.log("Loading Transcriber Plugin");
        await this.loadSettings();
        this.addSettingTab(new SettingsTab(this.app, this));

        this.addCommand({
            id: 'transcribe_audio',
            name: 'Transcribe Audio',
            callback: () => this.handleAudioInput()
        });
    }

    async loadSettings() {
        console.log("Loading settings...");
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        console.log("Settings loaded:", this.settings);
    }

    async saveSettings() {
        console.log("Saving settings...");
        await this.saveData(this.settings);
    }

    async handleAudioInput() {
        console.log("Handling audio input...");
        const userInput = await this.promptForInput();
        if (!userInput) {
            new Notice('No input provided.');
            console.log("No user input provided.");
            return;
        }
        console.log("User input received:", userInput);
        try {
            const endpointUrl = this.settings.endpointUrl;
            console.log("endpoint url in settings: ", endpointUrl);
            await processAudio(userInput, endpointUrl);
        } catch (error) {
            console.error("Failed to access settings:", error);
        }
    }

    async promptForInput(): Promise<string | null> {
        console.log("Prompting for user input...");
        return new Promise(resolve => {
            new TranscriptionInputUI(this.app, resolve).open();
        });
    }
}
