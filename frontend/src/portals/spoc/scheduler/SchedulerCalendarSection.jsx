"use client";

import React, { Suspense } from "react";

const SchedulerCalendarSection = ({
  CalendarViewComponent,
  calendarEvents,
  onEventClick,
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <Suspense
      fallback={(
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}
    >
      <CalendarViewComponent
        events={calendarEvents}
        onEventClick={onEventClick}
      />
    </Suspense>
  </div>
);

export default SchedulerCalendarSection;
