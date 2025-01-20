import { DAVCalendar, DAVClient } from "tsdav";
import { getCredentials } from "./storage.js";

var davClient: DAVClient;

export const createConn = async () => {
    const credentials = await getCredentials();
    davClient = new DAVClient({
        serverUrl: `https://${credentials.host}/`,
        credentials: {
            username: credentials.email,
            password: credentials.password,
        },
        authMethod: 'Basic', // Usa Basic Auth per SOGo
        defaultAccountType: 'caldav',
    });
}

export const getCalendars = async () => {
    await davClient.login();
    return await davClient.fetchCalendars();
}

export const queryCalendar = async (params: { calendar: DAVCalendar, month: number, year: number }) => {
    // Calcola le date di inizio e fine per il mese richiesto
    const startDate = new Date(params.year, params.month, 1).toISOString();
    const endDate = new Date(params.year, params.month + 1, 0, 23, 59, 59).toISOString();

    // Esegui la query CalDAV
    await davClient.login();
    const events = await davClient.fetchCalendarObjects({
        calendar: params.calendar,
        filters: [
            {
                'comp-filter': {
                    _attributes: {
                        name: 'VCALENDAR',
                    },
                    'comp-filter': {
                        _attributes: {
                            name: 'VEVENT',
                        },
                        'time-range': {
                            _attributes: {
                                start: startDate.replace(/[-:]/g, "").split(".")[0] + "Z",
                                end: endDate.replace(/[-:]/g, "").split(".")[0] + "Z",
                            },
                        },
                    },
                },
            },
        ],
    });
    return events;
};