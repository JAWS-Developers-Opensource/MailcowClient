// CalendarWithPopup.js
import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css';
import ICAL from 'ical.js';
import { DAVCalendar } from 'tsdav';
import { useLoading } from '../../contexts/LoadingContext';
import { ReactEventType } from '../../types/calendar.types';
import { useVars } from '../../contexts/VarContext';

const localizer = momentLocalizer(moment);

moment.locale("it-it", {
    week: {
        dow: 1 //Monday is the first day of the week.
    }
});

const CalendarPage: React.FC = ({ }) => {
    const { setLoadingStatus, loading } = useLoading();
    const { getVar, cal } = useVars();

    const [events, setEvents] = useState<any[]>([]);
    const [cals, setCals] = useState<DAVCalendar[]>();
    const [calEvents, setCalEvents] = useState<{ clendar: DAVCalendar, events: ReactEventType[] }[]>([])
    const calendarColors: Record<string, string> = {};

    const loadEvents = async () => {
        setEvents([]);
        await window.electron.calCreateConn();

        const assignColorsToCalendars = (calendars: DAVCalendar[]) => {

            calendars.forEach((cal, index) => {
                calendarColors[cal.displayName + ""] = cal.calendarColor + "";
            });
        };

        await window.electron.calGetCalendars().then((cals) => {

            setCals(cals);
            assignColorsToCalendars(cals);

            cals.forEach(async (cal: DAVCalendar) => {
                const callEvents: ReactEventType[] = [];
                await window.electron.calQueryCalendar(cal, 1, 2025).then((icsEvents) => {
                    icsEvents.forEach((entry) => {
                        try {
                            const parsedData = ICAL.parse(entry.data);
                            const comp = new ICAL.Component(parsedData);
                            const vevents = comp.getAllSubcomponents('vevent');

                            vevents.forEach((vevent) => {
                                const event = new ICAL.Event(vevent);

                                const calendarEvent = {
                                    title: event.summary || 'Senza titolo',
                                    start: event.startDate.toJSDate(),
                                    end: event.endDate.toJSDate(),
                                    allDay: event.startDate.isDate,
                                    description: event.description || '',
                                    color: calendarColors[cal.displayName + ""] || '#808080',
                                };

                                callEvents.push(calendarEvent);
                            });
                        } catch (error) {
                            console.error('Errore nel parsare i dati:', error);
                        }
                    });
                });
                setCalEvents(prev => [...prev, { clendar: cal, events: callEvents}])
            });
        });
        setLoadingStatus(false)
    };

    useEffect(() => {
        setLoadingStatus(true)
        loadEvents();
    }, [])


    useEffect(() => {
        const visibleCals = getVar("cal", "visibility");
        console.log(visibleCals);
        console.log(cal);
        
        

        const allVisibleEvents = calEvents
            .filter(cal => visibleCals[cal.clendar.ctag + ""]) 
            .flatMap(cal => cal.events);

        setEvents(allVisibleEvents);
    }, [calEvents, cal]);

    const eventStyleGetter = (event: any) => {
        return {
            style: {
                backgroundColor: event.color,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block',
            },
        };
    };

    if (loading)
        return <></>;

    console.log("render");

    return (
        <div className="calendar-container">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                selectable
                style={{ margin: '20px' }}
                eventPropGetter={eventStyleGetter} // Applica lo stile dinamico
            />
        </div>
    );
};

export default CalendarPage;