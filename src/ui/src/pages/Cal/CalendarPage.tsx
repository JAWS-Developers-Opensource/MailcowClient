import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css';
import ICAL from 'ical.js';
import { DAVCalendar, DAVCalendarObject } from 'tsdav';
import { useLoading } from '../../contexts/LoadingContext';
import { ReactEventType } from '../../types/calendar.types';
import { useCalContext } from '../../contexts/cal/CalContext';
import NewEventComponent from '../../components/cal/NewEventComponent';
import { useNotification } from '../../contexts/NotificationContext';

const localizer = momentLocalizer(moment);

moment.locale('it-it', { week: { dow: 1 } });

const EMPTY_EVENT = {
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    allDay: false,
    calendarIndex: 0,
};

type RichEvent = ReactEventType & {
    calendarObject?: DAVCalendarObject;
    calendarIndex?: number;
};

const CalendarPage: React.FC = () => {
    const { setLoadingStatus, loading } = useLoading();
    const { calendars } = useCalContext();
    const { addNotification } = useNotification();

    const [events, setEvents] = useState<RichEvent[]>([]);
    const [calEvents, setCalEvents] = useState<{ calendar: DAVCalendar; events: RichEvent[] }[]>([]);
    const [allCalendars, setAllCalendars] = useState<DAVCalendar[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    // ── Event form state ──────────────────────────────────────────────────────
    const [showForm, setShowForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingObject, setEditingObject] = useState<DAVCalendarObject | null>(null);
    const [newEvent, setNewEvent] = useState({ ...EMPTY_EVENT });

    // ─────────────────────────────────────────────────────────────────────────

    const loadEvents = useCallback(async (date?: Date) => {
        const d = date ?? currentDate;
        setLoadingStatus(true);
        setCalEvents([]);

        try {
            await window.electron.calCreateConn();
            const cals = await window.electron.calGetCalendars();
            setAllCalendars(cals);
            calendars.setCalendars(cals);

            const calendarColors: Record<string, string> = {};
            cals.forEach((cal) => { calendarColors[String(cal.displayName)] = String(cal.calendarColor); });

            const all: { calendar: DAVCalendar; events: RichEvent[] }[] = [];

            for (const cal of cals) {
                const callEvents: RichEvent[] = [];
                try {
                    const icsEvents = await window.electron.calQueryCalendar(cal, d.getMonth(), d.getFullYear());
                    icsEvents.forEach((entry: any) => {
                        try {
                            const parsedData = ICAL.parse(entry.data);
                            const comp = new ICAL.Component(parsedData);
                            const vevents = comp.getAllSubcomponents('vevent');
                            vevents.forEach((vevent: any) => {
                                const event = new ICAL.Event(vevent);
                                callEvents.push({
                                    title: event.summary || 'Untitled',
                                    start: event.startDate.toJSDate(),
                                    end: event.endDate.toJSDate(),
                                    allDay: event.startDate.isDate,
                                    description: event.description || '',
                                    color: calendarColors[String(cal.displayName)] || '#808080',
                                    calendarObject: entry,
                                    calendarIndex: cals.indexOf(cal),
                                });
                            });
                        } catch { /* skip malformed events */ }
                    });
                } catch { /* skip failed calendar */ }
                all.push({ calendar: cal, events: callEvents });
            }

            setCalEvents(all);
        } catch (e: any) {
            addNotification("Calendar", `Failed to load events: ${e.message}`, 'error');
        } finally {
            setLoadingStatus(false);
        }
    }, [currentDate, addNotification]);

    useEffect(() => {
        loadEvents();
    }, []);

    useEffect(() => {
        const visible = calEvents
            .filter(({ calendar }) => {
                try { return calendars.getCalendarVisiblity(calendar); } catch { return true; }
            })
            .flatMap((c) => c.events);
        setEvents(visible);
    }, [calendars, calEvents]);

    // ── Navigate ──────────────────────────────────────────────────────────────

    const handleNavigate = (date: Date) => {
        setCurrentDate(date);
        loadEvents(date);
    };

    // ── Slot select (new event) ───────────────────────────────────────────────

    const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const fmtTime = (d: Date) => d.toTimeString().slice(0, 5);
        setNewEvent({
            ...EMPTY_EVENT,
            startDate: fmt(start),
            startTime: fmtTime(start),
            endDate: fmt(end),
            endTime: fmtTime(end),
            allDay: false,
            calendarIndex: 0,
        });
        setIsEditMode(false);
        setEditingObject(null);
        setShowForm(true);
    };

    // ── Event click (edit) ────────────────────────────────────────────────────

    const handleSelectEvent = (event: RichEvent) => {
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const fmtTime = (d: Date) => d.toTimeString().slice(0, 5);
        setNewEvent({
            title: event.title,
            description: event.description ?? '',
            location: '',
            startDate: fmt(event.start),
            startTime: fmtTime(event.start),
            endDate: fmt(event.end),
            endTime: fmtTime(event.end),
            allDay: event.allDay,
            calendarIndex: event.calendarIndex ?? 0,
        });
        setIsEditMode(true);
        setEditingObject(event.calendarObject ?? null);
        setShowForm(true);
    };

    // ── Save event ────────────────────────────────────────────────────────────

    const handleSaveEvent = async () => {
        if (!newEvent.title.trim()) {
            addNotification("Calendar", 'Please enter an event title.', 'error');
            return;
        }
        if (!newEvent.startDate) {
            addNotification("", 'Please enter a start date.', 'error');
            return;
        }

        const startISO = newEvent.allDay
            ? newEvent.startDate
            : `${newEvent.startDate}T${newEvent.startTime}:00`;
        const endISO = newEvent.allDay
            ? newEvent.endDate || newEvent.startDate
            : `${newEvent.endDate || newEvent.startDate}T${newEvent.endTime}:00`;

        try {
            if (isEditMode && editingObject) {
                await window.electron.calUpdateEvent({
                    calendarObject: editingObject,
                    title: newEvent.title,
                    description: newEvent.description,
                    location: newEvent.location,
                    startDate: startISO,
                    endDate: endISO,
                    allDay: newEvent.allDay,
                });
                addNotification("Calendar", 'Event updated!', 'success');
            } else {
                const calendar = allCalendars[newEvent.calendarIndex];
                if (!calendar) { addNotification("Calendar", 'No calendar selected.', 'error'); return; }
                await window.electron.calCreateEvent({
                    calendar,
                    title: newEvent.title,
                    description: newEvent.description,
                    location: newEvent.location,
                    startDate: startISO,
                    endDate: endISO,
                    allDay: newEvent.allDay,
                });
                addNotification("Calendar", 'Event created!', 'success');
            }
            setShowForm(false);
            loadEvents();
        } catch (e: any) {
            addNotification("Calendar", `Failed to save event: ${e.message}`, 'error');
        }
    };

    // ── Delete event ──────────────────────────────────────────────────────────

    const handleDeleteEvent = async () => {
        if (!editingObject) return;
        try {
            await window.electron.calDeleteEvent(editingObject);
            addNotification("Calendar", 'Event deleted.', 'success');
            setShowForm(false);
            loadEvents();
        } catch (e: any) {
            addNotification("", `Failed to delete: ${e.message}`, 'error');
        }
    };

    const eventStyleGetter = (event: any) => ({
        style: {
            backgroundColor: event.color,
            borderRadius: '4px',
            opacity: 0.85,
            color: '#fff',
            border: '0',
        },
    });

    if (loading) return <></>;

    return (
        <div className="calendar-container">
            {showForm && (
                <NewEventComponent
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    handleSaveEvent={handleSaveEvent}
                    closePopup={() => setShowForm(false)}
                    calendars={allCalendars}
                    isEdit={isEditMode}
                />
            )}

            {isEditMode && showForm && editingObject && (
                <div className="event-delete-bar">
                    <button className="event-delete-btn" onClick={handleDeleteEvent}>
                        🗑 Delete Event
                    </button>
                </div>
            )}

            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                selectable
                style={{ margin: '10px', flex: 1 }}
                eventPropGetter={eventStyleGetter}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                date={currentDate}
                onNavigate={handleNavigate}
            />
        </div>
    );
};

export default CalendarPage;
