import {logger} from './logger';

export function isValidYouTubeUrl(url: string): boolean {
    const videoRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+(&[\w-]+)*$/;
    const playlistRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+$/;
    const isValid = videoRegex.test(url) || playlistRegex.test(url);
    logger.debug(`valid YouTube URL: ${isValid}`);
    return isValid;
}

export function isValidMP3(filePath: string): boolean {
    const isValid = filePath.endsWith('.mp3');
        if (isValid) {
            logger.debug(`valid mp3 filepath`);
        } else {
            logger.debug(`Not a valid mp3 filepath`);
        }
    return isValid;
}

export async function  ensureFolder(folderPath: string) {
    logger.debug("--> ensureFolder");
    logger.debug(`folder path: ${folderPath}`);
    try {
        await this.app.vault.createFolder(folderPath);
        logger.debug("Transcripts folder created successfully.");
        return true;
    } catch (error) {
        if (error.message.includes("Folder already exists.")) {
            return true;
        } else {
            logger.error(`Failed to create transcripts folder: ${error}`);
            throw new Error(
                "Failed to create transcripts folder: " + error.message
            );
        }
    }
}