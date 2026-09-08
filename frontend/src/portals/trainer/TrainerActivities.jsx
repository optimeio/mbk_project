"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin,
  RefreshCw,
  Loader2,
  Building,
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Image as ImageIcon,
  LogOut,
  Clock,
  UserCheck,
  AlertTriangle,
  FileCheck,
  CalendarDays,
  X,
  BookOpen,
  Activity
} from 'lucide-react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
const getApiErrorMessage = (err, fallback = 'Something went wrong.') => {
  return err?.response?.message || err?.data?.message || err?.message || fallback;
};

const STEPS = [
  { num: 1, label: 'Check-In',           icon: MapPin },
  { num: 2, label: 'Student Attendance',  icon: Users },
  { num: 3, label: 'Student Activities',  icon: Activity },
  { num: 4, label: 'Check-Out',           icon: LogOut },
];

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const compressImage = async (imageFile) => {
  const options = {
    maxSizeMB: 1, // Target size under 1MB
    maxWidthOrHeight: 1280, // Web-optimized dimensions
    useWebWorker: true,
  };
  try {
    const imageCompression = (await import('browser-image-compression')).default;
    const compressedBlob = await imageCompression(imageFile, options);
    return new File([compressedBlob], imageFile.name, {
      type: imageFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Client-side compression failed, using original file:", error);
    return imageFile;
  }
};

const StudentCard = React.memo(({ student, index, onToggle }) => {
  const isPresent = student.status === 'Present';
  return (
    <div
      onClick={() => onToggle(index)}
      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
        isPresent
          ? "bg-emerald-50/55 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
          : "bg-card border-border text-slate-600 dark:text-slate-400 shadow-sm"
      }`}
    >
      <div>
        <p className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{student.rollNo}</p>
        <p className="text-base font-bold text-slate-800 dark:text-slate-200">{student.name}</p>
      </div>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
        isPresent
          ? "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
          : "bg-muted dark:bg-slate-900 border-border text-slate-500 dark:text-slate-400"
      }`}>
        {student.status}
      </span>
    </div>
  );
});

