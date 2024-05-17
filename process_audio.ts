// Import necessary functions and types
import { Notice, TFile } from 'obsidian';
import { logDebug } from './utils';

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
    console.log(data);
    logDebug(test_mode, `Transcription requested successfully. Here is the data: `, data);

    // Start SSE after successfully initiating the transcription process
    handleSSE(apiUrl, folderPath, test_mode);
}

function handleSSE(apiUrl:string, folderPath: string, test_mode: boolean): void {
    const sseUrl = apiUrl.replace("/process_audio", "/stream");
    const eventSource = new EventSource(`${sseUrl}`);
    let fullPath = '';

    eventSource.onmessage = (event) => {

        const data = JSON.parse(event.data);
        console.log('Received event data:', data);
        console.log('Full path:', fullPath);
        if (data.status) {
            console.log(`-> handleSSE. Status: ${data.status}`);
            new Notice(data.status);
        }
        if (data.done) {
            eventSource.close();
            console.log('Transcription process finished.');
            new Notice('Transcription process finished.');
        }
        if (data.filename) {
            console.log(`-> data.filename. Transcript folder: ${fullPath}`);
            const transcript_filename = `${data.filename}.md`;
            fullPath = `${folderPath}/${transcript_filename}`;
            console.log('Full path:', fullPath);
        }


        // The front matter comes from YouTube Metadata.
        if (data.frontmatter) {
            console.log(`-> data.frontmatter. Transcript filename: ${fullPath}`);
            try {
                saveTranscriptPart('frontmatter', fullPath, data.frontmatter);
                console.log(`File successfully written at ${fullPath}`);
            } catch (error) {
                console.error(`Failed to write file at ${fullPath}:`, error);
            }
        }

        // If the process started from a YouTube URL, there is
        // a chance of having the video broken into chapters.
        if (data.chapter) {
            console.log(`-> data.chapter. Transcript filename: ${fullPath}`);
            try {
                saveTranscriptPart('chapter', fullPath, data.chapter);
                console.log(`Chapter successfully appended to file at ${fullPath}`);
            } catch (error) {
                console.error(`Failed to append chapter to file at ${fullPath}:`, error);
            }
        }
    };

async function saveTranscriptPart(transcriptPart:string,fullPath: string, content: string): Promise<void> {
    console.log(`-> saveTranscript. Full path: ${fullPath}`);
    try {
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
        console.log('Transcript saved successfully!');
        new Notice('Transcript saved successfully!');
    } catch (error) {
        console.error('Error saving transcript:', error);
        new Notice('Failed to save transcript.');
    }
}}
