import { Plugin } from 'obsidian';
import { InputForm } from './input_form';
import { PluginSettings, DEFAULT_SETTINGS } from './plugin_settings';
import { SettingsTab } from './settings_tab_ui';
import { initializeLogger } from "./logger";
import { ensureFolder } from './utils';

export default class TranscriberPlugin extends Plugin {
    settings: PluginSettings;
    logger: any;
    submitButton: HTMLButtonElement;
    cancelButton: HTMLButtonElement;
    processing: boolean = false;



    async onload() {

        // Load Settings
        await this.loadSettings();
        this.logger = initializeLogger(this.settings.debug);
        this.logger.debug('obsidian-transcriber: Logger loaded successfully.');

        // Add UI features
        // Add settings tab and commands
        this.addSettingTab(new SettingsTab(this.app, this));
        // Add ribbon icon
        this.addRibbonIcon('flower', 'Transcribe Audio', () => this.userInput());
        this.addCommand({
            id: 'transcribe_audio',
            name: 'Transcribe Audio',
            callback: () => this.userInput()
        });
        this.logger.debug('obsidian-transcriber: Plugin loaded successfully.');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // Check on the folders that will be used.
        await ensureFolder(this.settings.transcriptsFolder);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.logger.debug('main.saveSettings: Settings have been saved.');
    }

    async userInput(): Promise<void> {
        this.logger.debug("main.userInput: start");
        new InputForm(this.app, this, this.logger).open();
    }
}