export default function TrainerActivities() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Step tracker: 1=Check-In, 2=Student Attendance, 3=Student Activities, 4=Check-Out, 5=Summary
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Schedule gate
  const [hasScheduleToday, setHasScheduleToday] = useState(null);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [scheduleChecked, setScheduleChecked] = useState(false);

  // Assignment
  const [assignment, setAssignment] = useState(null);
  const [assignmentError, setAssignmentError] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isInside, setIsInside] = useState(false);

  // GPS
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationError, setLocationError] = useState('');

  // Session
  const [attendanceId, setAttendanceId] = useState(null);

  // ── Step 1: Check-In ──────────────────────────────────
  const [checkInFile, setCheckInFile] = useState([]);
  const [checkInPreview, setCheckInPreview] = useState(null);

  // ── Step 2: Student Attendance ────────────────────────
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [attendanceFilePreview, setAttendanceFilePreview] = useState(null);

  // ── Step 3: Student Activities ────────────────────────
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityImages, setActivityImages] = useState([]);
  const [activityPreviews, setActivityPreviews] = useState([]);

  // ── Step 4: Check-Out ─────────────────────────────────
  const [checkOutFile, setCheckOutFile] = useState([]);
  const [checkOutPreview, setCheckOutPreview] = useState(null);

  // Summary
  const [summaryData, setSummaryData] = useState(null);

  // --- Location Handling ---
  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation is not supported by this device.");
      return;
    }

    setLocationStatus("locating");
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCoords(currentCoords);
        setLocationStatus("ready");
        toast.success("GPS Location verified");
      },
      (err) => {
        const msgs = {
          1: "Location permissions denied. Please enable GPS permissions.",
          2: "GPS signal lost. Please check device location settings.",
          3: "Location check timed out. Retrying...",
        };
        setLocationStatus("error");
        setLocationError(msgs[err.code] || "Could not fetch GPS coordinates.");
        // Set fallback coordinates (0, 0) so the process doesn't block
        setCoords({ lat: 0, lng: 0, accuracy: 0 });
        console.warn("Location acquisition failed, using fallback coordinates (0, 0)");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // A stable ref that tracks whether the component has unmounted.
  // Passed into async functions so they skip setState after unmount.
  const cancelledRef = useRef(false);

  // Fetch assignment, today's attendance status & coordinates on mount
  useEffect(() => {
    cancelledRef.current = false;
    fetchCurrentAssignment();
    checkTodayAttendanceStatus();
    captureLocation();
    return () => { cancelledRef.current = true; };
  }, [captureLocation, checkTodayAttendanceStatus]);

  const searchParams = useSearchParams();
  const targetScheduleId = searchParams?.get('scheduleId') || '';

  const checkTodayAttendanceStatus = useCallback(async () => {
    try {
      const statusUrl = targetScheduleId
        ? `/attendance/today-status?scheduleId=${encodeURIComponent(targetScheduleId)}`
        : '/attendance/today-status';
      const res = await api.get(statusUrl);
      if (cancelledRef.current) return;

      // Always read the schedule gate from the API response
      if (typeof res.hasScheduleToday === 'boolean') {
        setHasScheduleToday(res.hasScheduleToday);
      } else {
        // Older backend without schedule gate — allow access by default
        setHasScheduleToday(true);
      }
      if (res.scheduleInfo) {
        setScheduleInfo(res.scheduleInfo);
      }

      if (res.success && res.clockedIn) {
        if (res.attendanceId) setAttendanceId(res.attendanceId);
        // Map backend steps (2=clocked-in, 3=attendance done, 4=activities done, 5=clocked-out, 6=summary)
        // to our frontend steps (1=check-in, 2=attendance, 3=activities, 4=check-out, 5=summary)
        if (res.step) {
          const mapped = Math.max(2, Math.min(5, res.step - 1));
          setStep(mapped);
          if (res.step === 6) {
            setStep(5);
            setSummaryData({ clockOutTime: res.checkOutTime, duration: res.durationMinutes || 0 });
          } else if (res.step === 3) {
            toast.success('Already checked-in today. Redirected to Student Attendance.');
          }
        } else {
          setStep(2); // already clocked-in -> go to attendance step
        }
      }
    } catch (err) {
      if (cancelledRef.current) return;
      console.warn("Could not check today's clock-in status:", err);
      setHasScheduleToday(true);
    } finally {
      if (!cancelledRef.current) setScheduleChecked(true);
    }
  }, [targetScheduleId]);

  // Validation loop whenever coordinates change
  useEffect(() => {
    if (coords && assignment) {
      validateLocationAgainstGeofence();
    }
  }, [coords, assignment]);

  const fetchCurrentAssignment = async () => {
    setLoading(true);
    setAssignmentError(null);
    try {
      const assignUrl = targetScheduleId
        ? `/teacher/current-assignment?scheduleId=${encodeURIComponent(targetScheduleId)}`
        : '/teacher/current-assignment';
      const res = await api.get(assignUrl);
      if (res.success && res.assignment) {
        setAssignment(res.assignment);
      } else {
        throw new Error(res.message || 'No active assignment found');
      }
    } catch (err) {
      const message = err.response?.message || err.data?.message || err.message || 'Unable to load trainer assignment.';
      console.error('Failed to load current trainer assignment:', message);
      setAssignment(null);
      setAssignmentError(message);
      toast.error('Unable to load your current assignment. Please contact admin.');
    } finally {
      setLoading(false);
    }
  };

  const validateLocationAgainstGeofence = async () => {
    if (!coords) return;
    try {
      const res = await api.post('/location/validate', {
        latitude: coords.lat,
        longitude: coords.lng
      });
      if (res.success) {
        setIsInside(res.isInside);
        setDistance(res.distanceMeters);
      }
    } catch (err) {
      setIsInside(false);
      if (err.response?.distanceMeters != null) {
        setDistance(err.response.distanceMeters);
      }
    }
  };

  // --- Camera Operations ---
  const startCamera = async () => {
    setCapturedImageUrl(null);
    setCapturedImageBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        // Explicitly start playback — required on some browsers to avoid black screen
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video autoplay prevented:", playErr);
        }
      }
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("Camera permission denied. Please allow camera access in your browser settings and reload.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error("No camera found on this device.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast.error("Camera is already in use by another app. Please close it and try again.");
      } else {
        toast.error("Could not access device camera. Please check permissions.");
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const W = videoRef.current.videoWidth || 640;
    const H = videoRef.current.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Mirror horizontally to undo the CSS -scale-x-100 flip so the saved image is correct
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, -W, 0, W, H);
    ctx.restore();

    // --- Geo-tag overlay strip ---
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const latStr = coords ? coords.lat.toFixed(6) : 'N/A';
    const lngStr = coords ? coords.lng.toFixed(6) : 'N/A';
    const accStr = coords ? `±${Math.round(coords.accuracy)}m` : '';
    const locName = assignment?.collegeName || 'Current Location';

    // Strip height proportional to image
    const stripH = Math.round(H * 0.18);
    const stripY = H - stripH;
    const pad = Math.round(W * 0.025);
    const baseFontSize = Math.max(11, Math.round(W * 0.022));

    // Semi-transparent dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
    ctx.fillRect(0, stripY, W, stripH);

    // Subtle teal left accent bar
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, stripY, 4, stripH);

    // Map pin icon (drawn with canvas arcs)
    const iconX = pad + 10;
    const iconY = stripY + stripH * 0.35;
    const iconR = baseFontSize * 0.65;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, 2 * Math.PI);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR * 0.45, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    // Pin tail
    ctx.beginPath();
    ctx.moveTo(iconX - iconR * 0.5, iconY + iconR * 0.7);
    ctx.lineTo(iconX + iconR * 0.5, iconY + iconR * 0.7);
    ctx.lineTo(iconX, iconY + iconR * 1.8);
    ctx.closePath();
    ctx.fillStyle = '#10b981';
    ctx.fill();

    const textX = iconX + iconR * 2.5;

    // College / location name — prominent
    ctx.font = `bold ${baseFontSize * 1.1}px Inter, Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(locName, textX, stripY + stripH * 0.3);

    // GPS coordinates line
    ctx.font = `${baseFontSize * 0.88}px Inter, monospace`;
    ctx.fillStyle = '#10b981';
    ctx.fillText(`${latStr}, ${lngStr}  ${accStr}`, textX, stripY + stripH * 0.54);

    // Date + time line
    ctx.font = `${baseFontSize * 0.82}px Inter, Arial, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${dateStr}  ${timeStr}`, textX, stripY + stripH * 0.76);

    // "GEO VERIFIED" badge on right
    const badgeText = coords ? 'GPS VERIFIED' : 'NO GPS';
    const badgeColor = coords ? '#10b981' : '#ef4444';
    const bW = baseFontSize * 5.8;
    const bH = baseFontSize * 1.4;
    const bX = W - bW - pad;
    const bY = stripY + (stripH - bH) / 2;
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.roundRect(bX, bY, bW, bH, 4);
    ctx.fill();
    ctx.font = `bold ${baseFontSize * 0.78}px Inter, Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, bX + bW / 2, bY + bH * 0.68);
    ctx.textAlign = 'left';

    canvas.toBlob((blob) => {
      setCapturedImageBlob(blob);
      setCapturedImageUrl(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const beforeUploadImg = (file, setFileList, setPreview) => {
    if (!file.type.startsWith('image/')) { message.error('Only image files allowed!'); return Upload.LIST_IGNORE; }
    if (file.size > 10 * 1024 * 1024) { message.error('Image must be ≤10MB!'); return Upload.LIST_IGNORE; }
    return new Promise(async (resolve) => {
      try {
        message.loading({ content: 'Optimizing…', key: 'compress', duration: 0 });
        const compressed = await compressImage(file);
        message.success({ content: 'Image optimized!', key: 'compress', duration: 2 });
        const obj = { uid: file.uid, name: file.name, status: 'done', originFileObj: compressed, size: compressed.size };
        setFileList([obj]); setPreview(URL.createObjectURL(compressed)); resolve(false);
      } catch { message.destroy('compress'); resolve(false); }
    });
  };


  // --- Step 1: Check-In ---
  const handleClockIn = async () => {
    if (checkInFile.length === 0) { message.error('Please upload a check-in image.'); return; }
    setLoading(true);
    const formData = new FormData();
    const lat = coords?.lat || assignment?.latitude || 0;
    const lng = coords?.lng || assignment?.longitude || 0;
    formData.append('latitude', lat); formData.append('longitude', lng);
    formData.append('timestamp', new Date().toISOString());
    if (targetScheduleId) formData.append('scheduleId', targetScheduleId);
    formData.append('check_in_image', checkInFile[0].originFileObj, checkInFile[0].name);
    formData.append('address', assignment?.collegeName ? `${assignment.collegeName} Campus` : '');
    try {
      const res = await api.post('/attendance/clock-in', formData);
      if (res.success) {
        setAttendanceId(res.attendanceId);
        toast.success('Check-In recorded!');
        setCheckInFile([]); setCheckInPreview(null);
        setStep(2);
      }
    } catch (err) { toast.error(getApiErrorMessage(err, 'Check-in failed.')); }
    finally { setLoading(false); }
  };

  // --- Step 2: Student Attendance ---
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!attendanceFile) { toast.error('Please select an attendance file.'); return; }
    setLoading(true);
    const formData = new FormData();
    formData.append('attendanceExcel', attendanceFile);
    formData.append('attendanceId', attendanceId);
    const lat = coords?.lat || assignment?.latitude || 0;
    const lng = coords?.lng || assignment?.longitude || 0;
    formData.append('latitude', lat); formData.append('longitude', lng);
    try {
      const res = await api.post('/student-attendance/upload', formData);
      if (res.success) { toast.success(res.message || 'Attendance saved!'); setStep(3); }
    } catch (err) { toast.error(getApiErrorMessage(err, 'Failed to process attendance file.')); }
    finally { setLoading(false); }
  };



  // --- Activity Log Submissions ---
  const handleActivityFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validate total count
    if (activityImages.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 activity images");
      return;
    }

    // Validate size and compress images
    const compressedFiles = [];
    const thumbnailUrls = [];

    const compToastId = toast.loading("Optimizing activity photos...");

    try {
      for (const file of files) {
        // Size validation
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 5MB size limit!`, { id: compToastId });
          continue;
        }

        // Compress
        const compressed = await compressImage(file);
        compressedFiles.push(compressed);

        // Generate canvas thumbnail
        const thumbUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              const maxThumbSize = 150;
              let width = img.width;
              let height = img.height;
              if (width > height) {
                if (width > maxThumbSize) {
                  height = Math.round((height * maxThumbSize) / width);
                  width = maxThumbSize;
                }
              } else {
                if (height > maxThumbSize) {
                  width = Math.round((width * maxThumbSize) / height);
                  height = maxThumbSize;
                }
              }
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(URL.createObjectURL(blob));
                } else {
                  resolve(event.target.result);
                }
              }, "image/jpeg", 0.7);
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        });
        
        thumbnailUrls.push(thumbUrl);
      }
      
      setActivityImages(prev => [...prev, ...compressedFiles]);
      setActivityPreviews(prev => [...prev, ...thumbnailUrls]);
      toast.success("Photos optimized successfully!", { id: compToastId });
    } catch (err) {
      console.error(err);
      toast.error("Error optimizing photos", { id: compToastId });
    }
  };

  const removeActivityImage = (idx) => {
    setActivityImages(prev => prev.filter((_, i) => i !== idx));
    setActivityPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    if (!activityTitle || !activityDesc) {
      toast.error("Please fill in activity title and description");
      return;
    }
    if (activityImages.length === 0) {
      toast.error("Please upload at least 1 activity image as verification");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('attendanceId', attendanceId);
    formData.append('title', activityTitle);
    formData.append('description', activityDesc);
    const lat = coords?.lat || assignment?.latitude || 0;
    const lng = coords?.lng || assignment?.longitude || 0;
    formData.append('latitude', lat);
    formData.append('longitude', lng);

    activityImages.forEach(img => {
      formData.append('activityPhotos', img);
    });

    try {
      const res = await api.post('/student-activities', formData);
      if (res.success) {
        toast.success('Activities logged successfully!');
        setStep(4); // Proceed to Check-Out
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to submit activities.");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 4: Check-Out ---
  const handleClockOut = async () => {
    if (checkOutFile.length === 0) { toast.error('Please upload a check-out image.'); return; }
    setLoading(true);
    const formData = new FormData();
    formData.append('check_out_image', checkOutFile[0].originFileObj, checkOutFile[0].name);
    formData.append('attendanceId', attendanceId);
    const lat = coords?.lat || assignment?.latitude || 0;
    const lng = coords?.lng || assignment?.longitude || 0;
    formData.append('latitude', lat); formData.append('longitude', lng);
    formData.append('timestamp', new Date().toISOString());
    formData.append('address', assignment?.collegeName ? `${assignment.collegeName} Campus` : '');
    try {
      const res = await api.post('/attendance/clock-out', formData);
      if (res.success) {
        toast.success('Check-Out recorded!');
        setSummaryData({ clockOutTime: res.clockOutTime, duration: res.durationMinutes });
        setCheckOutFile([]); setCheckOutPreview(null);
        setStep(5);
      }
    } catch (err) { toast.error(getApiErrorMessage(err, 'Check-out failed.')); }
    finally { setLoading(false); }
  };

  // Show spinner while schedule check hasn't resolved yet
  if (!scheduleChecked) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Checking today's schedule…</p>
        </div>
      </section>
    );
  }

  // Block access if no schedule is assigned for today
  if (hasScheduleToday === false) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-100">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <CalendarDays className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-amber-900 dark:text-amber-100">
            No Schedule for Today
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            You do not have a scheduled session assigned for today. Please contact your coordinator to get your schedule updated.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push('/trainer/dashboard')}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 dark:bg-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:hover:bg-slate-600"
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              onClick={() => { setScheduleChecked(false); checkTodayAttendanceStatus(); }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-amber-700 dark:text-amber-400 transition hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!assignment && !loading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-100">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 p-8 text-center shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-rose-950 dark:text-rose-200">Assignment Required</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {assignmentError || 'Unable to load your current assignment. Please contact your administrator.'}
          </p>
          <button
            type="button"
            onClick={fetchCurrentAssignment}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Retry Assignment
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-100">

      {/* Header Title */}
      <div className="mb-8 border-b border-border pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Daily Workflow</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {assignment?.collegeName ? `${assignment.collegeName} — Complete all 4 steps.` : "Complete all 4 steps for today's visit."}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f3f5c]/10 border border-[#1a547a]/20 text-[#0f3f5c] dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
          <Building className="h-6 w-6" />
        </div>
      </div>

      {/* Step Progress Bar */}
      {step < 5 && (
        <div className="mb-8 rounded-2xl bg-card border border-border p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-500 dark:text-slate-400">Step Progress</p>
          <div className="flex items-center">
            {STEPS.map((s, idx) => {
              const done = step > s.num; const active = step === s.num; const Icon = s.icon;
              return (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      active ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 border-emerald-400 text-white scale-110 shadow-lg shadow-emerald-500/20'
                      : done ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted border-border text-slate-400 dark:text-slate-500'
                    }`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs mt-1.5 font-semibold hidden sm:block text-center leading-tight max-w-[72px] ${
                      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>{s.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`h-[3px] flex-1 mx-1 rounded-full transition-all duration-500 ${step > s.num ? 'bg-emerald-400' : 'bg-border'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: CHECK-IN */}
      {step === 1 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-b border-border px-6 py-5 flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Step 1 — Check-In</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload your geotagged check-in photo to record arrival.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 dark:bg-slate-900 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">GPS Status</p>
                <p className={`mt-1.5 font-bold text-sm ${locationStatus === 'ready' ? 'text-emerald-600 dark:text-emerald-400' : locationStatus === 'locating' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {locationStatus === 'ready' ? 'Ready ✓' : locationStatus === 'locating' ? 'Acquiring…' : 'Unavailable'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 dark:bg-slate-900 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Coordinates</p>
                <p className="mt-1.5 font-bold text-sm text-slate-800 dark:text-slate-200 break-all">
                  {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 dark:bg-slate-900 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Distance</p>
                <p className={`mt-1.5 font-bold text-sm ${isInside ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {distance != null ? `${Math.round(distance)}m ${isInside ? '✓' : ''}` : '—'}
                </p>
              </div>
            </div>
            {locationError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">{locationError}</p>
              </div>
            )}
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Check-In Image <span className="text-rose-500">*</span></p>
              <Upload fileList={checkInFile} onChange={({ fileList }) => setCheckInFile(fileList)}
                beforeUpload={(file) => beforeUploadImg(file, setCheckInFile, setCheckInPreview)}
                maxCount={1} listType="picture" showUploadList={{ showPreviewIcon: false, showRemoveIcon: true }}
                className="w-full" onRemove={() => { setCheckInFile([]); setCheckInPreview(null); }}>
                <Button icon={<UploadOutlined />} size="large" block>Upload / Take Photo</Button>
              </Upload>
              {checkInPreview && (
                <div className="flex justify-center mt-3">
                  <div className="relative">
                    <img loading="lazy" src={checkInPreview} alt="Check-In Preview"
                      className="max-w-[280px] w-full max-h-52 object-cover rounded-xl border border-border shadow" />
                    <button type="button" onClick={() => { setCheckInFile([]); setCheckInPreview(null); }}
                      className="absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-center">
              <button onClick={handleClockIn} disabled={loading || checkInFile.length === 0}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:opacity-95 disabled:opacity-50 transition shadow-lg">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Check-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: STUDENT ATTENDANCE */}
      {step === 2 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-border px-6 py-5 flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Step 2 — Student Attendance</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload attendance as Excel, PDF, or classroom photo.</p>
            </div>
            <span className="ml-auto inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
              Checked-In ✓
            </span>
          </div>
          <form onSubmit={handleAttendanceSubmit} className="p-6 space-y-6">
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Attendance File <span className="text-rose-500">*</span></p>
              <label className="block border-2 border-dashed border-orange-300 dark:border-orange-800 hover:border-orange-500 dark:hover:border-orange-600 transition-colors rounded-2xl p-8 text-center bg-orange-50/20 dark:bg-slate-900/40 cursor-pointer relative">
                <input type="file" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setAttendanceFile(f);
                    setAttendanceFilePreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-xl"><FileSpreadsheet className="h-5 w-5" /></span>
                  <span className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-xl"><FileCheck className="h-5 w-5" /></span>
                  <span className="p-2 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-xl"><Camera className="h-5 w-5" /></span>
                </div>
                {attendanceFile ? (
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-800 dark:text-white">{attendanceFile.name}</p>
                    <p className="text-xs text-slate-500">{(attendanceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <span className="text-xs text-orange-600 font-semibold hover:underline">Click to change</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Drag &amp; drop or click to upload</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Supports Excel (.xlsx, .csv), PDF, or Classroom Photo — up to 15MB</p>
                  </div>
                )}
              </label>
              {attendanceFilePreview && (
                <div className="flex justify-center mt-4">
                  <div className="relative">
                    <img loading="lazy" src={attendanceFilePreview} alt="Attendance Preview"
                      className="max-w-[280px] w-full max-h-48 object-cover rounded-xl border border-border shadow" />
                    <button type="button" onClick={() => { setAttendanceFile(null); setAttendanceFilePreview(null); }}
                      className="absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-center pt-2 border-t border-border">
              <button type="submit" disabled={loading || !attendanceFile}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:opacity-95 disabled:opacity-50 transition shadow-lg">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Attendance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: STUDENT ACTIVITIES */}
      {step === 3 && (
        <form onSubmit={handleActivitySubmit} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-border px-6 py-5 flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Step 3 — Student Activities</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Record syllabus progress and upload verification photos.</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Activity Title / Syllabus Topic <span className="text-rose-500">*</span></label>
              <input type="text" placeholder="e.g. Python OOP Workshop Day 3" value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                className="rounded-xl border border-border bg-muted/10 dark:bg-slate-950/20 px-4 py-3 text-base text-slate-800 dark:text-white focus:border-emerald-500 focus:outline-none shadow-sm" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Description / Syllabus Details <span className="text-rose-500">*</span></label>
              <textarea placeholder="Summarize teaching topics, student exercises, outcomes…" rows={4} value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                className="rounded-xl border border-border bg-muted/10 dark:bg-slate-950/20 px-4 py-3 text-base text-slate-800 dark:text-white focus:border-emerald-500 focus:outline-none shadow-sm resize-none" />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Activity Photos <span className="text-rose-500">*</span>{' '}
                <span className="text-slate-400 font-normal text-xs">(max 5)</span>
              </label>
              {activityPreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {activityPreviews.map((p, idx) => (
                    <div key={`${p}-${idx}`} className="relative aspect-square rounded-xl bg-muted border border-border overflow-hidden shadow-sm group">
                      <img loading="lazy" src={p} alt={`Activity ${idx + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeActivityImage(idx)}
                        className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow transition opacity-0 group-hover:opacity-100"
                        aria-label="Remove photo"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              {activityImages.length < 5 && (
                <label className="block border-2 border-dashed border-border hover:border-cyan-400 dark:hover:border-cyan-600 transition rounded-xl p-6 text-center bg-card cursor-pointer relative">
                  <input type="file" multiple accept="image/*" onChange={handleActivityFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <ImageIcon className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Click or drag to upload activity photos</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activityImages.length > 0 ? `${activityImages.length}/5 uploaded — ${5 - activityImages.length} more allowed` : 'Up to 5 images, max 10MB each'}
                  </p>
                </label>
              )}
            </div>
            <div className="flex justify-center pt-2 border-t border-border">
              <button type="submit" disabled={loading}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:opacity-95 disabled:opacity-50 transition shadow-lg">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Activities
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 4: CHECK-OUT */}
      {step === 4 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-rose-500/10 to-red-500/10 border-b border-border px-6 py-5 flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Step 4 — Check-Out</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload your check-out photo to complete today's visit.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Check-Out Image <span className="text-rose-500">*</span></p>
              <Upload fileList={checkOutFile} onChange={({ fileList }) => setCheckOutFile(fileList)}
                beforeUpload={(file) => beforeUploadImg(file, setCheckOutFile, setCheckOutPreview)}
                maxCount={1} listType="picture" showUploadList={{ showPreviewIcon: false, showRemoveIcon: true }}
                className="w-full" onRemove={() => { setCheckOutFile([]); setCheckOutPreview(null); }}>
                <Button icon={<UploadOutlined />} size="large" block>Upload / Take Photo</Button>
              </Upload>
              {checkOutPreview && (
                <div className="flex justify-center mt-3">
                  <div className="relative">
                    <img loading="lazy" src={checkOutPreview} alt="Check-Out Preview"
                      className="max-w-[280px] w-full max-h-52 object-cover rounded-xl border border-border shadow" />
                    <button type="button" onClick={() => { setCheckOutFile([]); setCheckOutPreview(null); }}
                      className="absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-center border-t border-border">
              <button onClick={handleClockOut} disabled={loading || checkOutFile.length === 0}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:opacity-95 disabled:opacity-50 transition shadow-lg">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Check-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: SUMMARY */}
      {step === 5 && (
        <div className="rounded-2xl bg-card border border-emerald-200 dark:border-emerald-900 p-8 text-center space-y-6 shadow-sm">
          <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Daily Visit Completed!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              All 4 steps — check-in, attendance, activities, and check-out — have been recorded.
            </p>
          </div>
          <div className="max-w-sm mx-auto grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-muted/10 dark:bg-slate-950/20 border border-border text-center shadow-sm">
              <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Duration</p>
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{summaryData?.duration || 0} mins</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/10 dark:bg-slate-950/20 border border-border text-center shadow-sm">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Check-Out</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1.5">
                {summaryData?.clockOutTime ? formatTime(summaryData.clockOutTime) : 'Done'}
              </p>
            </div>
          </div>
          <div className="pt-4">
            <button onClick={() => router.push('/trainer/dashboard')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition hover:bg-muted shadow-sm">
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </section>
  );
}

