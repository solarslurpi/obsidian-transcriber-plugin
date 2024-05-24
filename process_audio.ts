// Import necessary functions and types
import { Notice, TFile } from 'obsidian';
import {logger} from './logger';

interface SSEState {
    chapters: string[];
    frontmatter: string;
    fullPath: string;
    numChapters: number;
    transcriptTime?: string;
    isClosed: boolean;
    isComplete: boolean;
}

// Overloads
export function processAudio(file: File, apiUrl: string, folderPath: string,  audioQuality: string): Promise<void>;
export function processAudio(url: string, apiUrl: string, folderPath: string, audioQuality: string): Promise<void>;

// Implementation
export async function processAudio(input: File | string, apiUrl: string, folderPath: string, audioQuality: string): Promise<void> {
    new Notice('Starting to process audio.');
    try {
        if (input instanceof File) {
            logger.debug(`Processing audio input (File): ${input.name} with endpoint URL: ${apiUrl}`);
            await processFile(input, apiUrl, folderPath, audioQuality);
        } else if (typeof input === 'string') {
            logger.debug(`Processing audio input (URL): ${input} with endpoint URL: ${apiUrl}`);
            await processUrl(input, apiUrl, folderPath, audioQuality);
        } else {
            throw new Error('Invalid input type');
        }
    } catch (error) {
        logger.error(`Error during transcription request: ${error}`);
        new Notice('Error in transcription request.');
    }
}

async function processFile(file: File, apiUrl: string, folderPath: string, audioQuality: string): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("audio_quality", audioQuality);

    logger.debug("Process File:  Sending POST with File attachment.");
    const response = await fetch(`${apiUrl}`, {
        method: 'POST',
        body: formData
    });

    await handleResponse(apiUrl, response, folderPath);
}

async function processUrl(url: string, apiUrl: string, folderPath: string, audioQuality: string): Promise<void> {
    const formData = new FormData();
    formData.append("youtube_url", url);
    formData.append("audio_quality", audioQuality);

    logger.debug("Process URL. Sending POST with URL.");
    const response = await fetch(`${apiUrl}`, {
        method: 'POST',
        body: formData
    });

    await handleResponse(apiUrl, response, folderPath);
}

async function handleResponse(apiUrl: string, response: Response, folderPath: string): Promise<void> {
    if (!response.ok) {
        logger.debug(`handleResponse: Response not ok: ${response}`);
        throw new Error('Network response was not ok');
    } else {
        logger.debug('Transcription request POST was successful.')
    }

    // Start SSE after successfully initiating the transcription process
    handleSSE(apiUrl, folderPath);
}

function handleSSE(apiUrl: string, folderPath: string): void {

    const sseUrl = apiUrl.replace("/process_audio", "/stream");
    const eventSource = new EventSource(`${sseUrl}`);
    logger.debug(`handleSSE: eventsource ${sseUrl} has been created.`)
    const state: SSEState = {
        chapters: [],
        frontmatter: '',
        fullPath: '',
        numChapters: 0,
        isClosed: false,
        isComplete: false
    };

    eventSource.onmessage = (event) => {
        if (state.isClosed) {
            logger.debug(`Received message after SSE is closed: ${event.data}`);
            return;
            }

        const data = JSON.parse(event.data);
        logger.debug(`----Received event data: ${event.data}`);

        if (data.status) {
            logger.debug(`Status: ${data.status}`);
            new Notice(data.status);
        }
        if (data.error) {
            eventSource.close();
            state.isClosed = true;
            logger.error(`Error: ${data.error}`);
            new Notice(data.error, 10000);
        }
        if (data.done) {
            eventSource.close();
            state.isClosed = true;
            state.isComplete = true;
            logger.debug('Transcription process finished.');
            saveTranscript(state);
            new Notice('Transcription process finished.');
        }
        if (data.filename) {
            const transcript_filename = `${data.filename}.md`;
            state.fullPath = `${folderPath}/${transcript_filename}`;
            logger.debug(`Transcript folder: ${state.fullPath}`);
        }
        if (data.frontmatter) {
            state.frontmatter = data.frontmatter;
            logger.debug(`Frontmatter: ${state.frontmatter}`);
        }
        if (data.num_chapters) {
            state.numChapters = data.num_chapters;
            logger.debug(`Number of chapters: ${data.num_chapters}`);
        }
        if (data.chapter) {
            state.chapters.push(data.chapter);
            logger.debug(`Chapter: ${data.chapter.substring(0, 10).replace(/\n/g, '')}`);

        }
    };
}

function saveTranscript(state: SSEState) {
    if (!state.fullPath) {
        new Notice('A transcript file path was not provided by the server. Please report this issue to the plugin author.', 10000);
        logger.error('A transcript file path was not provided by the server.');
        return;
    }
    new Notice(`Saving transcript to ${state.fullPath}.`);
    logger.debug(`Saving transcript to ${state.fullPath}.`);
    try {
        let file = this.app.vault.getAbstractFileByPath(state.fullPath) as TFile;
        let content = '';

        if (state.frontmatter) {
            content += `${state.frontmatter}\n\n`;
        }

        if (state.chapters) {
            content += state.chapters.join('\n');
            content += '\n';
        } else {
            content += "No content available.";
        }

        if (file) {
            this.app.vault.modify(file, content);
        } else {
            this.app.vault.create(state.fullPath, content);
        }
    } catch (error) {
        logger.error(`Error saving transcript: ${error.message}`);
    }
}
