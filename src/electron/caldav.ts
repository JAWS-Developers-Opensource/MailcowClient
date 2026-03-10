import { DAVCalendar, DAVClient, DAVCalendarObject } from 'tsdav';
import { getCredentials } from './storage.js';

let davClient: DAVClient;

// ─── Connection ───────────────────────────────────────────────────────────────

export const createConn = async () => {
    const credentials = await getCredentials();
    davClient = new DAVClient({
        serverUrl: `https://${credentials.host}/`,
        credentials: {
            username: credentials.email,
            password: credentials.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
    });
};

// ─── Calendars ────────────────────────────────────────────────────────────────

export const getCalendars = async () => {
    await davClient.login();
    return await davClient.fetchCalendars();
};

export const createCalendar = async (params: {
    displayName: string;
    color?: string;
    description?: string;
}): Promise<void> => {
    await davClient.login();
    const credentials = await getCredentials();
    const calendarId = generateUUID();
    const calendarUrl = `https://${credentials.host}/SOGo/dav/${encodeURIComponent(credentials.email)}/Calendar/${calendarId}/`;

    await davClient.makeCalendar({
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

    await davClient.login();
    const events = await davClient.fetchCalendarObjects({
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
    await davClient.login();
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

    await davClient.createCalendarObject({
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
    await davClient.login();

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

    await davClient.updateCalendarObject({
        calendarObject: {
            ...params.calendarObject,
            data: icsData,
        },
    });
};

export const deleteEvent = async (params: { calendarObject: DAVCalendarObject }): Promise<void> => {
    await davClient.login();
    await davClient.deleteCalendarObject({ calendarObject: params.calendarObject });
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
