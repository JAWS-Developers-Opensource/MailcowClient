import React, { useState, useEffect } from 'react';
import './SettingsPage.css';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { APIQuery } from '../../services/api/api.base';

type MailboxInfo = {
    username?: string;
    name?: string;
    quota_used?: number;
    quota?: number;
    active?: boolean;
    aliases?: string[];
};

const SettingsPage: React.FC = () => {
    const { addNotification } = useNotification();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [apiKey, setApiKey] = useState('');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [mailboxInfo, setMailboxInfo] = useState<MailboxInfo | null>(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [host, setHost] = useState('');

    useEffect(() => {
        window.electron.settingsGetApiKey().then((key) => {
            if (key) {
                setApiKey(key);
                setApiKeyInput(key);
            }
        });
        window.electron.getUserCredentials().then((creds) => {
            setHost(creds.host);
        });
    }, []);

    const handleSaveApiKey = async () => {
        await window.electron.settingsSaveApiKey(apiKeyInput);
        setApiKey(apiKeyInput);
        addNotification("Settings", 'API key saved.', 'success');
    };

    const handleLoadMailboxInfo = async () => {
        if (!apiKey || !host) {
            addNotification("Settings", 'Enter your API key and make sure you have a host configured.', 'error');
            return;
        }
        setLoadingInfo(true);
        try {
            const response = await APIQuery(
                { token: apiKey },
                host,
                `/api/v1/get/mailbox/${encodeURIComponent(user.email)}`,
                'GET'
            );
            if (response && !response.error_code) {
                setMailboxInfo(response as MailboxInfo);
            } else {
                addNotification("Settings", 'Failed to fetch mailbox info. Check your API key.', 'error');
            }
        } catch (e: any) {
            addNotification("Settings", `API error: ${e.message}`, 'error');
        }
        setLoadingInfo(false);
    };

    const usedMB = mailboxInfo?.quota_used ? Math.round(mailboxInfo.quota_used / 1024 / 1024) : 0;
    const totalMB = mailboxInfo?.quota ? Math.round(mailboxInfo.quota / 1024 / 1024) : 0;
    const quotaPct = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;
    const quotaColor = quotaPct > 80 ? '#e74c3c' : 'var(--primary-color, #3498db)';

    return (
        <div className="settings-page">
            <div className="settings-content">
                <h1 className="settings-title">⚙ Settings</h1>

                {/* ── Account ──────────────────────────────────────────────── */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Account</h2>
                    <div className="settings-row">
                        <span className="settings-label">Logged in as</span>
                        <span className="settings-value">{user.email || '—'}</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Server</span>
                        <span className="settings-value">{host || '—'}</span>
                    </div>
                    <div className="settings-row">
                        <button className="settings-logout-btn" onClick={logout}>
                            🚪 Sign Out
                        </button>
                    </div>
                </section>

                {/* ── Appearance ───────────────────────────────────────────── */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Appearance</h2>
                    <div className="settings-row">
                        <span className="settings-label">Theme</span>
                        <button className="settings-theme-btn" onClick={toggleTheme}>
                            {theme === 'dark' ? '🌞 Switch to Light' : '🌙 Switch to Dark'}
                        </button>
                    </div>
                </section>

                {/* ── Mailcow API ──────────────────────────────────────────── */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Mailcow API</h2>
                    <p className="settings-hint">
                        Enter your Mailcow API key to enable server-side features (mailbox info, aliases, etc.).
                        Find it in <em>Mailcow Admin → Configuration → API</em>.
                    </p>
                    <div className="settings-api-row">
                        <input
                            type="password"
                            className="settings-input"
                            placeholder="Your Mailcow API key"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                        />
                        <button className="settings-save-btn" onClick={handleSaveApiKey}>
                            Save Key
                        </button>
                    </div>
                    {apiKey && (
                        <button
                            className="settings-fetch-btn"
                            onClick={handleLoadMailboxInfo}
                            disabled={loadingInfo}
                        >
                            {loadingInfo ? 'Loading…' : '📊 Load Mailbox Info'}
                        </button>
                    )}
                </section>

                {/* ── Mailbox info ─────────────────────────────────────────── */}
                {mailboxInfo && (
                    <section className="settings-section">
                        <h2 className="settings-section-title">Mailbox Info</h2>
                        <div className="settings-row">
                            <span className="settings-label">Name</span>
                            <span className="settings-value">{mailboxInfo.name || mailboxInfo.username || '—'}</span>
                        </div>
                        <div className="settings-row">
                            <span className="settings-label">Status</span>
                            <span className={`settings-badge ${mailboxInfo.active ? 'badge-active' : 'badge-inactive'}`}>
                                {mailboxInfo.active ? '● Active' : '● Inactive'}
                            </span>
                        </div>
                        {totalMB > 0 && (
                            <div className="settings-row">
                                <span className="settings-label">Quota</span>
                                <div className="quota-bar-wrap">
                                    <div className="quota-bar">
                                        <div
                                            className="quota-bar-fill"
                                            style={{ width: `${quotaPct}%`, background: quotaColor }}
                                        />
                                    </div>
                                    <span className="quota-label">{usedMB} MB / {totalMB} MB ({quotaPct}%)</span>
                                </div>
                            </div>
                        )}
                        {mailboxInfo.aliases && mailboxInfo.aliases.length > 0 && (
                            <div className="settings-row settings-row--column">
                                <span className="settings-label">Aliases</span>
                                <ul className="aliases-list">
                                    {mailboxInfo.aliases.map((a) => (
                                        <li key={a} className="alias-item">✉ {a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
