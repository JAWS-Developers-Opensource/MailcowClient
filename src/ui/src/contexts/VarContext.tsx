import { createContext, useContext, useState, ReactNode } from 'react';
import { VarsContextType } from '../types/var.types';

// Context for notifications
const VarContext = createContext<VarsContextType | undefined>(undefined);

export const useVars = () => {
    const context = useContext(VarContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

// Notification Provider
interface VarsProviderProps {
    children: ReactNode;
}

export const VarsPorvider = ({ children }: VarsProviderProps) => {
    const [cal, setCal] = useState<Record<string, any>>({});
    const [car, setCar] = useState<Record<string, any>>({});
    const [mail, setMail] = useState<Record<string, any>>({});

    const setVar = (group: "cal" | "car" | "mail", key: string, value: any) => {
        switch (group) {
            case "cal":
                setCal((prev) => ({ ...prev, [key]: value }));
                break;
            case "car":
                setCar((prev) => ({ ...prev, [key]: value }));
                break;
            case "mail":
                setMail((prev) => ({ ...prev, [key]: value }));
                break;
        }
    };

    const getVar = (group: "cal" | "car" | "mail", key: string) => {
        switch (group) {
            case "cal":
                return cal[key];
            case "car":
                return car[key];
            case "mail":
                return mail[key];
            default:
                return undefined;
        }
    };

    const resetVars = (group: "cal" | "car" | "mail") => {
        switch (group) {
            case "cal":
                setCal({});
                break;
            case "car":
                setCar({});
                break;
            case "mail":
                setMail({});
                break;
        }
    };

    return (
        <VarContext.Provider value={{ cal, car, mail, setVar, getVar, resetVars }}>
            {children}
        </VarContext.Provider>
    );
};
