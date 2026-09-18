"use client";

import { memo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import {
  XMarkIcon,
  CameraIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import {
  FileText,
  FileSpreadsheet,
  UploadCloud,
  Plus,
  Trash2,
  FileCode2,
} from "lucide-react";
import { api } from "@/services/api";
import { getSecureImageUrl } from "@/utils/imageUtils";
import { formatCalendarDate } from "@/utils/dateUtils";

// Format bytes into readable format
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// Robust file type detector
const detectFileType = (file) => {
  if (!file) return { kind: "unknown", label: "File", isImage: false };
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic|svg)$/i.test(name)) {
    return { kind: "image", label: "Image", isImage: true };
  }
  if (type.includes("pdf") || /\.pdf$/i.test(name)) {
    return { kind: "pdf", label: "PDF Document", isImage: false };
  }
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv") || /\.(xlsx|xls|csv)$/i.test(name)) {
    return { kind: "excel", label: "Excel Sheet", isImage: false };
  }
  if (type.includes("word") || type.includes("document") || /\.(docx?|rtf|txt)$/i.test(name)) {
    return { kind: "doc", label: "Document", isImage: false };
  }
  return { kind: "doc", label: "Document", isImage: false };
};

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
  const [studentDocs, setStudentDocs] = useState([]);
  const [studentDocPreviews, setStudentDocPreviews] = useState([]);
  const [activityPhotos, setActivityPhotos] = useState([]);
  const [activityPreviews, setActivityPreviews] = useState([]);
  const [checkOutImage, setCheckOutImage] = useState(null);
  const [checkOutPreview, setCheckOutPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");

  const att = selectedSchedule?.attendance || selectedSchedule?.attendanceRecord || selectedSchedule || {};

  const existingCheckInUrl = selectedSchedule?.imageUrl || selectedSchedule?.checkInPhoto || selectedSchedule?.checkInImage || att?.imageUrl || att?.checkInPhoto || att?.checkInImage;
  const existingStudentDocUrl = selectedSchedule?.studentAttendanceImageUrls?.[0] || att?.studentAttendanceImageUrls?.[0] || selectedSchedule?.attendancePdfUrl || selectedSchedule?.attendanceExcelUrl || selectedSchedule?.studentsPhotoUrl || selectedSchedule?.attendancePhotoUrl || selectedSchedule?.attendanceDocumentUrl || att?.attendancePdfUrl || att?.attendanceExcelUrl || att?.studentsPhotoUrl || att?.attendancePhotoUrl || att?.attendanceDocumentUrl;
  const existingActivityPhotos = Array.isArray(selectedSchedule?.activityPhotos) && selectedSchedule.activityPhotos.length > 0
    ? selectedSchedule.activityPhotos
    : Array.isArray(att?.activityPhotos) && att.activityPhotos.length > 0
    ? att.activityPhotos
    : [];
  const existingCheckOutUrl = selectedSchedule?.checkOutGeoImageUrl || selectedSchedule?.checkOutImage || selectedSchedule?.checkOut?.photos?.[0]?.url || att?.checkOutGeoImageUrl || att?.checkOutImage || att?.checkOut?.photos?.[0]?.url;

  const isCheckInAlreadyUploaded = Boolean(existingCheckInUrl);
  const isStudentDocAlreadyUploaded = Boolean(existingStudentDocUrl);
  const isActivitiesAlreadyUploaded = Boolean(existingActivityPhotos.length > 0);
  const isCheckOutAlreadyUploaded = Boolean(existingCheckOutUrl);

  const hasCheckIn = Boolean(checkInImage || isCheckInAlreadyUploaded);
  const hasStudentDoc = Boolean(studentDocs.length > 0 || isStudentDocAlreadyUploaded);
  const hasActivities = Boolean(activityPhotos.length > 0 || isActivitiesAlreadyUploaded);
  const hasCheckOut = Boolean(checkOutImage || isCheckOutAlreadyUploaded);

  const isPartialUpload = isCheckInAlreadyUploaded || isStudentDocAlreadyUploaded || isActivitiesAlreadyUploaded || isCheckOutAlreadyUploaded;

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

  const scheduledDateFormatted = formatCalendarDate(
    selectedSchedule?.scheduledDate || selectedSchedule?.date,
    { dayFirst: true, fallback: "N/A" }
  );

  const sessionLabel = String(selectedSchedule?.session || "FN").toUpperCase();
  const displaySession = sessionLabel.includes("AN") ? "Afternoon (AN)" : "Forenoon (FN)";

  const collegeName = selectedSchedule?.collegeId?.name || selectedSchedule?.collegeName || "College";
  const courseName = selectedSchedule?.courseId?.title || selectedSchedule?.courseId?.name || selectedSchedule?.courseName || selectedSchedule?.subject || "Course";
  const dayNumber = selectedSchedule?.dayNumber ?? "N/A";

  // Check-In handlers
  const handleCheckInChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        if (showToast) showToast("warning", "Check-in image exceeds 10MB limit.");
        return;
      }
      setCheckInImage(file);
      setCheckInPreview(URL.createObjectURL(file));
      e.target.value = "";
    }
  };

  const removeCheckInImage = () => {
    setCheckInImage(null);
    setCheckInPreview(null);
  };

  // Student Attendance handlers
  const handleStudentDocChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (studentDocs.length + files.length > 4) {
      if (showToast) showToast("warning", "Maximum 4 files allowed for student attendance.");
      return;
    }

    const newPreviews = files.map((file) => {
      const info = detectFileType(file);
      return info.isImage ? URL.createObjectURL(file) : null;
    });

    setStudentDocs((prev) => [...prev, ...files]);
    setStudentDocPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeStudentDoc = (index) => {
    setStudentDocs((prev) => prev.filter((_, i) => i !== index));
    setStudentDocPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Activity Photos handlers
  const handleActivityPhotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (activityPhotos.length + files.length > 5) {
      if (showToast) showToast("warning", "Maximum 5 activity photos allowed.");
      return;
    }

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setActivityPhotos((prev) => [...prev, ...files]);
    setActivityPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeActivityPhoto = (index) => {
    setActivityPhotos((prev) => prev.filter((_, i) => i !== index));
    setActivityPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Check-Out handlers
  const handleCheckOutChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        if (showToast) showToast("warning", "Check-out image exceeds 10MB limit.");
        return;
      }
      setCheckOutImage(file);
      setCheckOutPreview(URL.createObjectURL(file));
      e.target.value = "";
    }
  };

  const removeCheckOutImage = () => {
    setCheckOutImage(null);
    setCheckOutPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      if (showToast) showToast("warning", "Please provide a reason for the attendance request.");
      else alert("Please provide a reason for the attendance request.");
      return;
    }

    if (!hasCheckIn) {
      if (showToast) showToast("warning", "Mandatory: Please upload the missing Check-In photo.");
      else alert("Mandatory: Please upload the missing Check-In photo.");
      return;
    }

    if (!hasStudentDoc) {
      if (showToast) showToast("warning", "Mandatory: Please upload the missing Student Attendance Sheet (Image/PDF/Excel).");
      else alert("Mandatory: Please upload the missing Student Attendance Sheet (Image/PDF/Excel).");
      return;
    }

    if (!hasActivities) {
      if (showToast) showToast("warning", "Mandatory: Please upload at least one missing Student Activities photo.");
      else alert("Mandatory: Please upload at least one missing Student Activities photo.");
      return;
    }

    if (!hasCheckOut) {
      if (showToast) showToast("warning", "Mandatory: Please upload the missing Check-Out photo.");
      else alert("Mandatory: Please upload the missing Check-Out photo.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Resolve both Schedule ID and Attendance ID robustly
      let actualScheduleId = null;
      let actualAttendanceId = null;

      if (selectedSchedule?.scheduleId) {
        actualScheduleId = typeof selectedSchedule.scheduleId === 'object'
          ? (selectedSchedule.scheduleId?._id || selectedSchedule.scheduleId?.id)
          : selectedSchedule.scheduleId;
        actualAttendanceId = selectedSchedule._id || selectedSchedule.id;
      } else if (selectedSchedule?.rawSchedule?._id) {
        actualScheduleId = selectedSchedule.rawSchedule._id;
        actualAttendanceId = selectedSchedule.attendance?._id || selectedSchedule._id;
      } else {
        actualScheduleId = selectedSchedule?.id || selectedSchedule?._id;
        actualAttendanceId = selectedSchedule?.attendance?._id || selectedSchedule?.attendanceId;
      }

      const formData = new FormData();

      if (actualScheduleId) {
        formData.append("scheduleId", actualScheduleId);
      }
      if (actualAttendanceId) {
        formData.append("attendanceId", actualAttendanceId);
      }
      formData.append("reason", reason.trim());
      formData.append("session", sessionLabel.includes("AN") ? "AN" : "FN");

      if (checkInImage) {
        formData.append("checkInImage", checkInImage);
      }

      if (studentDocs.length > 0) {
        studentDocs.forEach((file) => {
          const typeInfo = detectFileType(file);
          if (typeInfo.isImage) {
            formData.append("studentAttendanceImages", file);
          } else if (typeInfo.kind === "pdf") {
            formData.append("attendancePdf", file);
          } else if (typeInfo.kind === "excel") {
            formData.append("attendanceExcel", file);
          } else {
            formData.append("attendanceDocument", file);
          }
        });
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
            "Attendance proof submitted successfully! Awaiting Admin verification."
          );
        }
        if (onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error(response?.message || "Failed to submit attendance request");
      }
    } catch (err) {
      console.error("Attendance request error:", err);
      const errorMsg = err?.response?.data?.message || err?.response?.message || err?.message || "Failed to submit request";
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
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] my-auto overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isPartialUpload ? "Upload Missing Attendance Proofs" : "Request Late Attendance"}
              </h2>
              <p className="text-xs text-indigo-200">
                {isPartialUpload
                  ? "Submit missing proofs only to complete your attendance record"
                  : "Submit all 4 attendance proofs for Admin verification"}
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
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100/60 shadow-xs">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <CalendarDaysIcon className="h-3.5 w-3.5 text-indigo-600" />
                  Scheduled Date
                </span>
                <p className="font-bold text-gray-800 mt-1">{scheduledDateFormatted}</p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100/60 shadow-xs">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <AcademicCapIcon className="h-3.5 w-3.5 text-purple-600" />
                  Day Number
                </span>
                <p className="font-bold text-purple-700 mt-1">Day {dayNumber}</p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100/60 shadow-xs">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5 text-blue-600" />
                  Scheduled Session
                </span>
                <p className="font-bold text-blue-700 mt-1">{displaySession}</p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100/60 shadow-xs">
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
                placeholder="Explain why proofs were missing or attendance could not be marked on the scheduled time..."
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            {/* Upload Guidance Banner */}
            <div className="rounded-lg bg-indigo-50/80 border border-indigo-200 p-3 flex items-start gap-2.5">
              <ExclamationCircleIcon className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                {isPartialUpload
                  ? "Already uploaded proofs are locked to protect verified session data. Please upload only the missing proofs below to complete your record."
                  : "All 4 proofs (Check-In photo, Student attendance document, Classroom activity photos, and Check-Out photo) are mandatory for approval."}
              </p>
            </div>

            {/* 4 Proof Upload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Proof 1: Check-In Photo */}
              <div className={`border rounded-xl p-3.5 transition space-y-2.5 ${isCheckInAlreadyUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50/80'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <CameraIcon className="h-4 w-4 text-indigo-600" />
                    1. Check-In Photo {!isCheckInAlreadyUploaded && <span className="text-red-500">*</span>}
                  </span>
                  {isCheckInAlreadyUploaded ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" /> Uploaded & Locked
                    </span>
                  ) : checkInImage ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> 1 Photo Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">Missing Proof</span>
                  )}
                </div>

                {isCheckInAlreadyUploaded ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-300 shadow-xs">
                      <img src={getSecureImageUrl(existingCheckInUrl)} alt="Check-In Existing" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold text-emerald-800">Check-in photo recorded</p>
                      <p className="text-[11px] text-slate-400">Preserved in system & Drive</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {checkInImage ? (
                      <div className="relative flex items-center gap-2.5 p-2 bg-white border border-indigo-200 rounded-xl shadow-xs">
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                          <img src={checkInPreview} alt="Check-In Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-xs font-bold text-slate-800 truncate" title={checkInImage.name}>
                            {checkInImage.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">{formatFileSize(checkInImage.size)}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Check-In
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeCheckInImage}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Remove check-in photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-indigo-50/30 transition group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCheckInChange}
                          className="hidden"
                        />
                        <CameraIcon className="h-6 w-6 text-indigo-500 mb-1 group-hover:scale-110 transition" />
                        <p className="text-xs font-bold text-slate-800">Select Check-In Photo</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 10MB</p>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Proof 2: Students Attendance Sheet (multi-image up to 4 or PDF/Excel docs) */}
              <div className={`border rounded-xl p-3.5 transition space-y-2.5 ${isStudentDocAlreadyUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50/80'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    2. Student Attendance {!isStudentDocAlreadyUploaded && <span className="text-red-500">*</span>}
                  </span>
                  {isStudentDocAlreadyUploaded ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" /> Uploaded & Locked
                    </span>
                  ) : studentDocs.length > 0 ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> {studentDocs.length}/4 File(s) Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">Missing Proof</span>
                  )}
                </div>

                {isStudentDocAlreadyUploaded ? (
                  <div className="pt-1">
                    <a
                      href={getSecureImageUrl(existingStudentDocUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 underline font-semibold hover:text-indigo-800 bg-indigo-50/50 px-3 py-2 rounded-lg border border-indigo-100"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>View Uploaded Attendance Roster</span>
                    </a>
                    <p className="text-[11px] text-slate-400 mt-1">Preserved in system & Drive</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Selected files preview grid matching Student Activities */}
                    {studentDocs.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {studentDocs.map((file, i) => {
                          const typeInfo = detectFileType(file);
                          return (
                            <div
                              key={i}
                              className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-xs hover:border-blue-300 transition"
                            >
                              <div className="aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
                                {typeInfo.isImage && studentDocPreviews[i] ? (
                                  <img
                                    src={studentDocPreviews[i]}
                                    alt={file.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                  />
                                ) : typeInfo.kind === "pdf" ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-red-50 text-red-600">
                                    <FileText className="w-8 h-8 mb-1 text-red-500" />
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded">PDF</span>
                                  </div>
                                ) : typeInfo.kind === "excel" ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-emerald-50 text-emerald-600">
                                    <FileSpreadsheet className="w-8 h-8 mb-1 text-emerald-600" />
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">XLS</span>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-blue-50 text-blue-600">
                                    <FileCode2 className="w-8 h-8 mb-1 text-blue-600" />
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">DOC</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-1.5 bg-white border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-800 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[9px] text-slate-400">{formatFileSize(file.size)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStudentDoc(i)}
                                className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow transition cursor-pointer"
                                title="Remove file"
                              >
                                <XMarkIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Upload Dropzone / Add More Button */}
                    {studentDocs.length < 4 ? (
                      <label className={`border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-blue-50/30 transition group ${studentDocs.length > 0 ? 'py-2' : 'py-3.5'}`}>
                        <input
                          type="file"
                          accept=".pdf,.xls,.xlsx,.csv,image/*"
                          multiple
                          onChange={handleStudentDocChange}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          {studentDocs.length > 0 ? (
                            <>
                              <Plus className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-bold text-blue-700">Add More Files ({4 - studentDocs.length} remaining)</span>
                            </>
                          ) : (
                            <div className="flex flex-col items-center">
                              <UploadCloud className="h-6 w-6 text-blue-500 mb-1 group-hover:scale-110 transition" />
                              <p className="text-xs font-bold text-slate-800">Select Attendance Files</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Images (up to 4) or PDF / Excel sheets</p>
                            </div>
                          )}
                        </div>
                      </label>
                    ) : (
                      <p className="text-[11px] text-emerald-600 font-semibold text-center py-1 bg-emerald-50 rounded-lg">
                        ✓ Maximum 4 files reached
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Proof 3: Students Classroom Activities (up to 5 photos) */}
              <div className={`border rounded-xl p-3.5 transition space-y-2.5 sm:col-span-2 ${isActivitiesAlreadyUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50/80'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <PhotoIcon className="h-4 w-4 text-purple-600" />
                    3. Student Classroom Activities {!isActivitiesAlreadyUploaded && <span className="text-red-500">*</span>}
                  </span>
                  {isActivitiesAlreadyUploaded ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" /> {existingActivityPhotos.length} Uploaded & Locked
                    </span>
                  ) : activityPhotos.length > 0 ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> {activityPhotos.length}/5 Photo(s) Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">Missing Proof</span>
                  )}
                </div>

                {isActivitiesAlreadyUploaded ? (
                  <div className="space-y-1 pt-1">
                    <div className="flex flex-wrap gap-2">
                      {existingActivityPhotos.map((photoUrl, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-emerald-300 shadow-xs">
                          <img src={getSecureImageUrl(photoUrl)} alt={`Existing Activity ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">Preserved in system & Drive</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Selected activity photos preview grid */}
                    {activityPhotos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {activityPhotos.map((file, i) => (
                          <div
                            key={i}
                            className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-xs hover:border-purple-300 transition"
                          >
                            <div className="aspect-square bg-slate-100 overflow-hidden">
                              <img
                                src={activityPreviews[i]}
                                alt={file.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                            </div>
                            <div className="p-1.5 bg-white border-t border-slate-100">
                              <p className="text-[10px] font-bold text-slate-800 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[9px] text-slate-400">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeActivityPhoto(i)}
                              className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow transition cursor-pointer"
                              title="Remove photo"
                            >
                              <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Dropzone / Add More Photos Button */}
                    {activityPhotos.length < 5 ? (
                      <label className={`border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-purple-50/30 transition group ${activityPhotos.length > 0 ? 'py-2' : 'py-4'}`}>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleActivityPhotosChange}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          {activityPhotos.length > 0 ? (
                            <>
                              <Plus className="h-4 w-4 text-purple-600" />
                              <span className="text-xs font-bold text-purple-700">Add More Photos ({5 - activityPhotos.length} remaining)</span>
                            </>
                          ) : (
                            <div className="flex flex-col items-center">
                              <PhotoIcon className="h-6 w-6 text-purple-500 mb-1 group-hover:scale-110 transition" />
                              <p className="text-xs font-bold text-slate-800">Select Classroom Activity Photos</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Up to 5 images (PNG, JPG) showing students engaged in class</p>
                            </div>
                          )}
                        </div>
                      </label>
                    ) : (
                      <p className="text-[11px] text-emerald-600 font-semibold text-center py-1 bg-emerald-50 rounded-lg">
                        ✓ Maximum 5 activity photos reached
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Proof 4: Check-Out Photo */}
              <div className={`border rounded-xl p-3.5 transition space-y-2.5 sm:col-span-2 ${isCheckOutAlreadyUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50/80'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <CameraIcon className="h-4 w-4 text-emerald-600" />
                    4. Check-Out Photo {!isCheckOutAlreadyUploaded && <span className="text-red-500">*</span>}
                  </span>
                  {isCheckOutAlreadyUploaded ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" /> Uploaded & Locked
                    </span>
                  ) : checkOutImage ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> 1 Photo Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">Missing Proof</span>
                  )}
                </div>

                {isCheckOutAlreadyUploaded ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-300 shadow-xs">
                      <img src={getSecureImageUrl(existingCheckOutUrl)} alt="Check-Out Existing" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold text-emerald-800">Check-out photo recorded</p>
                      <p className="text-[11px] text-slate-400">Preserved in system & Drive</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {checkOutImage ? (
                      <div className="relative flex items-center gap-2.5 p-2 bg-white border border-emerald-200 rounded-xl shadow-xs">
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                          <img src={checkOutPreview} alt="Check-Out Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-xs font-bold text-slate-800 truncate" title={checkOutImage.name}>
                            {checkOutImage.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">{formatFileSize(checkOutImage.size)}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Check-Out
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeCheckOutImage}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Remove check-out photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-emerald-50/30 transition group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCheckOutChange}
                          className="hidden"
                        />
                        <CameraIcon className="h-6 w-6 text-emerald-500 mb-1 group-hover:scale-110 transition" />
                        <p className="text-xs font-bold text-slate-800">Select Check-Out Photo</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 10MB</p>
                      </label>
                    )}
                  </div>
                )}
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
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="late-attendance-form"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
