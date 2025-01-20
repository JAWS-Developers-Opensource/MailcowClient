// CalendarWithPopup.js
import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css';
import EventPopup from '../../components/cal/NewEventComponent';
import EventHoverTooltip from '../../components/cal/EventHoverTooltip';
import ICAL from 'ical.js';
import { DAVCalendar } from 'tsdav';

const localizer = momentLocalizer(moment);

moment.locale("it-it", {
    week: {
        dow: 1 //Monday is the first day of the week.
    }
});

const CalendarPage = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [cals, setCals] = useState<DAVCalendar[]>();
    const calendarColors: Record<string, string> = {};

    const loadEvents = async () => {
        setEvents([]); // Reset degli eventi
        await window.electron.calCreateConn();

        const assignColorsToCalendars = (calendars: DAVCalendar[]) => {
            // Assegna un colore unico a ogni calendario
            const colors = ['#FF5733', '#33FF57', '#3357FF', '#FFC300', '#DAF7A6'];
            //console.log(calendars);
            
            calendars.forEach((cal, index) => {
                calendarColors[cal.displayName + ""] = colors[index % colors.length];
            });
        };

        window.electron.calGetCalendars().then((cals) => {
            setCals(cals);
            assignColorsToCalendars(cals);

            const allEvents: any[] = [];

            cals.forEach((cal) => {                
                window.electron.calQueryCalendar(cal, 1, 2025).then((icsEvents) => {
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
                                    color: calendarColors[cal.displayName] || '#808080', // Colore del calendario
                                };

                                allEvents.push(calendarEvent);
                            });
                        } catch (error) {
                            console.error('Errore nel parsare i dati:', error);
                        }
                    });

                    setEvents((prevEvents) => [...prevEvents, ...allEvents]);
                });
            });
        });
    };

    useEffect(() => {
        loadEvents();
    }, [])
    

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