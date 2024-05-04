// SettingsTab.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import TranscriberPlugin from './main';

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

        // Endpoint URL Setting
        new Setting(containerEl)
            .setName('API Endpoint URL')
            .setDesc('Specify the URL endpoint for transcription services.')
            .addText(text => text
                .setValue(this.plugin.settings.endpointUrl)
                .onChange(async (value) => {
                    this.plugin.settings.endpointUrl = value.trim();
                    await this.plugin.saveSettings();
                }));
    }
}
