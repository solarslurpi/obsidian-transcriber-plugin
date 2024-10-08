// PluginSettings.ts
// Handle the settings data structure and default value.
export interface PluginSettings {
    transcriptsFolder: string;
    transcriberApiUrl: string;
    audioQuality:string;
    computeType:string;
    chapterChunkTime:number;
    debug:boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    transcriptsFolder: 'transcripts',
    transcriberApiUrl: 'http://127.0.0.1:8081/api/v1/process_audio',
    audioQuality: 'small',
    computeType: 'int8',
    chapterChunkTime: 10,
    debug: false
};
