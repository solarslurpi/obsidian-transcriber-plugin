// SettingsTab.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import TranscriberPlugin from './main';
import {logger} from './logger'

export class SettingsTab extends PluginSettingTab {
    plugin: TranscriberPlugin;

    constructor(app: App, plugin: TranscriberPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Transcripts Folder Setting
        new Setting(containerEl)
            .setName('Transcripts Folder')
            .setDesc('Specify the folder where transcriptions should be stored.')
            .addText(text => text
                .setValue(this.plugin.settings.transcriptsFolder)
                .onChange(async (value) => {
                    this.plugin.settings.transcriptsFolder = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Obsidian Transcriber Service Endpoint URL Setting
        new Setting(containerEl)
            .setName('Obsidian Transcriber Service Endpoint URL')
            .setDesc('Specify the URL endpoint for transcription services.')
            .addText(text => text
                .setValue(this.plugin.settings.transcriberApiUrl)
                .onChange(async (value) => {
                    this.plugin.settings.transcriberApiUrl = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Audio Quality Setting
        new Setting(containerEl)
            .setName('Audio Quality')
            .setDesc('Select the desired audio quality')
            .addDropdown(dropdown => {
                dropdown.addOption('tiny', 'tiny')
                        .addOption('small', 'small')
                        .addOption('medium', 'medium')
                        .addOption('large', 'large')
                        .setValue(this.plugin.settings.audioQuality)
                        .onChange(async (value) => {
                            this.plugin.settings.audioQuality = value;
                            await this.plugin.saveSettings();
                        });
            });

        // In your settings tab
        new Setting(containerEl)
            .setName('Log Level')
            .setDesc('Set the log level for the plugin')
            .addDropdown(dropdown => dropdown
                .addOption('error', 'Error')
                .addOption('warn', 'Warning')
                .addOption('info', 'Info')
                .addOption('http', 'HTTP')
                .addOption('verbose', 'Verbose')
                .addOption('debug', 'Debug')
                .addOption('silly', 'Silly')
                .setValue(this.plugin.settings.logLevel || 'info')
                .onChange(async (value) => {
                    logger.level = value
                    this.plugin.settings.logLevel = value;
                    await this.plugin.saveSettings();
                }));



    }
}
