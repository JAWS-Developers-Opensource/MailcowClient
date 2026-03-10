import React, { useEffect, useState } from 'react';
import './CalSideBarComponent.css';
import { useLoading } from '../../contexts/LoadingContext';
import { DAVCalendar } from 'tsdav';
import { FaPlus } from 'react-icons/fa';
import { useCalContext } from '../../contexts/cal/CalContext';
import { useNotification } from '../../contexts/NotificationContext';

const PRESET_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

export const CalSideBarComponent = () => {
    const { setLoadingStatus } = useLoading();
    const { calendars } = useCalContext();
    const { addNotification } = useNotification();

    const [showNewCalForm, setShowNewCalForm] = useState(false);
    const [newCalName, setNewCalName] = useState('');
    const [newCalColor, setNewCalColor] = useState('#3498db');
    const [saving, setSaving] = useState(false);

    const loadCal = async () => {
        setLoadingStatus(true);
        window.electron.calGetCalendars().then((data: DAVCalendar[]) => {
            calendars.setCalendars(data);
            setLoadingStatus(false);
        }).catch(() => setLoadingStatus(false));
    };

    useEffect(() => { loadCal(); }, []);

    const handleCreateCalendar = async () => {
        if (!newCalName.trim()) {
            addNotification("Calendar", 'Please enter a calendar name.', 'error');
            return;
        }
        setSaving(true);
        try {
            await window.electron.calCreateCalendar({ displayName: newCalName.trim(), color: newCalColor });
            addNotification("Calendar", `Calendar "${newCalName}" created!`, 'success');
            setShowNewCalForm(false);
            setNewCalName('');
            loadCal();
        } catch (e: any) {
            addNotification("Calendar", `Failed to create calendar: ${e.message}`, 'error');
        }
        setSaving(false);
    };

    return (
        <div className="cal-sidebar-container">
            <h2 className="sidebar-title">Calendars</h2>

            <button className="add-event-button" onClick={() => setShowNewCalForm(!showNewCalForm)}>
                <FaPlus /> New Calendar
            </button>

            {showNewCalForm && (
                <div className="new-cal-form">
                    <input
                        type="text"
                        placeholder="Calendar name"
                        value={newCalName}
                        onChange={(e) => setNewCalName(e.target.value)}
                        className="new-cal-input"
                    />
                    <div className="color-picker-row">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                className={`color-dot${newCalColor === c ? ' color-dot--selected' : ''}`}
                                style={{ background: c }}
                                onClick={() => setNewCalColor(c)}
                                type="button"
                            />
                        ))}
                    </div>
                    <div className="new-cal-actions">
                        <button className="new-cal-save-btn" onClick={handleCreateCalendar} disabled={saving}>
                            {saving ? 'Creating…' : 'Create'}
                        </button>
                        <button className="new-cal-cancel-btn" onClick={() => setShowNewCalForm(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <ul className="calendar-list">
                {calendars.getCalendars().map(({ calendar, visibility }) => (
                    <li key={String(calendar.ctag ?? calendar.url)} className="calendar-item">
                        <span
                            className="calendar-color-dot"
                            style={{ background: calendar.calendarColor ?? '#808080' }}
                        />
                        <label className="calendar-label">
                            {String(calendar.displayName ?? calendar.url)}
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
    );
};
