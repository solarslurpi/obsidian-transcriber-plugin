import {  Notice, TFile } from 'obsidian';
import TranscriberPlugin from './main';
import { logger } from './logger';
import { createFrontmatter } from './utils';

import ReconnectingEventSource from 'reconnecting-eventsource';

// Define a variable to store the timeout ID outside of the function
// Used to check if the content has been received after a certain time.
let contentCheckTimeoutId: ReturnType<typeof setTimeout> | null = null;

interface Chapter {
    title: string;
    start_time: string;
    end_time: string;
    text: string;
    number: number;
}

interface ContentState {
    key: string;
    basename: string;
    frontmatter: string;
    numChapters: number;
    chapters: Chapter[];
}
const TIMEOUT_MS = 5000;
let lastNotice: string = '';

let eventSource: EventSource;
let noticeIntervalID: ReturnType<typeof setInterval>;

// export function processAudio(plugin: TranscriberPlugin,  file: File): Promise<void>;
// export function processAudio(plugin: TranscriberPlugin, url: string): Promise<void>;

export async function processAudio(plugin: TranscriberPlugin, input: File | string): Promise<void> {
    new Notice('Starting to process audio.');
    try {
        await handleSSE(plugin);
        const formData = createFormData(input, plugin.settings.audioQuality);

        const response = await sendTranscriptionRequest(plugin.settings.transcriberApiUrl, formData);
        await handleResponse(response);
    } catch (error) {
        logger.error(`process_audio.processAudio: Error during transcription request: ${error}`);
        new Notice(`Could not connect to the transcriber service.  Is it running?`);
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
        throw new Error('Network response was not ok. Please try again.');
    }

    const feedback = await response.json()
    logger.debug(`process_audio.handleResponse: Post response message: ${feedback.status}`);
}

async function handleSSE(plugin:TranscriberPlugin): Promise<void> {

    const state: ContentState = {
        key: '',
        basename: '',
        frontmatter: '',
        numChapters: 0,
        chapters: [],
    };

    const sseUrl = plugin.settings.transcriberApiUrl.replace("/process_audio", "/sse");
    eventSource = new ReconnectingEventSource(sseUrl);
    logger.debug(`process_audio.handleSSE: ReconnectingEventSource created at ${sseUrl}`);
    noticeIntervalID = setInterval(() => {
        if (lastNotice) {
            new Notice(lastNotice);
            lastNotice = '';
        }
    }, 5000);

    eventSource.addEventListener("status", (event) => {
        lastNotice = event.data;
        logger.debug(`**status message**: ${event.data}`);
    });

    eventSource.addEventListener("server-error", (event) => {
        logger.debug(`**error message**: ${event.data}`);
    });
    eventSource.addEventListener("data", async (event) => {
        await handleContentEvent(plugin, event, state);
    });

    eventSource.onopen = (event) => {
        logger.debug("SSE connection opened.");
    };
}

