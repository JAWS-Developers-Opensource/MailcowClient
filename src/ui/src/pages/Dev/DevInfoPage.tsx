import React from 'react';
import './DevInfoPage.css';
import { useTheme } from '../../contexts/ThemeContext';

const DevInfoPage = () => {
    const { theme } = useTheme();    

    return (
        <div className="dev-info-container">
            <header className="dev-info-header">
                <h1>Developer Information</h1>
                <p>Details about the React Vite app and Electron setup.</p>
            </header>
            <section className="dev-info-section">
                <div className="card">
                    <h2>React Vite App</h2>
                    <ul>
                        <li><strong>Framework:</strong> Vite + React</li>
                        <li><strong>Language:</strong> TypeScript</li>
                        <li><strong>App Version:</strong> </li>
                        <li><strong>Current Environment:</strong> Development</li>
                        <li><strong>Live Preview:</strong> </li>
                    </ul>
                </div>
                <div className="card">
                    <h2>Electron App</h2>
                    <ul>
                        <li><strong>Electron Version:</strong> </li>
                        <li><strong>Node Version:</strong> </li>
                        <li><strong>Platform:</strong> </li>
                        <li><strong>Window Config:</strong> Custom, no title bar</li>
                        <li><strong>App Path:</strong> </li>
                    </ul>
                </div>
            </section>
            <footer className="dev-info-footer">
                <p>&copy; 2025 JAWS Developer's Projects | Developed with <span className="heart">❤️</span></p>
            </footer>
        </div>
    );
};

export default DevInfoPage;
