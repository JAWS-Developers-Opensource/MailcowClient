import { createContext, useContext, useState, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { NotificationContextProps } from '../types/notification.types';

// Context for notifications
const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

// Notification Provider
interface NotificationProviderProps {
    children: ReactNode;
}

const NotificationProvider = ({ children }: NotificationProviderProps) => {
    const [notifications, setNotifications] = useState<{ id: number; title: string; message: string; type: string }[]>([]);

    const addNotification = (title: string, message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now();
        setNotifications((prev) => [...prev, { id, title, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((notification) => notification.id !== id));
        }, 4000);
    };

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <StyledNotificationContainer>
                {notifications.map((notification) => (
                    <StyledNotification key={notification.id} type={notification.type}>
                        <NotificationTitle>{notification.title}</NotificationTitle>
                        <NotificationMessage>{notification.message}</NotificationMessage>
                    </StyledNotification>
                ))}
            </StyledNotificationContainer>
        </NotificationContext.Provider>
    );
};

// Animations
const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(10%);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const fadeOut = keyframes`
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(-10%);
    }
`;

// Styled components
const StyledNotificationContainer = styled.div`
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 1000;
`;

const StyledNotification = styled.div<{ type: string }>`
    background-color: ${({ type }) =>
        type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: ${fadeIn} 0.3s ease-out, ${fadeOut} 0.3s ease-in 3.7s;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;

    &:hover {
        transform: scale(1.05);
    }
`;

const NotificationTitle = styled.h4`
    font-size: 1.2rem;
    margin: 0;
`;

const NotificationMessage = styled.p`
    font-size: 1rem;
    margin: 0;
`;

export default NotificationProvider;
