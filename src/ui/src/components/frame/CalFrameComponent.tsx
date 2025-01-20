import React from 'react';
import Sidebar from './SideBarComponent';
import './CalFrameComponent.css';
import { CalSideBarComponent } from '../cal/CalSideBarComponent';

const CalFrameComponent = ({ children }: { children: React.ReactNode}) => {
    return (
        <div className="cal-frame">
            <CalSideBarComponent />
            <div className="cal-frame-content">{children}</div>
        </div>
    );
};

export default CalFrameComponent;
