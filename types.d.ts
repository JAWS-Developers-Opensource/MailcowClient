// ─── Auth ─────────────────────────────────────────────────────────────────────

type ImapLogin = {
    status: 'host-not-found' | 'success' | 'credentials' | 'unkonw';
    info?: string;
};

type UserCredentials = {
    email: string;
    password: string;
    host: string;
};

type OAuth2Credentials = {
    host: string;
    clientId: string;
    email: string;
    accessToken: string;
    refreshToken?: string | null;
};

type OAuth2AvailabilityResult = {
    available: boolean;
};

type OAuth2LoginResult =
    | { success: true; accessToken: string; refreshToken?: string; email: string; expiresIn?: number }
    | { success: false; error: string };

// ─── Calendar ─────────────────────────────────────────────────────────────────

type Calendar = {
    description: string;
    timezone: string;
    url: string;
    ctag: number;
    calendarColor: string;
    displayName: string;
    components: string[];
    resourcetype: string[];
    syncToken: number;
    projectedProps: object;
    reports: string[];
};

// ─── Email (IMAP) ─────────────────────────────────────────────────────────────

type ImapFolderList = {
    success: boolean;
    folders: string[];
    error?: string;
};

type ImapEmail = {
    uid: number;
    subject: string;
    from: string;
    to: string;
    date: string;
    flags: string[];
    folder: string;
};

type ImapEmailList = {
    success: boolean;
    emails: ImapEmail[];
    hasMore: boolean;
    total: number;
    error?: string;
};

type ImapEmailBody = {
    success: boolean;
    uid?: number;
    subject?: string;
    from?: string;
    to?: string;
    date?: string;
    bodyText?: string;
    bodyHtml?: string;
    error?: string;
};

// ─── Email (SMTP) ─────────────────────────────────────────────────────────────

type SmtpSendResult = {
    success: boolean;
    messageId?: string;
    error?: string;
};

// ─── Contacts ─────────────────────────────────────────────────────────────────

type ParsedContact = {
    uid: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    notes: string;
    url?: string;
    etag?: string;
};

// ─── IPC payload mapping ──────────────────────────────────────────────────────

type EventPayloadMapping = {
    // Auth / credentials
    imapCheckCredentials: ImapLogin;
    saveUserCredentials: UserCredentials;
    getUserCredentials: UserCredentials;
    removeUserCredentials: void;
    // OAuth2
    checkOAuth2Available: OAuth2AvailabilityResult;
    startOAuth2Login: OAuth2LoginResult;
    saveOAuth2Credentials: void;
    getOAuth2Credentials: OAuth2Credentials | null;
    removeOAuth2Credentials: void;
    // IMAP – email
    imapFetchFolders: ImapFolderList;
    imapFetchEmails: ImapEmailList;
    imapFetchEmailBody: ImapEmailBody;
    imapDeleteEmail: void;
    imapMoveEmail: void;
    imapMarkEmailSeen: void;
    // SMTP – send
    smtpSendEmail: SmtpSendResult;
    // CalDAV
    calCreateConn: any;
    calGetCalendars: DAVCalendar[];
    calQueryCalendar: DAVResponse[];
    calCreateEvent: void;
    calUpdateEvent: void;
    calDeleteEvent: void;
    calCreateCalendar: void;
    // CardDAV
    cardCreateConn: void;
    cardFetchAddressBooks: DAVAddressBook[];
    cardFetchContacts: DAVVCard[];
    cardCreateContact: void;
    cardUpdateContact: void;
    cardDeleteContact: void;
    // Settings
    settingsSaveApiKey: void;
    settingsGetApiKey: string | null;
};

// ─── Window.electron interface ────────────────────────────────────────────────

interface Window {
    electron: {
        // Auth
        imapCheckCredentials: (email: string, password: string, host: string) => Promise<ImapLogin>;
        saveUserCredentials: (userCredentials: UserCredentials) => void;
        getUserCredentials: () => Promise<UserCredentials>;
        removeUserCredentials: () => Promise<void>;
        // OAuth2
        checkOAuth2Available: (host: string) => Promise<OAuth2AvailabilityResult>;
        startOAuth2Login: (host: string, clientId: string, clientSecret?: string) => Promise<OAuth2LoginResult>;
        saveOAuth2Credentials: (credentials: OAuth2Credentials) => Promise<void>;
        getOAuth2Credentials: () => Promise<OAuth2Credentials | null>;
        removeOAuth2Credentials: () => Promise<void>;
        // IMAP – email
        imapFetchFolders: () => Promise<ImapFolderList>;
        imapFetchEmails: (folder: string, page: number, limit: number) => Promise<ImapEmailList>;
        imapFetchEmailBody: (folder: string, uid: number) => Promise<ImapEmailBody>;
        imapDeleteEmail: (folder: string, uid: number) => Promise<void>;
        imapMoveEmail: (folder: string, uid: number, toFolder: string) => Promise<void>;
        imapMarkEmailSeen: (folder: string, uid: number, seen: boolean) => Promise<void>;
        // SMTP
        smtpSendEmail: (params: {
            to: string;
            cc?: string;
            bcc?: string;
            subject: string;
            body: string;
            isHtml?: boolean;
            replyTo?: string;
        }) => Promise<SmtpSendResult>;
        // CalDAV
        calCreateConn: () => Promise<any>;
        calGetCalendars: () => Promise<DAVCalendar[]>;
        calQueryCalendar: (calendar: DAVCalendar, month: number, year: number) => Promise<DAVResponse[]>;
        calCreateEvent: (params: {
            calendar: DAVCalendar;
            title: string;
            description?: string;
            location?: string;
            startDate: string;
            endDate: string;
            allDay?: boolean;
        }) => Promise<void>;
        calUpdateEvent: (params: {
            calendarObject: DAVCalendarObject;
            title: string;
            description?: string;
            location?: string;
            startDate: string;
            endDate: string;
            allDay?: boolean;
        }) => Promise<void>;
        calDeleteEvent: (calendarObject: DAVCalendarObject) => Promise<void>;
        calCreateCalendar: (params: { displayName: string; color?: string; description?: string }) => Promise<void>;
        // CardDAV
        cardCreateConn: () => Promise<void>;
        cardFetchAddressBooks: () => Promise<DAVAddressBook[]>;
        cardFetchContacts: (addressBook: DAVAddressBook) => Promise<DAVVCard[]>;
        cardCreateContact: (params: {
            addressBook: DAVAddressBook;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string;
            company?: string;
            notes?: string;
        }) => Promise<void>;
        cardUpdateContact: (params: {
            vCard: DAVVCard;
            firstName: string;
            lastName: string;
            email: string;
            phone?: string;
            company?: string;
            notes?: string;
        }) => Promise<void>;
        cardDeleteContact: (vCard: DAVVCard) => Promise<void>;
        // Settings
        settingsSaveApiKey: (apiKey: string) => Promise<void>;
        settingsGetApiKey: () => Promise<string | null>;
    };
}
