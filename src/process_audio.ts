import {  Notice, TFile } from 'obsidian';
import TranscriberPlugin from './main';
import { logger } from './logger';
import { createFrontmatter_object } from './utils';
import { StateManager, ContentState } from './state_manager';
import yaml from 'js-yaml';

import ReconnectingEventSource from 'reconnecting-eventsource';

// Define a variable to store the timeout ID outside of the function
// Used to check if the content has been received after a certain time.
let contentCheckTimeoutId: ReturnType<typeof setTimeout> | null = null;

export interface Chapter {
    title: string;
    start_time: string;
    end_time: string;
    text: string;
    number: number;
}

const stateManager = new StateManager();

const TIMEOUT_MS = 5000;
let lastNotice: string = '';

let eventSource: EventSource;
let noticeIntervalID: ReturnType<typeof setInterval>;


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
        formData.append("upload_file", input);
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
        await handleContentEvent(plugin, event);
    });

    eventSource.onopen = (event) => {
        logger.debug("SSE connection opened.");
    };
}

async function handleContentEvent(plugin: TranscriberPlugin, event: MessageEvent): Promise<void>  {
    try {
        // Clear existing timeout if it exists
        if (contentCheckTimeoutId !== null) {
            clearTimeout(contentCheckTimeoutId);
            contentCheckTimeoutId = null; // Reset the timeout ID
        }
        // logger.debug(`process_audio.handleContentEvent: Received a data message. ${event.data}`);
        const data = JSON.parse(event.data);
        if (data.key) {
            logger.debug(`**data:key**: ${data.key}`);
            stateManager.setProperty('key',data.key);
            stateManager.removeMissingProperty('key');
            new Notice("processed key");
        }
        if (data.basename) {
            logger.debug(`**data:basename**: ${data.basename}`);
            stateManager.setProperty('basename', data.basename);
            stateManager.removeMissingProperty('basename');
            new Notice("processed basename");
        }
        if (data.metadata) {
            try {
                logger.debug(`**data:frontmatter**`);
                const frontmatter = createFrontmatter_object(data.metadata);
                stateManager.setProperty('frontmatter', frontmatter);
                stateManager.removeMissingProperty('metadata');
                new Notice("processed metadata");
            } catch (error) {
                logger.error(`process_audio.handleContentEvent: Error processing metadata: ${error.message}`)
                new Notice(`Error processing metadata: ${error.message}`);
            }
        }
        if (data.num_chapters) {
            logger.debug(`**data:num_chapters**: ${data.num_chapters}`);
            try {
                stateManager.setProperty('numChapters', data.num_chapters);
                stateManager.removeMissingProperty('num_chapters');
                new Notice(`Processing ${data.numChapters} chapters`);
            } catch (error) {
                logger.error(`process_audio.handleContentEvent: Error processing number of chapters: ${error.message}`)
                new Notice(`Error processing number of chapters: ${error.message}`);
            }
        }

        if (data.chapter) {
            logger.debug(`**data:chapter**`);
            try {
                stateManager.addChapter(data.chapter);
                if (stateManager.checkChaptersComplete()) {
                    logger.debug(`process_audio.handleContentEvent: All chapters received.`);
                    stateManager.removeMissingProperty('chapters');
                }

            } catch (error) {
                logger.error(`process_audio.handleContentEvent: Error adding chapter to chapters list: ${error.message}`)
                new Notice(`Error processing number of chapters: ${error.message}`);
            }
        }

         // Ensure all other fields are received before closing the event source
        const missing_properties = stateManager.getMissingProperties();
        // logger.debug(`--> missing properties: ${missing.join(', ')}`)
        if (missing_properties.length ===0) {
            logger.debug('-->state is complete');
            saveTranscript(plugin, stateManager);
            closeEventSource(eventSource);
            clearInterval(noticeIntervalID);
            new Notice("Success. Transcript saved.")
        } else {
            logger.debug(`--> MISSING PROPERTIES: ${missing_properties.join(', ')}`);
        }

        if (missing_properties.length > 0) {
            // Wait a bit to see if new messages came in with the missing content before asking for it.
            contentCheckTimeoutId = setTimeout(async() => {
                new Notice(`Traffic jam! Asking for missing content: ${missing_properties.join(', ')}`);
                await processDoneMessage(plugin.settings.transcriberApiUrl, missing_properties, stateManager.getProperty('key'));
                // For example, check for missing content or finalize processing
                logger.debug("Timeout logic executed");
                // Reset the timeout ID after execution
                contentCheckTimeoutId = null;
            }, TIMEOUT_MS); // Time to wait in ms to see if more data messages are to arrive.  If not,`
        }
    } catch (error) {
        logger.error(`Error processing metadata: ${error.message}`);
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
function closeEventSource(eventSource: EventSource): void {
    eventSource.close();
    stateManager.resetState();
    logger.debug('process_audio.closeEventSource: EventSource closed.');
}

function saveTranscript(plugin:TranscriberPlugin, stateManager: StateManager): void {
    try {
        const noteLocation = `${plugin.settings.transcriptsFolder}/${stateManager.getProperty('basename')}.md`;
        const file = plugin.app.vault.getAbstractFileByPath(noteLocation) as TFile;
        logger.debug(`process_audio.saveTranscript: Saving transcript to ${noteLocation}`)
        // Put the content together based on what was collected in the state during transcription process.
        // We have verified the existence of the state properties. so it is a matter of putting them together.
        let content = '';
        // start with the frontmatter.
        const frontmatter = stateManager.getProperty('frontmatter');
        const frontmatterString = yaml.dump(frontmatter);

        content += `---\n${frontmatterString}---\n\n`;
        // Create a code block for the YouTube URL based on the Timestamp Notes plugin format
        content += `\`\`\`timestamp-url\n${frontmatter.audio_source}\n\`\`\`\n\n`;
        // Add the chapters
        // Most likely the chapters came in order, but just in case, sort them by number.
        const chapters = stateManager.getProperty('chapters');
        chapters.sort((a, b) => a.number - b.number);
        // Construct content with each chapter
        chapters.forEach(chapter => {
            if (chapter.title.trim() !== '') {
                content += `# ${chapter.title}\n`;
            }
            content += `\n\`\`\`timestamp\n${chapter.start_time}\n\`\`\`\n`;;
            content += `${chapter.text}\n\n`; // Add two new lines for separation
        });
        logger.debug(`process_audio.saveTranscript: Saving transcript to ${noteLocation}`)
        if (file) {
            logger.debug(`process_audio.saveTranscript: Modifying existing file: ${file.name}`);
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
