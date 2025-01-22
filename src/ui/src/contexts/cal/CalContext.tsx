// PopupContext.tsx
import React, { createContext, useContext, useState } from "react";
import { DAVCalendar } from "tsdav";

type PopupContextType = {
    popUps: {
        addEvent: {
            isPopupOpen: boolean;
            openPopup: () => void;
            closePopup: () => void;
        }
    }
    calendars: {
        setCalendars: () => void;
        setCalendarsVisiblity: () => void;
        getCalendars: () => DAVCalendar[];
        getCalendarsVisiblity: () => {calendar: }
    }
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const CalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPopupOpen, setPopupOpen] = useState(false);

    const openPopup = () => setPopupOpen(true);
    const closePopup = () => setPopupOpen(false);

    return (
        <PopupContext.Provider value={{ isPopupOpen, openPopup, closePopup }}>
            {children}
        </PopupContext.Provider>
    );
};

export const usePopup = () => {
    const context = useContext(PopupContext);
    if (!context) {
        throw new Error("usePopup must be used within a PopupProvider");
    }
    return context;
};
