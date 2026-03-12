import React from 'react';
import './EventHoverTooltip.css';

const EventHoverTooltip = ({ event }: { event: { title: string; description?: string } }) => {
    return (
        <div className="tooltip-container">
            <strong>{event.title}</strong>
            <p>{event.description}</p>
        </div>
    );
};

export default EventHoverTooltip;