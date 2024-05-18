// Import necessary functions and types
import { Notice, TFile } from 'obsidian';
import { logDebug } from './utils';

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
export function processAudio(file: File, apiUrl: string, folderPath: string, test_mode: boolean, audioQuality: string): Promise<void>;
export function processAudio(url: string, apiUrl: string, folderPath: string, test_mode: boolean, audioQuality: string): Promise<void>;

// Implementation


export async function processAudio(input: File | string, apiUrl: string, folderPath: string, test_mode: boolean, audioQuality: string): Promise<void> {
    new Notice('Starting to process audio.');
    try {
        if (input instanceof File) {
            logDebug(test_mode, `Processing audio input (File): ${input.name} with endpoint URL: ${apiUrl}`);
            await processFile(input, apiUrl, folderPath, test_mode, audioQuality);
        } else if (typeof input === 'string') {
            logDebug(test_mode, `Processing audio input (URL): ${input} with endpoint URL: ${apiUrl}`);
            await processUrl(input, apiUrl, folderPath, test_mode, audioQuality);
        } else {
            throw new Error('Invalid input type');
        }
    } catch (error) {
        console.error('Error during transcription request:', error);
        new Notice('Error in transcription request.');
    }
}

async function processFile(file: File, apiUrl: string, folderPath: string, test_mode: boolean, audioQuality: string): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("audio_quality", audioQuality); // Added line

    logDebug(test_mode, "Process File. Sending POST with File attachment.");
    const response = await fetch(`${apiUrl}`, {
        method: 'POST',
        body: formData
    });

    handleResponse(apiUrl, response, folderPath, test_mode);
}

async function processUrl(url: string, apiUrl: string, folderPath: string, test_mode: boolean, audioQuality: string): Promise<void> {
    const formData = new FormData();
    formData.append("youtube_url", url);
    formData.append("audio_quality", audioQuality); // Added line
    logDebug(test_mode, "Process URL. Sending POST with URL.");
    const response = await fetch(`${apiUrl}`, {
        method: 'POST',
        body: formData  // No headers needed, browser will set the correct `Content-Type`
    });

    handleResponse(apiUrl, response, folderPath, test_mode);
}

async function handleResponse(apiUrl:string, response: Response, folderPath: string, test_mode: boolean): Promise<void> {
    if (!response.ok) {
        logDebug(test_mode, `Response: `, response);
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log(`-> handleResponse - Transcription requested successfully. Here is the data: ${data}`);

    // Start SSE after successfully initiating the transcription process
    handleSSE(apiUrl, folderPath, test_mode);
}

function handleSSE(apiUrl:string, folderPath: string, test_mode: boolean): void {
    const sseUrl = apiUrl.replace("/process_audio", "/stream");
    const eventSource = new EventSource(`${sseUrl}`);
    const state: SSEState = {
        chapters: [],
        frontmatter: '',
        fullPath: '',
        numChapters: 0, // If started as YouTube and has chapters, track number of chapters processed.
        isClosed: false, // Flag to track if SSE is closed
        isComplete: false // Flag to track if transcription process is complete
    };


    eventSource.onmessage = (event) => {
        if (state.isClosed) {
            console.log('Received message after SSE is closed:', event.data);
            return;
        }

        const data = JSON.parse(event.data);

        console.log('**>Received event data:', data);

        if (data.status) {
            console.log(`-> data.status Status: ${data.status}`);
            new Notice(data.status);
        }
        if (data.error) {
            eventSource.close();
            state.isClosed = true;
            console.log(`-> data.error Error: ${data.error}`);
            // Show for a bit longer (say 10 seconds?)
            new Notice(data.error, 10000);
        }
        if (data.done) {
            eventSource.close();
            state.isClosed = true;  // Set flag to indicate SSE is closed
            state.isComplete = true; // Set flag to indicate transcription process is complete
            console.log('-> data.done Transcription process finished.');
            saveTranscript(state);
            new Notice('Transcription process finished.');
        }
        if (data.filename) {
            console.log(`-> data.filename. Transcript folder: ${state.fullPath}`);
            const transcript_filename = `${data.filename}.md`;
            state.fullPath = `${folderPath}/${transcript_filename}`;
            console.log('Full path:', state.fullPath);
        }

        // The front matter comes from YouTube Metadata.
        if (data.frontmatter) {
            state.frontmatter = data.frontmatter;
            console.log(`-> data.frontmatter. Frontmatter: ${state.frontmatter}`);
        }

        // If the process started from a YouTube URL, there is
        // a chance of having the video broken into chapters.
        if (data.num_chapters) {
            state.numChapters = data.num_chapters;
            console.log(`-> data.num_chapters. Chapter format. Num chapters: ${data.num_chapters}`);

        }
        if (data.chapter) {
            console.log(`-> data.chapter. Chapter: ${data.chapter}`);
            state.chapters.push(data.chapter);
        }
    };
}

function saveTranscript(state: SSEState) {
    new Notice(`Saving transcript to ${state.fullPath}.`);
    console.log(`Saving transcript to ${state.fullPath}.`);
    try {

        // Use the Obsidian library to interact with files in the vault.
        let file = this.app.vault.getAbstractFileByPath(state.fullPath) as TFile;

        // Prepare the content to write
        let content = '';

        // Check if there is frontmatter to write
        if (state.frontmatter) {
            content += `${state.frontmatter}\n\n`;
        }

        // Append the chapters or other content
        if (state.chapters) {
            content += state.chapters;
            content += '\n' // Have a new line between chapters.
        } else {
            content += "No content available.";
        }

        if (file) {
            // Modify the file if it exists
            this.app.vault.modify(file, content);
        } else {
            // Create the file if it does not exist
            this.app.vault.create(state.fullPath, content);
        }

    } catch (error) {
        console.error(`Error saving transcript: ${error.message}`);
    }
}


async function saveTranscriptPart(transcriptPart:string,fullPath: string, content: string): Promise<void> {
    console.log(`-> saveTranscript. Full path: ${fullPath}`);
    try {

        // Use the Obsidian library to interact with files in the vault.
        let file = this.app.vault.getAbstractFileByPath(fullPath) as TFile;
        console.log(`-> saveTranscript. File: ${file}`);
        // frontmatter and all start the file. If there are
        // chapters, they are after the frontmatter.
        if (file && transcriptPart !== 'chapter') {
            // If the file exists, replace its content
            console.log(`-> saveTranscript EXISTS. Modifying file at ${fullPath}`);
            await this.app.vault.modify(file, content);
        } else if (!file){
            // If the file does not exist, create a new file with the content
            console.log(`-> saveTranscript NEW FILE. Creating new file at ${fullPath}`);
            await this.app.vault.create(fullPath, content);
        } else if (transcriptPart === 'chapter'){
            // If the file exists, append the chapter
            console.log(`-> saveTranscript APPEND CHAPTER. Appending chapter to file at ${fullPath}`);
            await this.app.vault.append(file, content);
        }
    } catch (error) {
        console.error(`Error saving ${transcriptPart}: ${error}`);
    }
}
