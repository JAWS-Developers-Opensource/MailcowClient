import { Route, Routes } from "react-router-dom"
import CalendarPage from "../pages/Cal/CalendarPage"
import CalFrameComponent from "../components/frame/CalFrameComponent"
import { useLoading } from "../contexts/LoadingContext";
import { CalProvider } from "../contexts/cal/CalContext";

export const CalendarStack = () => {

    const { setLoadingStatus, loading } = useLoading();
    /*const { setVar } = useVars();

   const loadCalendarData = async () => {
       await window.electron.calCreateConn();
       await window.electron.calGetCalendars().then(cals => setVar("cal", "calendars", cals))
       console.log("done");

       setLoadingStatus(false)
   }

   useEffect(() => {
       setLoadingStatus(true)
       loadCalendarData();
   }, [])*/


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