import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext'; // Importiamo il contesto del tema
import './SideBarComponent.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const { theme, toggleTheme } = useTheme(); // Ottieni il tema attuale e la funzione di toggle
    const { logout } = useAuth();

    const nav = useNavigate();

    const handleSideBarNavigation = (path: string) => {
        nav(path);
    }
    
    return (
        <div className={`sidebar`}>
            {/*<div className="sidebar-logo">{isExpanded ? (theme === 'dark' ? 'MyApp (Dark)' : 'MyApp (Light)') : (
                <img src='https://avatars.githubusercontent.com/u/23747925?s=280&v=4' />
            )}</div>*/}
            <div className="sidebar-menu">
                <div className="sidebar-item-group">
                    <button onClick={() => handleSideBarNavigation('/mail')} className="sidebar-item">
                        📧
                    </button>
                </div>
                <div className="sidebar-item-group">
                    <button onClick={() => handleSideBarNavigation('/calendar')} className="sidebar-item">
                        📅
                    </button>
                </div>
                <div className="sidebar-item-group">
                    <button onClick={() => handleSideBarNavigation('/contacts')} className="sidebar-item">
                        👥
                    </button>
                </div>
            </div>
            <div className="sidebar-footer">
                <button className="sidebar-item" onClick={toggleTheme}>
                    {theme === 'dark' ? '🌞' : '🌙'}
                </button>
                <button className="sidebar-item" onClick={logout}>
                    🚪
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
