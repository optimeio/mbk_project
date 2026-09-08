"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useState, useMemo, lazy } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useSchedulerData } from '@/modules/schedules';
import { notify } from '@/lib/toast';
import { runOnIdle } from '@/shared/lib/mainThread';
import { clearTrainerDashboardScheduleSummaryCache, clearTrainerDashboardSnapshot, signalTrainerDashboardRefresh } from '@/portals/trainer/dashboard/dashboardUtils';
import ScheduleFilterPanel from '@/components/common/ScheduleFilterPanel';
import { getTrainingColleges } from '@/services/trainingCollegeService';
import { getTrainingCourses } from '@/services/courseService';
import SchedulerAssignModalSection from './scheduler/SchedulerAssignModalSection';
import SchedulerHeaderActions from './scheduler/SchedulerHeaderActions';
import SchedulerCalendarSection from './scheduler/SchedulerCalendarSection';
import SchedulerListSection from './scheduler/SchedulerListSection';
import SchedulerDashboardSection from './scheduler/SchedulerDashboardSection';
import { buildAssignModalSeed, guardAssignSubmission } from './scheduler/schedulerUiState';
import useSchedulerExportWorker from './scheduler/useSchedulerExportWorker';

const BulkUploadModal = dynamic(() => import('./scheduler/BulkUploadModal'), {
    loading: () => null,
    ssr: false,
});

// ✅ Lazy-load FullCalendar — only pulled when user switches to calendar view
const LazyCalendarView = lazy(() =>
    Promise.all([
        import('@fullcalendar/react'),
        import('@fullcalendar/daygrid'),
        import('@fullcalendar/timegrid'),
        import('@fullcalendar/interaction'),
    ]).then(([{ default: FullCalendar }, dayGridPlugin, timeGridPlugin, interactionPlugin]) => ({
        default: ({ events, onEventClick }) => (
            <FullCalendar
                plugins={[dayGridPlugin.default, timeGridPlugin.default, interactionPlugin.default]}
                initialView="dayGridMonth"
                events={events}
                eventClick={(info) => onEventClick(info.event.extendedProps)}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek'
                }}
                height="700px"
                eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                }}
            />
        ),
    }))
);

// ✅ Lazy-load xlsx — only pulled when user clicks Export
const getXlsx = async () => {
    const { default: XLSX } = await import('xlsx');
    return XLSX;
};

const getPdfTools = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);
    return { jsPDF, autoTable };
};

