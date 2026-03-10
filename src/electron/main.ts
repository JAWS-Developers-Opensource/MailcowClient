import { app, BrowserWindow } from 'electron';
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

app.on('ready', () => {
    Logger.info('App ready — launching MailcowClient');
    const mainWindow = new BrowserWindow({
        webPreferences: {
            preload: getPreloadPath(),
        },
    });

    if (isDev()) {
        mainWindow.loadURL('http://localhost:6969');
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
    }

    // Auth
    ipcHandle('imapCheckCredentials', ImapManager.checkAuthCredentials);
    ipcHandle('getUserCredentials', getCredentials);
    ipcMainOn('saveUserCredentials', saveCredentials);
    ipcHandle('removeUserCredentials', removeCredentials);

    // OAuth2
    ipcHandle('checkOAuth2Available', checkOAuth2Available);
    ipcHandle('startOAuth2Login', startOAuth2Login);
    ipcHandle('saveOAuth2Credentials', saveOAuth2Credentials);
    ipcHandle('getOAuth2Credentials', getOAuth2Credentials);
    ipcHandle('removeOAuth2Credentials', removeOAuth2Credentials);

    // IMAP – email
    ipcHandle('imapFetchFolders', async () => {
        const creds = await getCredentials();
        return fetchFolders(creds);
    });
    ipcHandle('imapFetchEmails', async (params) => {
        const creds = await getCredentials();
        return fetchEmails({ ...creds, ...params });
    });
    ipcHandle('imapFetchEmailBody', async (params) => {
        const creds = await getCredentials();
        return fetchEmailBody({ ...creds, ...params });
    });
    ipcHandle('imapDeleteEmail', async (params) => {
        const creds = await getCredentials();
        return deleteEmail({ ...creds, ...params });
    });
    ipcHandle('imapMoveEmail', async (params) => {
        const creds = await getCredentials();
        return moveEmail({ ...creds, ...params });
    });
    ipcHandle('imapMarkEmailSeen', async (params) => {
        const creds = await getCredentials();
        return markEmailSeen({ ...creds, ...params });
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
    ipcHandle('settingsMailcowUpdateUserAcl', mailcowUpdateUserAcl);

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
