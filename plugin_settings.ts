// PluginSettings.ts
// Handle the settings data structure and default value.
export interface PluginSettings {
    transcriptsFolder: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    transcriptsFolder: 'Transcripts'
};
