import './App.css'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './src/contexts/AuthContext'
import LoadingProvider from './src/contexts/LoadingContext'
import LoginPage from './src/pages/Auth/LoginPage'
import MainFrameComponent from './src/components/frame/MainFrameComponent'
import { ThemeProvider } from './src/contexts/ThemeContext'
import { MailStack } from './src/navigate/MailStack'
import NotificationProvider from './src/contexts/NotificationContext'
import { CalendarStack } from './src/navigate/CalendarStack'
import { VarsPorvider } from './src/contexts/VarContext'
import { ContactStack } from './src/navigate/ContactStack'
import SettingsPage from './src/pages/Settings/SettingsPage'
import { useState, useEffect } from 'react'
import UpdateModal from './src/components/frame/UpdateModal'


function App() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    window.electron.checkForUpdates()
      .then((info) => {
        if (info.updateAvailable) {
          setUpdateInfo(info);
        }
      })
      .catch(() => {
        // Silently ignore update check failures (e.g. no network)
      });
  }, []);

  return (
    <HashRouter>
      <ThemeProvider>
        <VarsPorvider>
          <NotificationProvider>
            <LoadingProvider>
              <AuthProvider>
                {updateInfo && (
                  <UpdateModal
                    currentVersion={updateInfo.currentVersion}
                    latestVersion={updateInfo.latestVersion}
                    releaseName={updateInfo.releaseName}
                    releaseNotes={updateInfo.releaseNotes}
                    releaseUrl={updateInfo.releaseUrl}
                    onDismiss={() => setUpdateInfo(null)}
                  />
                )}
                <Routes>
                  <Route path='/auth' element={<LoginPage />} />
                  <Route
                    path="*"
                    element={
                      <RequireAuth>
                        <MainFrameComponent>
                          <Routes>
                            <Route path='*' element={<Navigate to="/mail" replace />} />
                            <Route path='/mail' element={<MailStack />} />
                            <Route path='/calendar' element={<CalendarStack />} />
                            <Route path='/contacts' element={<ContactStack />} />
                            <Route path='/settings' element={<SettingsPage />} />
                          </Routes>
                        </MainFrameComponent>
                      </RequireAuth>
                    }
                  />
                </Routes>
              </AuthProvider>
            </LoadingProvider>
          </NotificationProvider>
        </VarsPorvider>
      </ThemeProvider>
    </HashRouter>
  )
}

export default App
