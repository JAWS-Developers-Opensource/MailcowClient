import { BrowserRouter, Route, Routes } from "react-router-dom"
import MailPage from "../pages/Mail/MailPage"
import CalendarPage from "../pages/Cal/CalendarPage"
import { CalSideBarComponent } from "../components/cal/CalSideBarComponent"
import CalFrameComponent from "../components/frame/CalFrameComponent"
import { useEffect } from "react"
import { useLoading } from "../contexts/LoadingContext"
import { useVars } from "../contexts/VarContext"

export const CalendarStack = () => {

    /*const { setLoadingStatus, loading } = useLoading();
    const { setVar } = useVars();

    const loadCalendarData = async () => {
        await window.electron.calCreateConn();
        await window.electron.calGetCalendars().then(cals => setVar("cal", "calendars", cals))
        console.log("done");

        setLoadingStatus(false)
    }

    useEffect(() => {
        setLoadingStatus(true)
        loadCalendarData();
    }, [])

    if (loading)
        return <></>*/

    return (
        <CalFrameComponent>
            <Routes>
                <Route path="*" element={<CalendarPage />} />
            </Routes>
        </CalFrameComponent>
    )
}