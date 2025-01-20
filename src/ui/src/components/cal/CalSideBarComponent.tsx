import { Key, useEffect, useState } from "react"
import "./CalSideBarComponent.css"
import { Calendar } from "dav";
import * as dav from 'dav';
import { useLoading } from "../../contexts/LoadingContext";


export const CalSideBarComponent = () => {
    const { setLoadingStatus } = useLoading();

    const [calendars, setCalendars] = useState<Calendar[]>([]);
    const [visibility, setVisibility] = useState<Record<number, boolean>>([]);

    const loadCal = async () => {
        setLoadingStatus(true);
        await window.electron.calCreateConn();
        window.electron.calGetCalendars().then((data: dav.Calendar[]) => {
            setCalendars(data);
            const initialVisibility = data.reduce((acc: any, cal: Calendar) => {
                acc[cal.ctag] = true;
                return acc;
            }, {});
            setVisibility(initialVisibility);
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
    return (
        <div className="cal-sidebar-container">
            <h2 className="sidebar-title">Calendari</h2>
            <ul className="calendar-list">
                {calendars.map((calendar) => (
                    <li key={calendar.ctag} className="calendar-item">
                        <label className="calendar-label">
                            {calendar.displayName}
                        </label>
                        <input
                            type="checkbox"
                            checked={visibility[parseInt(calendar.ctag)] || false}
                            onChange={() => toggleVisibility(parseInt(calendar.ctag))}
                            className="calendar-checkbox"
                        />
                    </li>
                ))}
            </ul>
        </div>
    )
}