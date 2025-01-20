import { app, BrowserWindow } from "electron"
import path from "path";
import { ipcHandle, ipcMainOn, isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";
import { ImapManager } from "./imap.js";
import { getCredentials, removeCredentials, saveCredentials } from "./storage.js";
import { createConnection } from "net";
import { createConn, getCalendars, queryCalendar } from "./caldav.js";

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
