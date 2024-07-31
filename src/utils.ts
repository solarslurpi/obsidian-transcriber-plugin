import {logger} from './logger';

import ytdl from 'ytdl-core';


export function isValidYouTubeUrl(url: string): boolean {
    // const videoRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(&[\w-]+)*$/;
    // // const playlistRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+$/;
    // const isValid = videoRegex.test(url); // || playlistRegex.test(url);
    const isValid =  ytdl.validateURL(url);
    logger.debug(`valid YouTube URL: ${isValid}`);
    return isValid;
};

export function isValidAudioFile(fileName: string): boolean {
    const validExtensions = ['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.flac', '.opus'];
    return validExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

export async function  ensureFolder(folderPath: string) {
    logger.debug(`utils.ensureFolder.folder path: ${folderPath}`);
    try {
        await this.app.vault.createFolder(folderPath);
        logger.debug("Transcripts folder created successfully.");
        return true;
    } catch (error) {
        if (error.message.includes("Folder already exists.")) {
            return true;
        } else {
            logger.error(`utils.ensureFolder.Failed to create transcripts folder: ${error}`);
            throw new Error(
                "Failed to create transcripts folder: " + error.message
            );
        }
    }
}
export type Frontmatter = {
    audio_source: string;
    title: string;
    tags: string;
    description: string;
    uploader_id: string;
    channel: string;
    upload_date: string;
    duration: string;
    download_time: string;
    transcription_time: string;
    audio_quality: string;
    [key: string]: string; // Index signature
}


type Metadata = {
  audio_input: {
    youtube_url: string | null;
    audio_filepath: string | null;
    audio_quality: string | null;
  };
  title: string;
  tags: string  | null;
  description: string | null;
  duration: string;
  channel: string | null;
  upload_date: string;
  uploader_id: string | null;
  download_time: string ;
  transcription_time: string;
};
export function createFrontmatter_object(metadata: Metadata): Frontmatter {
  const frontmatter: Frontmatter = {
    "audio_source": metadata.audio_input.youtube_url || metadata.audio_input.audio_filepath || "",
    "title": metadata.title,
    "tags": metadata.tags || "",
    "description": metadata.description || "",
    "uploader_id": metadata.uploader_id || "",
    "channel": metadata.channel || "",
    "upload_date": metadata.upload_date,
    "duration": metadata.duration,
    "download_time": metadata.download_time,
    "transcription_time": metadata.transcription_time,
    "audio_quality" : metadata.audio_input.audio_quality || "unknown",

  };

  return frontmatter;
}
export function addDurationToFrontmatter(frontmatter: string, duration: string): string {
  // Find the position before the closing ---\n
  const position = frontmatter.lastIndexOf('---\n');
  // Insert the duration property before the closing ---
  return frontmatter.slice(0, position) + `duration: ${duration}\n` + frontmatter.slice(position);
}
