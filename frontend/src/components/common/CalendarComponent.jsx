"use client";

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card } from 'antd';

const CalendarComponent = ({ events = [], onDateClick, onEventClick, title }) => {
  return (
    <Card title={title || "Schedule"}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        dateClick={onDateClick}
        eventClick={onEventClick}
        height="auto"
        selectable={true}
      />
    </Card>
  );
};

export default CalendarComponent;
