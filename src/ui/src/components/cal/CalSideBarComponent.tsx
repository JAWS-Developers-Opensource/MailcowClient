import { Key, useEffect, useState } from "react"
import "./CalSideBarComponent.css"
import { useLoading } from "../../contexts/LoadingContext";
import { DAVCalendar } from "tsdav";
import { useVars } from "../../contexts/VarContext";
import { FaPlus } from "react-icons/fa";


export const CalSideBarComponent = () => {
    const { setLoadingStatus, loading } = useLoading();
    const { setVar } = useVars();

    const [calendars, setCalendars] = useState<DAVCalendar[]>([]);
    const [visibility, setVisibility] = useState<Record<number, boolean>>([]);

    const loadCal = async () => {
        setLoadingStatus(true);
        await window.electron.calCreateConn();
        window.electron.calGetCalendars().then((data: DAVCalendar[]) => {
            setCalendars(data);
            const initialVisibility = data.reduce((acc: any, cal: DAVCalendar) => {
                acc[cal?.ctag + ""] = true;
                return acc;
            }, {});
            setVisibility(initialVisibility);
            setVar("cal", "visibility", initialVisibility)
            setLoadingStatus(false)
        });
    };



    const toggleVisibility = (id: number) => {
        setVisibility((prevVisibility) => ({
            ...prevVisibility,
            [id]: !prevVisibility[id],
        }));
    };

    useEffect(() => {
        loadCal();
    }, []);

    useEffect(() => {
        setVar("cal", "visibility", visibility)
    }, [visibility])

    return (
        <div className="cal-sidebar-container">
            <h2 className="sidebar-title">Calendari</h2>
            <button className="add-event-button"><FaPlus /></button>
            <ul className="calendar-list">
                {calendars.map((calendar) => (
                    <li key={calendar.ctag} className="calendar-item">
                        <label className="calendar-label" style={{ color: calendar.calendarColor }}>
                            {calendar.displayName + ""}
                        </label>
                        <input
                            type="checkbox"
                            checked={visibility[parseInt(calendar.ctag + "")] || false}
                            onChange={() => toggleVisibility(parseInt(calendar.ctag + ""))}
                            className="calendar-checkbox"
                        />
                    </li>
                ))}
            </ul>
        </div>
    )
}