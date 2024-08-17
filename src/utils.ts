// Note: Cannot use logging yet, as the plugin is not yet initialized.

import ytdl from 'ytdl-core';



export function isValidYouTubeUrl(url: string): boolean {
    const videoRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(&[\w-]+)*$/;
    const isValidRegex = videoRegex.test(url);
    // failed on https://www.youtube.com/live/TkNTuFF2t-c, so added in the regex.  There is duplicate, but just to make sure...
    const isValidYtdl = ytdl.validateURL(url);
    const isValid = isValidRegex || isValidYtdl;
    if (!isValid) {
        console.error(`Invalid YouTube URL: ${url}`);
    }
    return isValid;
}

export function isValidAudioFile(fileName: string): boolean {
    const validExtensions = ['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.flac', '.opus'];
    return validExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

export async function  ensureFolder(folderPath: string) {
    try {
        await this.app.vault.createFolder(folderPath);
        return true;
    } catch (error) {
        if (error.message.includes("Folder already exists.")) {
            return true;
        } else {
            console.error(`utils.ensureFolder.Failed to create transcripts folder: ${error}`);
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
    compute_type: string;
    [key: string]: string; // Index signature
}


type Metadata = {
  audio_input: {
    youtube_url: string | null;
    audio_filename: string | null;
    audio_quality: string | null;
    compute_type: string | null;
    chapter_chunk_time: number | null;
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
    "audio_source": metadata.audio_input.youtube_url || metadata.audio_input.audio_filename || "",
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
    "compute_type": metadata.audio_input.compute_type || "unknown"

  };

  return frontmatter;
}
export function addDurationToFrontmatter(frontmatter: string, duration: string): string {
  // Find the position before the closing ---\n
  const position = frontmatter.lastIndexOf('---\n');
  // Insert the duration property before the closing ---
  return frontmatter.slice(0, position) + `duration: ${duration}\n` + frontmatter.slice(position);
}