async function handleContentEvent(plugin: TranscriberPlugin, event: MessageEvent, state: ContentState): Promise<void>  {
    type StateKeys = keyof ContentState;
    try {
        // Clear existing timeout if it exists
        if (contentCheckTimeoutId !== null) {
            clearTimeout(contentCheckTimeoutId);
            contentCheckTimeoutId = null; // Reset the timeout ID
        }
        // logger.debug(`process_audio.handleContentEvent: Received a data message. ${event.data}`);
        const data = JSON.parse(event.data);
        logger.debug(`!!! A Content event: ${event.data}!!!`)
        if (data.key) {
            logger.debug(`**data:key**: ${data.key}`);
            state.key = data.key;
            new Notice("processed key");
        }
        if (data.basename) {
            logger.debug(`**data:basename**: ${data.basename}`);
            state.basename = data.basename;
            new Notice("processed basename");
        }
        if (data.metadata) {
            try {
                state.frontmatter = createFrontmatter(data.metadata);
                logger.debug(`**data:frontmatter**: ${state.frontmatter}`)
                // logger.debug(`process_audio.handleContentEvent: \nFrontmatter created: \n${state.frontmatter}\n`);
                new Notice("processed metadata");
            } catch (error) {
                logger.error(`process_audio.handleContentEvent: Error processing metadata: ${error.message}`)
                new Notice(`Error processing metadata: ${error.message}`);
            }
        }
        if (data.num_chapters) {
            logger.debug(`**data:num_chapters**: ${data.num_chapters}`);
            try {
                state.numChapters = data.num_chapters;
                // logger.debug(`process_audio.handleContentEvent: Number of chapters: ${data.num_chapters}`);
                new Notice(`Processing ${state.numChapters} chapters`);
            } catch (error) {
                logger.error(`process_audio.handleContentEvent: Error processing number of chapters: ${error.message}`)
                new Notice(`Error processing number of chapters: ${error.message}`);
            }
        }

        if (data.chapter) {
            try {
                addChapter(state, data);
                logger.debug(`**data:chapter**: ${state.chapters}`);

            } catch (error) {
                logger.error(`process_audio.handleContentEvent: Error adding chapter to chapters list: ${error.message}`)
                new Notice(`Error processing number of chapters: ${error.message}`);
            }
        }

         // Ensure all other fields are received before closing the event source
        const missing = missingStateList(state);
        // logger.debug(`--> missing properties: ${missing.join(', ')}`)
        if (missing.length ===0) {
            logger.debug('-->state is complete');
            saveTranscript(plugin, state);
            closeEventSource(eventSource, state);
            clearInterval(noticeIntervalID);
            new Notice("Success. Transcript saved.")
        } else {
            // Get received properties
            const receivedProperties = Object.keys(state).filter(key => receivedContent(key as StateKeys, state[key as StateKeys]));
            logger.debug(`--> KNOWN PROPERTIES: ${receivedProperties.join(', ')}`);
            logger.debug(`--> MISSING PROPERTIES: ${missing.join(', ')}`);
        }

        if (missing.length > 0) {
            // Wait a bit to see if new messages came in with the missing content before asking for it.
            contentCheckTimeoutId = setTimeout(async() => {
                new Notice(`Traffic jam! Asking for missing content: ${missing.join(', ')}`);
                await processDoneMessage(plugin.settings.transcriberApiUrl, missing, state.key);
                // For example, check for missing content or finalize processing
                console.log("Timeout logic executed");
                // Reset the timeout ID after execution
                contentCheckTimeoutId = null;
            }, TIMEOUT_MS); // Time to wait in ms to see if more data messages are to arrive.  If not,`
        }
    } catch (error) {
        logger.error(`process_audio.handleSSEMessage: Error processing metadata: ${error.message}`);
        new Notice(`Error processing metadata: ${error.message}`);
    }
}

async function sendMissingContentRequest(apiUrl: string, missing_contents: string[], key: string): Promise<Response> {
    logger.debug(`process_audio.sendMissingContentRequest: Sending POST request for missing content with contents: ${missing_contents.join(', ')}`);
    const requestBody = {
        key: key,
        missing_contents: missing_contents,
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });
    return response;
}

async function processDoneMessage(transcriberApiUrl: string, missing_contents: string[], key: string, ) {
    setTimeout(async () => {
        try {
            // If no key, start at the beginning.
            // if (!key) {
            //     const response = await sendMissingContentRequest(transcriberApiUrl, missing_contents, '');
            // }
            // Use the passed transcriberApiUrl instead of this.plugin.settings.transcriberApiUrl
            const missingContentUrl = transcriberApiUrl.replace("/process_audio", "/missing_content");
            const response = await sendMissingContentRequest(missingContentUrl, missing_contents, key);
            await handleResponse(response);
        } catch (error) {
            logger.error(`Error during missing content request: ${error}`);
            new Notice(`Could not connect to the transcriber service. Is it running?`);
        }
    }, 5000); // Adjust the timeout as needed
}
function closeEventSource(eventSource: EventSource, state: ContentState): void {
    eventSource.close();
    resetContentState(state);
    logger.debug('process_audio.closeEventSource: EventSource closed.');
}

