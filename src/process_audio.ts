import {  Notice, TFile } from 'obsidian';
import TranscriberPlugin from './main';
import { Logger } from 'winston';
import { createFrontmatter_object, isValidYouTubeUrl } from './utils';
import { StateManager} from './state_manager';
import yaml from 'js-yaml';
import * as path from 'path';
import { get } from 'http';


export interface Chapter {
    title: string;
    start_time: string;
    end_time: string;
    text: string;
    number: number;
}


// Define a variable to store the timeout ID outside of the function
// Used to check if the content has been received after a certain time.
let contentCheckTimeoutId: ReturnType<typeof setTimeout> | null = null;

const timeoutMs = 5000;


let lastNotice: string = '';

let eventSource: EventSource;
let noticeIntervalID: ReturnType<typeof setInterval>;

let isProcessing = false;

export function setIsProcessing(state: boolean): void {
    isProcessing = state;
}

export function getIsProcessing(): boolean {
    return isProcessing;
}

export async function processAudio(plugin: TranscriberPlugin, input: File | string, logger: Logger): Promise<void> {
    // Check if the plugin is already processing a transcription. If so, skip the request.
    if (! getIsProcessing()) {
        // Create an empty state to be filled in by incoming content.
        const stateManager = new StateManager(logger);
        new Notice('Starting to process audio.');
        try {
            await handleSSE(plugin, stateManager, logger);
            const formData = createFormData(input, plugin.settings.audioQuality, plugin.settings.computeType, plugin.settings.chapterChunkTime, logger);

            const response = await sendTranscriptionRequest(plugin.settings.transcriberApiUrl, formData, logger);
            await handleResponse(response, logger);
        } catch (error) {
            logger.error(`process_audio.processAudio: Error during transcription request: ${error}`);
            new Notice(`Could not connect to the transcriber service.  Is it running?`);
        }
    } else {
        logger.debug("process_audio.processAudio: Already processing. Skipping request.");
        new Notice("Already processing. Please wait for the current process to finish.");
    }
}

function createFormData(input: File | string, audioQuality: string, computeType: string, chapterChunkTime: number, logger: Logger): FormData {
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
    formData.append("compute_type", computeType);
    formData.append("chapter_chunk_time", chapterChunkTime.toString());
    logger.debug(`compute_type: ${computeType}, chapter chunk time: ${chapterChunkTime}`);
    return formData;
}

async function sendTranscriptionRequest(apiUrl: string, formData: FormData, logger: Logger): Promise<Response> {
    logger.debug(`isProcessing: ${isProcessing}`);
    if (getIsProcessing()) {
        logger.debug("process_audio.sendTranscriptionRequest: Already processing. Skipping request.");
        new Notice("Already processing. Please wait for the current process to finish.");
        // Create a custom response to indicate that the request was skipped
        const customResponse = new Response(null, { status: 429, statusText: 'Already processing.' });
        return Promise.resolve(customResponse);
    }
    logger.debug("process_audio.sendTranscriptionRequest: Sending POST request for transcription.");
    // Set isProcessing before posting to avoid multiple requests.
    setIsProcessing(true);
    const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
    });

    logger.debug(`Set isProcessing to ${isProcessing}`);
    return response;
}

async function handleResponse(response: Response, logger: any): Promise<void> {
    if (response.status === 429) {
        logger.debug(`In handleResponse. Request was skipped because it is already processing.`);
        return;
    }
    if (!response.ok) {
        const errorMessage = `process_audio.handleResponse: Network response was not ok: ${response.statusText}`;

        logger.error(errorMessage);
        new Notice(errorMessage, 5000);
        setIsProcessing(false);
        throw new Error('Network response was not ok. Please try again.');
    }

    const feedback = await response.json()
    logger.debug(`process_audio.handleResponse: Post response message: ${feedback.status}`);
}

async function handleSSE(plugin:TranscriberPlugin, stateManager:StateManager, logger: any): Promise<void> {
    const sseUrl = plugin.settings.transcriberApiUrl.replace("/process_audio", "/sse");

    // eventSource = new ReconnectingEventSource(sseUrl);
    eventSource = new EventSource(sseUrl);
    logger.debug(`process_audio: Created sse EventSource with URL: ${eventSource.url}`);
    // Send a status message every so often if one is available. This way if there might be a lot of message, some will be skipped.
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

    eventSource.addEventListener("reset-state", (event) => {
        logger.debug(`**reset-state message**`);
        stateManager.resetState();
    });

    eventSource.addEventListener("server-error", (event) => {
        logger.debug(`**error message**: ${event.data}`);
    });
    eventSource.addEventListener("data", async (event) => {
        await handleContentEvent(plugin, event, stateManager, logger);
    });

    eventSource.onopen = (event) => {
        logger.debug("SSE connection opened.");
    };
}

