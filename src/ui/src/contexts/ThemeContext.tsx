import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type ThemeContextType = {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const storedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('mc_theme') : null;
    const stored: 'light' | 'dark' = storedRaw === 'dark' ? 'dark' : 'light';
    const [theme, setTheme] = useState<'light' | 'dark'>(stored);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        if (typeof localStorage !== 'undefined') localStorage.setItem('mc_theme', next);
    };

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.style.setProperty('--background-color',      '#f0f4ff');
            root.style.setProperty('--sidebar-background-color', '#ffffff');
            root.style.setProperty('--text-color',            '#1e1b4b');
            root.style.setProperty('--text-muted',            '#6b7280');
            root.style.setProperty('--hover-background-color','#ede9fe');
            root.style.setProperty('--primary-color',         '#7c3aed');
            root.style.setProperty('--primary-hover',         '#6d28d9');
            root.style.setProperty('--border-color',          '#e0e7ff');
            root.style.setProperty('--card-bg',               '#ffffff');
            root.style.setProperty('--input-bg',              '#f5f3ff');
            root.style.setProperty('--box-shadow',            '0 2px 12px rgba(124,58,237,0.08)');
            // Sidebar specific
            root.style.setProperty('--sidebar-bg',            '#1e1b4b');
            root.style.setProperty('--sidebar-text',          'rgba(255,255,255,0.5)');
            root.style.setProperty('--sidebar-text-active',   'rgba(255,255,255,0.95)');
            root.style.setProperty('--hover-bg',              '#ede9fe');
        } else {
            root.style.setProperty('--background-color',      '#0a0a1a');
            root.style.setProperty('--sidebar-background-color', '#12122a');
            root.style.setProperty('--text-color',            '#e2e8f0');
            root.style.setProperty('--text-muted',            '#94a3b8');
            root.style.setProperty('--hover-background-color','#1e1b4b');
            root.style.setProperty('--primary-color',         '#7c3aed');
            root.style.setProperty('--primary-hover',         '#6d28d9');
            root.style.setProperty('--border-color',          '#1e1b4b');
            root.style.setProperty('--card-bg',               '#12122a');
            root.style.setProperty('--input-bg',              '#0f0c29');
            root.style.setProperty('--box-shadow',            '0 2px 12px rgba(0,0,0,0.5)');
            // Sidebar specific
            root.style.setProperty('--sidebar-bg',            '#0d0b20');
            root.style.setProperty('--sidebar-text',          'rgba(255,255,255,0.45)');
            root.style.setProperty('--sidebar-text-active',   'rgba(255,255,255,0.95)');
            root.style.setProperty('--hover-bg',              '#1e1b4b');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
