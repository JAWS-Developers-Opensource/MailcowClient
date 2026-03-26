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

    /** Attempt automatic login on startup — credential check happens entirely in the
     *  main process; the renderer never receives any stored password. */
    const autoLogin = async () => {
        setLoadingStatus(true);
        try {
            const result = await window.electron.autoLogin();
            if (result.success) {
                addNotification("Auth", "Welcome back", "success");
                setUser({ name: "", surname: "", email: result.email, id: 0 });
                setIsAuthenticated(true);
                nav("/");
            }
        } catch {
            // Auto-login failed — user will be directed to the login page
        }
        setLoadingStatus(false);
    };

    useEffect(() => {
        autoLogin();
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
        setLoadingStatus(true);
        setIsAuthenticated(false);
        setUser({ name: "", surname: "", email: "", id: 0 });
        window.electron.removeUserCredentials();
        window.electron.removeOAuth2Credentials();
        setLoadingStatus(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, loading, user }}>
            {children}
        </AuthContext.Provider>
    );
};


// Updated RequireAuth component
export const RequireAuth = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, loading } = useAuth();
    const nav = useNavigate();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return (<Navigate to="/auth" replace />)
    }

    return <>{children} </>;
};
