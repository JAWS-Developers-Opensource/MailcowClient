import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import UILogger from '../../helpers/UILogger';
import './SideBarComponent.css';

type StoredAccount = { email: string; password: string; host: string; label?: string };

const Sidebar: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const { t, language, setLanguage } = useLanguage();
    const { logout, user } = useAuth();
    const { addNotification } = useNotification();
    const nav = useNavigate();
    const location = useLocation();

    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [accounts, setAccounts] = useState<StoredAccount[]>([]);

    const isActive = (path: string) => location.pathname.startsWith(path);

    useEffect(() => {
        window.electron.getAccounts?.()
            .then(setAccounts)
            .catch((e) => UILogger.error('Sidebar', 'Failed to load accounts', e));
    }, []);

    const handleSwitch = async (acc: StoredAccount) => {
        await window.electron.switchAccount?.(acc);
        window.location.reload();
    };

    const navItems = [
        { path: '/mail',     icon: '📧', label: t('nav.mail') },
        { path: '/calendar', icon: '📅', label: t('nav.calendar') },
        { path: '/contacts', icon: '👥', label: t('nav.contacts') },
        { path: '/settings', icon: '⚙️', label: t('nav.settings') },
    ];

    return (
        <nav className="sidebar">
            {/* App logo / brand */}
            <div className="sidebar-brand">
                <span className="sidebar-brand-icon">🐄</span>
            </div>

            {/* Main navigation */}
            <div className="sidebar-nav">
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => nav(item.path)}
                        className={`sidebar-nav-item${isActive(item.path) ? ' sidebar-nav-item--active' : ''}`}
                        title={item.label}
                    >
                        <span className="sidebar-nav-icon">{item.icon}</span>
                        <span className="sidebar-nav-label">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Footer actions */}
            <div className="sidebar-footer">
                {/* Theme toggle */}
                <button
                    className="sidebar-footer-btn"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
                >
                    {theme === 'dark' ? '🌞' : '🌙'}
                </button>

                {/* Language selector */}
                <div className="sidebar-lang-wrapper" title={t('settings.language')}>
                    <select
                        className="sidebar-lang-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                    >
                        <option value="en">🇬🇧 EN</option>
                        <option value="it">🇮🇹 IT</option>
                        <option value="de">🇩🇪 DE</option>
                    </select>
                </div>

                {/* Account switcher */}
                <div className="sidebar-account-wrapper">
                    <button
                        className="sidebar-footer-btn sidebar-account-btn"
                        onClick={() => setShowAccountMenu(!showAccountMenu)}
                        title={t('nav.accounts')}
                    >
                        <span className="sidebar-avatar">
                            {user?.email ? user.email[0].toUpperCase() : '?'}
                        </span>
                    </button>
                    {showAccountMenu && (
                        <div className="sidebar-account-menu">
                            <div className="sidebar-account-current">
                                <div className="sidebar-account-email">{user?.email}</div>
                                <div className="sidebar-account-host">{user?.email?.split('@')[1]}</div>
                            </div>
                            {accounts.filter((a) => a.email !== user?.email).map((acc) => (
                                <button
                                    key={acc.email + acc.host}
                                    className="sidebar-account-item"
                                    onClick={() => handleSwitch(acc)}
                                >
                                    <span className="sidebar-account-item-avatar">{acc.email[0].toUpperCase()}</span>
                                    <span className="sidebar-account-item-email">{acc.email}</span>
                                </button>
                            ))}
                            <button className="sidebar-account-add" onClick={() => nav('/auth')}>
                                + {t('nav.addAccount')}
                            </button>
                            <div className="sidebar-account-divider" />
                            <button className="sidebar-account-logout" onClick={logout}>
                                🚪 {t('nav.logout')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;
