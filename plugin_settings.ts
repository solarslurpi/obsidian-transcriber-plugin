// PluginSettings.ts
// Handle the settings data structure and default value.
export interface PluginSettings {
    transcriptsFolder: string;
    endpointUrl: string; // Adding new setting for endpoint URL
}

export const DEFAULT_SETTINGS: PluginSettings = {
    transcriptsFolder: 'Transcripts',
    endpointUrl: 'https://default-endpoint-url.com/api' // Provide a sensible default
};
