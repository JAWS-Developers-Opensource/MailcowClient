// LoginPage.tsx
import React, { useEffect, useState } from 'react';
import { useLoading } from '../../contexts/LoadingContext';
import './LoginPage.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

/** Step within the IMAP flow when auth fails and MFA may be needed. */
type ImapStep = 'credentials' | 'mfa';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const { addNotification } = useNotification();
    const { loading, setLoadingStatus } = useLoading();

    // ── IMAP state ────────────────────────────────────────────────────────────
    const [imapStep, setImapStep] = useState<ImapStep>('credentials');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [host, setHost] = useState({ default: '', given: '' });
    const [totpCode, setTotpCode] = useState('');

    // ── Derived host ──────────────────────────────────────────────────────────
    const resolvedHost = host.given !== '' ? host.given : host.default;

    useEffect(() => {
        if (host.given === '') {
            const domain = email.split('@')[1];
            setHost({ given: '', default: domain ? `mail.${domain}` : '' });
        }
    }, [email]);

    // ─────────────────────────────────────────────────────────────────────────
    // IMAP login handlers
    // ─────────────────────────────────────────────────────────────────────────

    const handleImapLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingStatus(true);

        const response = await window.electron.imapCheckCredentials(email, password, resolvedHost);
        switch (response.status) {
            case 'success':
                addNotification('', 'Welcome back', 'success');
                window.electron.saveUserCredentials({ email, password, host: resolvedHost });
                login(email);
                break;
            case 'credentials':
                setImapStep('mfa');
                addNotification('Auth', 'Authentication failed. If 2FA is enabled, enter your TOTP code below.', 'error');
                break;
            case 'host-not-found':
                addNotification('Auth', 'Host not found. Check the server address.', 'error');
                break;
            default:
                addNotification('', response.info + '', 'error');
                break;
        }
        setLoadingStatus(false);
    };

    const handleImapMfaLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingStatus(true);

        const combinedPassword = password + totpCode;
        const response = await window.electron.imapCheckCredentials(email, combinedPassword, resolvedHost);
        switch (response.status) {
            case 'success':
                addNotification('', 'Welcome back', 'success');
                window.electron.saveUserCredentials({ email, password: combinedPassword, host: resolvedHost });
                login(email);
                break;
            case 'credentials':
                addNotification('Auth', 'Authentication still failed. Try an app-specific password.', 'error');
                setImapStep('credentials');
                break;
            case 'host-not-found':
                addNotification('', 'Host not found.', 'error');
                setImapStep('credentials');
                break;
            default:
                addNotification('', response.info + '', 'error');
                break;
        }
        setLoadingStatus(false);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="login-page-wrapper">
            <div className="login-card">
                <div className="login-logo">
                    <img src="https://avatars.githubusercontent.com/u/23747925?s=280&v=4" alt="Mailcow logo" />
                </div>
                <h2 className="login-title">Welcome to Mailcow Client 🐄</h2>

                {loading ? (
                    <div className="loading-spinner" />
                ) : (
                    <>
                        {/* ── Credentials step ──────────────────────────────── */}
                        {imapStep === 'credentials' && (
                            <form onSubmit={handleImapLogin} className="login-form-fields">
                                <div className="input-group">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoFocus
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
                                    <label htmlFor="host">
                                        Server host
                                        {host.default && !host.given && (
                                            <span className="host-hint"> (auto: {host.default})</span>
                                        )}
                                    </label>
                                    <input
                                        id="host"
                                        type="text"
                                        placeholder={host.default || 'mail.example.com'}
                                        value={host.given}
                                        onChange={(e) => setHost({ given: e.target.value, default: '' })}
                                    />
                                </div>
                                <button type="submit" className="login-btn" disabled={loading}>
                                    Sign in
                                </button>
                            </form>
                        )}

                        {/* ── MFA step ──────────────────────────────────────── */}
                        {imapStep === 'mfa' && (
                            <form onSubmit={handleImapMfaLogin} className="login-form-fields">
                                <p className="mfa-hint">
                                    If your account has 2FA (TOTP) enabled, enter the 6-digit code from your
                                    authenticator app.
                                </p>
                                <div className="input-group">
                                    <label htmlFor="totp">TOTP / 2FA Code</label>
                                    <input
                                        id="totp"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]{6}"
                                        maxLength={6}
                                        placeholder="123456"
                                        value={totpCode}
                                        onChange={(e) => setTotpCode(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" className="login-btn" disabled={loading}>
                                    Verify
                                </button>
                                <button
                                    type="button"
                                    className="login-btn login-btn-secondary"
                                    onClick={() => setImapStep('credentials')}
                                >
                                    ← Back
                                </button>
                            </form>
                        )}
                    </>
                )}

                {/* OAuth2 login is temporarily disabled */}
                {/* <OAuthLogin /> */}
            </div>
        </div>
    );
};

export default LoginPage;
