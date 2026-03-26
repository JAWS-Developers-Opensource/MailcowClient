import React, { useEffect, useState } from 'react';
import './CalSideBarComponent.css';
import { useLoading } from '../../contexts/LoadingContext';
import { DAVCalendar } from 'tsdav';
import { FaPlus, FaChevronDown, FaChevronRight } from 'react-icons/fa';
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
    const [collapsedAccounts, setCollapsedAccounts] = useState<Set<string>>(new Set());
    const [selectedAccountKey, setSelectedAccountKey] = useState<string>('');

    const loadCal = async () => {
        setLoadingStatus(true);
        try {
            const results = await window.electron.calGetAllAccountCalendars();
            calendars.setAllAccountCalendars(results);
            if (results.length > 0 && !selectedAccountKey) {
                setSelectedAccountKey(`${results[0].accountEmail}|${results[0].accountHost}`);
            }
        } catch {
            // ignore
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => { loadCal(); }, []);

    const toggleAccountCollapse = (key: string) => {
        setCollapsedAccounts(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleCreateCalendar = async () => {
        if (!newCalName.trim()) {
            addNotification("Calendar", 'Please enter a calendar name.', 'error');
            return;
        }
        if (!selectedAccountKey) {
            addNotification("Calendar", 'Please select an account.', 'error');
            return;
        }
        const [accountEmail, accountHost] = selectedAccountKey.split('|');
        setSaving(true);
        try {
            await window.electron.calCreateCalendarForAccount({
                accountEmail,
                accountHost,
                displayName: newCalName.trim(),
                color: newCalColor,
            });
            addNotification("Calendar", `Calendar "${newCalName}" created!`, 'success');
            setShowNewCalForm(false);
            setNewCalName('');
            loadCal();
        } catch (e: any) {
            addNotification("Calendar", `Failed to create calendar: ${e.message}`, 'error');
        }
        setSaving(false);
    };

    const grouped = calendars.getCalendarsGroupedByAccount();

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
                    {grouped.length > 1 && (
                        <select
                            className="new-cal-input"
                            value={selectedAccountKey}
                            onChange={(e) => setSelectedAccountKey(e.target.value)}
                        >
                            {grouped.map(g => {
                                const key = `${g.accountEmail}|${g.accountHost}`;
                                return (
                                    <option key={key} value={key}>
                                        {g.accountLabel || g.accountEmail}
                                    </option>
                                );
                            })}
                        </select>
                    )}
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

            {grouped.map(group => {
                const key = `${group.accountEmail}|${group.accountHost}`;
                const isCollapsed = collapsedAccounts.has(key);
                return (
                    <div key={key} className="cal-account-section">
                        <button
                            className="cal-account-header"
                            onClick={() => toggleAccountCollapse(key)}
                        >
                            {isCollapsed ? <FaChevronRight size={10} /> : <FaChevronDown size={10} />}
                            <span className="cal-account-label">
                                {group.accountLabel || group.accountEmail}
                            </span>
                        </button>
                        {!isCollapsed && (
                            <ul className="calendar-list">
                                {group.entries.map(({ calendar, visibility }) => (
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
                        )}
                    </div>
                );
            })}
        </div>
    );
};

