"use client";

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import scheduleService from '@/services/scheduleService';
import { notify } from '@/lib/toast';

import {
    clearTrainerDashboardScheduleSummaryCache,
    clearTrainerDashboardSnapshot,
    signalTrainerDashboardRefresh,
} from '@/portals/trainer/dashboard/dashboardUtils';
import { clearPortalDataBundle } from '@/utils/portalDataPrefetch';

const RescheduleModal = ({ isOpen, onClose, schedule, trainers = [], onSaveSuccess }) => {
    const [scheduledDate, setScheduledDate] = useState('');
    const [session, setSession] = useState('FULL_DAY');
    const [trainerId, setTrainerId] = useState('');
    const [status, setStatus] = useState('rescheduled');
    const [rescheduleReason, setRescheduleReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !schedule) return;

        // Parse initial date into YYYY-MM-DD
        let formattedDate = '';
        if (schedule.scheduledDate) {
            const d = new Date(schedule.scheduledDate);
            if (!isNaN(d.getTime())) {
                formattedDate = d.toISOString().split('T')[0];
            }
        }

        setScheduledDate(formattedDate);
        setSession(schedule.session || 'FULL_DAY');
        setTrainerId(schedule.trainerId?._id || schedule.trainerId || '');
        setStatus(schedule.status || 'rescheduled');
        setRescheduleReason(schedule.rescheduleReason || schedule.reason || '');
    }, [isOpen, schedule]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!schedule?._id) return;
        if (!scheduledDate) {
            notify.error('Please select a valid scheduled date.');
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = {
                scheduledDate,
                session,
                trainerId: trainerId || null,
                status: status || 'rescheduled',
                rescheduleReason: rescheduleReason.trim(),
            };

            await scheduleService.updateSchedule(schedule._id, payload);
            notify.success('Session rescheduled successfully!');

            // Clear trainer portal and dashboard caches immediately
            const targetTrainerId = trainerId || schedule.trainerId?._id || schedule.trainerId;
            if (targetTrainerId) {
                clearTrainerDashboardScheduleSummaryCache(targetTrainerId);
                clearTrainerDashboardSnapshot(targetTrainerId);
                signalTrainerDashboardRefresh(targetTrainerId);
            }
            clearPortalDataBundle();

            onClose(); // Close modal immediately for instant CTA feedback!

            if (typeof onSaveSuccess === 'function') {
                onSaveSuccess(); // Trigger background refetch asynchronously
            }
        } catch (error) {
            console.error('Error rescheduling session:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to reschedule session';
            if (error.response?.status === 400) {
                notify.warning(msg, { duration: 5000 });
            } else {
                notify.error(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-teal-700 to-cyan-800 px-6 py-5 text-white flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                            <CalendarIcon className="h-6 w-6 text-cyan-200" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-lg font-bold text-white">
                                                Reschedule Training Session
                                            </Dialog.Title>
                                            <p className="text-xs text-cyan-100/90 font-medium mt-0.5">
                                                Day {schedule?.dayNumber || 1} • {schedule?.subject || 'Training Session'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Content / Form */}
                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    {/* Date */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                            New Scheduled Date <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative rounded-xl shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <CalendarIcon className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                type="date"
                                                required
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Session Type */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                                Session Type
                                            </label>
                                            <div className="relative rounded-xl shadow-sm">
                                                <select
                                                    value={session}
                                                    onChange={(e) => setSession(e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white"
                                                >
                                                    <option value="FULL_DAY">Full Day</option>
                                                    <option value="FN">Forenoon (FN)</option>
                                                    <option value="AN">Afternoon (AN)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trainer Selection */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Assigned Trainer
                                        </label>
                                        <div className="relative rounded-xl shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <UserIcon className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <select
                                                value={trainerId}
                                                onChange={(e) => setTrainerId(e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white"
                                            >
                                                <option value="">-- Keep Current / Unassigned --</option>
                                                {trainers.filter((t) => {
                                                    const isApproved = (
                                                        t.status?.toUpperCase() === "APPROVED" ||
                                                        t.verificationStatus?.toUpperCase() === "APPROVED" ||
                                                        t.verificationStatus?.toUpperCase() === "VERIFIED" ||
                                                        t.registrationStatus?.toLowerCase() === "approved" ||
                                                        t.isApproved === true
                                                    ) && t.status?.toUpperCase() !== "REJECTED";
                                                    return isApproved && t.userId?.isActive !== false;
                                                }).map((t) => {
                                                    const tId = t._id || t.id;
                                                    const name = t.userId?.name || t.name || 'Trainer';
                                                    const phone = t.phone ? ` (${t.phone})` : '';
                                                    return (
                                                        <option key={tId} value={tId}>
                                                            {name}{phone}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Session Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white"
                                        >
                                            <option value="rescheduled">Rescheduled</option>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    {/* Reason */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Reschedule Reason / Notes
                                        </label>
                                        <div className="relative rounded-xl shadow-sm">
                                            <textarea
                                                rows={3}
                                                value={rescheduleReason}
                                                onChange={(e) => setRescheduleReason(e.target.value)}
                                                placeholder="e.g. College holiday, trainer unavailable, weather emergency..."
                                                className="block w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-6 flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center space-x-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                <span>Save & Reschedule</span>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default RescheduleModal;
