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
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('mc_theme')) as 'light' | 'dark' | null;
    const [theme, setTheme] = useState<'light' | 'dark'>(stored ?? 'light');

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        if (typeof localStorage !== 'undefined') localStorage.setItem('mc_theme', next);
    };

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.style.setProperty('--background-color',      '#f0f2f5');
            root.style.setProperty('--sidebar-background-color', '#ffffff');
            root.style.setProperty('--text-color',            '#1a202c');
            root.style.setProperty('--text-muted',            '#718096');
            root.style.setProperty('--hover-background-color','#eef2ff');
            root.style.setProperty('--primary-color',         '#6366f1');
            root.style.setProperty('--primary-hover',         '#4f46e5');
            root.style.setProperty('--border-color',          '#e2e8f0');
            root.style.setProperty('--card-bg',               '#ffffff');
            root.style.setProperty('--input-bg',              '#f7fafc');
            root.style.setProperty('--box-shadow',            '0 1px 6px rgba(0,0,0,0.08)');
            // Sidebar specific
            root.style.setProperty('--sidebar-bg',            '#1e1b4b');
            root.style.setProperty('--sidebar-text',          'rgba(255,255,255,0.5)');
            root.style.setProperty('--sidebar-text-active',   'rgba(255,255,255,0.95)');
            root.style.setProperty('--hover-bg',              '#f1f5f9');
        } else {
            root.style.setProperty('--background-color',      '#0f0f1a');
            root.style.setProperty('--sidebar-background-color', '#1a1a2e');
            root.style.setProperty('--text-color',            '#e2e8f0');
            root.style.setProperty('--text-muted',            '#94a3b8');
            root.style.setProperty('--hover-background-color','#1e293b');
            root.style.setProperty('--primary-color',         '#818cf8');
            root.style.setProperty('--primary-hover',         '#6366f1');
            root.style.setProperty('--border-color',          '#2d3748');
            root.style.setProperty('--card-bg',               '#1a1a2e');
            root.style.setProperty('--input-bg',              '#16213e');
            root.style.setProperty('--box-shadow',            '0 1px 6px rgba(0,0,0,0.4)');
            // Sidebar specific
            root.style.setProperty('--sidebar-bg',            '#0d0d1a');
            root.style.setProperty('--sidebar-text',          'rgba(255,255,255,0.45)');
            root.style.setProperty('--sidebar-text-active',   'rgba(255,255,255,0.95)');
            root.style.setProperty('--hover-bg',              '#1e293b');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
