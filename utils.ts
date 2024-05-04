import { Plugin } from 'obsidian';

// Assuming a simple environment check - adjust as necessary for your setup
export const isDevelopmentMode = /localhost|127\.0\.0\.1/.test(window.location.host);

export function isValidYouTubeUrl(url: string): boolean {
    const videoRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+(&[\w-]+)*$/;
    const playlistRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+$/;
    const isValid = videoRegex.test(url) || playlistRegex.test(url);
    logDebug(`valid YouTube URl: ${isValid}`)
    return isValid;
}

export function isValidMP3(filePath: string): boolean {
    if (!filePath.endsWith('.mp3')) {
        logDebug(`Not a valid mp3 filepath`);
        return false;
    }
    logDebug(`valid mp3 filepath`)
    // const mimeType = lookup(filePath);
    return true;
}

export function logDebug(context: string): void {
    // if (isDevelopmentMode) {
    console.log(`Debug - ${context}`);
    // }
}
