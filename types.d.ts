type ImapLogin = {
    status: "host-not-found" | "success" | "credentials" | "unkonw",
    info?: string
}

type UserCredentials = {
    email: string,
    password: string,
    host: string
}

type Calendar = {
    description: string,
    timezone: string,
    url: string,
    ctag: number,
    calendarColor: string,
    displayName: string,
    components: string[],
    resourcetype: string[],
    syncToken: number,
    projectedProps: object,
    reports: string[]
}

type EventPayloadMapping = {
    imapCheckCredentials: ImapLogin,
    saveUserCredentials: UserCredentials,
    getUserCredentials:  UserCredentials
    removeUserCredentials: void,
    calCreateConn: any,
    calGetCalendars: DAVCalendar[],
    calQueryCalendar: DAVResponse[]
}

interface Window {
    electron: {
        imapCheckCredentials: (email: string, password: string, host: string) => Promise<ImapLogin>,
        saveUserCredentials: (userCredentials: UserCredentials) => void,
        getUserCredentials: () => Promise<UserCredentials> 
        removeUserCredentials: () => Promise<void>,
        calCreateConn: () => Promise<any>,
        calGetCalendars: () => Promise<DAVCalendar[]>,
        calQueryCalendar: (calendar: DAVCalendar, month: number, year: number) => Promise<DAVResponse[]>
    }
}