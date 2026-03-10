// LoginPage.tsx
import React, { useEffect, useState } from 'react';
import { useLoading } from '../../contexts/LoadingContext';
import './LoginPage.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

type Tab = 'imap' | 'oauth2';

/** Step within the IMAP flow when auth fails and MFA may be needed. */
type ImapStep = 'credentials' | 'mfa';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const { addNotification } = useNotification();
    const { loading, setLoadingStatus } = useLoading();

    const [activeTab, setActiveTab] = useState<Tab>('imap');

    // ── IMAP state ────────────────────────────────────────────────────────────
    const [imapStep, setImapStep] = useState<ImapStep>('credentials');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [host, setHost] = useState({ default: "", given: "" });
    const [totpCode, setTotpCode] = useState('');

    // ── OAuth2 state ──────────────────────────────────────────────────────────
    const [oauthHost, setOauthHost] = useState('');
    const [oauthClientId, setOauthClientId] = useState('');
    const [oauthClientSecret, setOauthClientSecret] = useState('');
    const [oauthAvailable, setOauthAvailable] = useState<boolean | null>(null);
    const [oauthChecking, setOauthChecking] = useState(false);

    // ── Derived host ──────────────────────────────────────────────────────────
    const resolvedHost = host.given !== "" ? host.given : host.default;

    useEffect(() => {
        if (host.given === "") {
            const domain = email.split('@')[1];
            setHost({ given: "", default: domain ? `mail.${domain}` : "" });
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
            case "success":
                addNotification("", "Welcome back", "success");
                window.electron.saveUserCredentials({ email, password, host: resolvedHost });
                login(email);
                break;
            case "credentials":
                // Auth failed — offer MFA step
                setImapStep('mfa');
                addNotification("Auth", "Authentication failed. If 2FA is enabled, enter your TOTP code below.", "error");
                break;
            case "host-not-found":
                addNotification("Auth", "Host not found. Check the server address.", "error");
                break;
            default:
                addNotification("", response.info + "", "error");
                break;
        }
        setLoadingStatus(false);
    };

    const handleImapMfaLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingStatus(true);

        // Try password+totp (some Mailcow/Dovecot setups support this)
        const combinedPassword = password + totpCode;
        const response = await window.electron.imapCheckCredentials(email, combinedPassword, resolvedHost);
        switch (response.status) {
            case "success":
                addNotification("", "Welcome back", "success");
                window.electron.saveUserCredentials({ email, password: combinedPassword, host: resolvedHost });
                login(email);
                break;
            case "credentials":
                addNotification(
                    "Auth",
                    "Authentication still failed. Consider using an app-specific password or switch to OAuth2 login.",
                    "error"
                );
                setImapStep('credentials');
                break;
            case "host-not-found":
                addNotification("", "Host not found.", "error");
                setImapStep('credentials');
                break;
            default:
                addNotification("", response.info + "", "error");
                break;
        }
        setLoadingStatus(false);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // OAuth2 handlers
    // ─────────────────────────────────────────────────────────────────────────

    const handleCheckOAuth2 = async () => {
        if (!oauthHost) {
            addNotification("Mail", "Please enter the Mailcow server host first.", "error");
            return;
        }
        setOauthChecking(true);
        setOauthAvailable(null);
        const result = await window.electron.checkOAuth2Available(oauthHost);
        setOauthAvailable(result.available);
        setOauthChecking(false);
        if (!result.available) {
            addNotification("Auth", "OAuth2 is not available on this server, or the host is unreachable.", "error");
        } else {
            addNotification("Auth", "OAuth2 is available on this server!", "success");
        }
    };

    const handleOAuth2Login = async () => {
        if (!oauthClientId) {
            addNotification("Auth", "Please enter your OAuth2 Client ID.", "error");
            return;
        }
        setLoadingStatus(true);
        const result = await window.electron.startOAuth2Login(oauthHost, oauthClientId, oauthClientSecret || undefined);
        if (result.success) {
            await window.electron.saveOAuth2Credentials({
                host: oauthHost,
                clientId: oauthClientId,
                email: result.email,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken ?? null,
            });
            addNotification("Auth", "OAuth2 login successful!", "success");
            login(result.email);
        } else {
            if (result.error === 'window_closed') {
                addNotification("Auth", "OAuth2 login was cancelled.", "error");
            } else if (result.error === 'timeout') {
                addNotification("Auth", "OAuth2 login timed out. Please try again.", "error");
            } else {
                addNotification("Auth", `OAuth2 error: ${result.error}`, "error");
            }
        }
        setLoadingStatus(false);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="login-container">
            <div className="login-form">
                <div className="login-logo">
                    <img src="https://avatars.githubusercontent.com/u/23747925?s=280&v=4" alt="Mailcow logo" />
                </div>
                <h2 className="login-title">Welcome to Mailcow Client 🐄</h2>

                {/* Tab switcher */}
                <div className="login-tabs">
                    <button
                        className={`login-tab-btn${activeTab === 'imap' ? ' active' : ''}`}
                        onClick={() => { setActiveTab('imap'); setImapStep('credentials'); }}
                        type="button"
                    >
                        Password / IMAP
                    </button>
                    <button
                        className={`login-tab-btn${activeTab === 'oauth2' ? ' active' : ''}`}
                        onClick={() => setActiveTab('oauth2')}
                        type="button"
                    >
                        OAuth2 (SSO)
                    </button>
                </div>

                {loading ? (
                    <div className="loading-spinner"></div>
                ) : (
                    <>
                        {/* ── IMAP tab ─────────────────────────────────────── */}
                        {activeTab === 'imap' && imapStep === 'credentials' && (
                            <form onSubmit={handleImapLogin}>
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
                                        placeholder={host.default || "mail.example.com"}
                                        value={host.given}
                                        onChange={(e) => setHost({ given: e.target.value, default: "" })}
                                    />
                                </div>
                                <button type="submit" className="login-btn" disabled={loading}>
                                    Login
                                </button>
                            </form>
                        )}

                        {/* ── IMAP MFA step ────────────────────────────────── */}
                        {activeTab === 'imap' && imapStep === 'mfa' && (
                            <form onSubmit={handleImapMfaLogin}>
                                <p className="mfa-hint">
                                    If your account has 2FA (TOTP) enabled, enter the 6-digit code from your
                                    authenticator app. The client will append it to your password automatically.
                                    <br /><br />
                                    <strong>Tip:</strong> For a more reliable MFA experience, use the
                                    <em> OAuth2 </em> tab instead.
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

                        {/* ── OAuth2 tab ───────────────────────────────────── */}
                        {activeTab === 'oauth2' && (
                            <div className="oauth2-section">
                                <p className="oauth2-description">
                                    Log in using your Mailcow server's OAuth2 / SSO. Multi-Factor
                                    Authentication (TOTP, WebAuthn) is handled by the Mailcow web interface
                                    automatically.
                                </p>

                                <div className="input-group">
                                    <label htmlFor="oauth-host">Mailcow Server Host</label>
                                    <div className="input-with-btn">
                                        <input
                                            id="oauth-host"
                                            type="text"
                                            placeholder="mail.example.com"
                                            value={oauthHost}
                                            onChange={(e) => { setOauthHost(e.target.value); setOauthAvailable(null); }}
                                        />
                                        <button
                                            type="button"
                                            className="check-btn"
                                            onClick={handleCheckOAuth2}
                                            disabled={oauthChecking || !oauthHost}
                                        >
                                            {oauthChecking ? '…' : 'Check'}
                                        </button>
                                    </div>
                                    {oauthAvailable === true && (
                                        <span className="status-badge status-ok">✓ OAuth2 available</span>
                                    )}
                                    {oauthAvailable === false && (
                                        <span className="status-badge status-error">✗ OAuth2 unavailable</span>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label htmlFor="oauth-client-id">Client ID</label>
                                    <input
                                        id="oauth-client-id"
                                        type="text"
                                        placeholder="Your OAuth2 App Client ID"
                                        value={oauthClientId}
                                        onChange={(e) => setOauthClientId(e.target.value)}
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="oauth-client-secret">
                                        Client Secret <span className="optional">(optional)</span>
                                    </label>
                                    <input
                                        id="oauth-client-secret"
                                        type="password"
                                        placeholder="Leave empty for PKCE-only"
                                        value={oauthClientSecret}
                                        onChange={(e) => setOauthClientSecret(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="login-btn"
                                    onClick={handleOAuth2Login}
                                    disabled={loading || !oauthHost || !oauthClientId || oauthAvailable !== true}
                                >
                                    Login with Mailcow OAuth2
                                </button>

                                <p className="oauth2-setup-link">
                                    Don't have a Client ID? See the{' '}
                                    <a
                                        href="https://github.com/JAWS-Developers-Opensource/MailcowClient/blob/main/docs/oauth2-mailcow-setup.md"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        OAuth2 setup guide
                                    </a>.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
