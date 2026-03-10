import React, { useState, useEffect } from 'react';
import './SettingsPage.css';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

type MailboxInfo = Record<string, any>;
type AliasEntry = Record<string, any>;
type AppPasswordEntry = Record<string, any>;

const normalizeArray = (raw: any): any[] => {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.data)) return raw.data;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw && typeof raw === 'object') return [raw];
    return [];
};

const normalizeMailbox = (raw: any): MailboxInfo | null => {
    const list = normalizeArray(raw);
    if (list.length > 0 && typeof list[0] === 'object') return list[0];
    if (raw && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
    return null;
};

const readAliasAddress = (alias: AliasEntry): string =>
    String(alias.address ?? alias.alias ?? alias.addr ?? alias.username ?? '').trim();

const readAppPasswordId = (entry: AppPasswordEntry): string =>
    String(entry.id ?? entry.app_passwd_id ?? entry.password_id ?? entry.password ?? '').trim();

const SettingsPage: React.FC = () => {
    const { addNotification } = useNotification();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [apiKey, setApiKey] = useState('');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [mailboxInfo, setMailboxInfo] = useState<MailboxInfo | null>(null);
    const [aliases, setAliases] = useState<AliasEntry[]>([]);
    const [appPasswords, setAppPasswords] = useState<AppPasswordEntry[]>([]);

    const [loadingOverview, setLoadingOverview] = useState(false);
    const [savingAlias, setSavingAlias] = useState(false);
    const [savingAppPassword, setSavingAppPassword] = useState(false);
    const [savingAcl, setSavingAcl] = useState(false);

    const [host, setHost] = useState('');
    const [aliasAddress, setAliasAddress] = useState('');
    const [aliasGoto, setAliasGoto] = useState('');
    const [aliasActive, setAliasActive] = useState(true);

    const [appPasswordDescription, setAppPasswordDescription] = useState('Desktop app');
    const [appPasswordValue, setAppPasswordValue] = useState('');

    const [aclJson, setAclJson] = useState('{\n  "active": "1"\n}');

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

    useEffect(() => {
        if (!mailboxInfo) return;
        const aclCandidate = mailboxInfo.user_acl ?? mailboxInfo.acl ?? mailboxInfo.attributes?.acl;
        if (aclCandidate && typeof aclCandidate === 'object') {
            setAclJson(JSON.stringify(aclCandidate, null, 2));
        }
    }, [mailboxInfo]);

    const handleSaveApiKey = async () => {
        await window.electron.settingsSaveApiKey(apiKeyInput);
        setApiKey(apiKeyInput);
        addNotification("Settings", 'API key saved.', 'success');
    };

    const handleLoadOverview = async () => {
        if (!apiKey || !host) {
            addNotification("Settings", 'Enter your API key and make sure you have a host configured.', 'error');
            return;
        }

        setLoadingOverview(true);
        try {
            const overview = await window.electron.settingsMailcowGetOverview();
            setMailboxInfo(normalizeMailbox(overview.mailboxInfo));
            setAliases(normalizeArray(overview.aliases));
            setAppPasswords(normalizeArray(overview.appPasswords));
            addNotification('Settings', 'Mailcow data loaded.', 'success');
        } catch (e: any) {
            addNotification("Settings", `API error: ${e.message}`, 'error');
        } finally {
            setLoadingOverview(false);
        }
    };

    const handleCreateAlias = async () => {
        if (!aliasAddress.trim()) {
            addNotification('Settings', 'Alias address is required.', 'error');
            return;
        }

        setSavingAlias(true);
        try {
            await window.electron.settingsMailcowCreateAlias(aliasAddress.trim(), aliasGoto.trim(), aliasActive);
            addNotification('Settings', 'Alias created.', 'success');
            setAliasAddress('');
            await handleLoadOverview();
        } catch (e: any) {
            addNotification('Settings', `Create alias failed: ${e.message}`, 'error');
        } finally {
            setSavingAlias(false);
        }
    };

    const handleDeleteAlias = async (address: string) => {
        if (!address) return;
        try {
            await window.electron.settingsMailcowDeleteAlias(address);
            addNotification('Settings', 'Alias deleted.', 'success');
            await handleLoadOverview();
        } catch (e: any) {
            addNotification('Settings', `Delete alias failed: ${e.message}`, 'error');
        }
    };

    const handleCreateAppPassword = async () => {
        if (!appPasswordDescription.trim() || !appPasswordValue.trim()) {
            addNotification('Settings', 'Description and app password are required.', 'error');
            return;
        }

        setSavingAppPassword(true);
        try {
            await window.electron.settingsMailcowCreateAppPassword(appPasswordDescription.trim(), appPasswordValue.trim());
            addNotification('Settings', 'App password created.', 'success');
            setAppPasswordValue('');
            await handleLoadOverview();
        } catch (e: any) {
            addNotification('Settings', `Create app password failed: ${e.message}`, 'error');
        } finally {
            setSavingAppPassword(false);
        }
    };

    const handleDeleteAppPassword = async (id: string) => {
        if (!id) {
            addNotification('Settings', 'Cannot delete app password: missing id.', 'error');
            return;
        }
        try {
            await window.electron.settingsMailcowDeleteAppPassword(id);
            addNotification('Settings', 'App password deleted.', 'success');
            await handleLoadOverview();
        } catch (e: any) {
            addNotification('Settings', `Delete app password failed: ${e.message}`, 'error');
        }
    };

    const handleUpdateAcl = async () => {
        setSavingAcl(true);
        try {
            await window.electron.settingsMailcowUpdateUserAcl(aclJson);
            addNotification('Settings', 'Mailbox preferences (ACL) updated.', 'success');
            await handleLoadOverview();
        } catch (e: any) {
            addNotification('Settings', `ACL update failed: ${e.message}`, 'error');
        } finally {
            setSavingAcl(false);
        }
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
                        Enter your Mailcow API key to manage mailbox details, aliases, app passwords and ACL preferences.
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
                            onClick={handleLoadOverview}
                            disabled={loadingOverview}
                        >
                            {loadingOverview ? 'Loading…' : 'Load Mailcow Data'}
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
                    </section>
                )}

                {/* ── Aliases ──────────────────────────────────────────────── */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Aliases</h2>
                    <div className="settings-api-row">
                        <input
                            type="text"
                            className="settings-input"
                            placeholder="alias@example.com"
                            value={aliasAddress}
                            onChange={(e) => setAliasAddress(e.target.value)}
                        />
                        <input
                            type="text"
                            className="settings-input"
                            placeholder={`Destination (default: ${user.email})`}
                            value={aliasGoto}
                            onChange={(e) => setAliasGoto(e.target.value)}
                        />
                        <button className="settings-save-btn" onClick={handleCreateAlias} disabled={savingAlias}>
                            {savingAlias ? 'Saving…' : 'Add Alias'}
                        </button>
                    </div>
                    <div className="settings-row">
                        <label className="settings-checkbox-label">
                            <input
                                type="checkbox"
                                checked={aliasActive}
                                onChange={(e) => setAliasActive(e.target.checked)}
                            />
                            Active
                        </label>
                    </div>
                    <ul className="aliases-list">
                        {aliases.length === 0 && <li className="alias-item">No aliases found.</li>}
                        {aliases.map((alias, idx) => {
                            const address = readAliasAddress(alias);
                            const destination = String(alias.goto ?? alias.goto_mailbox ?? alias.destination ?? '').trim();
                            return (
                                <li key={`${address}-${idx}`} className="alias-item alias-item--action">
                                    <span>{address || '(unknown alias)'} {destination ? `→ ${destination}` : ''}</span>
                                    {address && (
                                        <button className="settings-inline-danger" onClick={() => handleDeleteAlias(address)}>
                                            Delete
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {/* ── App passwords ────────────────────────────────────────── */}
                <section className="settings-section">
                    <h2 className="settings-section-title">App Passwords</h2>
                    <div className="settings-api-row">
                        <input
                            type="text"
                            className="settings-input"
                            placeholder="Description"
                            value={appPasswordDescription}
                            onChange={(e) => setAppPasswordDescription(e.target.value)}
                        />
                        <input
                            type="password"
                            className="settings-input"
                            placeholder="App password"
                            value={appPasswordValue}
                            onChange={(e) => setAppPasswordValue(e.target.value)}
                        />
                        <button className="settings-save-btn" onClick={handleCreateAppPassword} disabled={savingAppPassword}>
                            {savingAppPassword ? 'Saving…' : 'Create'}
                        </button>
                    </div>
                    <ul className="aliases-list">
                        {appPasswords.length === 0 && <li className="alias-item">No app passwords found.</li>}
                        {appPasswords.map((entry, idx) => {
                            const id = readAppPasswordId(entry);
                            const label = String((entry.description ?? entry.app_name ?? entry.name ?? id) || 'App password');
                            return (
                                <li key={`${label}-${idx}`} className="alias-item alias-item--action">
                                    <span>{label}</span>
                                    {id && (
                                        <button className="settings-inline-danger" onClick={() => handleDeleteAppPassword(id)}>
                                            Delete
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {/* ── Mailbox preferences (ACL) ───────────────────────────── */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Mailbox Preferences (ACL)</h2>
                    <p className="settings-hint">
                        The payload below is sent to <code>/api/v1/edit/user-acl</code>. Keep valid JSON format.
                    </p>
                    <textarea
                        className="settings-textarea"
                        value={aclJson}
                        onChange={(e) => setAclJson(e.target.value)}
                    />
                    <button className="settings-save-btn" onClick={handleUpdateAcl} disabled={savingAcl}>
                        {savingAcl ? 'Saving…' : 'Save ACL Preferences'}
                    </button>
                </section>
            </div>
        </div>
    );
};

export default SettingsPage;
