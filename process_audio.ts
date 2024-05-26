import { Notice, TFile } from 'obsidian';
import { logger } from './logger';

interface SSEState {
    chapters: string[];
    frontmatter: string;
    fullPath: string;
    numChapters: number;
    chapterCounter: number,
    transcriptTime?: string;
    isClosed: boolean;
}

// Overloads
export function processAudio(file: File, apiUrl: string, folderPath: string, audioQuality: string): Promise<void>;
export function processAudio(url: string, apiUrl: string, folderPath: string, audioQuality: string): Promise<void>;

// Implementation
export async function processAudio(input: File | string, apiUrl: string, folderPath: string, audioQuality: string): Promise<void> {
    new Notice('Starting to process audio.');
    try {
        const formData = createFormData(input, audioQuality);
        const response = await sendTranscriptionRequest(apiUrl, formData);
        await handleResponse(apiUrl, response, folderPath);
    } catch (error) {
        logger.error(`process_audio.processAudio: Error during transcription request: ${error}`);
        new Notice(`Error during transcription request: ${error}`, 10000);
    }
}

function createFormData(input: File | string, audioQuality: string): FormData {
    const formData = new FormData();
    if (input instanceof File) {
        logger.debug(`process_audio.createFormData: Processing audio input (File): ${input.name}`);
        formData.append("file", input);
    } else if (typeof input === 'string') {
        logger.debug(`process_audio.createFormData: Processing audio input (URL): ${input}`);
        formData.append("youtube_url", input);
    } else {
        throw new Error('Invalid input type');
    }
    formData.append("audio_quality", audioQuality);
    return formData;
}

async function sendTranscriptionRequest(apiUrl: string, formData: FormData): Promise<Response> {
    logger.debug("process_audio.sendTranscriptionRequest: Sending POST request for transcription.");
    const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
    });
    return response;
}

async function handleResponse(apiUrl: string, response: Response, folderPath: string): Promise<void> {
    if (!response.ok) {
        const errorMessage = `process_audio.handleResponse: Network response was not ok: ${response.statusText}`;
        logger.error(errorMessage);
        new Notice(errorMessage, 10000);
        throw new Error('Network response was not ok');
    }
    const feedback = await response.json()
    logger.debug(`process_audio.handleResponse: Post response: ${feedback.message}`);
    handleSSE(apiUrl, folderPath);
}

function handleSSE(apiUrl: string, folderPath: string): void {
    const sseUrl = apiUrl.replace("/process_audio", "/stream");
    const eventSource = new EventSource(sseUrl);
    logger.debug(`process_audio.handleSSE: EventSource created at ${sseUrl}`);

    const state: SSEState = {
        chapters: [],
        frontmatter: '',
        fullPath: '',
        numChapters: 0,
        chapterCounter: 0,
        isClosed: false
    };

    eventSource.onerror = (event: MessageEvent) => {
        logger.error(`process_audio.handleSSE: EventSource encountered an error.`);
        closeEventSource(eventSource, state);
        new Notice('Error occurred. Stopping SSE.', 10000);
    };

    eventSource.onmessage = (event) => handleSSEMessage(event, eventSource, state, folderPath);
}

function handleSSEMessage(event: MessageEvent, eventSource: EventSource, state: SSEState, folderPath: string): void {
    if (state.isClosed) {
        logger.debug(`process_audio.handleSSEMessage: Received message after SSE is closed: ${event.data}`);
        return;
    }

    const data = JSON.parse(event.data);

    if (data.status) {
        logger.debug(`process_audio.handleSSEMessage: Status: ${data.status}`);
        new Notice(data.status);
    }

    if (data.done) {
        logger.debug('process_audio.handleSSEMessage: Transcription process finished.');
        saveTranscript(state, folderPath);
        closeEventSource(eventSource, state);
        new Notice('Transcription process finished.');

    }
    updateState(data, state, folderPath);
}

function closeEventSource(eventSource: EventSource, state: SSEState): void {
    if (!state.isClosed) {
        eventSource.close();
        resetSSEState(state, true);
        logger.debug('process_audio.closeEventSource: EventSource closed.');
    }
}

function resetSSEState(state: SSEState, isClosed: boolean): void {
    state.chapters = [];
    state.frontmatter = '';
    state.fullPath = '';
    state.numChapters = 0;
    state.chapterCounter = 0;
    state.isClosed = isClosed;
}
function updateState(data: any, state: SSEState, folderPath: string): void {
    logger.debug(`data: ${data}`)
    if (data.basefilename) {
        state.fullPath = `${folderPath}/${data.basefilename}.md`;
        logger.debug(`process_audio.updateState: Transcript path set: ${state.fullPath}`);
        new Notice(`Transcript path set: ${state.fullPath}`);
    }
    if (data.frontmatter) {
        state.frontmatter = data.frontmatter;
        logger.debug(`process_audio.updateState: Frontmatter set.`);
        new Notice(`Finished Frontmatter`);
    }
    if (data.num_chapters) {
        state.numChapters = data.num_chapters;
        logger.debug(`process_audio.updateState: Number of chapters: ${data.num_chapters}`);
        new Notice(`Processing Chapters. Total number: ${data.num_chapters}`)
    }
    if (data.chapter) {
        state.chapterCounter += 1;
        state.chapters.push(data.chapter);
        // const chapter = data.chapter.substring(0, 10).replace(/\n/g, '');
        logger.debug(`process_audio.updateState: Chapter ${state.chapterCounter} added to transcript.`);
        new Notice(`Chapter ${state.chapterCounter} added to transcript.`);
    }
}

function saveTranscript(state: SSEState, folderPath: string): void {
    if (!state.fullPath) {
        const errorMessage = 'A transcript file path was not provided by the server. Please report this issue to the plugin author.';
        logger.error(`process_audio.saveTranscript: ${errorMessage}`);
        new Notice(errorMessage, 10000);
        return;
    }

    logger.debug(`process_audio.saveTranscript: Saving transcript to ${state.fullPath}`);
    new Notice(`Saving transcript to ${state.fullPath}`)
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

        new Notice(`Transcript saved to ${state.fullPath}`);
    } catch (error) {
        logger.error(`process_audio.saveTranscript: Error saving transcript: ${error.message}`);
        new Notice(`Error saving transcript: ${error.message}`, 10000);
    }
}
