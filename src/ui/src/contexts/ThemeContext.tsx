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
            root.style.setProperty('--background-color',      '#f4f6f9');
            root.style.setProperty('--sidebar-background-color', '#ffffff');
            root.style.setProperty('--text-color',            '#172436');
            root.style.setProperty('--text-muted',            '#68778a');
            root.style.setProperty('--hover-background-color','#f1f4f8');
            root.style.setProperty('--primary-color',         '#f47b20');
            root.style.setProperty('--primary-hover',         '#df6810');
            root.style.setProperty('--border-color',          '#e2e7ed');
            root.style.setProperty('--card-bg',               '#ffffff');
            root.style.setProperty('--input-bg',              '#f8fafc');
            root.style.setProperty('--box-shadow',            '0 2px 12px rgba(23,36,54,0.07)');
            // Sidebar specific
            root.style.setProperty('--sidebar-bg',            '#142338');
            root.style.setProperty('--sidebar-text',          'rgba(255,255,255,0.5)');
            root.style.setProperty('--sidebar-text-active',   'rgba(255,255,255,0.95)');
            root.style.setProperty('--hover-bg',              '#f1f4f8');
        } else {
            root.style.setProperty('--background-color',      '#101722');
            root.style.setProperty('--sidebar-background-color', '#182231');
            root.style.setProperty('--text-color',            '#e2e8f0');
            root.style.setProperty('--text-muted',            '#a0adbc');
            root.style.setProperty('--hover-background-color','#202c3b');
            root.style.setProperty('--primary-color',         '#ff984a');
            root.style.setProperty('--primary-hover',         '#ffad70');
            root.style.setProperty('--border-color',          '#2b3949');
            root.style.setProperty('--card-bg',               '#182231');
            root.style.setProperty('--input-bg',              '#111b28');
            root.style.setProperty('--box-shadow',            '0 2px 12px rgba(0,0,0,0.28)');
            // Sidebar specific
            root.style.setProperty('--sidebar-bg',            '#101c2b');
            root.style.setProperty('--sidebar-text',          'rgba(255,255,255,0.45)');
            root.style.setProperty('--sidebar-text-active',   'rgba(255,255,255,0.95)');
            root.style.setProperty('--hover-bg',              '#202c3b');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
