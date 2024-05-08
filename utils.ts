


export function isValidYouTubeUrl(url: string, test_mode: boolean): boolean {
    const videoRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+(&[\w-]+)*$/;
    const playlistRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+$/;
    const isValid = videoRegex.test(url) || playlistRegex.test(url);

    logDebug(test_mode, `valid YouTube URl: ${isValid}`)
    return isValid;
}

export function isValidMP3(filePath: string, test_mode: boolean): boolean {
    if (!filePath.endsWith('.mp3')) {
        logDebug(test_mode, `Not a valid mp3 filepath`);
        return false;
    }
    logDebug(test_mode, `valid mp3 filepath`)
    // const mimeType = lookup(filePath);
    return true;
}

/**
 * Logs a debug message to the console if test mode is enabled, with 'Debug -' as a prefix.
 * @param {boolean} test_mode - Indicates whether to perform logging.
 * @param {string} message - The message to be logged.
 */
export function logDebug(test_mode:boolean, message:string, object?: any ) {
    if (test_mode) {
        if (object) {
            try {
                // Attempt to serialize the object into a JSON string.
                message += " - " + JSON.stringify(object, (key, value) => {
                    if (typeof value === 'function') {
                        return `function ${value.name}() {...}`;
                    }
                    return value;
                }, 2);
            } catch (error) {
                message += " - Error serializing object: " + error.message;
            }
        }
        console.log("Debug - " + message);
    }
}
