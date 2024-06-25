import { Plugin } from 'obsidian';
import { InputForm } from './input_form';
import { PluginSettings, DEFAULT_SETTINGS } from './plugin_settings';
import { SettingsTab } from './settings_tab_ui';
import { initializeLogger, logger } from './logger';
import { ensureFolder } from './utils';

export default class TranscriberPlugin extends Plugin {
    settings: PluginSettings;

    async onload() {
        // Load Settings
        await this.loadSettings();
        logger.debug('obsidian-transcriber: Settings loaded successfully. ')

        // Initialize logging to the console as well as an obsidian note.
        const logDir = this.settings.logDir;  // Use the log directory from settings
        // Setup logger with the level from settings
        const logLevel = this.settings.logLevel || 'info';
        await initializeLogger(this.app.vault, logDir, 'transcriber_log.md', logLevel);
        logger.debug('obsidian-transcriber: Logger loaded successfully. ')
        // Add settings tab and commands
        this.addSettingTab(new SettingsTab(this.app, this));
        // Add ribbon icon
        this.addRibbonIcon('flower', 'Transcribe Audio', () => this.userInput());
        this.addCommand({
            id: 'transcribe_audio',
            name: 'Transcribe Audio',
            callback: () => this.userInput()
        });
        logger.debug('obsidian-transcriber: Plugin loaded successfully.');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // Check on the folders that will be used.
        await ensureFolder(this.settings.transcriptsFolder);
        await ensureFolder(this.settings.logDir);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        logger.debug('main.saveSettings: Settings have been saved.')
    }

    async userInput(): Promise<void> {
        logger.debug("main.userInput: start");
        new InputForm(this.app, this, logger).open();
    }
}
