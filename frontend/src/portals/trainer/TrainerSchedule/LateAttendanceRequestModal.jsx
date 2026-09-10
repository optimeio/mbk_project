"use client";

import { memo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  CameraIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { api } from "@/services/api";

import { getSecureImageUrl } from "@/utils/imageUtils";

function LateAttendanceRequestModal({
  selectedSchedule,
  onClose,
  onSuccess,
  showToast,
}) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState("");
  const [checkInImage, setCheckInImage] = useState(null);
  const [checkInPreview, setCheckInPreview] = useState(null);
  const [studentDoc, setStudentDoc] = useState(null);
  const [activityPhotos, setActivityPhotos] = useState([]);
  const [activityPreviews, setActivityPreviews] = useState([]);
  const [checkOutImage, setCheckOutImage] = useState(null);
  const [checkOutPreview, setCheckOutPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");

  const att = selectedSchedule?.attendance || selectedSchedule?.attendanceRecord || {};

  const existingCheckInUrl = selectedSchedule?.imageUrl || selectedSchedule?.checkInPhoto || att?.imageUrl || att?.checkInPhoto;
  const existingStudentDocUrl = selectedSchedule?.attendancePdfUrl || selectedSchedule?.attendanceExcelUrl || selectedSchedule?.studentsPhotoUrl || att?.attendancePdfUrl || att?.attendanceExcelUrl || att?.studentsPhotoUrl;
  const existingActivityPhotos = Array.isArray(selectedSchedule?.activityPhotos) && selectedSchedule.activityPhotos.length > 0
    ? selectedSchedule.activityPhotos
    : Array.isArray(att?.activityPhotos) && att.activityPhotos.length > 0
    ? att.activityPhotos
    : [];
  const existingCheckOutUrl = selectedSchedule?.checkOutGeoImageUrl || selectedSchedule?.checkOut?.photos?.[0]?.url || att?.checkOutGeoImageUrl || att?.checkOut?.photos?.[0]?.url;

  const hasCheckIn = Boolean(checkInImage || existingCheckInUrl);
  const hasStudentDoc = Boolean(studentDoc || existingStudentDocUrl);
  const hasActivities = Boolean(activityPhotos.length > 0 || existingActivityPhotos.length > 0);
  const hasCheckOut = Boolean(checkOutImage || existingCheckOutUrl);

  useEffect(() => {
    setMounted(true);
    setCurrentDateTime(dayjs().format("DD MMM YYYY, hh:mm A"));
    const interval = setInterval(() => {
      setCurrentDateTime(dayjs().format("DD MMM YYYY, hh:mm A"));
    }, 10000);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const scheduledDateFormatted = selectedSchedule?.scheduledDate || selectedSchedule?.date
    ? dayjs(selectedSchedule.scheduledDate || selectedSchedule.date).format("DD MMM YYYY")
    : "N/A";

  const sessionLabel = String(selectedSchedule?.session || "FULL_DAY").toUpperCase();
  const displaySession = sessionLabel === "FN" ? "Forenoon (FN)" : sessionLabel === "AN" ? "Afternoon (AN)" : "Full Day";

  const collegeName = selectedSchedule?.collegeId?.name || selectedSchedule?.collegeName || "College";
  const courseName = selectedSchedule?.courseId?.title || selectedSchedule?.courseId?.name || selectedSchedule?.courseName || selectedSchedule?.subject || "Course";
  const dayNumber = selectedSchedule?.dayNumber ?? "N/A";

  const handleCheckInChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCheckInImage(file);
      setCheckInPreview(URL.createObjectURL(file));
    }
  };

  const handleStudentDocChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setStudentDoc(file);
    }
  };

  const handleActivityPhotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setActivityPhotos((prev) => [...prev, ...files]);
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setActivityPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeActivityPhoto = (index) => {
    setActivityPhotos((prev) => prev.filter((_, i) => i !== index));
    setActivityPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckOutChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCheckOutImage(file);
      setCheckOutPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      if (showToast) showToast("warning", "Please provide a reason for the attendance request.");
      else alert("Please provide a reason for the attendance request.");
      return;
    }

    if (!hasCheckIn) {
      if (showToast) showToast("warning", "Mandatory: Please upload the Check-In photo.");
      else alert("Mandatory: Please upload the Check-In photo.");
      return;
    }

    if (!hasStudentDoc) {
      if (showToast) showToast("warning", "Mandatory: Please upload the Student Attendance Sheet (PDF/Excel).");
      else alert("Mandatory: Please upload the Student Attendance Sheet (PDF/Excel).");
      return;
    }

    if (!hasActivities) {
      if (showToast) showToast("warning", "Mandatory: Please upload at least one Student Activities photo.");
      else alert("Mandatory: Please upload at least one Student Activities photo.");
      return;
    }

    if (!hasCheckOut) {
      if (showToast) showToast("warning", "Mandatory: Please upload the Check-Out photo.");
      else alert("Mandatory: Please upload the Check-Out photo.");
      return;
    }

    try {
      setIsSubmitting(true);
      const scheduleId = selectedSchedule?.id || selectedSchedule?._id;
      const formData = new FormData();

      formData.append("scheduleId", scheduleId);
      formData.append("reason", reason.trim());
      formData.append("session", selectedSchedule?.session || "FULL_DAY");

      if (checkInImage) {
        formData.append("checkInImage", checkInImage);
      }

      if (studentDoc) {
        const docName = (studentDoc.name || "").toLowerCase();
        if (docName.endsWith(".pdf")) {
          formData.append("attendancePdf", studentDoc);
        } else if (docName.endsWith(".xls") || docName.endsWith(".xlsx") || docName.endsWith(".csv")) {
          formData.append("attendanceExcel", studentDoc);
        } else {
          formData.append("attendanceDocument", studentDoc);
        }
      }

      if (activityPhotos.length > 0) {
        activityPhotos.forEach((file) => {
          formData.append("activityPhotos", file);
        });
      }

      if (checkOutImage) {
        formData.append("checkOutImage", checkOutImage);
      }

      const response = await api.post("/attendance/late-request", formData);

      if (response?.success) {
        if (showToast) {
          showToast(
            "success",
            "Attendance request submitted successfully! Awaiting Admin verification."
          );
        }
        if (onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error(response?.message || "Failed to submit attendance request");
      }
    } catch (err) {
      console.error("Attendance request error:", err);
      const errorMsg = err?.response?.message || err?.message || "Failed to submit request";
      if (showToast) showToast("error", errorMsg);
      else alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-6 flex min-h-full items-center justify-center cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] my-auto overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Request Attendance for Trainers</h2>
              <p className="text-xs text-indigo-200">
                Submit past session attendance proof for Admin verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Scheduled Session Meta Card */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100/60 shadow-sm">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <CalendarDaysIcon className="h-3.5 w-3.5 text-indigo-600" />
                  Scheduled Date
                </span>
                <p className="font-bold text-gray-800 mt-1">{scheduledDateFormatted}</p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100/60 shadow-sm">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <AcademicCapIcon className="h-3.5 w-3.5 text-purple-600" />
                  Day Number
                </span>
                <p className="font-bold text-purple-700 mt-1">Day {dayNumber}</p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100/60 shadow-sm">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5 text-blue-600" />
                  Scheduled Session
                </span>
                <p className="font-bold text-blue-700 mt-1">{displaySession}</p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100/60 shadow-sm">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5 text-amber-600" />
                  Request Raised At
                </span>
                <p className="font-bold text-amber-700 mt-1">{currentDateTime}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                <BuildingLibraryIcon className="h-4 w-4 text-indigo-600" />
                <span>{collegeName}</span>
              </div>
              <div className="text-gray-500">
                Course: <span className="font-medium text-gray-700">{courseName}</span>
              </div>
            </div>
          </div>

          <form id="late-attendance-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Reason Text Area */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Reason for Attendance Request <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why attendance could not be marked on the scheduled date/time..."
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            {/* Mandatory Uploads Section Banner */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
              <ExclamationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Please upload any missing proofs below. Proofs already uploaded for this session are marked as <strong>Already Uploaded</strong> and do not need to be re-uploaded unless you wish to replace them.
              </p>
            </div>

            {/* 4 Proof Upload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Proof 1: Check-In Photo */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 hover:bg-gray-50 transition space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <CameraIcon className="h-4 w-4 text-indigo-600" />
                    1. Check-In Photo {!existingCheckInUrl && <span className="text-red-500">*</span>}
                  </span>
                  {checkInImage ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> New File Selected
                    </span>
                  ) : existingCheckInUrl ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> Already Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-500 font-semibold">Required</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCheckInChange}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                {checkInPreview ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 mt-2">
                    <img src={checkInPreview} alt="Check-In New" className="w-full h-full object-cover" />
                  </div>
                ) : existingCheckInUrl ? (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-300">
                      <img src={getSecureImageUrl(existingCheckInUrl)} alt="Check-In Existing" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">Current Check-In Image</span>
                  </div>
                ) : null}
              </div>

              {/* Proof 2: Students Attendance Sheet */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 hover:bg-gray-50 transition space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <DocumentArrowUpIcon className="h-4 w-4 text-blue-600" />
                    2. Student Attendance {!existingStudentDocUrl && <span className="text-red-500">*</span>}
                  </span>
                  {studentDoc ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> New File Selected
                    </span>
                  ) : existingStudentDocUrl ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> Already Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-500 font-semibold">PDF / Excel</span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.xls,.xlsx,.csv,image/*"
                  onChange={handleStudentDocChange}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {studentDoc ? (
                  <p className="text-[11px] text-gray-600 truncate bg-white px-2 py-1 rounded border border-gray-200">
                    {studentDoc.name}
                  </p>
                ) : existingStudentDocUrl ? (
                  <a
                    href={getSecureImageUrl(existingStudentDocUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-600 underline font-medium block truncate mt-1"
                  >
                    View Existing Roster Document
                  </a>
                ) : null}
              </div>

              {/* Proof 3: Students Classroom Activities */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 hover:bg-gray-50 transition space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <PhotoIcon className="h-4 w-4 text-purple-600" />
                    3. Student Classroom Activities {existingActivityPhotos.length === 0 && <span className="text-red-500">*</span>}
                  </span>
                  {activityPhotos.length > 0 ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> {activityPhotos.length} New Photo(s)
                    </span>
                  ) : existingActivityPhotos.length > 0 ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> {existingActivityPhotos.length} Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-500 font-semibold">Class photos</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleActivityPhotosChange}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                />
                {activityPreviews.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {activityPreviews.map((src, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300 group">
                        <img src={src} alt={`Activity ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeActivityPhoto(i)}
                          className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : existingActivityPhotos.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {existingActivityPhotos.map((photoUrl, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-emerald-300">
                        <img src={getSecureImageUrl(photoUrl)} alt={`Existing Activity ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Proof 4: Check-Out Photo */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 hover:bg-gray-50 transition space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <CameraIcon className="h-4 w-4 text-emerald-600" />
                    4. Check-Out Photo {!existingCheckOutUrl && <span className="text-red-500">*</span>}
                  </span>
                  {checkOutImage ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> New File Selected
                    </span>
                  ) : existingCheckOutUrl ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> Already Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-500 font-semibold">Required</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCheckOutChange}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                {checkOutPreview ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 mt-2">
                    <img src={checkOutPreview} alt="Check-Out New" className="w-full h-full object-cover" />
                  </div>
                ) : existingCheckOutUrl ? (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-300">
                      <img src={getSecureImageUrl(existingCheckOutUrl)} alt="Check-Out Existing" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">Current Check-Out Image</span>
                  </div>
                ) : null}
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="late-attendance-form"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>Submit Attendance Request</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default memo(LateAttendanceRequestModal);
