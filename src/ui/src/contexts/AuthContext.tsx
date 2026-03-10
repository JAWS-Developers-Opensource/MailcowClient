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

    /** Attempt automatic login on startup using stored credentials. */
    const autoLogin = async () => {
        setLoadingStatus(true);

        // 1. Try OAuth2 credentials first
        try {
            const oauth2 = await window.electron.getOAuth2Credentials();
            if (oauth2 && oauth2.accessToken) {
                // Verify the token is still valid by hitting the Mailcow profile endpoint
                const profileRes = await fetch(`https://${oauth2.host}/oauth/profile`, {
                    headers: { Authorization: `Bearer ${oauth2.accessToken}` },
                });
                if (profileRes.ok) {
                    addNotification("Auth", "Welcome back", "success");
                    setUser({ name: "", surname: "", email: oauth2.email, id: 0 });
                    setIsAuthenticated(true);
                    setLoadingStatus(false);
                    nav("/");
                    return;
                }
            }
        } catch {
            // OAuth2 check failed; fall through to IMAP
        }

        // 2. Fall back to IMAP credentials
        try {
            const userCredentials = await window.electron.getUserCredentials();
            if (userCredentials.email && userCredentials.password && userCredentials.host) {
                const response = await window.electron.imapCheckCredentials(
                    userCredentials.email,
                    userCredentials.password,
                    userCredentials.host
                );
                if (response.status === "success") {
                    addNotification("Auth", "Welcome back", "success");
                    setUser({ name: "", surname: "", email: userCredentials.email, id: 0 });
                    setIsAuthenticated(true);
                    setLoadingStatus(false);
                    nav("/");
                    return;
                }
            }
        } catch {
            // IMAP check failed
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
