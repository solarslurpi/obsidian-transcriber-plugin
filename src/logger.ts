import * as winston from 'winston';

let loggerInstance: winston.Logger | null = null;

const createLogger = (production: boolean): winston.Logger => {
    const level = production ? 'info' : 'debug';
    const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    );
    const fileFormat = winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    );

    const transports: winston.transport[] = [
        new winston.transports.Console({ level, format: consoleFormat })
    ];

    if (!production) {
        transports.push(new winston.transports.File({ filename: 'debug.log', level: 'debug', format: fileFormat }));
    }

    return winston.createLogger({
        level,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports
    });
};

export const initializeLogger = (production: boolean): winston.Logger => {
    if (!loggerInstance) {
        loggerInstance = createLogger(production);
    }
    return loggerInstance;
};

export const getLogger = (): winston.Logger => {
    if (!loggerInstance) {
        console.error('uh oh');
        // throw new Error('Logger is not initialized. Call initializeLogger first.');
    }
    return loggerInstance!;
};