import { env } from '../config/env.js';

const canLogInfo = env.nodeEnv !== 'test';
const canLogDebug = env.debugLogs && env.nodeEnv !== 'test';

export const logInfo = (...args) => {
    if (canLogInfo) {
        console.log(...args);
    }
};

export const logWarn = (...args) => {
    if (canLogInfo) {
        console.warn(...args);
    }
};

export const logError = (...args) => {
    if (env.nodeEnv === 'test') {
        return;
    }

    console.error(...args);
};

export const logDebug = (...args) => {
    if (canLogDebug) {
        console.log(...args);
    }
};
