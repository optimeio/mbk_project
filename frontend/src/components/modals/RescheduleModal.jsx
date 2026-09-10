"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import scheduleService from "@/services/scheduleService";
import { notify } from "@/lib/toast";
import {
  clearTrainerDashboardScheduleSummaryCache,
  clearTrainerDashboardSnapshot,
  signalTrainerDashboardRefresh,
} from "@/portals/trainer/dashboard/dashboardUtils";
import { clearPortalDataBundle } from "@/utils/portalDataPrefetch";

const SearchableSelect = ({
  label,
  icon: Icon,
  required,
  placeholder,
  value,
  onChange,
  options = [],
  colorClass = "teal",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const filteredOptions = options.filter((o) =>
    String(o.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {Icon && <Icon className={`h-4 w-4 text-${colorClass}-600`} />}
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 flex items-center justify-between focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-xs hover:border-slate-300 transition-colors"
      >
        <span className={selectedOption ? "text-slate-800 font-medium truncate" : "text-slate-400 truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-sm">
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 ml-1 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search option..."
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none py-1"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs sm:text-sm ${
                      isSelected
                        ? "bg-teal-50 text-teal-800 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && <CheckIcon className="h-4 w-4 text-teal-600 shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">
                No matching results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const RescheduleModal = ({
  isOpen,
  onClose,
  schedule,
  associations = {},
  trainers: propTrainers = [],
  onSaveSuccess,
}) => {
  const [companyId, setCompanyId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [dayNumber, setDayNumber] = useState(1);
  const [scheduledDate, setScheduledDate] = useState("");
  const [session, setSession] = useState("FULL_DAY");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("rescheduled");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const companies = associations.companies || [];
  const trainers = associations.trainers?.length ? associations.trainers : propTrainers;
  const colleges = associations.colleges || [];
  const courses = associations.courses || [];

  useEffect(() => {
    if (!isOpen || !schedule) return;

    let formattedDate = "";
    if (schedule.scheduledDate) {
      const d = new Date(schedule.scheduledDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split("T")[0];
      }
    } else if (schedule.date) {
      const d = new Date(schedule.date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split("T")[0];
      }
    }

    setCompanyId(schedule.companyId?._id || schedule.companyId || "");
    setCourseId(schedule.courseId?._id || schedule.courseId || schedule.collegeId?.courseId || "");
    setCollegeId(schedule.collegeId?._id || schedule.collegeId || "");
    setTrainerId(schedule.trainerId?._id || schedule.trainerId || "");
    setDayNumber(schedule.dayNumber || 1);
    setScheduledDate(formattedDate);
    setSession(schedule.session || "FULL_DAY");
    setSubject(schedule.subject || "");
    setStatus(schedule.status || "rescheduled");
    setRescheduleReason(schedule.rescheduleReason || schedule.reason || "");
    setError("");
  }, [isOpen, schedule]);

  const selectedCompanyObj = companies.find((c) => String(c._id || c.id) === String(companyId));
  const isSmGroupsSelected = selectedCompanyObj && /sm\s*groups/i.test(selectedCompanyObj.name || "");

  const filteredTrainers = trainers.filter((t) => {
    const isApproved = (
      t.status?.toUpperCase() === "APPROVED" ||
      t.verificationStatus?.toUpperCase() === "APPROVED" ||
      t.verificationStatus?.toUpperCase() === "VERIFIED" ||
      t.registrationStatus?.toLowerCase() === "approved" ||
      t.isApproved === true
    ) && t.status?.toUpperCase() !== "REJECTED";
    if (!isApproved) return false;
    if (t.userId?.isActive === false) return false;

    if (!companyId) return true;
    const tCompanyId = t.companyId?._id || t.companyId || t.company?._id || t.company || t.userId?.companyId;
    const tCompanyCode = t.companyCode;

    if (tCompanyId && String(tCompanyId) === String(companyId)) return true;
    if (tCompanyCode && selectedCompanyObj?.companyCode && String(tCompanyCode).toUpperCase() === String(selectedCompanyObj.companyCode).toUpperCase()) return true;
    if (isSmGroupsSelected && (!tCompanyId || String(tCompanyId) === String(companyId))) return true;

    return false;
  });

  const selectedCourseObj = courses.find((crs) => String(crs._id || crs.id) === String(courseId));

  const filteredColleges = colleges.filter((c) => {
    if (companyId) {
      const cId = c.companyId?._id || c.companyId;
      const cCode = c.companyCode;
      if (cId && String(cId) !== String(companyId)) {
        if (!selectedCompanyObj?.companyCode || String(cCode).toUpperCase() !== String(selectedCompanyObj.companyCode).toUpperCase()) {
          return false;
        }
      }
    }
    if (courseId) {
      const colCourseId = c.courseId?._id || c.courseId;
      const matchesDirectCourse = colCourseId && String(colCourseId) === String(courseId);
      const matchesCourseColleges = selectedCourseObj && Array.isArray(selectedCourseObj.colleges) &&
        selectedCourseObj.colleges.some((col) => String(col._id || col) === String(c._id || c.id));

      if (!matchesDirectCourse && !matchesCourseColleges) {
        return false;
      }
    }
    return true;
  });

  const filteredCourses = courses.filter((crs) => {
    if (!companyId) return true;
    const cId = crs.companyId?._id || crs.companyId;
    return String(cId) === String(companyId);
  });

  const trainerOptions = filteredTrainers.map((t) => {
    const id = t._id || t.id;
    const name = t.name || t.userId?.name || [t.firstName, t.lastName].filter(Boolean).join(" ") || t.trainerId || "Unknown";
    const code = t.trainerId ? ` (${t.trainerId})` : "";
    return { value: id, label: `${name}${code}` };
  });

  const collegeOptions = filteredColleges.map((c) => {
    const id = c._id || c.id;
    const name = c.name || "Unknown College";
    return { value: id, label: name };
  });

  const courseOptions = filteredCourses.map((crs) => {
    const id = crs._id || crs.id;
    const title = crs.title || crs.name || "Course";
    return { value: id, label: title };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schedule?._id) return;
    if (!scheduledDate) {
      notify.error("Please select a valid scheduled date.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        companyId: companyId || undefined,
        courseId: courseId || undefined,
        collegeId: collegeId || undefined,
        trainerId: trainerId || null,
        dayNumber: Number(dayNumber) || 1,
        scheduledDate,
        session,
        startTime: session === "AN" ? "13:00" : "09:00",
        endTime: session === "FN" ? "13:00" : "17:00",
        subject: subject || undefined,
        status: status || "rescheduled",
        rescheduleReason: rescheduleReason.trim(),
      };

      await scheduleService.updateSchedule(schedule._id, payload);
      notify.success("Session rescheduled & updated successfully!");

      const targetTrainerId = trainerId || schedule.trainerId?._id || schedule.trainerId;
      if (targetTrainerId) {
        clearTrainerDashboardScheduleSummaryCache(targetTrainerId);
        clearTrainerDashboardSnapshot(targetTrainerId);
        signalTrainerDashboardRefresh(targetTrainerId);
      }
      clearPortalDataBundle();

      onClose();

      if (typeof onSaveSuccess === "function") {
        onSaveSuccess();
      }
    } catch (err) {
      console.error("Error rescheduling session:", err);
      const msg = err.response?.data?.message || err.message || "Failed to reschedule session";
      setError(msg);
      if (err.response?.status === 400) {
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
              <Dialog.Panel className="relative transform overflow-visible rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl border border-slate-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-700 to-cyan-800 px-6 py-5 text-white flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                      <CalendarIcon className="h-6 w-6 text-cyan-200" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-bold text-white">
                        Reschedule Training Session
                      </Dialog.Title>
                      <p className="text-xs text-cyan-100/90 font-medium mt-0.5">
                        Day {schedule?.dayNumber || dayNumber || 1} • {schedule?.subject || schedule?.courseId?.title || "Training Session"}
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                      {error}
                    </div>
                  )}

                  {/* Course Dropdown */}
                  {courseOptions.length > 0 && (
                    <SearchableSelect
                      label="Course Name"
                      icon={AcademicCapIcon}
                      placeholder="-- Choose Course --"
                      value={courseId}
                      onChange={setCourseId}
                      options={courseOptions}
                      colorClass="indigo"
                    />
                  )}

                  {/* College Dropdown */}
                  {collegeOptions.length > 0 && (
                    <SearchableSelect
                      label="Select College"
                      icon={BuildingOfficeIcon}
                      placeholder="-- Choose College --"
                      value={collegeId}
                      onChange={setCollegeId}
                      options={collegeOptions}
                      colorClass="purple"
                    />
                  )}

                  {/* Trainer Dropdown */}
                  <SearchableSelect
                    label="Assigned Trainer"
                    icon={UserIcon}
                    placeholder="-- Keep Current / Choose Trainer --"
                    value={trainerId}
                    onChange={setTrainerId}
                    options={trainerOptions}
                    colorClass="teal"
                  />

                  {/* Date & Day Number Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4 text-slate-600" />
                        Scheduled Date {scheduledDate && !isNaN(new Date(scheduledDate).getTime()) && (
                          <span className="text-indigo-600 font-bold lowercase first-letter:uppercase">
                            ({new Date(scheduledDate).toLocaleDateString("en-US", { weekday: "short" })})
                          </span>
                        )} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        Day Number <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={dayNumber}
                        onChange={(e) => setDayNumber(Number(e.target.value))}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                          const weekdayStr = scheduledDate && !isNaN(new Date(scheduledDate).getTime())
                            ? ` (${new Date(scheduledDate).toLocaleDateString("en-US", { weekday: "short" })})`
                            : "";
                          return (
                            <option key={num} value={num}>
                              Day {num}{weekdayStr}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Session Type & Status Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ClockIcon className="h-4 w-4 text-slate-600" />
                        Session Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={session}
                        onChange={(e) => setSession(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                      >
                        <option value="FULL_DAY">Full Day</option>
                        <option value="FN">Forenoon (FN)</option>
                        <option value="AN">Afternoon (AN)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        Session Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                      >
                        <option value="rescheduled">Rescheduled</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Subject / Topic */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Subject / Topic (Optional)
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Day 1: Introduction to Web Development"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Reschedule Reason / Notes
                    </label>
                    <textarea
                      rows={3}
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="e.g. College holiday, trainer unavailable, weather emergency..."
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
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
