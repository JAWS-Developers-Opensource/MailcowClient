import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
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
import { FiRefreshCw, FiPlus } from 'react-icons/fi';

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
    description?: string;
    location?: string;
};

const CalendarPage: React.FC = () => {
    const { setLoadingStatus, loading } = useLoading();
    const { calendars, updateTriggers } = useCalContext();
    const { addNotification } = useNotification();

    const [events, setEvents] = useState<RichEvent[]>([]);
    const [calEvents, setCalEvents] = useState<{ calendar: DAVCalendar; events: RichEvent[] }[]>([]);
    const [allCalendars, setAllCalendars] = useState<DAVCalendar[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState<string>(Views.MONTH);

    // ── Event form state ──────────────────────────────────────────────────────
    const [showForm, setShowForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingObject, setEditingObject] = useState<DAVCalendarObject | null>(null);
    const [newEvent, setNewEvent] = useState({ ...EMPTY_EVENT });

    // ── Selected event detail ─────────────────────────────────────────────────
    const [selectedEvent, setSelectedEvent] = useState<RichEvent | null>(null);

    // ─────────────────────────────────────────────────────────────────────────

    const loadEvents = useCallback(async (date?: Date) => {
        const d = date ?? currentDate;
        setLoadingStatus(true);
        setCalEvents([]);

        try {
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
                                    location: event.location || '',
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
            addNotification('Calendar', `Failed to load events: ${e.message}`, 'error');
        } finally {
            setLoadingStatus(false);
        }
    }, [currentDate, addNotification]);

    useEffect(() => { loadEvents(); }, []);

    useEffect(() => {
        const visible = calEvents
            .filter(({ calendar }) => {
                try { return calendars.getCalendarVisiblity(calendar); } catch { return true; }
            })
            .flatMap((c) => c.events);
        setEvents(visible);
    }, [calEvents, updateTriggers.calendars]);

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
        setSelectedEvent(null);
        setShowForm(true);
    };

    // ── Event click ───────────────────────────────────────────────────────────
    const handleSelectEvent = (event: RichEvent) => {
        setSelectedEvent(event);
    };

    // ── Open edit form from detail ────────────────────────────────────────────
    const handleEditEvent = (event: RichEvent) => {
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const fmtTime = (d: Date) => d.toTimeString().slice(0, 5);
        setNewEvent({
            title: event.title,
            description: event.description ?? '',
            location: event.location ?? '',
            startDate: fmt(event.start),
            startTime: fmtTime(event.start),
            endDate: fmt(event.end),
            endTime: fmtTime(event.end),
            allDay: event.allDay,
            calendarIndex: event.calendarIndex ?? 0,
        });
        setIsEditMode(true);
        setEditingObject(event.calendarObject ?? null);
        setSelectedEvent(null);
        setShowForm(true);
    };

    // ── Save event ────────────────────────────────────────────────────────────
    const handleSaveEvent = async () => {
        if (!newEvent.title.trim()) {
            addNotification('Calendar', 'Please enter an event title.', 'error');
            return;
        }
        if (!newEvent.startDate) {
            addNotification('', 'Please enter a start date.', 'error');
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
                addNotification('Calendar', 'Event updated!', 'success');
            } else {
                const calendar = allCalendars[newEvent.calendarIndex];
                if (!calendar) { addNotification('Calendar', 'No calendar selected.', 'error'); return; }
                await window.electron.calCreateEvent({
                    calendar,
                    title: newEvent.title,
                    description: newEvent.description,
                    location: newEvent.location,
                    startDate: startISO,
                    endDate: endISO,
                    allDay: newEvent.allDay,
                });
                addNotification('Calendar', 'Event created!', 'success');
            }
            setShowForm(false);
            loadEvents();
        } catch (e: any) {
            addNotification('Calendar', `Failed to save event: ${e.message}`, 'error');
        }
    };

    // ── Delete event ──────────────────────────────────────────────────────────
    const handleDeleteEvent = async (obj?: DAVCalendarObject | null) => {
        const target = obj ?? editingObject;
        if (!target) return;
        try {
            await window.electron.calDeleteEvent(target);
            addNotification('Calendar', 'Event deleted.', 'success');
            setShowForm(false);
            setSelectedEvent(null);
            loadEvents();
        } catch (e: any) {
            addNotification('', `Failed to delete: ${e.message}`, 'error');
        }
    };

    const eventStyleGetter = (event: any) => ({
        style: {
            backgroundColor: event.color || 'var(--primary-color, #007bff)',
            borderRadius: '5px',
            color: '#fff',
            border: 'none',
            fontSize: '0.8rem',
            padding: '2px 6px',
        },
    });

    const todayEvents = events.filter((e) => {
        const today = new Date();
        return e.start.toDateString() === today.toDateString();
    });

    if (loading) return <div className="cal-loading">Loading…</div>;

    return (
        <div className="calendar-page">
            {/* ── Toolbar ───────────────────────────────────────────── */}
            <div className="cal-toolbar">
                <div className="cal-toolbar-left">
                    <button className="cal-new-btn" onClick={() => {
                        const now = new Date();
                        const fmt = (d: Date) => d.toISOString().split('T')[0];
                        setNewEvent({ ...EMPTY_EVENT, startDate: fmt(now), endDate: fmt(now) });
                        setIsEditMode(false);
                        setEditingObject(null);
                        setSelectedEvent(null);
                        setShowForm(true);
                    }}>
                        <FiPlus size={14} /> New Event
                    </button>
                </div>
                <div className="cal-toolbar-center">
                    <span className="cal-today-badge">
                        {todayEvents.length > 0
                            ? `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today`
                            : 'No events today'}
                    </span>
                </div>
                <div className="cal-toolbar-right">
                    <button className="cal-icon-btn" onClick={() => loadEvents()} title="Refresh">
                        <FiRefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* ── Calendar ──────────────────────────────────────────── */}
            <div className="cal-body">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    selectable
                    style={{ flex: 1 }}
                    eventPropGetter={eventStyleGetter}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    date={currentDate}
                    onNavigate={handleNavigate}
                    view={currentView as any}
                    onView={setCurrentView}
                    views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                    popup
                    tooltipAccessor={(e: any) => e.description || e.title}
                />
            </div>

            {/* ── Event detail popup ────────────────────────────────── */}
            {selectedEvent && (
                <div className="event-detail-overlay" onClick={() => setSelectedEvent(null)}>
                    <div className="event-detail-card" onClick={(e) => e.stopPropagation()}>
                        <div className="event-detail-color-strip" style={{ background: selectedEvent.color }} />
                        <div className="event-detail-content">
                            <h3 className="event-detail-title">{selectedEvent.title}</h3>
                            <div className="event-detail-row">
                                <span className="event-detail-icon">🕐</span>
                                <span>
                                    {moment(selectedEvent.start).format('ddd D MMM YYYY')}
                                    {!selectedEvent.allDay && (
                                        <> — {moment(selectedEvent.start).format('HH:mm')} → {moment(selectedEvent.end).format('HH:mm')}</>
                                    )}
                                </span>
                            </div>
                            {selectedEvent.location && (
                                <div className="event-detail-row">
                                    <span className="event-detail-icon">📍</span>
                                    <span>{selectedEvent.location}</span>
                                </div>
                            )}
                            {selectedEvent.description && (
                                <div className="event-detail-row">
                                    <span className="event-detail-icon">📝</span>
                                    <span className="event-detail-desc">{selectedEvent.description}</span>
                                </div>
                            )}
                            <div className="event-detail-actions">
                                <button className="event-detail-edit-btn" onClick={() => handleEditEvent(selectedEvent)}>
                                    ✏ Edit
                                </button>
                                {selectedEvent.calendarObject && (
                                    <button
                                        className="event-detail-delete-btn"
                                        onClick={() => handleDeleteEvent(selectedEvent.calendarObject)}
                                    >
                                        🗑 Delete
                                    </button>
                                )}
                                <button className="event-detail-close-btn" onClick={() => setSelectedEvent(null)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── New/edit event form ───────────────────────────────── */}
            {showForm && (
                <NewEventComponent
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    handleSaveEvent={handleSaveEvent}
                    closePopup={() => setShowForm(false)}
                    calendars={allCalendars}
                    isEdit={isEditMode}
                    onDelete={isEditMode && editingObject ? () => handleDeleteEvent(editingObject) : undefined}
                />
            )}
        </div>
    );
};

export default CalendarPage;
