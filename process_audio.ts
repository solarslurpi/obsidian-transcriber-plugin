// Import necessary functions and types
import { Notice, TFile } from 'obsidian';
import { logDebug } from './utils';



// Overloads
export function processAudio(file: File, apiUrl: string, sseUrl: string, folderPath:string, test_mode:boolean, audioQuality: string): Promise<void>;
export function processAudio(url: string, apiUrl: string, sseUrl: string, folderPath: string, test_mode:boolean, audioQuality: string): Promise<void>;


// Implementation
export async function processAudio(input: File | string, apiUrl: string, sseUrl: string, folderPath: string, test_mode:boolean, audioQuality:string): Promise<void> {
    new Notice('Starting to process audio.',5000);
    try {
        if (input instanceof File) {
            logDebug(test_mode, `Processing audio input (File): ${input.name} with endpoint URL: ${apiUrl}`);
            await processFile(input, apiUrl, sseUrl, folderPath, test_mode, audioQuality);
        } else if (typeof input === 'string') {
            logDebug(test_mode, `Processing audio input (URL): ${input} with endpoint URL: ${apiUrl}`);
            await processUrl(input, apiUrl, sseUrl, folderPath, test_mode, audioQuality);
        } else {
            throw new Error('Invalid input type');
        }
    } catch (error) {
        console.error('Error during transcription request:', error);
        new Notice('Error in transcription request.');
    }
}

async function processFile(file: File, apiUrl: string, sseUrl: string, folderPath: string, test_mode: boolean, audioQuality: string): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("audio_quality", audioQuality); // Added line

    logDebug(test_mode, "Sending POST with File attachment.")
    const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
    });

    handleResponse(response, sseUrl, folderPath, test_mode);
}

async function processUrl(url: string, apiUrl: string, sseUrl: string, folderPath: string, test_mode: boolean, audioQuality: string): Promise<void> {
    const formData = new FormData();
    formData.append("youtube_url", url);
    formData.append("audio_quality", audioQuality); // Added line

    const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData  // No headers needed, browser will set the correct `Content-Type`
    });

    handleResponse(response, sseUrl, folderPath, test_mode);
}


async function handleResponse(response: Response, sseUrl: string, folderPath: string, test_mode: boolean): Promise<void> {
    if (!response.ok) {
        logDebug(test_mode, `Response: `, response)
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log(data)
    logDebug(test_mode, `Transcription requested successfully.  Here is the data: `, data);

    setupSSE(sseUrl, folderPath, test_mode);
}

function setupSSE(sseUrl: string, folderPath: string,  test_mode: boolean): void {
    const eventSource = new EventSource(sseUrl);
    let messageCount = 0;
    const MAX_MESSAGES = 5;

    logDebug(test_mode,`sseUrl: ${sseUrl}`)
    eventSource.onmessage = (event) => {
        logDebug(test_mode, `new event received`)
        const data = JSON.parse(event.data);
        logDebug(test_mode,`data: `,data)

        if (data.transcript == 'START') {
            new Notice('Transcription has started');
        } else if (data.transcript_text) {
            new Notice('Transcript received');

            // Directly use the provided filename stem from the server
            const safeFilename = `${data.filename}.md`.replace(/[:\s]/g, '-');
            console.log("safeFilename: ", safeFilename);

            // Call the save method
            saveTranscript(safeFilename, data.transcript_text, folderPath).then(() => {
                new Notice('Transcript saved successfully!');
            }).catch((err: unknown) => {
                console.error('Error saving transcript:', err);
                new Notice('Failed to save transcript: ' + (err instanceof Error ? err.message : err));
            });
        }
    };

    eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);  // Log the error event object to the console
        eventSource.close();
        };

}

async function saveTranscript(filename: string, content: string, folderPath: string): Promise<void> {
 // The folder path from settings
    const fullPath = `${folderPath}/${filename}`;
    console.log(`-> saveTranscript.  Full path: ${fullPath}`)
    try {
        let file = this.app.vault.getAbstractFileByPath(fullPath) as TFile;
        if (file) {
            // If the file exists, replace its content
            await this.app.vault.modify(file, content);
        } else {
            // If the file does not exist, create a new file with the content
            await this.app.vault.create(fullPath, content);
        }
        console.log('Transcript saved successfully!')
        new Notice('Transcript saved successfully!');
    } catch (error) {
        console.error('Error saving transcript:', error);
        new Notice('Failed to save transcript.');
    }
}
