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
  Activity,
  Maximize2,
  Sparkles,
  Info,
  ShieldCheck,
  ChevronRight,
  UploadCloud
} from 'lucide-react';

const getApiErrorMessage = (err, fallback = 'Something went wrong.') => {
  return err?.response?.message || err?.data?.message || err?.message || fallback;
};

const STEPS = [
  { num: 1, label: 'Check-In',           icon: MapPin,   color: 'from-emerald-500 to-teal-600' },
  { num: 2, label: 'Student Attendance',  icon: Users,    color: 'from-amber-500 to-orange-600' },
  { num: 3, label: 'Student Activities',  icon: Activity, color: 'from-sky-500 to-indigo-600' },
  { num: 4, label: 'Check-Out',           icon: LogOut,   color: 'from-rose-500 to-red-600' },
];

const REFERENCE_GUIDES = {
  1: {
    title: 'Reference: Geotagged Check-In Selfie',
    subtitle: 'Sample photo taken upon arrival at college entrance with GPS Map Camera timestamp.',
    image: '/reference-images/checkin-reference.jpg',
    badge: 'Check-In Photo Format',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    points: [
      'Take a clear, smiling selfie in front of the college building/entrance.',
      'Ensure GPS Map Camera overlay is enabled (showing College Name, Date, Time like 10:24 AM, and Coordinates).',
      'Wear your official Trainer ID badge visibly.',
    ],
  },
  2: {
    title: 'Reference: Signed Student Attendance Sheet',
    subtitle: 'Official college attendance sheet format with signatures.',
    image: '/reference-images/student-attendance-reference.jpg',
    badge: 'Attendance Sheet Format',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    points: [
      'Include Header: College Name, Trainer Name, Course Name, Department & Date.',
      'Clear student list with Roll No, Name, and Present / Absent markings.',
      'Mandatory Signatures: Trainer Signature, SCOP Signature, and HOD Signature with official seal.',
    ],
  },
  3: {
    title: 'Reference: Classroom Teaching & Activities',
    subtitle: 'Photo capturing the live classroom session and syllabus progress.',
    image: '/reference-images/students-activity-reference.jpg',
    badge: 'Classroom Activity Photo',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    points: [
      'Show the trainer actively teaching at the blackboard or projector.',
      'Include students seated and engaged in the classroom.',
      'GPS Map Camera overlay should show timestamp (e.g. 1:25 PM) and college details.',
    ],
  },
  4: {
    title: 'Reference: Geotagged Check-Out Selfie',
    subtitle: 'Sample photo taken at the end of the day when completing sessions.',
    image: '/reference-images/checkout-reference.jpg',
    badge: 'Check-Out Photo Format',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    points: [
      'Take a clear selfie at the college entrance when departing.',
      'GPS Map Camera overlay must show evening time (e.g. 5:24 PM) and college coordinates.',
      'Ensure all student attendance and activity logs were submitted before checking out.',
    ],
  },
};

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
    maxSizeMB: 1,
    maxWidthOrHeight: 1280,
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
    console.warn("Client-side compression fallback to original:", error);
    return imageFile;
  }
};

