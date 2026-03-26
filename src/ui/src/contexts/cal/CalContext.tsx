// PopupContext.tsx
import React, { createContext, useContext, useState } from "react";
import { DAVCalendar } from "tsdav";

export type AccountCalendarEntry = {
    accountEmail: string;
    accountHost: string;
    accountLabel?: string;
    calendar: DAVCalendar;
    visibility: boolean;
};

type PopupContextType = {
    popUps: {
        addEvent: {
            isPopupOpen: boolean
            popUpState: (status: "open" | "closed") => void;
        }
    },
    calendars: {
        setCalendars: (calendars: DAVCalendar[]) => void;
        setAllAccountCalendars: (results: AccountCalendarsResult[]) => void;
        setCalendarVisibility: (calendar: DAVCalendar) => void,
        getCalendars: () => { calendar: DAVCalendar, visibility: boolean }[];
        getCalendarVisiblity: (calendar: DAVCalendar) => boolean;
        getCalendarsGroupedByAccount: () => { accountEmail: string; accountHost: string; accountLabel?: string; entries: AccountCalendarEntry[] }[];
    },
    updateTriggers: {
        calendars: boolean
    }
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const CalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPopupOpen, setPopupOpen] = useState(false);
    const popUpProps = {
        addEvent: {
            isPopupOpen: isPopupOpen,
            popUpState: (status: "open" | "closed") => setPopupOpen(status === "open" ? true : false),
        }
    }

    const [calUpdateTrigger, setCaUpdatetrigger] = useState(false);
    const [allEntries, setAllEntries] = useState<AccountCalendarEntry[]>([]);

    const saveCalendars = (cals: DAVCalendar[]) => {
        setAllEntries(prev => {
            // Preserve existing visibility state; add new entries visible by default
            const updated = cals.map(calendar => {
                const existing = prev.find(e => e.calendar === calendar || e.calendar.url === calendar.url);
                return {
                    accountEmail: '',
                    accountHost: '',
                    calendar,
                    visibility: existing?.visibility ?? true,
                };
            });
            return updated;
        });
        setCaUpdatetrigger(v => !v);
    };

    const saveAllAccountCalendars = (results: AccountCalendarsResult[]) => {
        setAllEntries(prev => {
            const updated: AccountCalendarEntry[] = [];
            for (const result of results) {
                for (const calendar of result.calendars) {
                    const existing = prev.find(
                        e => e.calendar.url === calendar.url && e.accountEmail === result.accountEmail
                    );
                    updated.push({
                        accountEmail: result.accountEmail,
                        accountHost: result.accountHost,
                        accountLabel: result.accountLabel,
                        calendar,
                        visibility: existing?.visibility ?? true,
                    });
                }
            }
            return updated;
        });
        setCaUpdatetrigger(v => !v);
    };

    const calendarsProps = {
        setCalendars: saveCalendars,
        setAllAccountCalendars: saveAllAccountCalendars,
        setCalendarVisibility: (calendar: DAVCalendar) => {
            setAllEntries(prev =>
                prev.map(item =>
                    item.calendar === calendar
                        ? { ...item, visibility: !item.visibility }
                        : item
                )
            );
            setCaUpdatetrigger(v => !v);
        },
        getCalendars: () => allEntries.map(e => ({ calendar: e.calendar, visibility: e.visibility })),
        getCalendarVisiblity: (calendar: DAVCalendar) => {
            const found = allEntries.find(e => e.calendar === calendar);
            return found?.visibility ?? true;
        },
        getCalendarsGroupedByAccount: () => {
            const groups: Record<string, { accountEmail: string; accountHost: string; accountLabel?: string; entries: AccountCalendarEntry[] }> = {};
            for (const entry of allEntries) {
                const key = `${entry.accountEmail}|${entry.accountHost}`;
                if (!groups[key]) {
                    groups[key] = { accountEmail: entry.accountEmail, accountHost: entry.accountHost, accountLabel: entry.accountLabel, entries: [] };
                }
                groups[key].entries.push(entry);
            }
            return Object.values(groups);
        },
    };

    const updateTriggers = {
        calendars: calUpdateTrigger
    };

    return (
        <PopupContext.Provider value={{ popUps: popUpProps, calendars: calendarsProps, updateTriggers}}>
            {children}
        </PopupContext.Provider>
    );
};

export const useCalContext = () => {
    const context = useContext(PopupContext);
    if (!context) {
        throw new Error("usePopup must be used within a PopupProvider");
    }
    return context;
};
