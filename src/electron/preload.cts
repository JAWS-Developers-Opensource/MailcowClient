const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Auth
  imapCheckCredentials: (email, password, host) => ipcInvoke('imapCheckCredentials', { email, password, host }),
  saveUserCredentials: (userCredentials) => ipcSend('saveUserCredentials', userCredentials),
  getUserCredentials: () => ipcInvoke('getUserCredentials'),
  removeUserCredentials: () => ipcInvoke('removeUserCredentials'),
  // OAuth2
  checkOAuth2Available: (host) => ipcInvoke('checkOAuth2Available', { host }),
  startOAuth2Login: (host, clientId, clientSecret) => ipcInvoke('startOAuth2Login', { host, clientId, clientSecret }),
  saveOAuth2Credentials: (credentials) => ipcInvoke('saveOAuth2Credentials', credentials),
  getOAuth2Credentials: () => ipcInvoke('getOAuth2Credentials'),
  removeOAuth2Credentials: () => ipcInvoke('removeOAuth2Credentials'),
  // IMAP – email
  imapFetchFolders: () => ipcInvoke('imapFetchFolders'),
  imapFetchEmails: (folder, page, limit) => ipcInvoke('imapFetchEmails', { folder, page, limit }),
  imapFetchEmailBody: (folder, uid) => ipcInvoke('imapFetchEmailBody', { folder, uid }),
  imapDeleteEmail: (folder, uid) => ipcInvoke('imapDeleteEmail', { folder, uid }),
  imapMoveEmail: (folder, uid, toFolder) => ipcInvoke('imapMoveEmail', { folder, uid, toFolder }),
  imapMarkEmailSeen: (folder, uid, seen) => ipcInvoke('imapMarkEmailSeen', { folder, uid, seen }),
  // SMTP
  smtpSendEmail: (params) => ipcInvoke('smtpSendEmail', params),
  // CalDAV
  calCreateConn: () => ipcInvoke('calCreateConn'),
  calGetCalendars: () => ipcInvoke('calGetCalendars'),
  calQueryCalendar: (calendar, month, year) => ipcInvoke('calQueryCalendar', { calendar, month, year }),
  calCreateEvent: (params) => ipcInvoke('calCreateEvent', params),
  calUpdateEvent: (params) => ipcInvoke('calUpdateEvent', params),
  calDeleteEvent: (calendarObject) => ipcInvoke('calDeleteEvent', { calendarObject }),
  calCreateCalendar: (params) => ipcInvoke('calCreateCalendar', params),
  // CardDAV
  cardCreateConn: () => ipcInvoke('cardCreateConn'),
  cardFetchAddressBooks: () => ipcInvoke('cardFetchAddressBooks'),
  cardFetchContacts: (addressBook) => ipcInvoke('cardFetchContacts', { addressBook }),
  cardCreateContact: (params) => ipcInvoke('cardCreateContact', params),
  cardUpdateContact: (params) => ipcInvoke('cardUpdateContact', params),
  cardDeleteContact: (vCard) => ipcInvoke('cardDeleteContact', { vCard }),
  // Settings
  settingsSaveApiKey: (apiKey) => ipcInvoke('settingsSaveApiKey', { apiKey }),
  settingsGetApiKey: () => ipcInvoke('settingsGetApiKey'),
  settingsMailcowGetOverview: () => ipcInvoke('settingsMailcowGetOverview'),
  settingsMailcowCreateAlias: (address, goto, active) => ipcInvoke('settingsMailcowCreateAlias', { address, goto, active }),
  settingsMailcowDeleteAlias: (address) => ipcInvoke('settingsMailcowDeleteAlias', { address }),
  settingsMailcowCreateAppPassword: (description, appPassword) => ipcInvoke('settingsMailcowCreateAppPassword', { description, appPassword }),
  settingsMailcowDeleteAppPassword: (id) => ipcInvoke('settingsMailcowDeleteAppPassword', { id }),
  settingsMailcowUpdateUserAcl: (aclJson) => ipcInvoke('settingsMailcowUpdateUserAcl', { aclJson }),
  // Updater
  checkForUpdates: () => ipcInvoke('checkForUpdates'),
  getAppVersion: () => ipcInvoke('getAppVersion'),
} satisfies Window['electron'])

function ipcInvoke<Key extends keyof EventPayloadMapping>(
  key: Key,
  params?: any
): Promise<EventPayloadMapping[Key]> {
  return ipcRenderer.invoke(key, params);
}

function ipcSend<Key extends keyof EventPayloadMapping>(
  key: Key,
  payload: EventPayloadMapping[Key]
) {
  ipcRenderer.send(key, payload);
}
