import React from 'react';
import './NewEventComponent.css';
import { DAVCalendar } from 'tsdav';

type FlatCalendarEntry = {
    calendar: DAVCalendar;
    accountEmail: string;
    accountHost: string;
    accountLabel?: string;
};

interface NewEventProps {
    newEvent: {
        title: string;
        description: string;
        location: string;
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        allDay: boolean;
        calendarIndex: number;
    };
    setNewEvent: (event: any) => void;
    handleSaveEvent: () => void;
    closePopup: () => void;
    flatCalendars: FlatCalendarEntry[];
    isEdit?: boolean;
    onDelete?: () => void;
}

const NewEventComponent: React.FC<NewEventProps> = ({
    newEvent,
    setNewEvent,
    handleSaveEvent,
    closePopup,
    flatCalendars,
    isEdit = false,
    onDelete,
}) => {
    return (
        <div className="popup-overlay">
            <div className="popup-container">
                <div className="popup-header">
                    <h2>{isEdit ? 'Edit Event' : 'New Event'}</h2>
                    <button className="cancel-btn" onClick={closePopup}>✕</button>
                </div>

                <div className="fields">
                    <div className="field">
                        <label>Title *</label>
                        <input
                            type="text"
                            placeholder="Event title"
                            value={newEvent.title}
                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        />
                    </div>

                    <div className="field">
                        <label>Description</label>
                        <textarea
                            placeholder="Description"
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        />
                    </div>

                    <div className="field">
                        <label>Location</label>
                        <input
                            type="text"
                            placeholder="Location"
                            value={newEvent.location}
                            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        />
                    </div>

                    <div className="field">
                        <label>Calendar</label>
                        <select
                            value={newEvent.calendarIndex}
                            onChange={(e) => setNewEvent({ ...newEvent, calendarIndex: Number(e.target.value) })}
                        >
                            {flatCalendars.map((entry, idx) => (
                                <option key={`${entry.accountEmail}|${entry.calendar.url}`} value={idx}>
                                    {String(entry.calendar.displayName ?? entry.calendar.url)}
                                    {entry.accountEmail ? ` — ${entry.accountEmail}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="checkbox-field">
                        <label>
                            <input
                                type="checkbox"
                                checked={newEvent.allDay}
                                onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                            />
                            All Day
                        </label>
                    </div>

                    <div className="date-time-all-day">
                        <div className="field">
                            <label>Start Date *</label>
                            <input
                                type="date"
                                value={newEvent.startDate}
                                onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                            />
                        </div>
                        {!newEvent.allDay && (
                            <div className="field">
                                <label>Start Time</label>
                                <input
                                    type="time"
                                    value={newEvent.startTime}
                                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                />
                            </div>
                        )}
                        <div className="field">
                            <label>End Date *</label>
                            <input
                                type="date"
                                value={newEvent.endDate}
                                onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                            />
                        </div>
                        {!newEvent.allDay && (
                            <div className="field">
                                <label>End Time</label>
                                <input
                                    type="time"
                                    value={newEvent.endTime}
                                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="footer">
                    <button className="add-event-btn" onClick={handleSaveEvent}>
                        {isEdit ? 'Save Changes' : 'Create Event'}
                    </button>
                    {isEdit && onDelete && (
                        <button className="delete-event-btn" onClick={onDelete}>
                            🗑 Delete
                        </button>
                    )}
                    <button className="cancel-footer-btn" onClick={closePopup}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default NewEventComponent;

