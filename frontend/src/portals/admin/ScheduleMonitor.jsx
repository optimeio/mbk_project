"use client";

import React, { useState, useMemo, useCallback } from 'react';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CalendarIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowPathIcon,
    BuildingOfficeIcon,
    AcademicCapIcon,
    UserIcon,
    PencilSquareIcon,
    TrashIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/services/api';
import scheduleService from '@/services/scheduleService';
import { notify } from '@/lib/toast';
import RescheduleModal from '@/components/modals/RescheduleModal';
import CreateScheduleModal from '@/components/modals/CreateScheduleModal';

const ScheduleMonitor = () => {
    const queryClient = useQueryClient();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [statusFilter, setStatusFilter] = useState('all');
    const [companyFilter, setCompanyFilter] = useState('all');
    const [collegeFilter, setCollegeFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('all');

    // Create & Reschedule Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    // Associations Query (Companies, Colleges, Courses, Trainers)
    const associationsQuery = useQuery({
        queryKey: ['admin', 'schedule-associations'],
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        refetchOnWindowFocus: false,
        queryFn: async () => {
            try {
                const [assocRes, trainersRes] = await Promise.all([
                    scheduleService.getAssociations().catch(() => ({})),
                    api.get('/trainers').catch(() => ([]))
                ]);
                const assocData = assocRes?.data || assocRes || {};

                let trainersData = [];
                if (Array.isArray(trainersRes)) {
                    trainersData = trainersRes;
                } else if (Array.isArray(trainersRes?.data?.trainers)) {
                    trainersData = trainersRes.data.trainers;
                } else if (Array.isArray(trainersRes?.data)) {
                    trainersData = trainersRes.data;
                } else if (Array.isArray(trainersRes?.trainers)) {
                    trainersData = trainersRes.trainers;
                }

                return {
                    companies: Array.isArray(assocData.companies) ? assocData.companies : [],
                    colleges: Array.isArray(assocData.colleges) ? assocData.colleges : [],
                    courses: Array.isArray(assocData.courses) ? assocData.courses : [],
                    trainers: trainersData,
                };
            } catch (err) {
                console.error("Error loading schedule associations:", err);
                return { companies: [], colleges: [], courses: [], trainers: [] };
            }
        }
    });

    const associations = associationsQuery.data || { companies: [], colleges: [], courses: [], trainers: [] };

    // Schedules Query
    const schedulesQuery = useQuery({
        queryKey: ['admin', 'schedules-monitor'],
        staleTime: 1000 * 60 * 2, // 2 minutes cache
        refetchOnWindowFocus: false,
        queryFn: async () => {
            try {
                const res = await scheduleService.getAllSchedules();
                if (Array.isArray(res)) return res;
                if (Array.isArray(res?.data)) return res.data;
                if (Array.isArray(res?.data?.data)) return res.data.data;
                if (Array.isArray(res?.rows)) return res.rows;
                return [];
            } catch (err) {
                console.error("Error fetching schedules monitor:", err);
                return [];
            }
        }
    });

    const schedulesList = schedulesQuery.data || [];
    const isLoading = schedulesQuery.isLoading || associationsQuery.isLoading;

    const trainersMap = useMemo(() => {
        const map = new Map();
        (associations.trainers || []).forEach((t) => {
            const tId = String(t._id || t.id || '').trim();
            const uId = String(t.userId?._id || t.userId || '').trim();
            const name = t.name || [t.firstName, t.lastName].filter(Boolean).join(' ') || t.userId?.name || t.email;
            if (tId && name) map.set(tId, name);
            if (uId && name) map.set(uId, name);
        });
        return map;
    }, [associations.trainers]);

    // Filtered Schedules
    const filteredSchedules = useMemo(() => {
        return schedulesList.filter((item) => {
            const hasTrainer = Boolean(item.trainerId);

            // Status Filter
            if (statusFilter !== 'all') {
                const normStatus = String(item.status || '').toLowerCase();
                if (statusFilter === 'rescheduled' && normStatus !== 'rescheduled') return false;
                if (statusFilter === 'scheduled' && normStatus !== 'scheduled') return false;
                if (statusFilter === 'assigned' && !hasTrainer) return false;
                if (statusFilter === 'unassigned' && hasTrainer) return false;
                if (statusFilter === 'completed' && normStatus !== 'completed') return false;
                if (statusFilter === 'cancelled' && normStatus !== 'cancelled') return false;
            }

            // Company Filter
            if (companyFilter !== 'all') {
                const cId = item.companyId?._id || item.companyId;
                if (String(cId) !== String(companyFilter)) return false;
            }

            // College Filter
            if (collegeFilter !== 'all') {
                const colId = item.collegeId?._id || item.collegeId;
                if (String(colId) !== String(collegeFilter)) return false;
            }

            // Course Filter
            if (courseFilter !== 'all') {
                const crsId = item.courseId?._id || item.courseId;
                if (String(crsId) !== String(courseFilter)) return false;
            }

            // Search Term — uses debounced value to avoid filtering on every keystroke
            if (debouncedSearchTerm.trim()) {
                const term = debouncedSearchTerm.toLowerCase();
                const collegeName = String(item.collegeId?.name || '').toLowerCase();
                const rawT = item.trainerId;
                const trainerName = String(
                    typeof rawT === 'object' && rawT
                        ? rawT.name || [rawT.firstName, rawT.lastName].filter(Boolean).join(' ') || rawT.userId?.name || rawT.email
                        : trainersMap.get(String(rawT)) || ''
                ).toLowerCase();
                const subject = String(item.subject || '').toLowerCase();

                return collegeName.includes(term) || trainerName.includes(term) || subject.includes(term);
            }

            return true;
        });
    }, [schedulesList, statusFilter, companyFilter, collegeFilter, courseFilter, debouncedSearchTerm, trainersMap]);

    // Filtered Courses for Dropdown
    const filteredCoursesForDropdown = useMemo(() => {
        let list = associations.courses || [];
        if (companyFilter !== 'all') {
            list = list.filter((crs) => {
                const cId = crs.companyId?._id || crs.companyId;
                return String(cId) === String(companyFilter);
            });
        }
        return list;
    }, [associations.courses, companyFilter]);

    // Filtered Colleges for Dropdown
    const filteredCollegesForDropdown = useMemo(() => {
        let list = associations.colleges || [];

        // Filter by selected company
        if (companyFilter !== 'all') {
            const compObj = (associations.companies || []).find((c) => String(c._id || c.id) === String(companyFilter));
            list = list.filter((col) => {
                const cId = col.companyId?._id || col.companyId;
                const cCode = col.companyCode;
                if (cId && String(cId) === String(companyFilter)) return true;
                if (cCode && compObj?.companyCode && String(cCode).toUpperCase() === String(compObj.companyCode).toUpperCase()) return true;
                return false;
            });
        }

        // Filter strictly by selected course (e.g. Surface modeling => 57 colleges)
        if (courseFilter !== 'all') {
            const selectedCourseObj = (associations.courses || []).find((crs) => String(crs._id || crs.id) === String(courseFilter));
            list = list.filter((col) => {
                const colCourseId = col.courseId?._id || col.courseId;
                const matchesDirectCourse = colCourseId && String(colCourseId) === String(courseFilter);
                const matchesCourseColleges = selectedCourseObj && Array.isArray(selectedCourseObj.colleges) &&
                    selectedCourseObj.colleges.some((c) => String(c._id || c) === String(col._id || col.id));
                return matchesDirectCourse || matchesCourseColleges;
            });
        }

        return list;
    }, [associations.colleges, associations.companies, associations.courses, companyFilter, courseFilter]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = schedulesList.length;
        const scheduled = schedulesList.filter(s => String(s.status).toLowerCase() === 'scheduled').length;
        const rescheduled = schedulesList.filter(s => String(s.status).toLowerCase() === 'rescheduled').length;
        const completed = schedulesList.filter(s => String(s.status).toLowerCase() === 'completed').length;
        return { total, scheduled, rescheduled, completed };
    }, [schedulesList]);

    const handleRefetch = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'schedules-monitor'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'schedule-associations'] });
    }, [queryClient]);

    const handleOpenReschedule = (schedule) => {
        setSelectedSchedule(schedule);
        setRescheduleModalOpen(true);
    };

    const handleDelete = async (scheduleId) => {
        if (!window.confirm('Are you sure you want to delete this schedule?')) return;
        try {
            // Optimistically update React Query cache immediately for instant response
            queryClient.setQueryData(['admin', 'schedules-monitor'], (old) => {
                if (!Array.isArray(old)) return old;
                return old.filter(s => String(s._id) !== String(scheduleId));
            });

            await scheduleService.deleteSchedule(scheduleId);
            notify.success('Schedule deleted successfully!');
            handleRefetch();
        } catch (error) {
            console.error('Error deleting schedule:', error);
            notify.error('Failed to delete schedule');
            handleRefetch();
        }
    };

    const getStatusBadge = (statusStr) => {
        const s = String(statusStr || 'scheduled').toLowerCase();
        if (s === 'completed') {
            return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">Completed</span>;
        }
        if (s === 'rescheduled') {
            return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">Rescheduled</span>;
        }
        if (s === 'in_progress') {
            return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">In Progress</span>;
        }
        if (s === 'cancelled') {
            return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">Cancelled</span>;
        }
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 whitespace-nowrap">Scheduled</span>;
    };

    return (
        <div className="w-full max-w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <CalendarIcon className="h-7 w-7 text-teal-600 flex-shrink-0" />
                        <span>Schedule Monitor & Rescheduler</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Monitor training calendars across colleges and instantly reschedule sessions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-bold rounded-xl transition-all shadow-sm whitespace-nowrap gap-1.5"
                    >
                        <PlusIcon className="h-4 w-4 stroke-[2.5]" />
                        <span>Add Schedule</span>
                    </button>
                    <button
                        onClick={handleRefetch}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all border border-slate-200 whitespace-nowrap"
                    >
                        <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sessions</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{metrics.total}</p>
                    </div>
                    <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
                        <CalendarIcon className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled</p>
                        <p className="text-2xl font-black text-teal-700 mt-1">{metrics.scheduled}</p>
                    </div>
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                        <ClockIcon className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rescheduled</p>
                        <p className="text-2xl font-black text-amber-600 mt-1">{metrics.rescheduled}</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <ExclamationTriangleIcon className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.completed}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircleIcon className="h-6 w-6" />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                    <FunnelIcon className="h-4 w-4 text-teal-600" />
                    <span>Filter & Search Schedules</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search Input */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            placeholder="Search college, trainer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    >
                        <option value="all">All Statuses</option>
                        <option value="assigned">Assigned Only</option>
                        <option value="unassigned">Unassigned Only</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    {/* Company Filter */}
                    <select
                        value={companyFilter}
                        onChange={(e) => {
                            setCompanyFilter(e.target.value);
                            setCourseFilter('all');
                            setCollegeFilter('all');
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    >
                        <option value="all">All Companies</option>
                        {associations.companies.map((c) => (
                            <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                        ))}
                    </select>

                    {/* Course Filter */}
                    <select
                        value={courseFilter}
                        onChange={(e) => {
                            setCourseFilter(e.target.value);
                            setCollegeFilter('all');
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    >
                        <option value="all">All Courses</option>
                        {filteredCoursesForDropdown.map((crs) => (
                            <option key={crs._id || crs.id} value={crs._id || crs.id}>{crs.title || crs.name}</option>
                        ))}
                    </select>

                    {/* College Filter */}
                    <select
                        value={collegeFilter}
                        onChange={(e) => setCollegeFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    >
                        <option value="all">All Colleges</option>
                        {filteredCollegesForDropdown.map((col) => (
                            <option key={col._id || col.id} value={col._id || col.id}>{col.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table Container */}
            <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                <th className="px-6 py-4 min-w-[200px]">Session Info</th>
                                <th className="px-6 py-4 min-w-[220px]">College</th>
                                <th className="px-6 py-4 min-w-[180px]">Scheduled Date & Time</th>
                                <th className="px-6 py-4 min-w-[160px]">Assigned Trainer</th>
                                <th className="px-6 py-4 min-w-[140px]">Status</th>
                                <th className="px-6 py-4 min-w-[150px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <ArrowPathIcon className="h-6 w-6 animate-spin text-teal-600" />
                                            <span>Loading schedule data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSchedules.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No schedules matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredSchedules.map((schedule) => {
                                    const colName = schedule.collegeId?.name || 'College N/A';
                                    const crsName = schedule.courseId?.title || schedule.courseId?.name || 'Course N/A';
                                    const rawT = schedule.trainerId;
                                    const trainerName = (
                                        typeof rawT === 'object' && rawT
                                            ? rawT.name || [rawT.firstName, rawT.lastName].filter(Boolean).join(' ') || rawT.userId?.name || rawT.email
                                            : trainersMap.get(String(rawT))
                                    ) || 'Unassigned';
                                    const dateStr = schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    }) : 'Date TBD';
                                    const timeStr = `${schedule.startTime || '09:00'} - ${schedule.endTime || '17:00'}`;

                                    return (
                                        <tr key={schedule._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <div className="font-semibold text-slate-900">
                                                    Day {schedule.dayNumber || 1}: {schedule.subject || 'Training'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5">{crsName}</div>
                                            </td>

                                            <td className="px-6 py-4 min-w-[220px]">
                                                <div className="text-slate-800 font-medium">{colName}</div>
                                                {schedule.departmentId?.name && (
                                                    <div className="text-xs text-slate-400">Dept: {schedule.departmentId.name}</div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap min-w-[180px]">
                                                <div className="text-slate-800 font-semibold flex items-center space-x-1.5 whitespace-nowrap">
                                                    <CalendarIcon className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                                    <span className="whitespace-nowrap">{dateStr}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1 whitespace-nowrap">
                                                    <ClockIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                                    <span className="whitespace-nowrap">{timeStr}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap min-w-[160px]">
                                                <div className="flex items-center space-x-2 whitespace-nowrap">
                                                    <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {trainerName.charAt(0)}
                                                    </div>
                                                    <span className="text-slate-800 whitespace-nowrap">{trainerName}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                                                {getStatusBadge(schedule.status)}
                                                {schedule.rescheduleReason && (
                                                    <div className="text-xs text-amber-700 italic mt-1 max-w-xs truncate" title={schedule.rescheduleReason}>
                                                        "{schedule.rescheduleReason}"
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-right whitespace-nowrap min-w-[150px]">
                                                <div className="flex items-center justify-end space-x-2 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleOpenReschedule(schedule)}
                                                        className="inline-flex items-center px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg transition-colors border border-teal-200/60 whitespace-nowrap"
                                                        title="Reschedule session"
                                                    >
                                                        <PencilSquareIcon className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                                                        Reschedule
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(schedule._id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                                                        title="Delete schedule"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Schedule Modal */}
            <CreateScheduleModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleRefetch}
                associations={associations}
            />

            {/* Reschedule Modal */}
            <RescheduleModal
                isOpen={rescheduleModalOpen}
                onClose={() => {
                    setRescheduleModalOpen(false);
                    setSelectedSchedule(null);
                }}
                schedule={selectedSchedule}
                associations={associations}
                trainers={associations.trainers}
                onSaveSuccess={handleRefetch}
            />
        </div>
    );
};

export default ScheduleMonitor;
