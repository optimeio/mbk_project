"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import {
  Camera,
  Loader2,
  MapPin,
  RefreshCw,
  CloudUpload,
  Trash2,
  ImagePlus,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Award
} from 'lucide-react';

const API_ENDPOINT = '/api/student-activities';

export default function StudentActivitiesPage() {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [className, setClassName] = useState('');
  const [batchName, setBatchName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Location states
  const [location, setLocation] = useState(null); // { lat, lng, accuracy, timestamp }
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | locating | ready | error
  const [locationError, setLocationError] = useState('');

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const trainerId = currentUser?.trainerId || currentUser?.trainer_id || currentUser?.id || currentUser?._id;
  const trainerName = currentUser?.name || currentUser?.displayName || 'Trainer';

  // 1. Fetch activities
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(API_ENDPOINT);
      setActivities(res.activities || []);
    } catch (err) {
      console.error('Fetch activities error:', err);
      setError(err.message || 'Failed to fetch student activities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // 2. Geolocation capture
  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('locating');
    setLocationError('');
    setLocation(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setLocationStatus('ready');
      },
      (err) => {
        const messages = {
          1: 'Location access denied. Please allow location permission.',
          2: 'Location unavailable. Please check your GPS/network settings.',
          3: 'Location request timed out. Please try again.',
        };
        setLocationStatus('error');
        setLocationError(messages[err.code] || 'Failed to capture GPS coordinates.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Auto-capture location on mount
  useEffect(() => {
    captureLocation();
  }, [captureLocation]);

  // 3. Image file changes
  const handleFileChange = useCallback(async (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
    setFormError('');
    setUploadSuccess(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
    e.target.value = '';
  }, [handleFileChange]);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setFormError('');
  }, []);

  // 4. Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!className.trim() || !batchName.trim()) {
      setFormError('Please enter class name and batch name.');
      return;
    }
    if (!imageFile) {
      setFormError('Please capture or upload a live class photo.');
      return;
    }
    if (locationStatus !== 'ready' || !location) {
      setFormError('GPS Location is required before uploading.');
      return;
    }

    setUploading(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('class_id', `${className}-${batchName}`.toLowerCase().replace(/\s+/g, '-'));
      formData.append('className', className);
      formData.append('batchName', batchName);
      formData.append('trainer_id', trainerId);
      formData.append('geo_latitude', String(location.lat));
      formData.append('geo_longitude', String(location.lng));
      formData.append('geo_accuracy', String(location.accuracy));
      formData.append('timestamp', new Date().toISOString());

      await api.post(`${API_ENDPOINT}/class/image-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadSuccess(true);
      setClassName('');
      setBatchName('');
      clearImage();
      // Refetch gallery list
      fetchActivities();
    } catch (err) {
      console.error('Submit error:', err);
      setFormError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isFormValid = className.trim() && batchName.trim() && imageFile && locationStatus === 'ready';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-[24px] border border-[#1a6b9e]/20 bg-gradient-to-br from-[#0c2438] to-[#153e53] p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 h-48 w-48 -translate-y-8 translate-x-8 rounded-full bg-white/5 blur-2xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md shadow-inner">
              <Camera className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Live Class Activities</h1>
              <p className="mt-1 text-sm text-blue-200">
                Upload geo-tagged session photos to verify your daily student activities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Trainer: {trainerName}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Side: Upload Form */}
        <section className="lg:col-span-5 space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CloudUpload className="h-5 w-5 text-[#1a6b9e]" />
              New Activity Upload
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Class Info */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Class / Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack Web Development"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition focus:border-[#1a6b9e] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Batch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch A - Salem College"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition focus:border-[#1a6b9e] focus:bg-white"
                  required
                />
              </div>

              {/* Location Panel */}
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className={`h-4 w-4 ${locationStatus === 'ready' ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <span className="text-sm font-semibold text-slate-700">GPS Location</span>
                  </div>
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={locationStatus === 'locating'}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {locationStatus === 'locating' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    {locationStatus === 'locating' ? 'Locating...' : 'Refresh'}
                  </button>
                </div>

                {locationStatus === 'ready' && location && (
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600 bg-white border border-slate-100 rounded-xl p-2.5">
                    <div>Lat: {location.lat.toFixed(6)}</div>
                    <div>Lng: {location.lng.toFixed(6)}</div>
                    <div className="col-span-2 text-slate-400 mt-1 border-t border-slate-50 pt-1 flex justify-between">
                      <span>Acc: ±{Math.round(location.accuracy)}m</span>
                      <span>{new Date(location.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}

                {locationStatus === 'error' && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{locationError}</span>
                  </div>
                )}
              </div>

              {/* Image Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Live Class Photo <span className="text-rose-500">*</span>
                </label>

                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-blue-50/20 hover:border-[#1a6b9e] cursor-pointer rounded-2xl p-6 transition text-center"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm transition group-hover:scale-105">
                      <ImagePlus className="h-5 w-5 text-slate-400 group-hover:text-[#1a6b9e]" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      Take a photo or browse image
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Camera supported • JPG, PNG, WEBP
                    </p>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-inner">
                    <Image
                      src={imagePreview}
                      alt="Class activity preview"
                      width={400}
                      height={250}
                      className="w-full object-cover h-48"
                      unoptimized
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={clearImage}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-rose-600 transition"
                        aria-label="Remove image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Browse file
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#1a6b9e]/30 bg-blue-50 px-3 py-2 text-xs font-bold text-[#1a6b9e] transition hover:bg-blue-100"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Take Photo
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {/* Status Notifications */}
              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Photo uploaded successfully! Your activity is registered.</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || uploading}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold shadow-md transition ${
                  isFormValid && !uploading
                    ? 'bg-gradient-to-r from-[#0c2438] to-[#153e53] text-white hover:opacity-95 shadow-blue-950/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading activity...
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-4 w-4" />
                    Submit Activity Photo
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Right Side: Gallery of uploads */}
        <section className="lg:col-span-7 space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#1a6b9e]" />
                Recent Uploads Gallery
              </h2>
              <button
                type="button"
                onClick={fetchActivities}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
                title="Refresh gallery"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="h-8 w-8 text-[#1a6b9e] animate-spin" />
                <span className="text-sm text-slate-500">Loading your activities...</span>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <Camera className="h-10 w-10 text-slate-300 mb-3" />
                <p className="font-semibold text-slate-700">No activities uploaded yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload a session photo to see it in the gallery.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {activities.map((act) => {
                  const displayUrl = act.photoUrl.startsWith('/') 
                    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'}${act.photoUrl}`
                    : act.photoUrl;

                  return (
                    <div
                      key={act._id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#1a6b9e]/30"
                    >
                      {/* Image block */}
                      <div 
                        className="relative h-44 w-full bg-slate-950 overflow-hidden cursor-pointer"
                        onClick={() => setPreviewImage(displayUrl)}
                      >
                        <Image
                          src={displayUrl}
                          alt={act.className || 'Class Activity'}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-90" />
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white">
                          <span className="truncate text-xs font-bold bg-[#1a6b9e] px-2 py-0.5 rounded-md">
                            {act.batchName || 'Session'}
                          </span>
                          <span className="text-[10px] opacity-90 font-medium">
                            {new Date(act.uploadedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Content block */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 leading-snug group-hover:text-[#1a6b9e] transition">
                            {act.className || 'Live Class Session'}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                            <Award className="h-3 w-3 text-slate-400" />
                            <span>Trainer: {act.trainerName}</span>
                          </div>
                        </div>

                        {/* Location footer info */}
                        <div className="border-t border-slate-50 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3 text-slate-300" />
                            {act.latitude ? act.latitude.toFixed(4) : '—'}, {act.longitude ? act.longitude.toFixed(4) : '—'}
                          </span>
                          {act.accuracy && <span>±{Math.round(act.accuracy)}m</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md transition-opacity duration-350">
          <div className="relative max-w-4xl w-full bg-slate-900 overflow-hidden rounded-3xl shadow-2xl border border-white/10 animate-scale-up">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-rose-600 transition"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative h-[80vh] w-full bg-slate-950">
              <Image
                src={previewImage}
                alt="Full preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
