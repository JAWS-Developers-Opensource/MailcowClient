import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './SideBarComponent.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const { theme, toggleTheme } = useTheme();
    const { logout } = useAuth();
    const nav = useNavigate();
    const location = useLocation();

    const go = (path: string) => nav(path);
    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <div className="sidebar">
            <div className="sidebar-menu">
                <div className="sidebar-item-group">
                    <button
                        onClick={() => go('/mail')}
                        className={`sidebar-item${isActive('/mail') ? ' active' : ''}`}
                        title="Mail"
                    >
                        📧
                    </button>
                </div>
                <div className="sidebar-item-group">
                    <button
                        onClick={() => go('/calendar')}
                        className={`sidebar-item${isActive('/calendar') ? ' active' : ''}`}
                        title="Calendar"
                    >
                        📅
                    </button>
                </div>
                <div className="sidebar-item-group">
                    <button
                        onClick={() => go('/contacts')}
                        className={`sidebar-item${isActive('/contacts') ? ' active' : ''}`}
                        title="Contacts"
                    >
                        👥
                    </button>
                </div>
                <div className="sidebar-item-group">
                    <button
                        onClick={() => go('/settings')}
                        className={`sidebar-item${isActive('/settings') ? ' active' : ''}`}
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>
            </div>
            <div className="sidebar-footer">
                <button className="sidebar-item" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
                    {theme === 'dark' ? '🌞' : '🌙'}
                </button>
                <button className="sidebar-item" onClick={logout} title="Sign out">
                    🚪
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
