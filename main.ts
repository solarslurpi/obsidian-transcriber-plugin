// main.ts

import { Plugin, Notice } from 'obsidian';
import { TranscriberInputUI } from './transcriber_input_ui';
import { PluginSettings, DEFAULT_SETTINGS } from '././plugin_settings';
import { SettingsTab } from './settings_tab_ui';



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
    }

    async promptForInput(): Promise<string | null> {
        console.log("Prompting for user input...");
        return new Promise(resolve => {
            new TranscriberInputUI(this.app, this).open();
        });
    }
}
