// PopupContext.tsx
import React, { createContext, useContext, useState } from "react";
import { DAVCalendar } from "tsdav";

type PopupContextType = {
    popUps: {
        addEvent: {
            isPopupOpen: boolean
            popUpState: (status: "open" | "closed") => void;
        }
    },
    calendars: {
        setCalendars: (calendars: DAVCalendar[]) => void;
        setCalendarVisibility: (calendar: DAVCalendar) => void,
        getCalendars: () => { calendar: DAVCalendar, visibility: boolean }[];
        getCalendarVisiblity: (calendar: DAVCalendar) => boolean
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
    const [calendars, setCalendars] = useState<{ calendar: DAVCalendar, visibility: boolean }[]>([]);
    const saveCalendars = (calendars: DAVCalendar[]) => {
        const updatedCalendars = calendars.map(calendar => ({
            calendar,
            visibility: true,
        }));
        setCalendars(updatedCalendars)
        setCaUpdatetrigger(!calUpdateTrigger);
    }

    const calendarsProps = {
        setCalendars: saveCalendars,
        setCalendarVisibility: (calendar: DAVCalendar) => {
            setCalendars(prevCalendars =>
                prevCalendars.map(item =>
                    item.calendar === calendar
                        ? { ...item, visibility: !item.visibility }
                        : item
                )

            )
            setCaUpdatetrigger(!calUpdateTrigger)
        },
        getCalendars: () => calendars,
        getCalendarVisiblity: (calendar: DAVCalendar) => calendars.filter(cal => cal.calendar === calendar)[0].visibility
    }


    const updateTriggers = {
        calendars: calUpdateTrigger
    }



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
