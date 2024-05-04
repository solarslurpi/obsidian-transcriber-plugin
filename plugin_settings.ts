// PluginSettings.ts
// Handle the settings data structure and default value.
export interface PluginSettings {
    transcriptsFolder: string;
    transcriberApiUrl: string;
    sseUrl: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    transcriptsFolder: 'Transcripts',
    transcriberApiUrl: 'https://127.0.0.1/api/v1/process_audio',
    sseUrl: 'https://127.0.0.1/api/v1/sse'
};