const Scheduler = () => {
    const {
        transformLiveExcel,
        transformLivePdf,
        transformListExcel,
        transformListPdf,
    } = useSchedulerExportWorker();
    const trainerSearch = '';
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'list' or 'calendar'
    const [bulkModal, setBulkModal] = useState(false);
    const [assignModal, setAssignModal] = useState({ show: false, scheduleId: null });
    const [assignData, setAssignData] = useState({
        trainerId: '',
        scheduledDate: '',
        startTime: '09:00',
        endTime: '17:00',
            rescheduleReason: ''
    });

    // Schedule filter state
    const [scheduleFilters, setScheduleFilters] = useState({ trainer: '', college: '', course: '' });
    const [staticColleges, setStaticColleges] = useState([]);
    const [staticCourses, setStaticCourses] = useState([]);

    const shouldLoadInteractiveData = viewMode !== 'dashboard' || assignModal.show;
    const {
        schedulesQuery,
        schedules,
        schedulesPagination,
        trainers,
        colleges: dbColleges,
        courses: dbCourses,
        liveSchedules,
        lastUpdated,
        loading,
        loadMoreSchedules,
        assignSchedule,
        deleteSchedule,
        refreshSchedules,
    } = useSchedulerData({
        viewMode,
        trainerSearch,
        shouldLoadInteractiveData,
    });

    // Fetch Tamil Nadu colleges and training courses for filter panel
    React.useEffect(() => {
        let cancelled = false;
        const loadFilterData = async () => {
            try {
                const [collegesData, coursesData] = await Promise.all([
                    getTrainingColleges(),
                    getTrainingCourses(),
                ]);
                if (!cancelled) {
                    setStaticColleges(collegesData || []);
                    setStaticCourses(coursesData || []);
                }
            } catch (err) {
                console.error('Failed to load filter data:', err);
            }
        };
        loadFilterData();
        return () => { cancelled = true; };
    }, []);

    // Merge database colleges with static Tamil Nadu colleges to ensure complete listing
    const filterColleges = useMemo(() => {
        const dbList = dbColleges || [];
        const staticList = staticColleges || [];
        const seen = new Set();
        const result = [];
        
        dbList.forEach(c => {
            const nameKey = String(c.name || '').trim().toLowerCase();
            if (nameKey) {
                seen.add(nameKey);
                result.push({
                    id: c.id || c._id,
                    _id: c.id || c._id,
                    name: c.name,
                    city: c.city || '',
                    state: c.state || 'Tamil Nadu'
                });
            }
        });
        
        staticList.forEach(c => {
            const nameKey = String(c.name || '').trim().toLowerCase();
            if (!seen.has(nameKey)) {
                seen.add(nameKey);
                result.push({
                    id: c.id || c._id,
                    _id: c.id || c._id,
                    name: c.name,
                    city: c.city || '',
                    state: c.state || 'Tamil Nadu'
                });
            }
        });
        
        return result;
    }, [dbColleges, staticColleges]);

    // Merge database courses with static courses
    const filterCourses = useMemo(() => {
        const dbList = dbCourses || [];
        const staticList = staticCourses || [];
        const seen = new Set();
        const result = [];
        
        dbList.forEach(c => {
            const nameKey = String(c.name || c.title || '').trim().toLowerCase();
            if (nameKey) {
                seen.add(nameKey);
                result.push({
                    id: c.id || c._id,
                    _id: c.id || c._id,
                    name: c.name || c.title,
                    category: c.category || ''
                });
            }
        });
        
        staticList.forEach(c => {
            const nameKey = String(c.name || '').trim().toLowerCase();
            if (!seen.has(nameKey)) {
                seen.add(nameKey);
                result.push({
                    id: c.id || c._id,
                    _id: c.id || c._id,
                    name: c.name,
                    category: c.category || ''
                });
            }
        });
        
        return result;
    }, [dbCourses, staticCourses]);

    // Map trainers for filter dropdown format
    const filterTrainers = useMemo(() => {
        if (!Array.isArray(trainers)) return [];
        return trainers.map((t) => ({
            id: t._id || t.id,
            _id: t._id || t.id,
            name: t.userId?.name || t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown',
            firstName: t.firstName || '',
            lastName: t.lastName || '',
            specialization: t.specialization || '',
        }));
    }, [trainers]);

    // Apply filters to schedules
    const filteredSchedules = useMemo(() => {
        let result = schedules;
        if (scheduleFilters.trainer) {
            result = result.filter((s) => {
                const trainerId = s.trainerId?._id || s.trainerId?.id || s.trainerId || '';
                return String(trainerId) === String(scheduleFilters.trainer);
            });
        }
        if (scheduleFilters.college) {
            result = result.filter((s) => {
                const collegeId = s.collegeId?._id || s.collegeId?.id || s.collegeId || '';
                return String(collegeId) === String(scheduleFilters.college);
            });
        }
        if (scheduleFilters.course) {
            result = result.filter((s) => {
                const courseId = s.courseId?._id || s.courseId?.id || s.courseId || '';
                return String(courseId) === String(scheduleFilters.course);
            });
        }
        return result;
    }, [schedules, scheduleFilters]);

    const handleScheduleFilterChange = useCallback((newFilters) => {
        setScheduleFilters(newFilters);
    }, []);

    const handleAssign = useCallback(async (e) => {
        e.preventDefault();
        const { isValid, mutationInput } = guardAssignSubmission({
            scheduleId: assignModal.scheduleId,
            assignData,
            onInvalidSubmit: (message) => notify.error(message),
        });
        if (!isValid) {
            return;
        }
        try {
            const payload = await assignSchedule({
                scheduleId: mutationInput.scheduleId,
                assignPayload: mutationInput.assignPayload,
            });
            if (payload?.success !== false) {
                setAssignModal({ show: false, scheduleId: null });
                notify.success('Schedule updated successfully');
            }
        } catch (error) {
            console.error('Error updating schedule:', error);
            notify.error('Failed to update schedule');
        }
    }, [assignData, assignModal.scheduleId, assignSchedule]);

    const handleDelete = useCallback(async (scheduleId, trainerId) => {
        if (!window.confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
            return;
        }

        const reason = window.prompt('Please provide a reason for cancellation (e.g., Batch completed, Trainer change):');
        if (reason === null) return; // User cancelled the prompt

        try {
            const payload = await deleteSchedule({
                scheduleId,
                reason,
            });
            if (payload?.success !== false) {
                notify.success('Schedule deleted successfully');
                if (trainerId) {
                    clearTrainerDashboardScheduleSummaryCache(trainerId);
                    clearTrainerDashboardSnapshot(trainerId);
                    signalTrainerDashboardRefresh(trainerId);
                }
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            notify.error('Failed to delete schedule');
        }
    }, [deleteSchedule]);

    const openAssignModal = useCallback((schedule) => {
        const assignSeed = buildAssignModalSeed(schedule);
        setAssignModal({ show: true, scheduleId: assignSeed.scheduleId });
        setAssignData(assignSeed.form);
    }, []);


    // ✅ Memoized — only recomputed when filteredSchedules changes
    const calendarEvents = useMemo(() =>
        filteredSchedules
            .filter(s => s.scheduledDate)
            .map(s => ({
                id: s.id || s._id,
                title: s.trainer ? s.trainer.User?.name : 'Unassigned',
                start: `${s.scheduledDate.split('T')[0]}T${s.startTime}`,
                end: `${s.scheduledDate.split('T')[0]}T${s.endTime}`,
                backgroundColor: s.status === 'Completed' ? '#10b981' : s.trainerId ? '#3b82f6' : '#f59e0b',
                borderColor: 'transparent',
                extendedProps: s
            }))
    , [filteredSchedules]);

    const exportDateSuffix = useMemo(
        () => new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
        [],
    );

    const handleExportLiveExcel = useCallback(async () => {
        const exportRows = await transformLiveExcel(liveSchedules);
        const XLSX = await getXlsx();
        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Session Overview');
        runOnIdle(() => {
            XLSX.writeFile(wb, `Session_Overview_${exportDateSuffix}.xlsx`);
        });
    }, [exportDateSuffix, liveSchedules, transformLiveExcel]);

    const handleExportLivePdf = useCallback(async () => {
        const tableRows = await transformLivePdf(liveSchedules);
        const { jsPDF, autoTable } = await getPdfTools();
        const doc = new jsPDF();
        doc.text('Session Overview', 14, 15);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 22);
        const tableColumn = ['Time', 'College', 'Course', 'Company', 'Trainer', 'Trainer ID', 'Status'];
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });
        runOnIdle(() => {
            doc.save(`Session_Overview_${exportDateSuffix}.pdf`);
        });
    }, [exportDateSuffix, liveSchedules, transformLivePdf]);

    const handleExportListExcel = useCallback(async () => {
        const exportRows = await transformListExcel(filteredSchedules);
        const XLSX = await getXlsx();
        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Training Itinerary');
        runOnIdle(() => {
            XLSX.writeFile(wb, `Training_Itinerary_${exportDateSuffix}.xlsx`);
        });
    }, [exportDateSuffix, filteredSchedules, transformListExcel]);

    const handleExportListPdf = useCallback(async () => {
        const tableRows = await transformListPdf(filteredSchedules);
        const { jsPDF, autoTable } = await getPdfTools();
        const doc = new jsPDF();
        doc.text('Training Itinerary', 14, 15);
        doc.text(`Total Sessions: ${filteredSchedules.length}`, 14, 22);

        const tableColumn = ['College', 'Course', 'Date', 'Time', 'Trainer', 'Trainer ID', 'Status'];
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });
        runOnIdle(() => {
            doc.save(`Training_Itinerary_${exportDateSuffix}.pdf`);
        });
    }, [exportDateSuffix, filteredSchedules, transformListPdf]);

    const openBulkModal = useCallback(() => {
        setBulkModal(true);
    }, []);

    const closeBulkModal = useCallback(() => {
        setBulkModal(false);
    }, []);

    const closeAssignModal = useCallback(() => {
        setAssignModal({ show: false, scheduleId: null });
    }, []);

    const handleAssignTrainerChange = useCallback((event) => {
        const nextValue = event.target.value;
        setAssignData((previous) => ({ ...previous, trainerId: nextValue }));
    }, []);

    const handleAssignDateChange = useCallback((event) => {
        const nextValue = event.target.value;
        setAssignData((previous) => ({ ...previous, scheduledDate: nextValue }));
    }, []);

    const handleAssignStartTimeChange = useCallback((event) => {
        const nextValue = event.target.value;
        setAssignData((previous) => ({ ...previous, startTime: nextValue }));
    }, []);

    const handleAssignEndTimeChange = useCallback((event) => {
        const nextValue = event.target.value;
        setAssignData((previous) => ({ ...previous, endTime: nextValue }));
    }, []);

    const handleAssignReasonChange = useCallback((event) => {
        const nextValue = event.target.value;
        setAssignData((previous) => ({ ...previous, rescheduleReason: nextValue }));
    }, []);

    return (
        <div className="space-y-6">
            <SchedulerHeaderActions onOpenBulkModal={openBulkModal} />

            <div className="mt-8">
                {/* Schedule Filter Panel - visible on list and calendar views */}
                {viewMode !== 'dashboard' && (
                    <ScheduleFilterPanel
                        trainers={filterTrainers}
                        colleges={filterColleges}
                        courses={filterCourses}
                        onFilterChange={handleScheduleFilterChange}
                        isOpen={true}
                    />
                )}

                <div className="w-full">
                    {loading ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-24 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading schedules...</p>
                        </div>
                    ) : (viewMode === 'dashboard' ? true : filteredSchedules.length > 0) ? (
                        <>
                            {viewMode === 'dashboard' ? (
                                <SchedulerDashboardSection
                                    liveSchedules={liveSchedules}
                                    lastUpdated={lastUpdated}
                                    onExportLiveExcel={handleExportLiveExcel}
                                    onExportLivePdf={handleExportLivePdf}
                                />
                            ) : viewMode === 'list' ? (
                                <SchedulerListSection
                                    schedules={filteredSchedules}
                                    schedulesPagination={schedulesPagination}
                                    hasNextPage={schedulesQuery.hasNextPage}
                                    isFetchingNextPage={schedulesQuery.isFetchingNextPage}
                                    onLoadMore={loadMoreSchedules}
                                    onExportListExcel={handleExportListExcel}
                                    onExportListPdf={handleExportListPdf}
                                    onOpenAssignModal={openAssignModal}
                                    onDeleteSchedule={handleDelete}
                                />
                            ) : (
                                <SchedulerCalendarSection
                                    CalendarViewComponent={LazyCalendarView}
                                    calendarEvents={calendarEvents}
                                    onEventClick={openAssignModal}
                                />
                            )}
                        </>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-24 text-center h-full flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <CalendarIcon className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">
                                {schedules.length > 0 ? 'No Schedules Match Filters' : 'No Schedules Found'}
                            </h3>
                            <p className="text-gray-500 max-w-sm mx-auto mt-2 italic">
                                {schedules.length > 0
                                    ? 'Try adjusting the filter criteria above to see more schedules.'
                                    : 'There are currently no training schedules assigned in the system. Use the "Add Activity" or "Bulk Assign" buttons to get started.'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <SchedulerAssignModalSection
                show={assignModal.show}
                assignData={assignData}
                trainers={trainers}
                onSubmit={handleAssign}
                onClose={closeAssignModal}
                onTrainerChange={handleAssignTrainerChange}
                onDateChange={handleAssignDateChange}
                onStartTimeChange={handleAssignStartTimeChange}
                onEndTimeChange={handleAssignEndTimeChange}
                onReasonChange={handleAssignReasonChange}
            />

            {bulkModal ? (
                <BulkUploadModal 
                    show={bulkModal}
                    onClose={closeBulkModal}
                    onRefresh={refreshSchedules}
                />
            ) : null}
        </div>
    );
};

export default Scheduler;

