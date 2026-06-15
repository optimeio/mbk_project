"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import MainLayout from '@/app/layouts/MainLayout';
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
  ChevronRight,
  UserCheck,
  AlertTriangle,
  FileCheck
} from 'lucide-react';

export default function DailyVisitPage() {
  const { currentUser } = useAuth();
  
  // Step tracker: 1=Assignment & Geofence, 2=Clock-In, 3=Attendance, 4=Activities, 5=Clock-Out, 6=Summary
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // 1. Assignment Info
  const [assignment, setAssignment] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isInside, setIsInside] = useState(false);
  
  // 2. GPS Location Coordinates
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle|locating|ready|error
  const [locationError, setLocationError] = useState("");

  // Daily session ID returned from Clock-In
  const [attendanceId, setAttendanceId] = useState(null);

  // 3. Camera Streams & Captures
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImageBlob, setCapturedImageBlob] = useState(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState(null);

  // 4. Attendance State
  const [attendanceMode, setAttendanceMode] = useState("excel"); // excel|live
  const [excelFile, setExcelFile] = useState(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  
  // Live attendance student list
  const [students, setStudents] = useState([
    { rollNo: "S101", name: "Anish Kumar", status: "Absent" },
    { rollNo: "S102", name: "Divya Bharathi", status: "Absent" },
    { rollNo: "S103", name: "Karthik R", status: "Absent" },
    { rollNo: "S104", name: "Nandhini S", status: "Absent" },
    { rollNo: "S105", name: "Praveen Kumar", status: "Absent" },
    { rollNo: "S106", name: "Sandhya V", status: "Absent" }
  ]);
  const [representativeName, setRepresentativeName] = useState("");
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // 5. Activity Logging state
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDesc, setActivityDesc] = useState("");
  const [activityImages, setActivityImages] = useState([]);
  const [activityPreviews, setActivityPreviews] = useState([]);

  // 6. Summary Stats
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
        toast.error("Location acquisition failed");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Fetch assignment & coordinates on mount
  useEffect(() => {
    fetchCurrentAssignment();
    captureLocation();
  }, [captureLocation]);

  // Validation loop whenever coordinates change
  useEffect(() => {
    if (coords && assignment) {
      validateLocationAgainstGeofence();
    }
  }, [coords, assignment]);

  const fetchCurrentAssignment = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teacher/current-assignment');
      if (res.data.success && res.data.assignment) {
        setAssignment(res.data.assignment);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "No active college assignment found.";
      console.warn(msg);
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
      if (res.data.success) {
        setIsInside(res.data.isInside);
        setDistance(res.data.distanceMeters);
      }
    } catch (err) {
      setIsInside(false);
      if (err.response?.data?.distanceMeters != null) {
        setDistance(err.response.data.distanceMeters);
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
      }
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not access device camera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        setCapturedImageBlob(blob);
        setCapturedImageUrl(URL.createObjectURL(blob));
        stopCamera();
      }, 'image/jpeg', 0.95);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // --- Clock-In Submission ---
  const handleClockIn = async () => {
    if (!capturedImageBlob) {
      toast.error("Please snap a check-in photo first");
      return;
    }
    if (!coords) {
      toast.error("Coordinates not acquired yet");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('check_in_image', capturedImageBlob, 'clock_in.jpg');
    formData.append('latitude', coords.lat);
    formData.append('longitude', coords.lng);
    formData.append('timestamp', new Date().toISOString());
    formData.append('address', assignment?.collegeName ? `${assignment.collegeName} Campus` : '');

    try {
      const res = await api.post('/attendance/clock-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setAttendanceId(res.data.attendanceId);
        toast.success("Clock-In recorded!");
        setCapturedImageUrl(null);
        setCapturedImageBlob(null);
        setStep(3); // unlock student attendance step
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Clock-in failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Student Attendance Submissions ---
  const handleExcelSubmit = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error("Please drag or select an excel sheet template");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('attendanceExcel', excelFile);
    formData.append('attendanceId', attendanceId);
    formData.append('latitude', coords.lat);
    formData.append('longitude', coords.lng);

    try {
      const res = await api.post('/student-attendance/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success(res.data.message || "Attendance saved!");
        setAttendanceSuccess(true);
        setStep(4); // proceed to Activities
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to process Excel file.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Canvas Signaturepad ---
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawingSig = (e) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#059669'; // Emerald
      setIsDrawing(true);
    }
  };

  const drawSig = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawingSig = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const toggleStudent = (index) => {
    setStudents(prev => prev.map((s, idx) => {
      if (idx === index) {
        return { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' };
      }
      return s;
    }));
  };

  const handleLiveSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if drawing pad is clear
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast.error("Student/Representative digital signature is required");
      return;
    }

    setLoading(true);
    const signatureBase64 = canvas.toDataURL('image/png');
    
    try {
      const res = await api.post('/student-attendance/live', {
        attendanceId,
        students,
        signatureBase64
      });
      if (res.data.success) {
        toast.success("Live attendance logged successfully!");
        setAttendanceSuccess(true);
        setStep(4); // proceed to Activities
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit live attendance.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Activity Log Submissions ---
  const handleActivityFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (activityImages.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 activity images");
      return;
    }
    
    setActivityImages(prev => [...prev, ...files]);
    
    // Create previews
    const previews = files.map(file => URL.createObjectURL(file));
    setActivityPreviews(prev => [...prev, ...previews]);
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
    formData.append('latitude', coords.lat);
    formData.append('longitude', coords.lng);
    
    activityImages.forEach(img => {
      formData.append('activityPhotos', img);
    });

    try {
      const res = await api.post('/student-activities', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success("Activity logged successfully!");
        setStep(5); // Unlock clock-out
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit activities.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Clock-Out Submission ---
  const handleClockOut = async () => {
    if (!capturedImageBlob) {
      toast.error("Please capture your clock-out selfie image first");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('check_out_image', capturedImageBlob, 'clock_out.jpg');
    formData.append('attendanceId', attendanceId);
    formData.append('latitude', coords.lat);
    formData.append('longitude', coords.lng);
    formData.append('timestamp', new Date().toISOString());
    formData.append('address', assignment?.collegeName ? `${assignment.collegeName} Campus` : '');

    try {
      const res = await api.post('/attendance/clock-out', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success("Clock-Out recorded successfully!");
        setSummaryData({
          clockOutTime: res.data.clockOutTime,
          duration: res.data.durationMinutes,
        });
        setCapturedImageUrl(null);
        setCapturedImageBlob(null);
        setStep(6); // Render Daily Summary page
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Clock-out failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 text-slate-100">
        
        {/* Header Title */}
        <div className="mb-8 border-b border-slate-800 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#0F172A' }}>
              Daily College Visit Workflow
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
              Guidance checklist mapping details of your daily assigned teaching visit.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f3f5c] border border-[#1a547a]/50 text-emerald-400">
            <Building className="h-6 w-6" />
          </div>
        </div>

        {/* Global Progress Stepper */}
        <div className="mb-10 rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#0F172A' }}>Daily Step Progress</p>
          <div className="flex items-center justify-between gap-2">
            {[
              { num: 1, label: "Check Location" },
              { num: 2, label: "Clock-In" },
              { num: 3, label: "Attendance" },
              { num: 4, label: "Activities" },
              { num: 5, label: "Clock-Out" },
              { num: 6, label: "Summary" }
            ].map((s) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step === s.num
                      ? "bg-gradient-to-br from-emerald-500 to-cyan-500 border-emerald-400 text-white scale-110 shadow-lg shadow-emerald-500/20"
                      : step > s.num
                        ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
                        : "bg-slate-950 border-slate-800 text-slate-500"
                  }`}>
                    {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                  </div>
                  <span className={`text-[10px] mt-1 text-center font-semibold hidden sm:inline`} style={{ color: step === s.num ? '#14B8A6' : '#334155' }}>
                    {s.label}
                  </span>
                </div>
                {s.num < 6 && (
                  <div className={`h-[2px] flex-1 bg-slate-800 ${step > s.num ? "bg-emerald-500/40" : ""}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Geolocation Coordinate Banner */}
        <div className={`mb-8 flex flex-col justify-between gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center backdrop-blur-sm transition-all duration-300 ${
          locationStatus === "ready" 
            ? "bg-emerald-950/20 border-emerald-950/50" 
            : locationStatus === "error" 
              ? "bg-rose-950/20 border-rose-950/50" 
              : "bg-slate-900/40 border-slate-800"
        }`}>
          <div className="flex items-start gap-3">
            <MapPin className={`h-5 w-5 shrink-0 mt-0.5 ${
              locationStatus === "ready" 
                ? "text-emerald-400" 
                : locationStatus === "error" 
                  ? "text-rose-400" 
                  : "text-cyan-400 animate-pulse"
            }`} />
            <div>
              <p className="text-sm font-semibold text-slate-200">
                GPS Position Verification
              </p>
              {locationStatus === "ready" && coords ? (
                <p className="text-xs text-emerald-400/90 font-mono mt-0.5">
                  Latitude: {coords.lat.toFixed(6)} | Longitude: {coords.lng.toFixed(6)} (Accuracy: ±{Math.round(coords.accuracy)}m)
                </p>
              ) : locationStatus === "error" ? (
                <p className="text-xs text-rose-400 mt-0.5">
                  {locationError}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">
                  Requesting GPS satellites location validation coordinates...
                </p>
              )}
            </div>
          </div>
          
          <button
            type="button"
            onClick={captureLocation}
            disabled={locationStatus === "locating" || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition hover:bg-slate-900 hover:border-slate-700 disabled:opacity-60 shrink-0 self-start sm:self-auto"
          >
            {locationStatus === "locating" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            )}
            Refresh Location
          </button>
        </div>

        {/* --- STEP 1: ASSIGNED COLLEGE & GEOFENCE VALIDATION --- */}
        {step === 1 && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-2xl border border-slate-800">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-400 mb-4" />
                <p className="text-slate-400 text-sm">Fetching assigned college details...</p>
              </div>
            ) : assignment ? (
              <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-6 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Your Assigned College Campus</h2>
                    <p className="text-xs text-slate-400">Assigned by the Admin portal to your trainer account</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#0a2e46] px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800/30">
                    Active Assignment
                  </span>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/50">
                      <p className="text-xs text-slate-500 font-semibold uppercase">College Name</p>
                      <p className="text-lg font-bold text-slate-200 mt-1">{assignment.collegeName}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/50">
                      <p className="text-xs text-slate-500 font-semibold uppercase">College ID</p>
                      <p className="text-sm font-mono text-slate-300 mt-1">{assignment.collegeId}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/50">
                      <p className="text-xs text-slate-500 font-semibold uppercase">Geo Coordinates</p>
                      <p className="text-sm font-mono text-slate-300 mt-1">Lat: {assignment.latitude} | Lng: {assignment.longitude}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/50">
                      <p className="text-xs text-slate-500 font-semibold uppercase">Geo-fence Radius Limit</p>
                      <p className="text-sm font-semibold text-slate-300 mt-1">{assignment.geofenceRadius} meters</p>
                    </div>
                  </div>

                  {/* Geofence verification box */}
                  <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 ${
                    isInside 
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" 
                      : "bg-rose-950/30 border-rose-500/30 text-rose-400"
                  }`}>
                    {isInside ? (
                      <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-10 w-10 shrink-0 text-rose-400" />
                    )}
                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-bold text-base">
                        {isInside ? "Inside Perimeter Verified" : "Outside Allowed Boundary"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {isInside 
                          ? `You are ${Math.round(distance || 0)} meters from center. Geofence verification passed.`
                          : distance != null 
                            ? `You are ${Math.round(distance)} meters from the campus center. You must be within ${assignment.geofenceRadius}m to perform check-ins.`
                            : "Awaiting GPS location coordinates to evaluate proximity."
                        }
                      </p>
                    </div>
                    {isInside && (
                      <button
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm px-5 py-3 rounded-xl transition hover:opacity-90 shadow-md hover:scale-105 active:scale-95 duration-200"
                      >
                        Proceed to Clock-In
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-rose-800/50 bg-rose-950/20 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-rose-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">No Assigned College Location</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  You are not assigned to any college for today. Admin settings must allocate your profile to a campus before you can perform a daily visit.
                </p>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 2: CLOCK-IN SCREEN --- */}
        {step === 2 && (
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Perform Clock-In</h2>
              <p className="text-xs text-slate-400">Capture a geotagged selfie inside college perimeter. Gallery uploads are blocked.</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Camera Shell */}
              <div className="relative aspect-video w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                {cameraActive ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : capturedImageUrl ? (
                  <img 
                    src={capturedImageUrl} 
                    alt="Selfie preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="h-12 w-12 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">Camera not active</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {!cameraActive && !capturedImageUrl && (
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0f3f5c] border border-[#1a547a]/50 text-emerald-400 font-semibold px-5 py-3 hover:bg-[#1a547a] transition text-sm"
                  >
                    <Camera className="h-4 w-4" />
                    Activate Camera
                  </button>
                )}

                {cameraActive && (
                  <button
                    onClick={capturePhoto}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white font-bold px-5 py-3 hover:bg-emerald-500 transition text-sm"
                  >
                    Snap Photo
                  </button>
                )}

                {(cameraActive || capturedImageUrl) && (
                  <button
                    onClick={() => { stopCamera(); setCapturedImageUrl(null); setCapturedImageBlob(null); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-xs text-slate-400 hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Submit Block */}
            {capturedImageUrl && (
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleClockIn}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:opacity-95 disabled:opacity-60 transition"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Clock-In
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 3: STUDENT ATTENDANCE OPTIONS --- */}
        {step === 3 && (
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Log Student Attendance</h2>
                <p className="text-xs text-slate-400">Choose to upload an Excel sheet or mark live attendance with signatures</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-950/80 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
                Clocked-In Today
              </span>
            </div>

            {/* Tabs Selector */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setAttendanceMode("excel")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition ${
                  attendanceMode === "excel" 
                    ? "bg-slate-900 border border-slate-800 text-white" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                Excel Upload
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode("live")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition ${
                  attendanceMode === "live" 
                    ? "bg-slate-900 border border-slate-800 text-white" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Users className="h-4 w-4 text-cyan-400" />
                Live Attendance
              </button>
            </div>

            {/* Option A: Excel Upload Form */}
            {attendanceMode === "excel" && (
              <form onSubmit={handleExcelSubmit} className="space-y-6">
                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 transition rounded-2xl p-8 text-center bg-slate-950/20 cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-200">
                    {excelFile ? excelFile.name : "Drag and drop or browse Excel sheet"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Accepts master Excel files (.xlsx, .xls) up to 10MB</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={loading || !excelFile}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:opacity-95 disabled:opacity-60 transition"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Excel Attendance
                  </button>
                </div>
              </form>
            )}

            {/* Option B: Live Grid & Signatures */}
            {attendanceMode === "live" && (
              <div className="space-y-6">
                {/* Student list grid */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase">Class Student Roll</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {students.map((student, idx) => (
                      <div 
                        key={student.rollNo}
                        onClick={() => toggleStudent(idx)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                          student.status === 'Present' 
                            ? "bg-emerald-950/10 border-emerald-500/30 text-emerald-400" 
                            : "bg-slate-950/20 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-mono font-bold text-slate-500">{student.rollNo}</p>
                          <p className="text-sm font-semibold text-slate-200">{student.name}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          student.status === 'Present'
                            ? "bg-emerald-950 border-emerald-800/40 text-emerald-400"
                            : "bg-slate-950 border-slate-800 text-slate-500"
                        }`}>
                          {student.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature canvas */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Representative Digital Signature</h3>
                    <p className="text-xs text-slate-500">Class representative or SPOC must sign on touch canvas to confirm live session details</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={180}
                      onMouseDown={startDrawingSig}
                      onMouseMove={drawSig}
                      onMouseUp={stopDrawingSig}
                      onMouseLeave={stopDrawingSig}
                      onTouchStart={startDrawingSig}
                      onTouchMove={drawSig}
                      onTouchEnd={stopDrawingSig}
                      className="bg-slate-950 border border-slate-800 rounded-xl cursor-crosshair max-w-full touch-none"
                    />
                    <button
                      onClick={clearSignature}
                      className="text-xs font-semibold text-slate-400 hover:text-white transition"
                    >
                      Clear Drawing Signature
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={handleLiveSubmit}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:opacity-95 disabled:opacity-60 transition"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Live Attendance
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 4: STUDENT ACTIVITIES LOGGING --- */}
        {step === 4 && (
          <form onSubmit={handleActivitySubmit} className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Submit Student Activities</h2>
              <p className="text-xs text-slate-400">Record syllabus progress, workshop events, and upload verification photos.</p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Activity Title</label>
                <input
                  type="text"
                  placeholder="e.g. Python OOP Workshop Day 3"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Description / Syllabus details</label>
                <textarea
                  placeholder="Summarize teaching topics, student exercises, outcomes..."
                  rows={4}
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3 pt-3">
                <label className="text-xs font-semibold uppercase text-slate-400">Activity Verification Photos</label>
                
                {/* Previews grid */}
                {activityPreviews.length > 0 && (
                  <div className="grid gap-3 grid-cols-5">
                    {activityPreviews.map((p, idx) => (
                      <div key={p} className="relative aspect-square rounded-lg bg-slate-950 border border-slate-800 overflow-hidden group">
                        <img src={p} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeActivityImage(idx)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-rose-400 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 transition rounded-xl p-6 text-center bg-slate-950/20 cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleActivityFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <ImageIcon className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300">Click to upload photos from today's exercises</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Maximum 5 images, up to 10MB each</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:opacity-95 disabled:opacity-60 transition"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Log Activities
              </button>
            </div>
          </form>
        )}

        {/* --- STEP 5: CLOCK-OUT SCREEN --- */}
        {step === 5 && (
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Record Clock-Out</h2>
              <p className="text-xs text-slate-400">Confirm you are leaving the college perimeter. Capture check-out geotagged photo.</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Camera Shell */}
              <div className="relative aspect-video w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                {cameraActive ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : capturedImageUrl ? (
                  <img 
                    src={capturedImageUrl} 
                    alt="Checkout Selfie preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <LogOut className="h-12 w-12 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">Camera not active</p>
                  </div>
                )}
              </div>

              {/* Camera Actions */}
              <div className="flex items-center gap-3">
                {!cameraActive && !capturedImageUrl && (
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0f3f5c] border border-[#1a547a]/50 text-emerald-400 font-semibold px-5 py-3 hover:bg-[#1a547a] transition text-sm"
                  >
                    <Camera className="h-4 w-4" />
                    Activate Camera
                  </button>
                )}

                {cameraActive && (
                  <button
                    onClick={capturePhoto}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white font-bold px-5 py-3 hover:bg-emerald-500 transition text-sm"
                  >
                    Capture Selfie
                  </button>
                )}

                {(cameraActive || capturedImageUrl) && (
                  <button
                    onClick={() => { stopCamera(); setCapturedImageUrl(null); setCapturedImageBlob(null); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-xs text-slate-400 hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Confirm Clock-Out */}
            {capturedImageUrl && (
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleClockOut}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-[#dc2626] text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-red-500 disabled:opacity-60 transition"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Clock-Out
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 6: SESSION SUMMARY STATS --- */}
        {step === 6 && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-950/10 to-slate-900 border border-emerald-500/20 p-8 text-center space-y-6 shadow-2xl">
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-400/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <FileCheck className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">Daily Visit Completed</h2>
              <p className="text-xs text-slate-400 mt-1">Check-in, attendance submission, activities, and check-out has been registered</p>
            </div>

            <div className="max-w-md mx-auto grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                <Clock className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Working Duration</p>
                <p className="text-lg font-bold text-slate-200 mt-1">{summaryData?.duration || 0} mins</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                <UserCheck className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Clock-Out Recorded</p>
                <p className="text-sm font-bold text-slate-200 mt-1.5">
                  {summaryData?.clockOutTime ? new Date(summaryData.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Done'}
                </p>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => {
                  setStep(1);
                  setSummaryData(null);
                  setCapturedImageUrl(null);
                  setCapturedImageBlob(null);
                  setExcelFile(null);
                  setAttendanceSuccess(false);
                  setActivityTitle("");
                  setActivityDesc("");
                  setActivityImages([]);
                  setActivityPreviews([]);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-5 py-3 text-xs font-semibold text-slate-300 hover:text-white transition hover:bg-slate-900"
              >
                Start New Visit Checklist
              </button>
            </div>
          </div>
        )}

      </section>
    </MainLayout>
  );
}
