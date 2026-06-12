"use client";

import { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const getDayStatusStyles = (status, active) => {
  if (active) return 'border-indigo-300 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-300';
  const normalized = (status || '').toLowerCase();
  if (normalized === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'inprogress') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-gray-200 bg-white text-gray-700';
};

const treeRowBase =
  'flex w-full items-center justify-between px-3 py-2.5 my-0.5 text-left text-[13px] font-medium transition-all duration-300 hover:bg-gray-50';

const HierarchySidebar = ({
  companyName = 'Company',
  courseName = 'Course',
  collegeName = 'College',
  departmentName = 'General',
  days = [],
  selectedDayId = null,
  onSelectDay,
}) => {
  const [expanded, setExpanded] = useState({
    company: true,
    course: true,
    college: true,
    department: true,
    days: true,
  });

  const toggle = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const dayItems = useMemo(
    () =>
      days.map((day) => {
        const dayName = day.date
          ? new Date(day.date).toLocaleDateString(undefined, { weekday: 'long' })
          : `Day ${day.dayNumber}`;
        const dayDate = day.date ? new Date(day.date).toLocaleDateString() : '';
        return { ...day, dayName, dayDate };
      }),
    [days]
  );

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Hierarchy</p>

      <button type="button" onClick={() => toggle('company')} className={treeRowBase}>
        <span className="flex items-center gap-2 font-semibold text-slate-800">
          <span className="text-base">🏢</span>
          {companyName}
        </span>
        {expanded.company ? <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : <ChevronRightIcon className="h-4 w-4 text-gray-500" />}
      </button>

      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expanded.company ? 'max-h-[1200px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
        <div className="ml-5 border-l-2 border-slate-100 pl-2">
          <button type="button" onClick={() => toggle('course')} className={treeRowBase}>
            <span className="flex items-center gap-2 text-indigo-700 font-semibold">
              <span className="text-base">📘</span>
              {courseName}
            </span>
            {expanded.course ? <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : <ChevronRightIcon className="h-4 w-4 text-gray-500" />}
          </button>

          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expanded.course ? 'max-h-[1000px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
            <div className="ml-5 border-l-2 border-slate-100 pl-2">
              <button type="button" onClick={() => toggle('college')} className={treeRowBase}>
                <span className="flex items-center gap-2 text-cyan-700 font-semibold">
                  <span className="text-base">🏫</span>
                  {collegeName}
                </span>
                {expanded.college ? <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : <ChevronRightIcon className="h-4 w-4 text-gray-500" />}
              </button>

              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expanded.college ? 'max-h-[900px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
                <div className="ml-5 border-l-2 border-slate-100 pl-2">
                  <button type="button" onClick={() => toggle('department')} className={treeRowBase}>
                    <span className="flex items-center gap-2 text-amber-700 font-semibold">
                      <span className="text-base">🏬</span>
                      {departmentName}
                    </span>
                    {expanded.department ? <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : <ChevronRightIcon className="h-4 w-4 text-gray-500" />}
                  </button>

                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expanded.department ? 'max-h-[860px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
                      <div className="ml-5 border-l-2 border-slate-100 pl-2">
                      <button type="button" onClick={() => toggle('days')} className={treeRowBase}>
                        <span className="flex items-center gap-2 text-gray-700 font-semibold">
                          <span className="text-base">📅</span>
                          Days ({dayItems.length})
                        </span>
                        {expanded.days ? <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : <ChevronRightIcon className="h-4 w-4 text-gray-500" />}
                      </button>

                      <div
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                          expanded.days ? 'max-h-[520px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'
                        }`}
                      >
                        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 mt-2 ml-2 border-l-2 border-indigo-100 pl-3">
                          {dayItems.length > 0 ? (
                            dayItems.map((day) => {
                              const active = selectedDayId && String(selectedDayId) === String(day.id);
                              return (
                                <button
                                  key={day.id || day.dayNumber}
                                  type="button"
                                  onClick={() => onSelectDay?.(day)}
                                  className={`w-full rounded px-3 py-2 text-left text-[12px] font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                                      active 
                                          ? 'bg-[#eef2ff] border-l-[3px] border-[#4f46e5] text-indigo-900 shadow-sm ring-1 ring-indigo-200/50' 
                                          : 'border border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">{day.dayName}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                                        active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {day.status || 'Pending'}
                                    </span>
                                  </div>
                                  <p className={`mt-1 truncate text-[10px] ${active ? 'text-indigo-600/80 font-medium' : 'text-gray-500'}`}>
                                    Day {day.dayNumber}
                                    {day.dayDate ? ` - ${day.dayDate}` : ''}
                                  </p>
                                </button>
                              );
                            })
                          ) : (
                            <p className="px-2 py-2 text-xs text-gray-400">No days available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default HierarchySidebar;
