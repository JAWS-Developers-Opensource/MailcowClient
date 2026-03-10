/**
 * Server-side logger for the Electron main process.
 * All messages are prefixed with [SERVER] and colourised for easy scanning.
 */

const RESET  = '\x1b[0m';
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const GRAY   = '\x1b[90m';
const BOLD   = '\x1b[1m';

function timestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function prefix(level: string, colour: string): string {
    return `${GRAY}${timestamp()}${RESET} ${BOLD}${colour}[SERVER]${RESET} ${colour}${level}${RESET}`;
}

export const Logger = {
    info(message: string, ...args: unknown[]): void {
        console.log(`${prefix('INFO ', CYAN)} ${message}`, ...args);
    },

    success(message: string, ...args: unknown[]): void {
        console.log(`${prefix('OK   ', GREEN)} ${message}`, ...args);
    },

    warn(message: string, ...args: unknown[]): void {
        console.warn(`${prefix('WARN ', YELLOW)} ${message}`, ...args);
    },

    error(message: string, ...args: unknown[]): void {
        console.error(`${prefix('ERROR', RED)} ${message}`, ...args);
    },

    debug(message: string, ...args: unknown[]): void {
        if (process.env.MC_DEBUG === '1') {
            console.log(`${prefix('DEBUG', GRAY)} ${message}`, ...args);
        }
    },
};

export default Logger;
