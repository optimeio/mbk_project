"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CheckIcon,
  PlusIcon,
  ExclamationTriangleIcon,
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

const parseTimeString = (timeStr) => {
  const match = String(timeStr || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    if (h < 1) h = 12;
    if (h > 12) h = 12;
    const hourStr = String(h).padStart(2, "0");
    const minuteStr = match[2];
    const periodStr = match[3].toUpperCase();
    return { hour: hourStr, minute: minuteStr, period: periodStr };
  }
  return { hour: "09", minute: "00", period: "AM" };
};

const TimeSelectInput = ({ label, value, onChange, required = true }) => {
  const parsed = parseTimeString(value);

  const updateTime = (newHour, newMinute, newPeriod) => {
    const formatted = `${newHour}:${newMinute} ${newPeriod}`;
    onChange(formatted);
  };

  const hours = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
  const periods = ["AM", "PM"];

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <ClockIcon className="h-4 w-4 text-slate-600" />
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
        {/* Hour Dropdown */}
        <select
          value={parsed.hour}
          onChange={(e) => updateTime(e.target.value, parsed.minute, parsed.period)}
          className="flex-1 bg-white border border-slate-200 text-slate-900 text-sm font-bold py-1.5 px-2 rounded-lg outline-none cursor-pointer hover:border-slate-300 transition-colors"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <span className="text-slate-400 font-bold text-sm px-0.5">:</span>

        {/* Minute Dropdown */}
        <select
          value={parsed.minute}
          onChange={(e) => updateTime(parsed.hour, e.target.value, parsed.period)}
          className="flex-1 bg-white border border-slate-200 text-slate-900 text-sm font-bold py-1.5 px-2 rounded-lg outline-none cursor-pointer hover:border-slate-300 transition-colors"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* AM / PM Dropdown Button */}
        <select
          value={parsed.period}
          onChange={(e) => updateTime(parsed.hour, parsed.minute, e.target.value)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg outline-none cursor-pointer shadow-xs transition-colors"
        >
          {periods.map((p) => (
            <option key={p} value={p} className="bg-white text-slate-900 font-semibold">
              {p}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const CreateScheduleModal = ({ open, onClose, onSuccess, associations = {} }) => {
  const [companyId, setCompanyId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dayNumber, setDayNumber] = useState(1);
  const [scheduledDate, setScheduledDate] = useState("");
  const [session, setSession] = useState("FULL_DAY");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const companies = associations.companies || [];
  const trainers = associations.trainers || [];
  const colleges = associations.colleges || [];
  const courses = associations.courses || [];

  const companyOptions = companies.map((c) => {
    const id = c._id || c.id;
    const name = c.name || "Company";
    return { value: id, label: name };
  });

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

  const resetForm = () => {
    setCompanyId("");
    setTrainerId("");
    setCollegeId("");
    setCourseId("");
    setDayNumber(1);
    setScheduledDate("");
    setSession("FULL_DAY");
    setSubject("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!trainerId) {
      const msg = "Please select a trainer.";
      setError(msg);
      notify.error(msg);
      return;
    }
    if (!courseId) {
      const msg = "Please select a course.";
      setError(msg);
      notify.error(msg);
      return;
    }
    if (!collegeId) {
      const msg = "Please select a college.";
      setError(msg);
      notify.error(msg);
      return;
    }
    if (!scheduledDate) {
      const msg = "Please select a scheduled date.";
      setError(msg);
      notify.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        companyId: companyId || undefined,
        trainerId,
        collegeId,
        courseId: courseId || undefined,
        dayNumber: Number(dayNumber) || 1,
        scheduledDate,
        session,
        subject: subject || undefined,
      };

      const res = await scheduleService.createSchedule(payload);
      if (res?.success || res?.status === 200 || res?.data) {
        if (trainerId) {
          clearTrainerDashboardScheduleSummaryCache(trainerId);
          clearTrainerDashboardSnapshot(trainerId);
          signalTrainerDashboardRefresh(trainerId);
        }
        clearPortalDataBundle();
        notify.success("Schedule created successfully!");
        handleClose();
        if (typeof onSuccess === "function") onSuccess();
      } else {
        const msg = res?.message || "Failed to create schedule.";
        setError(msg);
        notify.error(msg);
      }
    } catch (err) {
      console.error("Create schedule error:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to create schedule.";
      setError(errMsg);
      if (err?.response?.status === 400) {
        notify.warning(errMsg, { duration: 5000 });
      } else {
        notify.error(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-visible rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-bold text-slate-900">
                        Create Trainer Schedule
                      </Dialog.Title>
                      <p className="text-xs text-slate-500">
                        Assign a trainer to a college training session
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 flex items-start gap-3 shadow-xs">
                      <ExclamationTriangleIcon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1 font-semibold leading-relaxed">
                        {error}
                      </div>
                    </div>
                  )}
                  {/* Searchable Select Company */}
                  <SearchableSelect
                    label="Select Company"
                    icon={BuildingOfficeIcon}
                    required={true}
                    placeholder="-- Choose Company --"
                    value={companyId}
                    onChange={(val) => {
                      setCompanyId(val);
                      setCourseId("");
                      setCollegeId("");
                      setTrainerId("");
                    }}
                    options={companyOptions}
                    colorClass="indigo"
                  />

                  {/* Course Select */}
                  <SearchableSelect
                    label="Course Name"
                    icon={AcademicCapIcon}
                    required={true}
                    placeholder="-- Choose Course --"
                    value={courseId}
                    onChange={(val) => {
                      setCourseId(val);
                      setCollegeId("");
                    }}
                    options={courseOptions}
                    colorClass="blue"
                  />

                  {/* Searchable Select College */}
                  <SearchableSelect
                    label="Select College"
                    icon={BuildingOfficeIcon}
                    required={true}
                    placeholder="-- Choose College --"
                    value={collegeId}
                    onChange={setCollegeId}
                    options={collegeOptions}
                    colorClass="purple"
                  />

                  {/* Searchable Select Trainer */}
                  <SearchableSelect
                    label="Select Trainer"
                    icon={UserIcon}
                    required={true}
                    placeholder="-- Choose Trainer --"
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
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
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

                  {/* Session Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        Session Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={session}
                        onChange={(e) => setSession(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        <option value="FULL_DAY">Full Day</option>
                        <option value="FN">Forenoon (FN)</option>
                        <option value="AN">Afternoon (AN)</option>
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

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <PlusIcon className="h-4 w-4 stroke-[2.5]" />
                      <span>{submitting ? "Saving..." : "Save Schedule"}</span>
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateScheduleModal;
