type ImapLogin = {
    status: "host-not-found" | "success" | "credentials" | "unkonw",
    info?: string
}

type UserCredentials = {
    email: string,
    password: string,
    host: string
}

type OAuth2Credentials = {
    host: string,
    clientId: string,
    email: string,
    accessToken: string,
    refreshToken?: string | null,
}

type OAuth2AvailabilityResult = {
    available: boolean
}

type OAuth2LoginResult =
    | { success: true; accessToken: string; refreshToken?: string; email: string; expiresIn?: number }
    | { success: false; error: string }

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
    calQueryCalendar: DAVResponse[],
    checkOAuth2Available: OAuth2AvailabilityResult,
    startOAuth2Login: OAuth2LoginResult,
    saveOAuth2Credentials: void,
    getOAuth2Credentials: OAuth2Credentials | null,
    removeOAuth2Credentials: void,
}

interface Window {
    electron: {
        imapCheckCredentials: (email: string, password: string, host: string) => Promise<ImapLogin>,
        saveUserCredentials: (userCredentials: UserCredentials) => void,
        getUserCredentials: () => Promise<UserCredentials>
        removeUserCredentials: () => Promise<void>,
        calCreateConn: () => Promise<any>,
        calGetCalendars: () => Promise<DAVCalendar[]>,
        calQueryCalendar: (calendar: DAVCalendar, month: number, year: number) => Promise<DAVResponse[]>,
        checkOAuth2Available: (host: string) => Promise<OAuth2AvailabilityResult>,
        startOAuth2Login: (host: string, clientId: string, clientSecret?: string) => Promise<OAuth2LoginResult>,
        saveOAuth2Credentials: (credentials: OAuth2Credentials) => Promise<void>,
        getOAuth2Credentials: () => Promise<OAuth2Credentials | null>,
        removeOAuth2Credentials: () => Promise<void>,
    }
}