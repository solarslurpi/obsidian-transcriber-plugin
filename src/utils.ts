import {logger} from './logger';
import yaml from 'js-yaml';

export function isValidYouTubeUrl(url: string): boolean {
    const videoRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(&[\w-]+)*$/;
    // const playlistRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+$/;
    const isValid = videoRegex.test(url); // || playlistRegex.test(url);
    logger.debug(`valid YouTube URL: ${isValid}`);
    return isValid;
}

export function isValidMP3(filePath: string): boolean {
    const isValid = filePath.endsWith('.mp3');
    return isValid;
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

type Metadata = {
  youtube_url: string | null;
  title: string;
  tags: string[] | null;
  description: string | null;
  duration: string;
  channel: string | null;
  upload_date: string;
  uploader_id: string | null;
  download_time: number | null;
  transcription_time: number | null;
  audio_quality: string | null;

};
export function createFrontmatter(metadata: Metadata): string {
  const frontmatter: { [key: string]: any } = {
    "youtube_url": metadata.youtube_url || "",
    "title": metadata.title,
    "tags": metadata.tags || [],
    "description": metadata.description || "",
    "uploader_id": metadata.uploader_id || "",
    "channel": metadata.channel || "",
    "upload_date": metadata.upload_date,
    "duration": metadata.duration,
    "download_time": metadata.download_time || 0,
    "transcription_time": metadata.transcription_time || 0,
    "audio_quality" : metadata.audio_quality || "unknown",

  };

// Convert the frontmatter object to a YAML string
  const frontmatterString = yaml.dump(frontmatter);

return `---\n${frontmatterString}---\n`;
}
export function addDurationToFrontmatter(frontmatter: string, duration: string): string {
  // Find the position before the closing ---\n
  const position = frontmatter.lastIndexOf('---\n');
  // Insert the duration property before the closing ---
  return frontmatter.slice(0, position) + `duration: ${duration}\n` + frontmatter.slice(position);
}
