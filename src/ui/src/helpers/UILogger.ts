/**
 * Client-side logger for the React renderer process.
 * All messages are prefixed with [UI] and colourised for easy scanning.
 *
 * Usage:
 *   import UILogger from '../helpers/UILogger';
 *   UILogger.info('MailPage', 'Loaded 30 emails');
 *   UILogger.error('ComposeEmail', 'Send failed', err);
 *
 * Debug logging:
 *   Set `window.__MC_DEBUG__ = true` in the DevTools console to enable
 *   UILogger.debug() output at runtime without restarting the app.
 */

type LogLevel = 'INFO' | 'OK' | 'WARN' | 'ERROR' | 'DEBUG';

const STYLES: Record<LogLevel, string> = {
    INFO:  'color:#38bdf8;font-weight:bold',
    OK:    'color:#4ade80;font-weight:bold',
    WARN:  'color:#fb923c;font-weight:bold',
    ERROR: 'color:#f87171;font-weight:bold',
    DEBUG: 'color:#94a3b8;font-weight:bold',
};

const TAG_STYLE  = 'color:#a78bfa;font-weight:bold';
const TS_STYLE   = 'color:#64748b;font-size:0.85em';
const CTX_STYLE  = 'color:#94a3b8';

function ts(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function log(level: LogLevel, context: string, message: string, ...args: unknown[]): void {
    if (level === 'DEBUG' && typeof window !== 'undefined') {
        const mc = (window as any).__MC_DEBUG__;
        if (!mc) return;
    }
    const method = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    method(
        `%c${ts()} %c[UI] %c${level.padEnd(5)} %c[${context}] %c${message}`,
        TS_STYLE, TAG_STYLE, STYLES[level], CTX_STYLE, '',
        ...args,
    );
}

export const UILogger = {
    info(context: string, message: string, ...args: unknown[]): void {
        log('INFO', context, message, ...args);
    },
    success(context: string, message: string, ...args: unknown[]): void {
        log('OK', context, message, ...args);
    },
    warn(context: string, message: string, ...args: unknown[]): void {
        log('WARN', context, message, ...args);
    },
    error(context: string, message: string, ...args: unknown[]): void {
        log('ERROR', context, message, ...args);
    },
    debug(context: string, message: string, ...args: unknown[]): void {
        log('DEBUG', context, message, ...args);
    },
};

export default UILogger;
