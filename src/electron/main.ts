import { app, BrowserWindow } from "electron"
import path from "path";
import { ipcHandle, ipcMainOn, isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";
import { ImapManager } from "./imap.js";
import { getCredentials, removeCredentials, saveCredentials, getOAuth2Credentials, removeOAuth2Credentials, saveOAuth2Credentials } from "./storage.js";
import { createConn, getCalendars, queryCalendar } from "./caldav.js";
import { checkOAuth2Available, startOAuth2Login } from "./oauth.js";

type test = String;


app.on("ready", () => {
    const mainWindow = new BrowserWindow({
        // Aggiunte:
        webPreferences: {
            preload: getPreloadPath() // File per IPC
        }
    });


    if (isDev()) {
        mainWindow.loadURL("http://localhost:6969");
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
    }

    ipcHandle("imapCheckCredentials", ImapManager.checkAuthCredentials)

    ipcHandle("getUserCredentials", getCredentials);
    ipcMainOn("saveUserCredentials", saveCredentials);
    ipcHandle("removeUserCredentials", removeCredentials);

    ipcHandle("calCreateConn", createConn);
    ipcHandle("calGetCalendars", getCalendars);
    ipcHandle("calQueryCalendar", queryCalendar);

    // OAuth2 handlers
    ipcHandle("checkOAuth2Available", checkOAuth2Available);
    ipcHandle("startOAuth2Login", startOAuth2Login);
    ipcHandle("saveOAuth2Credentials", saveOAuth2Credentials);
    ipcHandle("getOAuth2Credentials", getOAuth2Credentials);
    ipcHandle("removeOAuth2Credentials", removeOAuth2Credentials);

    handleCloseEvents(mainWindow);
})

function handleCloseEvents(mainWindow: BrowserWindow) {
    let willClose = false;

    mainWindow.on('close', (e) => {
        if (willClose) {
            return;
        }
        e.preventDefault();
        mainWindow.hide();
        if (app.dock) {
            app.dock.hide();
        }
    });

    app.on('before-quit', () => {
        willClose = true;
    });

    mainWindow.on('show', () => {
        willClose = false;
    });
}
