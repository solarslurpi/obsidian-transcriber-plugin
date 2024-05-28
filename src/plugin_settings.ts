// PluginSettings.ts
// Handle the settings data structure and default value.
export interface PluginSettings {
    transcriptsFolder: string;
    transcriberApiUrl: string;
    logDir: string;
    audioQuality:string;
    logLevel:string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    transcriptsFolder: 'transcripts',
    transcriberApiUrl: 'http://127.0.0.1:8000/api/v1/process_audio',
    logDir: '_logs',
    audioQuality: 'medium',
    logLevel: 'debug'
};
