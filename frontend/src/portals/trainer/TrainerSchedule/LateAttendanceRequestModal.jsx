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
import { formatCalendarDate } from "@/utils/dateUtils";

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

  const handleCheckInChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCheckInImage(file);
      setCheckInPreview(URL.createObjectURL(file));
    }
  };

  const handleStudentDocChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if any file is a document (non-image)
    const hasDocument = files.some(f => !f.type.startsWith('image/'));
    if (hasDocument) {
      // Document mode: only 1 file allowed
      setStudentDocs([files[0]]);
      setStudentDocPreviews([null]);
      return;
    }

    // Image mode: up to 5
    if (studentDocs.length + files.length > 5) {
      if (showToast) showToast('warning', 'Maximum 5 attendance images allowed.');
      return;
    }
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setStudentDocs((prev) => [...prev, ...files]);
    setStudentDocPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeStudentDoc = (index) => {
    setStudentDocs((prev) => prev.filter((_, i) => i !== index));
    setStudentDocPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleActivityPhotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (activityPhotos.length + files.length > 5) {
      if (showToast) showToast('warning', 'Maximum 5 activity photos allowed.');
      return;
    }
    setActivityPhotos((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setActivityPreviews((prev) => [...prev, ...newPreviews]);
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
      if (showToast) showToast("warning", "Mandatory: Please upload the missing Check-In photo.");
      else alert("Mandatory: Please upload the missing Check-In photo.");
      return;
    }

    if (!hasStudentDoc) {
      if (showToast) showToast("warning", "Mandatory: Please upload the missing Student Attendance Sheet (PDF/Excel).");
      else alert("Mandatory: Please upload the missing Student Attendance Sheet (PDF/Excel).");
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
      const scheduleId = selectedSchedule?.id || selectedSchedule?._id || selectedSchedule?.scheduleId?._id || selectedSchedule?.scheduleId;
      const formData = new FormData();

      if (scheduleId) {
        formData.append("scheduleId", scheduleId);
      }
      formData.append("reason", reason.trim());
      formData.append("session", sessionLabel.includes("AN") ? "AN" : "FN");

      if (checkInImage) {
        formData.append("checkInImage", checkInImage);
      }

      if (studentDocs.length > 0) {
        const isAllImages = studentDocs.every(f => f.type?.startsWith('image/'));
        if (isAllImages) {
          // Multiple images → use studentAttendanceImages field
          studentDocs.forEach((file) => {
            formData.append("studentAttendanceImages", file);
          });
        } else {
          // Single document
          const doc = studentDocs[0];
          const docName = (doc.name || "").toLowerCase();
          if (docName.endsWith(".pdf")) {
            formData.append("attendancePdf", doc);
          } else if (docName.endsWith(".xls") || docName.endsWith(".xlsx") || docName.endsWith(".csv")) {
            formData.append("attendanceExcel", doc);
          } else {
            formData.append("attendanceDocument", doc);
          }
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
              <div className={`border rounded-xl p-3.5 transition space-y-2 ${isCheckInAlreadyUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
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
                      <CheckCircleIcon className="h-3.5 w-3.5" /> File Selected
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
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCheckInChange}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    {checkInPreview && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 mt-2">
                        <img src={checkInPreview} alt="Check-In New" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Proof 2: Students Attendance Sheet (multi-image up to 5 or 1 doc) */}
              <div className={`border rounded-xl p-3.5 transition space-y-2 ${isStudentDocAlreadyUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <DocumentArrowUpIcon className="h-4 w-4 text-blue-600" />
                    2. Student Attendance {!isStudentDocAlreadyUploaded && <span className="text-red-500">*</span>}
                  </span>
                  {isStudentDocAlreadyUploaded ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" /> Uploaded & Locked
                    </span>
                  ) : studentDocs.length > 0 ? (
                    <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> {studentDocs.length} File(s) Selected
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
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 underline font-semibold hover:text-indigo-800"
                    >
                      <span>View Uploaded Attendance Document / Sheet</span>
                    </a>
                    <p className="text-[11px] text-slate-400 mt-0.5">Preserved in system & Drive</p>
                  </div>
                ) : (
                  <>
                    {/* Uploaded files grid */}
                    {studentDocs.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {studentDocs.map((file, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300 group">
                            {studentDocPreviews[i] ? (
                              <img src={studentDocPreviews[i]} alt={`Attendance ${i + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 p-1">
                                <DocumentArrowUpIcon className="h-4 w-4 text-blue-600" />
                                <p className="text-[8px] text-slate-600 truncate w-full text-center">{file.name}</p>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeStudentDoc(i)}
                              className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload input — hide when doc uploaded or max images reached */}
                    {(studentDocs.length === 0 || (studentDocs.every(f => f.type?.startsWith('image/')) && studentDocs.length < 5)) && (
                      <div>
                        <input
                          type="file"
                          accept=".pdf,.xls,.xlsx,.csv,image/*"
                          multiple
                          onChange={handleStudentDocChange}
                          className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          {studentDocs.length > 0
                            ? `${5 - studentDocs.length} more images allowed`
                            : 'Up to 5 images or 1 PDF/Excel document'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Proof 3: Students Classroom Activities (up to 5 photos) */}
              <div className={`border rounded-xl p-3.5 transition space-y-2 sm:col-span-2 ${isActivitiesAlreadyUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
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
                        <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-emerald-300 shadow-2xs">
                          <img src={getSecureImageUrl(photoUrl)} alt={`Existing Activity ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">Preserved in system & Drive</p>
                  </div>
                ) : (
                  <>
                    {activityPhotos.length < 5 && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleActivityPhotosChange}
                          className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">{5 - activityPhotos.length} more photos allowed (max 5)</p>
                      </div>
                    )}
                    {activityPreviews.length > 0 && (
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
                    )}
                  </>
                )}
              </div>

              {/* Proof 4: Check-Out Photo */}
              <div className={`border rounded-xl p-3.5 transition space-y-2 sm:col-span-2 ${isCheckOutAlreadyUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'}`}>
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
                      <CheckCircleIcon className="h-3.5 w-3.5" /> File Selected
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
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCheckOutChange}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />
                    {checkOutPreview && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 mt-2">
                        <img src={checkOutPreview} alt="Check-Out New" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </>
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
