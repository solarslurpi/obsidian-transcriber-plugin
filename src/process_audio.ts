import yaml from 'js-yaml';
import ReconnectingEventSource from 'reconnecting-eventsource';


import { Notice, TFile } from 'obsidian';
import { logger } from './logger';


interface SSEState {
    chapters: string[];
    frontmatter: string;
    noteName: string;
    numChapters: number;
    transcriptTime?: string;
    lastNotice?: string;

}


let eventSource: EventSource ;
let noticeIntervalID: ReturnType<typeof setInterval> ;

// Overloads for the function allow processing either an UploadFile or a Youtube Url.
export async function processAudio(file: File, apiUrl: string, folderPath: string, audioQuality: string): Promise<void>;
export async function processAudio(url: string, apiUrl: string, folderPath: string, audioQuality: string): Promise<void>;

// Implementation
export async function processAudio(input: File | string, apiUrl: string, folderPath: string, audioQuality: string): Promise<void> {
    new Notice('Starting to process audio.');
    try {
        const formData = createFormData(input, audioQuality);
        // Initialize the SSE connection before sending the POST to capture all SSE events.
        // initSSE sets it up so that SSE events are handled by handleSSE_event.
        handleSSE(apiUrl, folderPath);
        const response = await sendTranscriptionRequest(apiUrl, formData);
        // Check out what the response said.
        await handleResponse(response);
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

async function handleResponse(response: Response): Promise<void> {
    if (!response.ok) {
        const errorMessage = `process_audio.handleResponse: Network response was not ok: ${response.statusText}`;
        logger.error(errorMessage);
        new Notice(errorMessage, 5000);
        throw new Error('Network response was not ok.  Please try again.');
    }

    const feedback = await response.json()
    logger.debug(`process_audio.handleResponse: Post response: ${feedback.status}`);
}

function handleSSE(apiUrl: string, transcriptsFolder: string): void {
    const state: SSEState = {
        chapters: [],
        frontmatter: '',
        noteName: '',
        numChapters: 0,
        transcriptTime: '',
        lastNotice: '',
    };
    const sseUrl = apiUrl.replace("/process_audio", "/sse");
    eventSource = new ReconnectingEventSource(sseUrl);
    logger.debug(`process_audio.handleSSE: ReconnectingEventSource created at ${sseUrl}`);
    noticeIntervalID = setInterval(() => {
        if (state.lastNotice) {
            new Notice(state.lastNotice);
            state.lastNotice = '';
        }
    }, 5000);

        // Listen for "status" events
    eventSource.addEventListener("status", (event) => {
        // The incoming status message sets the lastNotice in the state so that when the interval between status messages fires, the last status message is shown.
        state.lastNotice = event.data;
        logger.debug(`process_audio.handleSSEMessage: Received a status message: ${event.data}`);
    });

    eventSource.addEventListener("data", (event) => {
        handleContentEvent(event, state, transcriptsFolder);
    });

    // Handle open connection
    eventSource.onopen = (event) => {
        console.log("SSE connection opened.");
    };


}

function handleContentEvent(event: MessageEvent, state: SSEState, transcriptsFolder: string ): void {
    try{
        logger.debug(`process_audio.handleSSEMessage: Received a data message. ${event.data}`);
        const data = JSON.parse(event.data);
        console.log(event.data);
        if (data.metadata) {
            console.log(`data.metadata: ${data.metadata}`);
            // pull out the title and make that the name of the Obsidian note.
            try {
                if (data.metadata.title) {
                    state.noteName = data.metadata.title;
                    logger.debug(`process_audio.handleSSEMessage: Note name is set to ${state.noteName}`);
                    new Notice(`Processing ${state.noteName}`);
                }
                // wrapp the metadata and save it as the frontmatter.

                let frontmatterYaml = '---\n';
                for (const [key, value] of Object.entries(data.metadata)) {
                    if (key === "chapters_metadata") continue; // Skip chapters_metadata
                    frontmatterYaml += `${key}: ${value !== null ? value : '""'}\n`;
                    }
                frontmatterYaml += '---';
                logger.debug(`process_audio.handleSSEMessage: Frontmatter: ${frontmatterYaml}`);
                state.frontmatter = `---\n${frontmatterYaml}---\n`;
                new Notice("processed metadata");
            } catch(error) {
                logger.error(`process_audio.handleSSEMessage: Error processing metadata: ${error.message}`)
                new Notice(`Error processing metadata: ${error.message}`, 10000);
            }
        }
        if (data.num_chapters) {
            console.log(`num chapters: ${data.num_chapters}`);
            try{
                state.numChapters = data.num_chapters;
                logger.debug(`process_audio.handleSSEMessage: Number of chapters: ${data.num_chapters}`);
                new Notice(`Processing ${state.numChapters} chapters`);
            } catch(error) {
                logger.error(`process_audio.handleSSEMessage: Error processing number of chapters: ${error.message}`)
                new Notice(`Error processing number of chapters: ${error.message}`, 10000);
            }
        }

        if (data.chapter) {
            try{
                state.chapters.push(data.chapter);
                logger.debug(`process_audio.handleSSEMessage: Added chapter to chapters list. The title is: ${data.chapter.chapter_metadata.title}. The start tiem is: ${data.chapter.chapter_metadata.start_time}. The end time is: ${data.chapter.chapter_metadata.end_time}`);

            } catch(error) {
                logger.error(`process_audio.handleSSEMessage: Error padding chapter to chapters list: ${error.message}`)
                new Notice(`Error processing number of chapters: ${error.message}`, 10000);
            }
        }

        if (data.transcription_time) {
            // This is the last message in the transcription sequence. Time to save the transcript.
            logger.debug('process_audio.handleSSEMessage: Transcription process finished.');
            saveTranscript(state, transcriptsFolder);
            closeEventSource(eventSource, state);
            clearInterval(noticeIntervalID)
        }
    }catch (error) {
        logger.error(`process_audio.handleSSEMessage: Error processing metadata: ${error.message}`);
        new Notice(`Error processing metadata: ${error.message}`);

    }
}

function closeEventSource(eventSource: EventSource, state: SSEState): void {
    eventSource.close();
    resetSSEState(state, true);
    logger.debug('process_audio.closeEventSource: EventSource closed.');

}

function resetSSEState(state: SSEState, isClosed: boolean): void {
    state.chapters = [];
    state.frontmatter = '';
    state.noteName = '';
    state.numChapters = 0;
    state.transcriptTime = '';
    state.lastNotice = '';
}

function saveTranscript(state: SSEState, transcriptsFolder: string): void {
    // make the note name the title of the note.  The folder is this.settings.transcriptsFolder. call this variable fullpath.
    // open the note for writing.
    // write the frontmatter.
    // for each chapter, write the title, new line start and stop time,
    try {
        const noteLocation = `${transcriptsFolder}/${state.noteName}`;
        const file = this.app.vault.getAbstractFileByPath(noteLocation) as TFile;
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
            this.app.vault.create(noteLocation, content);
        }
        new Notice(`Transcript saved to ${noteLocation}`);
        logger.debug(`process_audio.saveTranscript: Transcript saved to ${noteLocation}`);

    } catch (error) {
        logger.error(`process_audio.saveTranscript: Error saving transcript: ${error.message}`);
        new Notice(`Error saving transcript: ${error.message}`, 10000);
    }
}
