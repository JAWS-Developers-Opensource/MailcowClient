import { app, BrowserWindow, shell, session } from 'electron';
import path from 'path';
import { ipcHandle, ipcMainOn, isDev } from './utils.js';
import { getPreloadPath } from './pathResolver.js';
import { ImapManager, fetchFolders, fetchEmails, fetchEmailBody, deleteEmail, moveEmail, markEmailSeen } from './imap.js';
import { sendEmail } from './smtp.js';
import {
    getCredentials, removeCredentials, saveCredentials,
    getOAuth2Credentials, removeOAuth2Credentials, saveOAuth2Credentials,
    saveApiKey, getApiKey,
    getAccounts, saveAccount, removeAccount, switchAccount,
} from './storage.js';
import { createConn, getCalendars, queryCalendar, createEvent, updateEvent, deleteEvent, createCalendar } from './caldav.js';
import { createCardDavConn, fetchAddressBooks, fetchContacts, createContact, updateContact, deleteContact } from './carddav.js';
import { checkOAuth2Available, startOAuth2Login } from './oauth.js';
import { checkForUpdates, getAppVersion } from './updater.js';
import {
    mailcowGetOverview,
    mailcowCreateAlias,
    mailcowDeleteAlias,
    mailcowCreateAppPassword,
    mailcowDeleteAppPassword,
    mailcowUpdateUserAcl,
} from './mailcow.js';
import Logger from './helpers/Logger.js';

// ─── IPC input validation helpers ────────────────────────────────────────────

function assertString(value: unknown, name: string, maxLen = 512): string {
    if (typeof value !== 'string') throw new Error(`IPC: ${name} must be a string`);
    if (value.length > maxLen)    throw new Error(`IPC: ${name} exceeds max length`);
    return value;
}

function assertUint(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= 2 ** 32) {
        throw new Error(`IPC: ${name} must be a non-negative integer`);
    }
    return value;
}

// ─────────────────────────────────────────────────────────────────────────────

// Content Security Policy applied to every renderer response
const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    // 'self' covers same-origin HTTP(S); https: covers external API calls.
    // ws:/wss: are needed for Vite HMR in development (harmless in production).
    "connect-src 'self' https: ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
].join('; ');

