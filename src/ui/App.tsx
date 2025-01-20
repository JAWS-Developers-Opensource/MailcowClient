import './App.css'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './src/contexts/AuthContext'
import LoadingProvider from './src/contexts/LoadingContext'
import LoginpPage from './src/pages/Auth/LoginPage'
import MainFrameComponent from './src/components/frame/MainFrameComponent'
import { ThemeProvider } from './src/contexts/ThemeContext'
import { MailStack } from './src/navigate/MailStack'
import NotificationProvider from './src/contexts/NotificationContext'
import CalendarPage from './src/pages/Cal/CalendarPage'
import { CalendarStack } from './src/navigate/CalendarStack'
import { VarsPorvider } from './src/contexts/VarContext'


function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <VarsPorvider>
          <NotificationProvider>
            <LoadingProvider>
              <AuthProvider>
                <Routes>
                  <Route path='/auth' element={<LoginpPage />} />
                  <Route path='/dev-info' />
                  <Route
                    path="*"
                    element={
                      <RequireAuth>
                        <MainFrameComponent>
                          <Routes>
                            <Route path='*' element={<Navigate to="/mail" replace />} />
                            <Route path='/mail' element={<MailStack />} />
                            <Route path='/calendar' element={<CalendarStack />} />
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
