import { Key, useEffect, useState } from "react"
import "./CalSideBarComponent.css"
import { useLoading } from "../../contexts/LoadingContext";
import { DAVCalendar } from "tsdav";
import { useVars } from "../../contexts/VarContext";
import { FaPlus } from "react-icons/fa";
import { useCalContext } from "../../contexts/cal/CalContext";


export const CalSideBarComponent = () => {
    const { setLoadingStatus } = useLoading();
    const { calendars } = useCalContext();

    const loadCal = async () => {
        setLoadingStatus(true);
        await window.electron.calCreateConn();
        window.electron.calGetCalendars().then((data: DAVCalendar[]) => calendars.setCalendars(data));
    };

    useEffect(() => {
        loadCal();
    }, []);
    
    return (
        <div className="cal-sidebar-container">
            <h2 className="sidebar-title">Calendari</h2>
            <button className="add-event-button"><FaPlus /></button>
            <ul className="calendar-list">
                {calendars.getCalendars().map(({ calendar, visibility }) => (
                    <li key={calendar.ctag} className="calendar-item">
                        <label className="calendar-label" style={{ color: calendar.calendarColor }}>
                            {calendar.displayName + ""}
                        </label>
                        <input
                            type="checkbox"
                            checked={visibility}
                            onChange={() => calendars.setCalendarVisibility(calendar)}
                            className="calendar-checkbox"
                        />
                    </li>
                ))}
            </ul>
        </div>
    )
}