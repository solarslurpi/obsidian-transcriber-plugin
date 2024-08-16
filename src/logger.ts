import * as winston from 'winston';

let loggerInstance: winston.Logger | null = null;

const createLogger = (debug: boolean): winston.Logger => {
    const level = debug ? 'debug' : 'error';
    const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    );

    const transports: winston.transport[] = [
        new winston.transports.Console({ level, format: consoleFormat })
    ];

    const logger = winston.createLogger({
        level,
        format: consoleFormat,
        transports
    });


    return logger;
};

export const initializeLogger = (debug: boolean): winston.Logger => {
    if (!loggerInstance) {
        loggerInstance = createLogger(debug);
    }
    return loggerInstance;
};

export const getLogger = (): winston.Logger => {
    if (!loggerInstance) {
        console.error('Logger is not initialized. Call initializeLogger first.');
    }
    return loggerInstance!;
};