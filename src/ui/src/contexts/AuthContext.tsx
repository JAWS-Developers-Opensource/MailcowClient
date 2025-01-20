import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthContextType, User } from '../types/auth.types';
import { useNotification } from './NotificationContext';
import LoadingScreen from '../components/frame/LoadingScreenComponent';
import { useLoading } from './LoadingContext';


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { addNotification } = useNotification();
    const { setLoadingStatus, loading } = useLoading();
    const nav = useNavigate();

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    const [user, setUser] = useState<User>({
        email: "",
        id: 0,
        name: "",
        surname: "",
    });

    const loginF = async () => {
        setLoadingStatus(true);
        window.electron.getUserCredentials().then(async (userCredentials) => {
            const response = await window.electron.imapCheckCredentials(userCredentials.email, userCredentials.password, userCredentials.host);
            switch (response.status) {
                case "success":
                    addNotification("Welcome back", "success");
                    setIsAuthenticated(true);
                    setLoadingStatus(false)
                    nav("/");
                    break;
            }
        })
    };


    useEffect(() => {
        loginF();
    }, []);

    const login = (email: string) => {
        setUser({
            name: "",
            surname: "",
            email: email,
            id: 0,
        })
        nav("/");
        setIsAuthenticated(true);
    };

    const logout = () => {
        setLoadingStatus(true)
        setIsAuthenticated(false);
        setUser({
            name: "",
            surname: "",
            email: "",
            id: 0,
        })
        window.electron.removeUserCredentials();
        setLoadingStatus(false)
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, loading, user }
        }>
            {children}
        </AuthContext.Provider>
    );
};


// Updated RequireAuth component
export const RequireAuth = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, loading } = useAuth();
    const nav = useNavigate();

    if (loading) {
        <LoadingScreen />
    }

    if (!isAuthenticated) {
        return (<Navigate to="/auth" replace />)
    }

    return <>{children} </>;
};