app.on('ready', () => {
    Logger.info('App ready — launching MailcowClient');

    // ── Harden session before any window loads ────────────────────────────────

    // Inject CSP + X-Content-Type-Options on all HTTP(S) renderer responses.
    // In development mode the Vite dev server injects inline scripts for React
    // Fast Refresh (HMR preamble) which would be blocked by script-src 'self'.
    // CSP is therefore only enforced in production; contextIsolation + sandbox
    // guards are still active in both modes.
    if (!isDev()) {
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [CSP],
                    'X-Content-Type-Options': ['nosniff'],
                    'X-Frame-Options': ['DENY'],
                },
            });
        });
    }

    // Deny all browser-level permission requests (camera, mic, location, notifications…)
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
    });
    session.defaultSession.setPermissionCheckHandler(() => false);

    // ── Main window ───────────────────────────────────────────────────────────
    // NOTE: sandbox:true is intentionally omitted for the main window.
    // The preload script uses CommonJS require('electron'), which is not
    // available inside a fully-sandboxed renderer process. Removing it here
    // is the correct approach when a preload bridge is in use; the remaining
    // webPreferences (contextIsolation, nodeIntegration:false, webSecurity)
    // still provide the important security boundaries.
    const mainWindow = new BrowserWindow({
        webPreferences: {
            preload: getPreloadPath(),
            nodeIntegration: false,       // never allow Node.js in renderer
            contextIsolation: true,       // isolate preload from renderer
            webSecurity: true,            // enforce same-origin policy
            allowRunningInsecureContent: false,
            webviewTag: false,            // disable <webview> (privileged)
        },
    });

    // ── Navigation guard ──────────────────────────────────────────────────────
    // Prevent the main window from navigating to any URL that isn't the
    // expected origin (dev server or local file).
    mainWindow.webContents.on('will-navigate', (event, url) => {
        try {
            const parsed = new URL(url);
            const allowed = isDev()
                ? parsed.origin === 'http://localhost:6969'
                : parsed.protocol === 'file:';
            if (!allowed) {
                event.preventDefault();
                Logger.warn('main', `Blocked navigation to: ${url}`);
            }
        } catch {
            event.preventDefault();
        }
    });

    // Open any link that tries to open a new window in the OS browser instead
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:/.test(url)) {
            shell.openExternal(url).catch(() => {});
        }
        return { action: 'deny' };
    });

    // ── DevTools guard ────────────────────────────────────────────────────────
    if (!isDev()) {
        mainWindow.webContents.on('devtools-opened', () => {
            mainWindow.webContents.closeDevTools();
        });
    }

    // ── Apply same guards to any future WebContents (belt-and-suspenders) ────
    app.on('web-contents-created', (_event, contents) => {
        contents.on('will-navigate', (event, url) => {
            try {
                const parsed = new URL(url);
                // Only allow HTTPS (or HTTP for localhost) in child windows (e.g. OAuth2)
                if (parsed.protocol !== 'https:' &&
                    !(parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1')) {
                    event.preventDefault();
                }
            } catch {
                event.preventDefault();
            }
        });
        // Prevent webview attachment
        contents.on('will-attach-webview', (event) => event.preventDefault());
    });

    if (isDev()) {
        mainWindow.loadURL('http://localhost:6969');
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
    }

    // ── IPC handlers ──────────────────────────────────────────────────────────

    // Auth — getUserCredentials returns only email+host, never the password
    ipcHandle('imapCheckCredentials', ImapManager.checkAuthCredentials);
    ipcHandle('getUserCredentials', async () => {
        const { email, host } = await getCredentials();
        return { email, host };
    });
    ipcMainOn('saveUserCredentials', saveCredentials);
    ipcHandle('removeUserCredentials', removeCredentials);

    // Auto-login: credential verification happens entirely in the main process;
    // the renderer receives only a success flag + email (never a password).
    ipcHandle('autoLogin', async () => {
        // 1. Try OAuth2 first
        try {
            const oauth2 = await getOAuth2Credentials();
            if (oauth2?.accessToken && oauth2.host) {
                // Guard against SSRF: host must look like a public domain name
                const hostOk = /^[a-zA-Z0-9][a-zA-Z0-9.\-]{1,252}[a-zA-Z0-9]$/.test(oauth2.host)
                    && !/(^|\.)localhost$/i.test(oauth2.host)
                    && !/^(10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(oauth2.host);
                if (hostOk) {
                    const ac = new AbortController();
                    const timer = setTimeout(() => ac.abort(), 5000);
                    try {
                        const r = await fetch(`https://${oauth2.host}/oauth/profile`, {
                            headers: { Authorization: `Bearer ${oauth2.accessToken}` },
                            signal: ac.signal,
                        });
                        if (r.ok) return { success: true as const, email: oauth2.email, method: 'oauth2' as const };
                    } finally {
                        clearTimeout(timer);
                    }
                }
            }
        } catch {
            // Fall through to IMAP
        }

        // 2. Try stored IMAP credentials
        try {
            const creds = await getCredentials();
            if (creds.email && creds.password && creds.host) {
                const result = await ImapManager.checkAuthCredentials(creds);
                if (result.status === 'success') {
                    return { success: true as const, email: creds.email, method: 'imap' as const };
                }
            }
        } catch {
            // Fall through
        }

        return { success: false as const };
    });

    // OAuth2
    ipcHandle('checkOAuth2Available', checkOAuth2Available);
    ipcHandle('startOAuth2Login', startOAuth2Login);
    ipcHandle('saveOAuth2Credentials', saveOAuth2Credentials);
    ipcHandle('getOAuth2Credentials', getOAuth2Credentials);
    ipcHandle('removeOAuth2Credentials', removeOAuth2Credentials);

    // IMAP – email (with input validation)
    ipcHandle('imapFetchFolders', async () => {
        const creds = await getCredentials();
        return fetchFolders(creds);
    });
    ipcHandle('imapFetchEmails', async (params) => {
        const folder = assertString(params?.folder, 'folder');
        const page   = assertUint(params?.page,  'page');
        const limit  = assertUint(params?.limit, 'limit');
        const creds  = await getCredentials();
        return fetchEmails({ ...creds, folder, page, limit });
    });
    ipcHandle('imapFetchEmailBody', async (params) => {
        const folder = assertString(params?.folder, 'folder');
        const uid    = assertUint(params?.uid, 'uid');
        const creds  = await getCredentials();
        return fetchEmailBody({ ...creds, folder, uid });
    });
    ipcHandle('imapDeleteEmail', async (params) => {
        const folder = assertString(params?.folder, 'folder');
        const uid    = assertUint(params?.uid, 'uid');
        const creds  = await getCredentials();
        return deleteEmail({ ...creds, folder, uid });
    });
    ipcHandle('imapMoveEmail', async (params) => {
        const folder   = assertString(params?.folder,   'folder');
        const toFolder = assertString(params?.toFolder, 'toFolder');
        const uid      = assertUint(params?.uid, 'uid');
        const creds    = await getCredentials();
        return moveEmail({ ...creds, folder, uid, toFolder });
    });
    ipcHandle('imapMarkEmailSeen', async (params) => {
        const folder = assertString(params?.folder, 'folder');
        const uid    = assertUint(params?.uid, 'uid');
        if (typeof params?.seen !== 'boolean') throw new Error('IPC: seen must be a boolean');
        const creds  = await getCredentials();
        return markEmailSeen({ ...creds, folder, uid, seen: params.seen });
    });

    // SMTP
    ipcHandle('smtpSendEmail', async (params) => {
        const creds = await getCredentials();
        return sendEmail({ fromEmail: creds.email, password: creds.password, host: creds.host, ...params });
    });

    // CalDAV
    ipcHandle('calCreateConn', createConn);
    ipcHandle('calGetCalendars', getCalendars);
    ipcHandle('calQueryCalendar', queryCalendar);
    ipcHandle('calCreateEvent', createEvent);
    ipcHandle('calUpdateEvent', updateEvent);
    ipcHandle('calDeleteEvent', (params) => deleteEvent(params));
    ipcHandle('calCreateCalendar', createCalendar);

    // CardDAV
    ipcHandle('cardCreateConn', createCardDavConn);
    ipcHandle('cardFetchAddressBooks', fetchAddressBooks);
    ipcHandle('cardFetchContacts', fetchContacts);
    ipcHandle('cardCreateContact', createContact);
    ipcHandle('cardUpdateContact', updateContact);
    ipcHandle('cardDeleteContact', (params) => deleteContact(params));

    // Settings
    ipcHandle('settingsSaveApiKey', (params) => saveApiKey(params.apiKey));
    ipcHandle('settingsGetApiKey', getApiKey);
    ipcHandle('settingsMailcowGetOverview', mailcowGetOverview);
    ipcHandle('settingsMailcowCreateAlias', mailcowCreateAlias);
    ipcHandle('settingsMailcowDeleteAlias', mailcowDeleteAlias);
    ipcHandle('settingsMailcowCreateAppPassword', mailcowCreateAppPassword);
    ipcHandle('settingsMailcowDeleteAppPassword', mailcowDeleteAppPassword);
    ipcHandle('settingsMailcowUpdateUserAcl', (params) => {
        assertString(params?.aclJson, 'aclJson', 8192);
        return mailcowUpdateUserAcl(params);
    });

    // Updater
    ipcHandle('checkForUpdates', checkForUpdates);
    ipcHandle('getAppVersion', async () => getAppVersion());

    // Multi-account
    ipcHandle('getAccounts', getAccounts);
    ipcHandle('saveAccount', saveAccount);
    ipcHandle('removeAccount', removeAccount);
    ipcHandle('switchAccount', switchAccount);

    Logger.info('All IPC handlers registered');
    handleCloseEvents(mainWindow);
});

function handleCloseEvents(mainWindow: BrowserWindow) {
    let willClose = false;

    mainWindow.on('close', (e) => {
        if (willClose) return;
        e.preventDefault();
        mainWindow.hide();
        if (app.dock) app.dock.hide();
    });

    app.on('before-quit', () => { willClose = true; });
    mainWindow.on('show', () => { willClose = false; });
}
