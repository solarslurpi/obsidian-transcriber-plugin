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

        // API Endpoint URL Setting
        new Setting(containerEl)
            .setName('API Endpoint URL')
            .setDesc('Specify the URL endpoint for transcription services.')
            .addText(text => text
                .setValue(this.plugin.settings.transcriberApiUrl)
                .onChange(async (value) => {
                    this.plugin.settings.transcriberApiUrl = value.trim();
                    await this.plugin.saveSettings();
                }));

        // SSE URL Setting
        new Setting(containerEl)
            .setName('SSE URL')
            .setDesc('Specify the URL endpoint for server-sent events.')
            .addText(text => text
                .setValue(this.plugin.settings.sseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.sseUrl = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Audio Quality Setting
        new Setting(containerEl)
            .setName('Audio Quality')
            .setDesc('Select the desired audio quality')
            .addDropdown(dropdown => {
                dropdown.addOption('small', 'small')
                        .addOption('medium', 'medium')
                        .addOption('large', 'large')
                        .setValue(this.plugin.settings.audioQuality)
                        .onChange(async (value) => {
                            this.plugin.settings.audioQuality = value;
                            await this.plugin.saveSettings();
                        });
            });

        // Toggle for test mode
        new Setting(containerEl)
            .setName('Test mode')
            .setDesc('Enable or disable test mode.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.test_mode)
                .onChange(async (value) => {
                    this.plugin.settings.test_mode = value;
                    await this.plugin.saveSettings();
                }));
    }
}
