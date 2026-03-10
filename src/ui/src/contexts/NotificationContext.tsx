import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { NotificationContextProps } from '../types/notification.types';
import './NotificationContext.css';

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};

const DURATION = 4500;

type NotifEntry = {
    id: number;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    createdAt: number;
};

const NotificationItem: React.FC<{ notif: NotifEntry; onClose: (id: number) => void }> = ({ notif, onClose }) => {
    const [progress, setProgress] = useState(100);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startRef = useRef(Date.now());
    const [exiting, setExiting] = useState(false);

    const doClose = () => {
        setExiting(true);
        setTimeout(() => onClose(notif.id), 280);
    };

    useEffect(() => {
        startRef.current = Date.now();
        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startRef.current;
            const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
            setProgress(remaining);
            if (remaining <= 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                doClose();
            }
        }, 50);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const icon = notif.type === 'success' ? '✓' : notif.type === 'error' ? '✕' : 'ℹ';

    return (
        <div className={`mc-notif mc-notif--${notif.type}${exiting ? ' mc-notif--exit' : ''}`}>
            <div className="mc-notif-icon">{icon}</div>
            <div className="mc-notif-body">
                {notif.title && <div className="mc-notif-title">{notif.title}</div>}
                <div className="mc-notif-message">{notif.message}</div>
            </div>
            <button className="mc-notif-close" onClick={doClose} aria-label="Close">✕</button>
            <div className="mc-notif-progress">
                <div className="mc-notif-bar" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
};

const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<NotifEntry[]>([]);

    const addNotification = (title: string, message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now() + Math.random();
        setNotifications((prev) => [...prev.slice(-4), { id, title, message, type, createdAt: Date.now() }]);
    };

    const removeNotification = (id: number) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <div className="mc-notif-container">
                {notifications.map((n) => (
                    <NotificationItem key={n.id} notif={n} onClose={removeNotification} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

export default NotificationProvider;
