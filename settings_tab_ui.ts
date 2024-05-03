// SettingsTab.ts
// Manage the settings ui.
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

        console.log("Displaying settings tab...");
        containerEl.createEl('h2', { text: 'Transcriber Settings' });

        new Setting(containerEl)
            .setName('Transcripts Folder')
            .setDesc('Specify the folder where transcriptions should be stored.')
            .addText(text => text
                .setValue(this.plugin.settings.transcriptsFolder)
                .onChange(async (value) => {
                    console.log("Updating transcripts folder setting...");
                    this.plugin.settings.transcriptsFolder = value.trim();
                    await this.plugin.saveSettings();
                    console.log("Transcripts folder updated to:", this.plugin.settings.transcriptsFolder);
                }));
    }
}
