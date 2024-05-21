import { Plugin } from 'obsidian';
import { InputForm } from './input_form';
import { PluginSettings, DEFAULT_SETTINGS } from './plugin_settings';
import { SettingsTab } from './settings_tab_ui';
import { initializeLogger, logger } from './logger';
import { ensureFolder } from './utils';

export default class TranscriberPlugin extends Plugin {
    settings: PluginSettings;

    async onload() {
        // Load plugin settings before initializing the logger
        await this.loadSettings();
        console.log('Settings have been loaded. On to setting up logging file.')

        const logDir = this.settings.logDir;  // Use the log directory from settings
        console.log(`Log directory: ${logDir}`);
        await initializeLogger(this.app.vault, logDir, 'transcriber_log.md');  // Initialize logger with the file path
        // Add settings tab and commands
        this.addSettingTab(new SettingsTab(this.app, this));
        this.addCommand({
            id: 'transcribe_audio',
            name: 'Transcribe Audio',
            callback: () => this.userInput()
        });

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // Check on the folders that will be used.
        await ensureFolder(this.settings.transcriptsFolder);
        await ensureFolder(this.settings.logDir);
        const now = new Date();
        const formattedDate = now.toISOString();
        logger.info(`Starting Run at ${formattedDate}`);
        logger.debug('hello');
        logger.debug('onload() has completed.');
    }

    async saveSettings() {
        logger.debug("Saving settings...");
        await this.saveData(this.settings);
    }

    async userInput(): Promise<void> {
        logger.debug("Prompting for user input...");
        new InputForm(this.app, this, logger).open();
    }
}
