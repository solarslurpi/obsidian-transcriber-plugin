import { Notice } from 'obsidian';
import { logDebug } from './utils';  // Assuming validators are defined separately


export async function processAudio(audioInput: string, endpointUrl: string): Promise<void> {
    logDebug(`Processing audio input: ${audioInput} with endpoint URL: ${endpointUrl}`);

    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl: audioInput })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        logDebug('Transcription requested successfully');

        // Assuming setupSSE is defined to handle the event stream
        setupSSE(data.streamUrl);
    } catch (error) {
        console.error('Error during transcription request:', error);
        new Notice('Error in transcription request.');
    }
}

function setupSSE(streamUrl: string): void {
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.finalResult) {
            logDebug('Transcription completed');
            new Notice('Transcription completed.');
            eventSource.close();
            // Further UI updates, like updating the ribbon bar, would be handled here.
        } else {
            logDebug(`Status update - ${data.status}`);
            // This could update a status bar or similar with progress or info.
        }
    };

    eventSource.onerror = (error) => {
        logDebug('SSE connection error');
        new Notice('Error in transcription stream.');
        eventSource.close();
    };
}
