// PluginSettings.ts
// Handle the settings data structure and default value.
export interface PluginSettings {
    transcriptsFolder: string;
    transcriberApiUrl: string;
    sseUrl: string;
    test_mode: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    transcriptsFolder: 'Transcripts',
    transcriberApiUrl: 'http://127.0.0.1:8000/api/v1/process_audio',
    sseUrl: 'http://127.0.0.1:8000/api/v1/sse',
    test_mode: true
};
