import { Route, Routes } from "react-router-dom"
import CalendarPage from "../pages/Cal/CalendarPage"
import CalFrameComponent from "../components/frame/CalFrameComponent"
import { CalProvider } from "../contexts/cal/CalContext";

export const CalendarStack = () => {
    return (
        <CalProvider>
            <CalFrameComponent>
                <Routes>
                    <Route path="*" element={<CalendarPage />} />
                </Routes>
            </CalFrameComponent>
        </CalProvider>
    )
}