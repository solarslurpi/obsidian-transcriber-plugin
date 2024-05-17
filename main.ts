// main.ts

import { Plugin, Notice } from 'obsidian';
import { InputUI } from './input_ui';
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
            callback: () => this.userInput()
        });
    }

    async loadSettings() {
        console.log("Loading settings...");
        this.settings = Object.assign({
            audioQuality: 'large',
        }, DEFAULT_SETTINGS, await this.loadData());
        console.log("Settings loaded:", this.settings);
    }

    async saveSettings() {
        console.log("Saving settings...");
        await this.saveData(this.settings);
    }
    async userInput(): Promise<string | null> {
        console.log("Prompting for user input...");
        return new Promise(resolve => {
            new InputUI(this.app, this).open();
        });
    }
    
}