export default function TrainerActivities() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Step tracker: 1=Check-In, 2=Student Attendance, 3=Student Activities, 4=Check-Out, 5=Summary
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxTitle, setLightboxTitle] = useState('');

  // Schedule gate
  const [hasScheduleToday, setHasScheduleToday] = useState(null);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [scheduleChecked, setScheduleChecked] = useState(false);

  // Assignment & Geofence
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

  // Step 1: Check-In
  const [checkInFile, setCheckInFile] = useState(null);
  const [checkInPreview, setCheckInPreview] = useState(null);

  // Step 2: Student Attendance
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [attendanceFilePreview, setAttendanceFilePreview] = useState(null);

  // Step 3: Student Activities
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityImages, setActivityImages] = useState([]);
  const [activityPreviews, setActivityPreviews] = useState([]);

  // Step 4: Check-Out
  const [checkOutFile, setCheckOutFile] = useState(null);
  const [checkOutPreview, setCheckOutPreview] = useState(null);

  // Summary
  const [summaryData, setSummaryData] = useState(null);

  // Location Handling
  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation is not supported by this browser.");
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
      },
      (err) => {
        const msgs = {
          1: "Location access denied. Please enable GPS permissions in your browser.",
          2: "GPS signal unavailable. Please ensure location is enabled on your device.",
          3: "GPS request timed out. Retrying…",
        };
        setLocationStatus("error");
        setLocationError(msgs[err.code] || "Could not fetch GPS coordinates.");
        setCoords({ lat: 0, lng: 0, accuracy: 0 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const cancelledRef = useRef(false);

  const searchParams = useSearchParams();
  const targetScheduleId = searchParams?.get('scheduleId') || '';

  // Helper: Is current IST time past 1:00 PM (FN session close)?
  const isFNSessionClosedNow = () => {
    const now = new Date();
    const istHour = Number(
      new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(now)
    );
    return istHour >= 13;
  };

  // Helper: Detect if a schedule session is FN
  const isSessionFN = (info) => {
    const s = String(info?.session || info?.sessionType || '').toUpperCase().trim();
    if (s === 'FN') return true;
    // Derive from startTime (e.g. '09:00 AM')
    const startRaw = String(info?.startTime || info?.time || '').trim().toUpperCase().split('-')[0].trim();
    const match = startRaw.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/);
    if (match) {
      let h = parseInt(match[1], 10);
      if (match[3] === 'PM' && h < 12) h += 12;
      if (match[3] === 'AM' && h === 12) h = 0;
      return h < 13;
    }
    return false;
  };

  const checkTodayAttendanceStatus = useCallback(async () => {
    try {
      const statusUrl = targetScheduleId
        ? `/attendance/today-status?scheduleId=${encodeURIComponent(targetScheduleId)}`
        : '/attendance/today-status';
      const res = await api.get(statusUrl);
      if (cancelledRef.current) return;

      if (typeof res.hasScheduleToday === 'boolean') {
        setHasScheduleToday(res.hasScheduleToday);
      } else {
        setHasScheduleToday(true);
      }
      if (res.scheduleInfo) {
        setScheduleInfo(res.scheduleInfo);
      }

      if (res.success && res.clockedIn) {
        if (res.attendanceId) setAttendanceId(res.attendanceId);
        if (res.step) {
          const mapped = Math.max(2, Math.min(5, res.step - 1));
          setStep(mapped);
          if (res.step === 6) {
            setStep(5);
            setSummaryData({ clockOutTime: res.checkOutTime, duration: res.durationMinutes || 0 });
          } else if (res.step === 3) {
            toast.success('Already checked-in today. Resuming at Student Attendance.');
          }
        } else {
          setStep(2);
        }
      } else if (res.hasScheduleToday && res.scheduleInfo) {
        // Not yet clocked in — check if FN session is already closed
        const fnOnly = isSessionFN(res.scheduleInfo);
        if (fnOnly && isFNSessionClosedNow()) {
          toast('FN session closed at 1:00 PM. Redirecting to your dashboard.', {
            icon: '🕐',
            duration: 4000,
          });
          setTimeout(() => { if (!cancelledRef.current) router.push('/trainer/dashboard'); }, 1500);
        }
      }
    } catch (err) {
      if (cancelledRef.current) return;
      console.warn("Could not check today's status:", err);
      setHasScheduleToday(true);
    } finally {
      if (!cancelledRef.current) setScheduleChecked(true);
    }
  }, [targetScheduleId, router]);

  const fetchCurrentAssignment = useCallback(async () => {
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
      const msg = err.response?.message || err.data?.message || err.message || 'Unable to load trainer assignment.';
      setAssignment(null);
      setAssignmentError(msg);
    } finally {
      setLoading(false);
    }
  }, [targetScheduleId]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchCurrentAssignment();
    checkTodayAttendanceStatus();
    captureLocation();
    return () => { cancelledRef.current = true; };
  }, [captureLocation, checkTodayAttendanceStatus, fetchCurrentAssignment]);

  // Auto-redirect to dashboard when no schedule today
  useEffect(() => {
    if (scheduleChecked && hasScheduleToday === false) {
      const timer = setTimeout(() => {
        if (!cancelledRef.current) router.push('/trainer/dashboard');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [scheduleChecked, hasScheduleToday, router]);

  // Validate geofence
  useEffect(() => {
    if (coords && assignment) {
      const validate = async () => {
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
      validate();
    }
  }, [coords, assignment]);

  // Generic image upload handler
  const handleSingleImageUpload = async (file, setFile, setPreview) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB.');
      return;
    }

    const tId = toast.loading('Optimizing image…');
    try {
      const compressed = await compressImage(file);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
      toast.success('Image ready!', { id: tId });
    } catch {
      setFile(file);
      setPreview(URL.createObjectURL(file));
      toast.dismiss(tId);
    }
  };

  // Step 1: Check-In Handler
  const handleClockIn = async () => {
    if (!checkInFile) {
      toast.error('Please take or upload a check-in photo.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    const lat = coords?.lat || assignment?.latitude || 0;
    const lng = coords?.lng || assignment?.longitude || 0;
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('timestamp', new Date().toISOString());
    if (targetScheduleId) formData.append('scheduleId', targetScheduleId);
    formData.append('check_in_image', checkInFile, checkInFile.name);
    formData.append('address', assignment?.collegeName ? `${assignment.collegeName} Campus` : '');

    try {
      const res = await api.post('/attendance/clock-in', formData);
      if (res.success) {
        setAttendanceId(res.attendanceId);
        toast.success('Check-In recorded successfully!');
        setCheckInFile(null);
        setCheckInPreview(null);
        setStep(2);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Check-in failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Student Attendance Handler
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!attendanceFile) {
      toast.error('Please upload the student attendance sheet.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('attendanceExcel', attendanceFile);
    formData.append('attendanceId', attendanceId);
    const lat = coords?.lat || assignment?.latitude || 0;
    const lng = coords?.lng || assignment?.longitude || 0;
    formData.append('latitude', lat);
    formData.append('longitude', lng);

    try {
      const res = await api.post('/student-attendance/upload', formData);
      if (res.success) {
        toast.success(res.message || 'Student attendance saved!');
        setStep(3);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to process attendance file.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Student Activity Photos Handler
  const handleActivityFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (activityImages.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 activity photos.");
      return;
    }

    const tId = toast.loading("Optimizing activity photos…");
    try {
      const compressedList = [];
      const previewList = [];

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 10MB!`);
          continue;
        }
        const compressed = await compressImage(file);
        compressedList.push(compressed);
        previewList.push(URL.createObjectURL(compressed));
      }

      setActivityImages((prev) => [...prev, ...compressedList]);
      setActivityPreviews((prev) => [...prev, ...previewList]);
      toast.success("Photos added!", { id: tId });
    } catch (err) {
      console.error(err);
      toast.error("Error processing photos", { id: tId });
    }
  };

  const removeActivityImage = (idx) => {
    setActivityImages((prev) => prev.filter((_, i) => i !== idx));
    setActivityPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    if (!activityTitle.trim() || !activityDesc.trim()) {
      toast.error("Please enter activity topic title and details.");
      return;
    }
    if (activityImages.length === 0) {
      toast.error("Please upload at least 1 classroom activity photo.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('attendanceId', attendanceId);
    formData.append('title', activityTitle.trim());
    formData.append('description', activityDesc.trim());
    const lat = coords?.lat || assignment?.latitude || 0;
    const lng = coords?.lng || assignment?.longitude || 0;
    formData.append('latitude', lat);
    formData.append('longitude', lng);

    activityImages.forEach((img) => {
      formData.append('activityPhotos', img);
    });

    try {
      const res = await api.post('/student-activities', formData);
      if (res.success) {
        toast.success('Activities logged successfully!');
        setStep(4);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit activities."));
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Check-Out Handler
  const handleClockOut = async () => {
    if (!checkOutFile) {
      toast.error('Please take or upload a check-out photo.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('check_out_image', checkOutFile, checkOutFile.name);
    formData.append('attendanceId', attendanceId);
    const lat = coords?.lat || assignment?.latitude || 0;
    const lng = coords?.lng || assignment?.longitude || 0;
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('timestamp', new Date().toISOString());
    formData.append('address', assignment?.collegeName ? `${assignment.collegeName} Campus` : '');

    try {
      const res = await api.post('/attendance/clock-out', formData);
      if (res.success) {
        toast.success('Check-Out recorded!');
        setSummaryData({ clockOutTime: res.clockOutTime, duration: res.durationMinutes });
        setCheckOutFile(null);
        setCheckOutPreview(null);
        setStep(5);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Check-out failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const currentGuide = REFERENCE_GUIDES[step];

  // Loading state
  if (!scheduleChecked) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Checking Today's Attendance Schedule</h3>
            <p className="text-xs text-slate-500 mt-1">Verifying active assignments and GPS geofence…</p>
          </div>
        </div>
      </section>
    );
  }

  // No schedule gate – auto-redirect to dashboard after brief display
  if (hasScheduleToday === false) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-amber-200 bg-white dark:bg-slate-900 dark:border-amber-900/50 p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
            <CalendarDays className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">
            No Active Schedule for Today
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            You do not have an active session assigned for today. Redirecting to your dashboard…
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/trainer/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition shadow-sm"
            >
              Go to Dashboard
            </button>
            <button
              type="button"
              onClick={() => { setScheduleChecked(false); checkTodayAttendanceStatus(); }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold transition inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8 space-y-6">

      {/* ── Top Header Bar ──────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#0f3f5c] to-[#1a6b9e] text-white flex items-center justify-center shadow-md shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0f3f5c] dark:text-cyan-400">
                  TRAINER DAILY ATTENDANCE &amp; ACTIVITIES
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400">
                  Live Session
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                {assignment?.collegeName || scheduleInfo?.college || "College Visit Workflow"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {assignment?.courseName || scheduleInfo?.course ? `Course: ${assignment?.courseName || scheduleInfo?.course} • ` : ''}
                Complete all 4 daily steps with geotagged verification photos.
              </p>
            </div>
          </div>

          {/* Quick GPS Status Pill */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5 px-3.5">
            <div className={`h-3 w-3 rounded-full shrink-0 ${locationStatus === 'ready' ? 'bg-emerald-500 animate-pulse' : locationStatus === 'locating' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'}`} />
            <div className="text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>GPS {locationStatus === 'ready' ? 'Verified' : locationStatus === 'locating' ? 'Acquiring…' : 'Disabled'}</span>
                {isInside && <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded">On Campus ✓</span>}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (±${Math.round(coords.accuracy || 0)}m)` : 'Checking GPS…'}
              </div>
            </div>
            <button
              onClick={captureLocation}
              title="Refresh GPS"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 4-Step Progress Navigation ──────────────────────────── */}
      {step < 5 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {STEPS.map((s) => {
              const isDone = step > s.num;
              const isActive = step === s.num;
              const Icon = s.icon;

              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-950 text-white border-slate-950 shadow-md scale-[1.02] dark:bg-white dark:text-slate-950 dark:border-white'
                      : isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300'
                      : 'bg-slate-50/50 border-slate-200/70 text-slate-400 dark:bg-slate-800/30 dark:border-slate-800 dark:text-slate-500'
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950'
                        : isDone
                        ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-slate-300 dark:text-slate-600' : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      Step {s.num} {isDone ? '• Done' : isActive ? '• Active' : ''}
                    </p>
                    <p className="text-xs sm:text-sm font-bold truncate leading-tight mt-0.5">
                      {s.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Main Content Area: Left (Action Form) + Right (Reference Guide) ── */}
      {step < 5 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── Left Column (7 cols on lg): Step Form ──────────────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* STEP 1: CHECK-IN */}
            {step === 1 && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">Step 1 — Trainer Check-In</h2>
                      <p className="text-xs text-slate-500">Record your campus arrival with GPS-verified selfie.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Required
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Location Info Grid */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">GPS Status</span>
                      <span className={`text-xs font-bold mt-0.5 inline-block ${locationStatus === 'ready' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {locationStatus === 'ready' ? 'Verified ✓' : 'Checking…'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Latitude / Longitude</span>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 mt-0.5 block truncate">
                        {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Campus Geofence</span>
                      <span className={`text-xs font-bold mt-0.5 inline-block ${isInside ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {distance != null ? `${Math.round(distance)}m ${isInside ? '(Inside ✓)' : ''}` : 'Target College'}
                      </span>
                    </div>
                  </div>

                  {locationError && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>{locationError}</span>
                    </div>
                  )}

                  {/* Image Upload Area */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                      Check-In Photo (With GPS Tag) <span className="text-rose-500">*</span>
                    </label>

                    {checkInPreview ? (
                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800/40 p-3 text-center">
                        <div className="relative max-w-sm mx-auto rounded-xl overflow-hidden shadow-md">
                          <img
                            src={checkInPreview}
                            alt="Check-In Preview"
                            className="w-full max-h-72 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => { setCheckInFile(null); setCheckInPreview(null); }}
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                          Photo ready for verification. Click below to submit check-in.
                        </p>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 dark:border-slate-700 dark:hover:border-emerald-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 dark:bg-slate-800/20 transition group">
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={(e) => handleSingleImageUpload(e.target.files?.[0], setCheckInFile, setCheckInPreview)}
                          className="hidden"
                        />
                        <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-sm">
                          <Camera className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Take Check-In Selfie or Upload Photo
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Supports GPS Map Camera photos (JPG, PNG). See reference guide on right.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-sm group-hover:bg-emerald-700">
                          <UploadCloud className="h-3.5 w-3.5" />
                          Select / Capture Image
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={handleClockIn}
                      disabled={loading || !checkInFile}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Confirm Check-In
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: STUDENT ATTENDANCE */}
            {step === 2 && (
              <form onSubmit={handleAttendanceSubmit} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center font-bold">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">Step 2 — Student Attendance</h2>
                      <p className="text-xs text-slate-500">Upload the official signed student attendance sheet.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Checked-In ✓
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                      Attendance Sheet Document / Photo <span className="text-rose-500">*</span>
                    </label>

                    {attendanceFilePreview ? (
                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800/40 p-3 text-center">
                        <div className="relative max-w-sm mx-auto rounded-xl overflow-hidden shadow-md">
                          <img
                            src={attendanceFilePreview}
                            alt="Attendance Sheet Preview"
                            className="w-full max-h-72 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => { setAttendanceFile(null); setAttendanceFilePreview(null); }}
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 font-bold mt-2">
                          {attendanceFile.name} ({(attendanceFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    ) : attendanceFile ? (
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="h-6 w-6 text-amber-600" />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{attendanceFile.name}</p>
                            <p className="text-xs text-slate-500">{(attendanceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setAttendanceFile(null); setAttendanceFilePreview(null); }}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          Change File
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 dark:border-slate-700 dark:hover:border-amber-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-amber-50/20 dark:bg-slate-800/20 transition group">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setAttendanceFile(f);
                            setAttendanceFilePreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
                          }}
                          className="hidden"
                        />
                        <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-sm">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Upload Signed Student Attendance Sheet
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Supports Photo of Physical Sheet, PDF, Excel (.xlsx, .csv).
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold shadow-sm group-hover:bg-amber-700">
                          <UploadCloud className="h-3.5 w-3.5" />
                          Select Attendance File / Photo
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !attendanceFile}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Submit Attendance Sheet
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: STUDENT ACTIVITIES */}
            {step === 3 && (
              <form onSubmit={handleActivitySubmit} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center font-bold">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">Step 3 — Student Activities &amp; Syllabus</h2>
                      <p className="text-xs text-slate-500">Record syllabus topic covered and classroom activity photos.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    Step 3 of 4
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Activity / Syllabus Topic <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Embedded System & IoT - MCU & WiFi Cloud Architecture"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:border-sky-500 focus:outline-none shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Session Details &amp; Exercises <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      placeholder="Detail the topics covered, hands-on lab exercises, student queries resolved…"
                      rows={3}
                      value={activityDesc}
                      onChange={(e) => setActivityDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:border-sky-500 focus:outline-none shadow-sm resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Classroom Photos <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {activityImages.length}/5 uploaded
                      </span>
                    </div>

                    {activityPreviews.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-3">
                        {activityPreviews.map((p, idx) => (
                          <div key={`${p}-${idx}`} className="relative aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden group shadow-sm">
                            <img src={p} alt={`Activity ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeActivityImage(idx)}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow transition hover:bg-rose-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {activityImages.length < 5 && (
                      <label className="border-2 border-dashed border-slate-300 hover:border-sky-500 dark:border-slate-700 dark:hover:border-sky-400 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-sky-50/20 dark:bg-slate-800/20 transition group">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleActivityFileChange}
                          className="hidden"
                        />
                        <ImageIcon className="h-6 w-6 text-sky-600 mb-1.5 group-hover:scale-110 transition" />
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Click to upload classroom session photos
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {5 - activityImages.length} more photos allowed (max 10MB each)
                        </p>
                      </label>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !activityTitle.trim() || !activityDesc.trim() || activityImages.length === 0}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save Activities &amp; Continue
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 4: CHECK-OUT */}
            {step === 4 && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center font-bold">
                      <LogOut className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">Step 4 — Trainer Check-Out</h2>
                      <p className="text-xs text-slate-500">Record departure photo to complete today's session.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    Final Step
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                      Check-Out Photo (With GPS Tag) <span className="text-rose-500">*</span>
                    </label>

                    {checkOutPreview ? (
                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800/40 p-3 text-center">
                        <div className="relative max-w-sm mx-auto rounded-xl overflow-hidden shadow-md">
                          <img
                            src={checkOutPreview}
                            alt="Check-Out Preview"
                            className="w-full max-h-72 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => { setCheckOutFile(null); setCheckOutPreview(null); }}
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                          Check-out photo ready. Confirm below to complete your day.
                        </p>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-rose-500 dark:border-slate-700 dark:hover:border-rose-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-rose-50/20 dark:bg-slate-800/20 transition group">
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={(e) => handleSingleImageUpload(e.target.files?.[0], setCheckOutFile, setCheckOutPreview)}
                          className="hidden"
                        />
                        <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-sm">
                          <Camera className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Take Check-Out Selfie or Upload Photo
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Supports GPS Map Camera photo taken upon leaving campus.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold shadow-sm group-hover:bg-rose-700">
                          <UploadCloud className="h-3.5 w-3.5" />
                          Select Check-Out Photo
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={handleClockOut}
                      disabled={loading || !checkOutFile}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Confirm Check-Out
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── Right Column (5 cols on lg): Reference Sample & Guide ── */}
          {currentGuide && (
            <div className="lg:col-span-5 space-y-4 sticky top-6">
              <div className="rounded-2xl border border-slate-200/90 bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Reference Guide &amp; Sample
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentGuide.badgeColor}`}>
                    {currentGuide.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {currentGuide.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentGuide.subtitle}
                  </p>
                </div>

                {/* Reference Image with Zoom Button */}
                <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 group">
                  <img
                    src={currentGuide.image}
                    alt={currentGuide.title}
                    className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxImage(currentGuide.image);
                        setLightboxTitle(currentGuide.title);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-white/90 hover:bg-white text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg backdrop-blur transition"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      View Full Reference Image
                    </button>
                  </div>
                </div>

                {/* Key Verification Points */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Important Instructions
                  </span>
                  <ul className="space-y-1.5">
                    {currentGuide.points.map((pt, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── STEP 5: VISIT COMPLETED SUMMARY ────────────────────── */}
      {step === 5 && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-lg space-y-6">
          <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
              Session Completed ✓
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white mt-3">
              Daily Workflow Finished!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
              All 4 steps (Check-in, Attendance sheet, Student activities, and Check-out) have been successfully recorded and verified.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <Clock className="h-5 w-5 text-sky-600 mx-auto mb-1.5" />
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Duration</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {summaryData?.duration || 0} mins
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <UserCheck className="h-5 w-5 text-emerald-600 mx-auto mb-1.5" />
              <p className="text-[10px] uppercase font-bold text-slate-400">Check-Out Time</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {summaryData?.clockOutTime ? formatTime(summaryData.clockOutTime) : 'Completed'}
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => router.push('/trainer/dashboard')}
              className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm transition shadow-md"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX MODAL FOR HIGH-RES REFERENCE IMAGES ───────── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {lightboxTitle || "Reference Sample"}
              </h3>
              <button
                onClick={() => setLightboxImage(null)}
                className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto bg-slate-950">
              <img
                src={lightboxImage}
                alt={lightboxTitle}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