function resetContentState(state: ContentState): void {
    state.basename = '';
    state.frontmatter = '';
    state.numChapters = 0;
    state.chapters = [];
}
function addChapter(state: ContentState, data: any) {
    logger.debug("addChapter incoming data:", data);
    // Check if the chapter number already exists in the state
    const chapterExists = state.chapters.some(chapter => chapter.number === data.chapter.number);
    if (!chapterExists) {
        try {
            const chapter: Chapter = {
                title: data.chapter.title,
                start_time: data.chapter.start_time,
                end_time: data.chapter.end_time,
                text: data.chapter.text,
                number: data.chapter.number
            };
            state.chapters.push(chapter);
        } catch (error) {
            console.error("Error adding chapter:", error);
        }
    } else {
        console.log(`Chapter number ${data.number} already exists. Skipping.`);
    }
}


function missingStateList(state: ContentState): string[] {
    const missingProperties: string[] = [];
    // The property name being pushed is what the server is expecting as the
    // property for the content state.
    if (state.basename === '') {
        missingProperties.push("basename");
    }
    if (state.numChapters === 0) {
        missingProperties.push("num_chapters");
    }

    if (state.numChapters > 0 && state.chapters.length !== state.numChapters) {
        missingProperties.push("chapters");
    }
    if (state.frontmatter === '') {
        missingProperties.push("metadata");
    }
    return missingProperties;
}

// Updated function to check if content is considered "received", including chapters check
function receivedContent(key: keyof ContentState, value: any, state?: ContentState): boolean {
    if (key === 'chapters' && (state?.numChapters ?? 0) > 0) {
        return state?.numChapters === value.length;
    }
    else if (Array.isArray(value) && value.length > 0) {
        return true;
    } else if (typeof value === 'string' && value.trim() !== '') {
        return true;
    } else if (typeof value === 'number' && value !== 0) {
        return true;
    }
    return false;
}

function saveTranscript(plugin:TranscriberPlugin, state: ContentState): void {
    try {
        const noteLocation = `${plugin.settings.transcriptsFolder}/${state.basename}.md`;
        const file = plugin.app.vault.getAbstractFileByPath(noteLocation) as TFile;
        logger.debug(`process_audio.saveTranscript: Saving transcript to ${noteLocation}`)
        // Put the content together based on what was collected in the state during transcription process.
        // We have verified the existence of the state properties. so it is a matter of putting them together.
        let content = '';
        // start with the frontmatter.
        content += `${state.frontmatter}\n\n`;
        // Add the chapters
        // Most likely the chapters came in order, but just in case, sort them by number.
        state.chapters.sort((a, b) => a.number - b.number);
        // Construct content with each chapter
        state.chapters.forEach(chapter => {
            if (chapter.title.trim() !== '') {
                content += `# ${chapter.title}\n`;
            }
            content += `${chapter.start_time} - ${chapter.end_time}\n`;
            content += `${chapter.text}\n\n`; // Add two new lines for separation
        });
        logger.debug(`process_audio.saveTranscript: Saving transcript to ${noteLocation}`)
        if (file) {
            logger.debug(`process_audio.saveTranscript: Modifying existing file: ${file}`);
            plugin.app.vault.modify(file, content);
        } else {
            logger.debug(`process_audio.saveTranscript: Creating new file: ${noteLocation}`);
            plugin.app.vault.create(noteLocation, content);
        }
        new Notice(`Transcript saved to ${noteLocation}`);
        logger.debug(`process_audio.saveTranscript: Transcript saved to ${noteLocation}`);

    } catch (error) {
        logger.error(`process_audio.saveTranscript: Error saving transcript: ${error.message}`);
        new Notice(`Error saving transcript: ${error.message}`, 10000);
    }
}

// Convert seconds to YouTube time format (e.g., 0:00)
function secondsToYouTubeTimeFormat(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let timeString = `${minutes}:${secs.toString().padStart(2, '0')}`;
    if (hours > 0) {
        timeString = `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return timeString;
}
