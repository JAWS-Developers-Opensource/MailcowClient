// Notification context
export type NotificationContextProps = {
    addNotification: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
};
