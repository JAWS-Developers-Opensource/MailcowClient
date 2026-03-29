import { DAVCalendar, DAVClient, DAVCalendarObject } from 'tsdav';
import { getCredentials, getAccountsWithCredentials } from './storage.js';
import Logger from './helpers/Logger.js';

async function getClientForCredentials(creds: { email: string; password: string; host: string }): Promise<DAVClient> {
    if (!creds?.host || !creds?.email || !creds?.password) {
        throw new Error('Missing CalDAV credentials');
    }

    const client = new DAVClient({
        serverUrl: `https://${creds.host}/`,
        credentials: {
            username: creds.email,
            password: creds.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
    });

    await client.login();
    return client;
}

async function getLoggedCalDavClient(): Promise<DAVClient> {
    const credentials = await getCredentials();
    return getClientForCredentials(credentials);
}

// ─── Connection ───────────────────────────────────────────────────────────────

export const createConn = async () => {
    await getLoggedCalDavClient();
};

// ─── Calendars ────────────────────────────────────────────────────────────────

export const getCalendars = async () => {
    const client = await getLoggedCalDavClient();
    return await client.fetchCalendars();
};

export const createCalendar = async (params: {
    displayName: string;
    color?: string;
    description?: string;
}): Promise<void> => {
    const client = await getLoggedCalDavClient();
    const credentials = await getCredentials();
    const calendarId = generateUUID();
    const calendarUrl = `https://${credentials.host}/SOGo/dav/${encodeURIComponent(credentials.email)}/Calendar/${calendarId}/`;

    await client.makeCalendar({
        url: calendarUrl,
        props: {
            displayname: params.displayName,
            'calendar-description': params.description ?? '',
            'calendar-color': params.color ?? '#3498db',
        },
    });
};

// ─── Multi-account calendars ──────────────────────────────────────────────────

export type AccountCalendarsResult = {
    accountEmail: string;
    accountHost: string;
    accountLabel?: string;
    calendars: DAVCalendar[];
};

export const getCalendarsAllAccounts = async (): Promise<AccountCalendarsResult[]> => {
    const accounts = await getAccountsWithCredentials();
    const primary = await getCredentials();

    let allAccounts = [...accounts];
    if (primary.email && primary.host && primary.password) {
        const exists = accounts.some(a => a.email === primary.email && a.host === primary.host);
        if (!exists) {
            allAccounts.unshift({ email: primary.email, password: primary.password, host: primary.host });
        }
    }

    const results: AccountCalendarsResult[] = [];
    for (const account of allAccounts) {
        try {
            const client = await getClientForCredentials(account);
            const cals = await client.fetchCalendars();
            results.push({ accountEmail: account.email, accountHost: account.host, accountLabel: account.label, calendars: cals });
        } catch (e: any) {
            Logger.error('caldav', `Failed to fetch calendars for ${account.email}: ${e?.message}`);
        }
    }
    return results;
};

export const queryCalendarForAccount = async (params: {
    accountEmail: string;
    accountHost: string;
    calendar: DAVCalendar;
    month: number;
    year: number;
}): Promise<DAVCalendarObject[]> => {
    const accounts = await getAccountsWithCredentials();
    const account = accounts.find(a => a.email === params.accountEmail && a.host === params.accountHost);
    const primary = await getCredentials();
    const creds = account ?? primary;
    if (!creds.email || !creds.password || !creds.host) throw new Error('No credentials found for account');
    const client = await getClientForCredentials(creds);
    const startDate = new Date(params.year, params.month, 1).toISOString();
    const endDate = new Date(params.year, params.month + 1, 0, 23, 59, 59).toISOString();
    return client.fetchCalendarObjects({
        calendar: params.calendar,
        filters: [{
            'comp-filter': {
                _attributes: { name: 'VCALENDAR' },
                'comp-filter': {
                    _attributes: { name: 'VEVENT' },
                    'time-range': {
                        _attributes: {
                            start: startDate.replace(/[-:]/g, '').split('.')[0] + 'Z',
                            end: endDate.replace(/[-:]/g, '').split('.')[0] + 'Z',
                        },
                    },
                },
            },
        }],
    });
};

export const createEventForAccount = async (params: {
    accountEmail: string;
    accountHost: string;
    calendar: DAVCalendar;
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate: string;
    allDay?: boolean;
}): Promise<void> => {
    const accounts = await getAccountsWithCredentials();
    const account = accounts.find(a => a.email === params.accountEmail && a.host === params.accountHost);
    const primary = await getCredentials();
    const creds = account ?? primary;
    const client = await getClientForCredentials(creds);
    const uid = generateUUID();
    const icsData = buildICSEvent({
        uid,
        title: params.title,
        description: params.description ?? '',
        location: params.location ?? '',
        startDate: params.startDate,
        endDate: params.endDate,
        allDay: params.allDay ?? false,
    });
    await client.createCalendarObject({
        calendar: params.calendar,
        filename: `${uid}.ics`,
        iCalString: icsData,
    });
};

export const createCalendarForAccount = async (params: {
    accountEmail: string;
    accountHost: string;
    displayName: string;
    color?: string;
    description?: string;
}): Promise<void> => {
    const accounts = await getAccountsWithCredentials();
    const account = accounts.find(a => a.email === params.accountEmail && a.host === params.accountHost);
    const primary = await getCredentials();
    const creds = account ?? primary;
    const client = await getClientForCredentials(creds);
    const calendarId = generateUUID();
    const calendarUrl = `https://${creds.host}/SOGo/dav/${encodeURIComponent(creds.email ?? '')}/Calendar/${calendarId}/`;
    await client.makeCalendar({
        url: calendarUrl,
        props: {
            displayname: params.displayName,
            'calendar-description': params.description ?? '',
            'calendar-color': params.color ?? '#3498db',
        },
    });
};

// ─── Event queries ────────────────────────────────────────────────────────────

export const queryCalendar = async (params: {
    calendar: DAVCalendar;
    month: number;
    year: number;
}) => {
    const startDate = new Date(params.year, params.month, 1).toISOString();
    const endDate = new Date(params.year, params.month + 1, 0, 23, 59, 59).toISOString();

    const client = await getLoggedCalDavClient();
    const events = await client.fetchCalendarObjects({
        calendar: params.calendar,
        filters: [
            {
                'comp-filter': {
                    _attributes: { name: 'VCALENDAR' },
                    'comp-filter': {
                        _attributes: { name: 'VEVENT' },
                        'time-range': {
                            _attributes: {
                                start: startDate.replace(/[-:]/g, '').split('.')[0] + 'Z',
                                end: endDate.replace(/[-:]/g, '').split('.')[0] + 'Z',
                            },
                        },
                    },
                },
            },
        ],
    });
    return events;
};

// ─── Event CRUD ───────────────────────────────────────────────────────────────

export const createEvent = async (params: {
    calendar: DAVCalendar;
    title: string;
    description?: string;
    location?: string;
    startDate: string;  // ISO string
    endDate: string;    // ISO string
    allDay?: boolean;
}): Promise<void> => {
    const client = await getLoggedCalDavClient();
    const uid = generateUUID();
    const icsData = buildICSEvent({
        uid,
        title: params.title,
        description: params.description ?? '',
        location: params.location ?? '',
        startDate: params.startDate,
        endDate: params.endDate,
        allDay: params.allDay ?? false,
    });

    await client.createCalendarObject({
        calendar: params.calendar,
        filename: `${uid}.ics`,
        iCalString: icsData,
    });
};

export const updateEvent = async (params: {
    calendarObject: DAVCalendarObject;
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate: string;
    allDay?: boolean;
}): Promise<void> => {
    const client = await getLoggedCalDavClient();

    // Extract UID from existing ICS
    const uid = extractUID(params.calendarObject.data ?? '') || generateUUID();
    const icsData = buildICSEvent({
        uid,
        title: params.title,
        description: params.description ?? '',
        location: params.location ?? '',
        startDate: params.startDate,
        endDate: params.endDate,
        allDay: params.allDay ?? false,
    });

    await client.updateCalendarObject({
        calendarObject: {
            ...params.calendarObject,
            data: icsData,
        },
    });
};

export const deleteEvent = async (params: { calendarObject: DAVCalendarObject }): Promise<void> => {
    const client = await getLoggedCalDavClient();
    await client.deleteCalendarObject({ calendarObject: params.calendarObject });
};

// ─── ICS helpers ─────────────────────────────────────────────────────────────

function buildICSEvent(params: {
    uid: string;
    title: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    allDay: boolean;
}): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let dtStart: string;
    let dtEnd: string;

    if (params.allDay) {
        dtStart = `DTSTART;VALUE=DATE:${params.startDate.replace(/-/g, '').substring(0, 8)}`;
        dtEnd = `DTEND;VALUE=DATE:${params.endDate.replace(/-/g, '').substring(0, 8)}`;
    } else {
        dtStart = `DTSTART:${new Date(params.startDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
        dtEnd = `DTEND:${new Date(params.endDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    }

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MailcowClient//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${params.uid}@mailcow-client`,
        `DTSTAMP:${now}`,
        `CREATED:${now}`,
        `LAST-MODIFIED:${now}`,
        dtStart,
        dtEnd,
        `SUMMARY:${escapeICS(params.title)}`,
        `DESCRIPTION:${escapeICS(params.description)}`,
        `LOCATION:${escapeICS(params.location)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

function escapeICS(value: string): string {
    return value.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

function extractUID(icsData: string): string {
    const match = icsData.match(/^UID:(.+)$/m);
    return match ? match[1].trim() : '';
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
