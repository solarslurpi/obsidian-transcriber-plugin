// SettingsTab.ts
import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
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

        // Compute Type Setting
        new Setting(containerEl)
            .setName('Compute Type')
            .setDesc('Select the desired compute type')
            .addDropdown(dropdown => {
                dropdown.addOption('int8', 'int8')
                    .addOption('int8_float32', 'int8_float32')
                    .addOption('int8_float16', 'int8_float16')
                    .addOption('int8_bfloat16', 'int8_bfloat16')
                    .addOption('int16', 'int16')
                    .addOption('float16', 'float16')
                    .addOption('bfloat16', 'bfloat16')
                    .addOption('float32', 'float32')
                    .setValue(this.plugin.settings.computeType)
                    .onChange(async (value) => {
                        this.plugin.settings.computeType = value;
                        await this.plugin.saveSettings();
                    });
            });
        // Amount of transcript time to chunk the transcript into time-based chapters.
        new Setting(containerEl)
            .setName('Chapter Chunk Time')
            .setDesc('Used to determine the amount of time to chunk the transcript into chapters if there is no chapter metadata.')
            .addText(text => text
                .setValue(this.plugin.settings.chapterChunkTime.toFixed(1))
                .onChange(async (value) => {
                    const parsedValue = parseFloat(value.trim());
                    if (!isNaN(parsedValue)) {
                        this.plugin.settings.chapterChunkTime = parsedValue;
                        await this.plugin.saveSettings();
                    } else {
                        new Notice(`${value} is not a valid number. Please enter a valid number.`);
                    }
                }));

        // Log Level Setting
        new Setting(containerEl)
            .setName('Production')
            .setDesc('Sets the verbosity of logging.  Production logs only error messages to the console.  If off, debug to error messages are logged to the console and a app_debug.log file.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.production)
                .onChange(async (value) => {
                    this.plugin.settings.production = value;
                    await this.plugin.saveSettings();
                }));

    }
}