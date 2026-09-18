"use client";

import { memo, useEffect, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  CameraIcon,
  CheckCircleIcon,
  MapPinIcon,
  XCircleIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  FileText,
  FileSpreadsheet,
  UploadCloud,
  Plus,
  Trash2,
  FileCode2,
} from "lucide-react";

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

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
  return { kind: "doc", label: "Document", isImage: false };
};

const optimizeImage = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        }, "image/jpeg", 0.7);
      };
    };
  });

const StudentRow = memo(({ student, isChecked, onCheck }) => {
  return (
    <tr className="hover:bg-indigo-50 transition-colors">
      <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 font-mono">
        {student.rollNo}
      </td>
      <td className="px-2 py-1.5 whitespace-nowrap text-[10px] text-gray-400 font-mono">
        {student.registerNo}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-900 font-medium">{student.name}</td>
      <td className="px-2 py-1.5 whitespace-nowrap text-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onCheck(student._id)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
        />
      </td>
    </tr>
  );
});

const CheckInModal = ({
  attendanceData,
  fetchingStudents,
  fetchStudentsForCollege,
  getLiveLocation,
  handleCheckInSubmit,
  handleStudentCheck,
  locationStatus,
  onClose,
  selectedSchedule,
  setAttendanceData,
  studentAttendance,
  students,
}) => {
  const [scannedImages, setScannedImages] = useState([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!selectedSchedule) {
      return;
    }

    fetchStudentsForCollege(selectedSchedule.collegeId);
    getLiveLocation().catch((error) => console.error("Auto-location failed:", error));
  }, [fetchStudentsForCollege, getLiveLocation, selectedSchedule]);

  const handlePdfScan = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const optimizedFile = await optimizeImage(file);
      setScannedImages((previous) => [...previous, optimizedFile]);
    } catch (error) {
      console.error("Optimization error:", error);
      setScannedImages((previous) => [...previous, file]);
    }
  };

  const generatePdfFromImages = async () => {
    if (!scannedImages.length) {
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const totalPages = scannedImages.length;
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let index = 0; index < totalPages; index += 1) {
        const item = scannedImages[index];
        if (index > 0) {
          pdf.addPage();
        }

        const objectUrl = typeof item === "string" ? item : URL.createObjectURL(item);

        await new Promise((resolve, reject) => {
          const img = new Image();
          img.src = objectUrl;
          img.onload = () => {
            let finalWidth = pdfWidth;
            let finalHeight = (img.height * pdfWidth) / img.width;

            if (finalHeight > pdfHeight) {
              finalHeight = pdfHeight;
              finalWidth = (img.width * pdfHeight) / img.height;
            }

            pdf.addImage(img, "JPEG", 0, 0, finalWidth, finalHeight, undefined, "FAST");
            if (typeof item !== "string") {
              URL.revokeObjectURL(objectUrl);
            }
            setTimeout(resolve, 50);
          };
          img.onerror = () => {
            if (typeof item !== "string") {
              URL.revokeObjectURL(objectUrl);
            }
            reject(new Error(`Failed to process page ${index + 1}`));
          };
        });
      }

      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `attendance_${Date.now()}.pdf`, {
        type: "application/pdf",
      });

      setAttendanceData((previous) => {
        const existing = Array.isArray(previous.studentAttendanceFiles) ? previous.studentAttendanceFiles : [];
        const nextFiles = existing.length < 4 ? [...existing, pdfFile] : existing;
        return {
          ...previous,
          attendancePdf: pdfFile,
          studentAttendanceFiles: nextFiles,
        };
      });
      setScannedImages([]);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const [previewModalUrl, setPreviewModalUrl] = useState(null);

  const studentFiles = Array.isArray(attendanceData.studentAttendanceFiles)
    ? attendanceData.studentAttendanceFiles
    : [];

  const handleStudentFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (studentFiles.length + files.length > 4) {
      alert("Maximum 4 files allowed for student attendance proofs.");
      return;
    }

    const updated = [...studentFiles, ...files];
    setAttendanceData((previous) => ({
      ...previous,
      studentAttendanceFiles: updated,
      attendancePdf: updated.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) || previous.attendancePdf,
      attendanceExcel: updated.find(f => ['.xlsx', '.xls', '.csv'].some(ext => f.name.toLowerCase().endsWith(ext))) || previous.attendanceExcel,
    }));
    event.target.value = "";
  };

  const removeStudentFile = (index) => {
    const updated = studentFiles.filter((_, i) => i !== index);
    setAttendanceData((previous) => ({
      ...previous,
      studentAttendanceFiles: updated,
      attendancePdf: updated.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) || null,
      attendanceExcel: updated.find(f => ['.xlsx', '.xls', '.csv'].some(ext => f.name.toLowerCase().endsWith(ext))) || null,
    }));
  };

  const isLateRequest = Boolean(
    selectedSchedule?.ui?.primaryAction?.isLate ||
    selectedSchedule?.ui?.primaryAction?.kind === "late-checkin" ||
    selectedSchedule?.isLate
  );

  return (
    <div className="dashboard-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm sm:bg-white/60">
      <div className="dashboard-modal-panel h-full w-full overflow-y-auto bg-white p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isLateRequest
              ? (selectedSchedule?.ui?.isPastDate ? "Request Attendance (Past Date)" : "Request Attendance (Session Closed)")
              : "Check In"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 mb-6 border border-indigo-100 shadow-sm">
          <h3 className="text-lg font-bold text-indigo-900 leading-tight">{selectedSchedule.college}</h3>
          <p className="text-sm font-semibold text-indigo-600 mt-1">{selectedSchedule.course}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-indigo-700">
            <span className="bg-white px-2 py-0.5 rounded border border-indigo-100 font-bold">
              Day {selectedSchedule.dayNumber}
            </span>
            <span>{selectedSchedule.date}</span>
            <span className="text-indigo-400">|</span>
            <span>{selectedSchedule.time}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-xl p-3 border ${
            locationStatus.detected
              ? "bg-green-50/50 border-green-100"
              : locationStatus.error
                ? "bg-red-50/50 border-red-100"
                : "bg-blue-50/50 border-blue-100"
          } mb-2`}>
            <div className="flex items-center gap-2 mb-1">
              <MapPinIcon className={`h-4 w-4 ${
                locationStatus.detected
                  ? "text-green-600"
                  : locationStatus.error
                    ? "text-red-500"
                    : "text-blue-500 animate-pulse"
              }`} />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Session Geo-Location
              </span>
            </div>
            {locationStatus.loading ? (
              <p className="text-xs text-blue-600 font-medium animate-pulse italic">
                Detecting high-accuracy location...
              </p>
            ) : null}
            {locationStatus.detected && locationStatus.details ? (
              <div className="space-y-1">
                <p className="text-xs text-green-700 font-black">Location detected successfully</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 font-mono text-[10px] text-gray-500">
                  <p>LATITUDE : {locationStatus.details.lat.toFixed(4)}</p>
                  <p>LONGITUDE: {locationStatus.details.lng.toFixed(4)}</p>
                  <p>ACCURACY : {locationStatus.details.accuracy} meters</p>
                  <p className="text-green-600 font-bold uppercase tracking-tighter">Auto Captured</p>
                </div>
              </div>
            ) : null}
            {locationStatus.error ? (
              <p className="text-xs text-red-600 font-bold italic bg-white p-2 rounded border border-red-100 mt-1">
                {locationStatus.error}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="checkin-syllabus" className="block text-sm font-medium text-gray-700 mb-1">
              Syllabus / Topic
            </label>
            <input
              type="text"
              id="checkin-syllabus"
              value={attendanceData.syllabus || ""}
              onChange={(event) =>
                setAttendanceData((previous) => ({ ...previous, syllabus: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter topic covered"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800">Student Attendance</h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                Total: {students.length}
              </span>
            </div>

            <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-inner overscroll-contain">
              {fetchingStudents ? (
                <div className="p-4 text-center text-xs text-gray-500">Loading student list...</div>
              ) : !students.length ? (
                <div className="p-4 text-center text-xs text-gray-500 italic">
                  No students found for this college
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Roll</th>
                      <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Register</th>
                      <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Present</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {students.map((student) => (
                      <StudentRow
                        key={student._id}
                        student={student}
                        isChecked={!!studentAttendance[student._id]}
                        onCheck={handleStudentCheck}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="checkin-time" className="block text-sm font-medium text-gray-700 mb-1">
              Check-in Time
            </label>
            <input
              type="time"
              id="checkin-time"
              value={attendanceData.checkInTime}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed focus:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkin-students-present" className="block text-sm font-medium text-gray-700 mb-1">
                Students Present
              </label>
              <input
                type="number"
                id="checkin-students-present"
                value={attendanceData.studentsPresent}
                onChange={(event) =>
                  setAttendanceData((previous) => ({ ...previous, studentsPresent: event.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="checkin-students-absent" className="block text-sm font-medium text-gray-700 mb-1">
                Students Absent
              </label>
              <input
                type="number"
                id="checkin-students-absent"
                value={attendanceData.studentsAbsent}
                onChange={(event) =>
                  setAttendanceData((previous) => ({ ...previous, studentsAbsent: event.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Student Attendance Proofs: Up to 4 files (Images, PDFs, Excel) with preview */}
          <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                Student Attendance (Up to 4 Files)
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="/reference-images/student-attendance-reference.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  View Sample
                </a>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  studentFiles.length > 0
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {studentFiles.length}/4 Selected
                </span>
              </div>
            </div>

            {/* Selected files preview grid (Images, PDFs, Excels) */}
            {studentFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {studentFiles.map((file, i) => {
                  const typeInfo = detectFileType(file);
                  const fileObjectUrl = typeInfo.isImage ? URL.createObjectURL(file) : null;
                  return (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-xs hover:border-indigo-300 transition"
                    >
                      <div className="aspect-square bg-slate-100 overflow-hidden flex items-center justify-center relative">
                        {typeInfo.isImage && fileObjectUrl ? (
                          <>
                            <img
                              src={fileObjectUrl}
                              alt={file.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl(fileObjectUrl)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                              title="Click to preview fullscreen"
                            >
                              <EyeIcon className="h-5 w-5 drop-shadow" />
                            </button>
                          </>
                        ) : typeInfo.kind === "pdf" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-red-50 text-red-600">
                            <FileText className="w-6 h-6 mb-1 text-red-500" />
                            <span className="text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded">PDF</span>
                          </div>
                        ) : typeInfo.kind === "excel" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-emerald-50 text-emerald-600">
                            <FileSpreadsheet className="w-6 h-6 mb-1 text-emerald-600" />
                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">XLS</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-blue-50 text-blue-600">
                            <FileCode2 className="w-6 h-6 mb-1 text-blue-600" />
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
                        onClick={() => removeStudentFile(i)}
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

            {/* Upload buttons: Multi-file picker & Scan option */}
            {studentFiles.length < 4 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-indigo-50/40 transition group">
                  <input
                    type="file"
                    accept="image/*,.pdf,.xls,.xlsx,.csv"
                    multiple
                    onChange={handleStudentFilesChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-1.5">
                    {studentFiles.length > 0 ? (
                      <>
                        <Plus className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-700">Add ({4 - studentFiles.length} left)</span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center py-1">
                        <UploadCloud className="h-5 w-5 text-indigo-500 mb-1 group-hover:scale-110 transition" />
                        <span className="text-xs font-bold text-slate-800">Upload Attendance</span>
                        <span className="text-[10px] text-slate-400">Up to 4 images/files</span>
                      </div>
                    )}
                  </div>
                </label>

                <div className="flex flex-col gap-1">
                  <label className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl p-2 flex items-center justify-center gap-1.5 text-center cursor-pointer bg-white hover:bg-indigo-50/40 transition group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePdfScan}
                      className="hidden"
                    />
                    <PhotoIcon className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-semibold text-indigo-700">
                      {scannedImages.length ? `Scan (${scannedImages.length} taken)` : "Camera Scan PDF"}
                    </span>
                  </label>

                  {scannedImages.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={generatePdfFromImages}
                        disabled={isGeneratingPdf}
                        className="flex-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:bg-gray-400 cursor-pointer"
                      >
                        {isGeneratingPdf ? "Building..." : `Finish (${scannedImages.length}p)`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setScannedImages([])}
                        className="py-1 px-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-700 font-semibold text-center py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                ✓ Maximum 4 attendance files selected
              </p>
            )}
          </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trainer Signature</label>
                <div className="relative rounded-xl border border-dashed border-gray-300 px-3 py-4 text-center bg-white hover:border-indigo-500 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setAttendanceData((previous) => ({
                        ...previous,
                        signature: event.target.files?.[0] || null,
                      }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-xs text-gray-600">
                    {attendanceData.signature ? attendanceData.signature.name : 'Upload Signature'}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Check-In Image</label>
                  <a
                    href="/reference-images/checkin-reference.jpg"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    View Sample
                  </a>
                </div>
                <div className="relative rounded-xl border border-dashed border-gray-300 px-3 py-4 text-center bg-white hover:border-indigo-500 transition-all">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={(event) =>
                      setAttendanceData((previous) => ({
                        ...previous,
                        checkInImage: event.target.files?.[0] || null,
                      }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-xs text-gray-600">
                    {attendanceData.checkInImage ? attendanceData.checkInImage.name : 'Upload Image'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {locationStatus.detected && locationStatus.details ? (
              <span className="text-green-600 flex items-center">
                <MapPinIcon className="h-3 w-3 mr-1" />
                Location captured: {locationStatus.details.lat.toFixed(4)}, {locationStatus.details.lng.toFixed(4)}
              </span>
            ) : (
              <span className="text-yellow-600 flex items-center">
                <MapPinIcon className="h-3 w-3 mr-1" />
                Fetching location...
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleCheckInSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center font-medium"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            {isLateRequest ? "Submit Attendance Request" : "Check In"}
          </button>
        </div>
        {/* Lightbox Image Preview Modal */}
        {previewModalUrl && (
          <div
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setPreviewModalUrl(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition z-10 cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <img src={previewModalUrl} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default memo(CheckInModal);
