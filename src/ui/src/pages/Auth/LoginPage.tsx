// LoginPage.tsx
import React, { useEffect, useState } from 'react';
import { useLoading } from '../../contexts/LoadingContext';
import './LoginPage.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const { addNotification } = useNotification();
    const { loading, setLoadingStatus } = useLoading();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [host, setHost] = useState({
        default: "",
        given: ""
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingStatus(true);

        const response = await window.electron.imapCheckCredentials(email, password, host.given != "" ? host.given : host.default);
        switch (response.status) {
            case "success":
                addNotification("Welcome back", "success");
                window.electron.saveUserCredentials({ email, password, host: host.given != "" ? host.given : host.default });
                login(email);
                break;
            case "credentials":
                addNotification("Worng username or password", "error");
                break;
            case "host-not-found":
                addNotification("No host found", "error");
                break;
            default:
                addNotification(response.info + "", "error");
                break;
        }
        setLoadingStatus(false)

    };

    useEffect(() => {
        if (host.given == "") {
            setHost({ default: "mail." + email.split('@')[1], given: "" })
        }
    }, [email])


    return (
        <div className="login-container">
            <div className="login-form">
                <div className="login-logo">
                    <img src="https://avatars.githubusercontent.com/u/23747925?s=280&v=4" alt="Logo" />
                </div>
                <h2 className="login-title">Welcome to mailcow client! Moohoo</h2>
                {loading ? (
                    <div className="loading-spinner"></div>
                ) : (<form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="host">Host</label>
                        <input
                            id="host"
                            type="text"
                            placeholder={host.default}
                            value={host.given}
                            onChange={(e) => setHost({ given: e.target.value, default: "" })}
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>)}
            </div>
        </div>
    );
};

export default LoginPage;