async function handleContentEvent(plugin: TranscriberPlugin, event: MessageEvent, stateManager:StateManager, logger: any): Promise<void>  {

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
            // The key came in.  Add it to the state.
            stateManager.setProperty('key',data.key);
            new Notice("processed key");
        }
        if (data.basename) {
            logger.debug(`**data:basename**: ${data.basename}`);
            stateManager.setProperty('basename', data.basename);
            new Notice("processed basename");
        }
        if (data.metadata) {
            try {
                logger.debug(`**data:frontmatter**`);
                const frontmatter = createFrontmatter_object(data.metadata);
                // Pretty print the frontmatter object
                const prettyFrontmatter = JSON.stringify(frontmatter, null, 2);
                logger.debug(`${prettyFrontmatter}`);
                stateManager.setProperty('frontmatter', frontmatter);
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
                new Notice(`Processing ${data.num_chapters} chapters`);
            } catch (error) {
                logger.error(`process_audio.handleContentEvent: Error processing number of chapters: ${error.message}`)
                new Notice(`Error processing number of chapters: ${error.message}`);
            }
        }
        if (data.chapter) {
            logger.debug(`**data:chapter**`);
            try {
                // Log the chapter number
                if (data.chapter.number !== undefined) {
                    logger.debug(`Chapter number: ${data.chapter.number}`);
                } else {
                    logger.debug(`Chapter number is missing in the data.`);
                }
                stateManager.addChapter(data.chapter);
                if (stateManager.checkChaptersComplete()) {
                    logger.debug(`process_audio.handleContentEvent: All chapters received.`);
                }

            } catch (error) {
                logger.error(`process_audio.handleContentEvent: Error adding chapter to chapters list: ${error.message}`)
                new Notice(`Error processing number of chapters: ${error.message}`);
            }
        }
        if (stateManager.isComplete()) {
            logger.debug('-->state is complete');
            saveTranscript(plugin, stateManager, logger);
            cleanup(eventSource, noticeIntervalID, stateManager, logger);
            new Notice("Success. Transcript saved.")
        } else {
            // After a time period that should be longer than an expected update of data, assume the data was lost and
            // needs to be resent.
            const missing_properties = stateManager.getMissingProperties()
            contentCheckTimeoutId = setTimeout(async() => {
                logger.debug(`process_audio.handleContentEvent: Retrieving missing content: ${missing_properties.join(', ')}`);
                retrieveMissingData(plugin.settings.transcriberApiUrl, missing_properties, stateManager.getProperty('key'), logger);
                // For example, check for missing content or finalize processing
                logger.debug("Timeout logic has executed.");
                // Reset the timeout ID after execution
                contentCheckTimeoutId = null;
            }, timeoutMs); // Time to wait in ms to see if more data messages are to arrive.  If not,`
        }
    } catch (error) {
        logger.error(`***>>process_audio.handleContentEvent: Unexpected error: ${error.message}`);
        cleanup(eventSource, noticeIntervalID, stateManager, logger);
        new Notice("An unexpected error occurred. Please try again.");
    }
}
async function sendMissingContentRequest(apiUrl: string, missing_contents: string[], key: string, logger: Logger): Promise<Response> {
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

export async function retrieveMissingData(transcriberApiUrl: string, missing_contents: string[], key: string, logger: Logger) {
    if (!key || key === '') {
        logger.debug("process_audio.retrieveMissingData: No key. Do not know what content to fetch. Returning.");
        return;
    }
    try {
        logger.debug(`process_audio.retrieveMissingData: Asking for missing content: ${missing_contents.join(', ')}`);
        const missingContentUrl = transcriberApiUrl.replace("/process_audio", "/missing_content");
        const response = await sendMissingContentRequest(missingContentUrl, missing_contents, key, logger);
        await handleResponse(response, logger);
    } catch (error) {
        logger.error(`Error during missing content request: ${error}`);
        new Notice(`Could not connect to the transcriber service. Is it running?`);
    }

}




function saveTranscript(plugin:TranscriberPlugin, stateManager: StateManager, logger: Logger): void {
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
        // Create a code block based on the Timestamp Notes plugin format
        if (isValidYouTubeUrl(frontmatter.audio_source) ) {
            content += `\`\`\`timestamp-url\n${frontmatter.audio_source}\n\`\`\`\n\n`;
        }
        else {
            let static_file_url = plugin.settings.transcriberApiUrl.replace(/\/api\/v1\/process_audio$/, "/audio/");
            const basename = path.basename(frontmatter.audio_source);
            static_file_url += basename;
            content += `\`\`\`timestamp-url\n${static_file_url}\n\`\`\`\n\n`;
        }

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
        setIsProcessing(false);
        logger.debug(`Set isProcessing to ${isProcessing}`);

    } catch (error) {
        logger.error(`process_audio.saveTranscript: Error saving transcript: ${error.message}`);
        new Notice(`Error saving transcript: ${error.message}`, 10000);
    }
}

function cleanup(eventSource: EventSource|null, noticeIntervalID: ReturnType<typeof setInterval>, stateManager: StateManager, logger: any): void {
    clearInterval(noticeIntervalID);
    eventSource?.close();
    eventSource = null;
    stateManager.resetState();
    logger.debug(`process_audio.cleanup: Closed event source.`);
}
