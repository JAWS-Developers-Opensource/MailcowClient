// LoginPage.tsx
import React, { useEffect, useState } from 'react';
import { useLoading } from '../../contexts/LoadingContext';
import './LoginPage.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';

/** Step within the IMAP flow when auth fails and MFA may be needed. */
type ImapStep = 'credentials' | 'mfa';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const { addNotification } = useNotification();
    const { loading, setLoadingStatus } = useLoading();
    const { t } = useLanguage();

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
                window.electron.saveAccount?.({ email, password, host: resolvedHost });
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
                window.electron.saveAccount?.({ email, password: combinedPassword, host: resolvedHost });
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
                <h2 className="login-title">{t('login.title')} 🐄</h2>

                {loading ? (
                    <div className="loading-spinner" />
                ) : (
                    <>
                        {/* ── Credentials step ──────────────────────────────── */}
                        {imapStep === 'credentials' && (
                            <form onSubmit={handleImapLogin} className="login-form-fields">
                                <div className="input-group">
                                    <label htmlFor="email">{t('login.email')}</label>
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
                                    <label htmlFor="password">{t('login.password')}</label>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label htmlFor="host">
                                        {t('login.host')}
                                        {host.default && !host.given && (
                                            <span className="host-hint"> ({t('login.hostHint')}{host.default})</span>
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
                                    {t('login.signIn')}
                                </button>
                            </form>
                        )}

                        {/* ── MFA step ──────────────────────────────────────── */}
                        {imapStep === 'mfa' && (
                            <form onSubmit={handleImapMfaLogin} className="login-form-fields">
                                <p className="mfa-hint">{t('login.mfaHint')}</p>
                                <div className="input-group">
                                    <label htmlFor="totp">{t('login.mfaCode')}</label>
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
                                    {t('login.verify')}
                                </button>
                                <button
                                    type="button"
                                    className="login-btn login-btn-secondary"
                                    onClick={() => setImapStep('credentials')}
                                >
                                    {t('login.back')}
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
