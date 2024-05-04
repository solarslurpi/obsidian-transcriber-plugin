// Assuming this is part of your TranscriptionService.ts
export async function processAudio(audioInput: string, endpointUrl: string, updateStatus: (message: string, method: string) => void): Promise<void> {
    console.log(`Processing audio input: ${audioInput} with endpoint URL: ${endpointUrl}`);

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
        console.log('Transcription requested successfully:', data);
        setupSSE(data.streamUrl, updateStatus);
    } catch (error) {
        console.error('Error during transcription request:', error);
        updateStatus(`Error: ${error.message}`, 'statusBar');
    }
}

function setupSSE(streamUrl: string, updateStatus: (message: string, method: string) => void): void {
    const eventSource = new EventSource(streamUrl);
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.finalResult) {
            updateStatus('Transcription completed', 'statusBar');
            eventSource.close();
        } else if (data.status) {
            updateStatus(data.status, 'statusBar');
        }
    };

    eventSource.onerror = () => {
        updateStatus('Connection error', 'statusBar');
        eventSource.close();
    };
}
