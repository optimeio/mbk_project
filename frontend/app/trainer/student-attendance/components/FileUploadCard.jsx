"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Loader2, X, CheckCircle2, AlertCircle, CloudUpload, FileSpreadsheet, FileText, Plus, Maximize2, Image as ImageIcon } from "lucide-react";

export default function FileUploadCard({
  title = "Upload File",
  accept = "*/*",
  maxSizeMb = 15,
  maxFiles = 10,
  multiple = false,
  files = [],
  setFiles,
  file,
  setFile,
  onSubmit,
  required = false,
  description = "",
}) {
  const isMultipleMode = multiple || Boolean(setFiles);
  const currentFiles = isMultipleMode ? (files || []) : (file ? [file] : []);

  const [previews, setPreviews] = useState([]);
  const [status, setStatus] = useState("idle"); // idle|compressing|uploading|success|error
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [isPending, startTransition] = useTransition();

  // Generate a thumbnail on the client to avoid loading large images in full resolution
  const generateThumbnail = useCallback((imageFile) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const maxThumbSize = 250;
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
          }, "image/jpeg", 0.8);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(imageFile);
    });
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const allowedExtensions = accept !== "*/*"
      ? new Set(accept.toLowerCase().split(",").map(ext => ext.trim()))
      : null;

    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    const validatedFiles = [];
    const newPreviews = [];

    for (const f of rawFiles) {
      const fileExtension = "." + f.name.split(".").pop().toLowerCase();
      if (allowedExtensions && !allowedExtensions.has(fileExtension) && !allowedExtensions.has("image/*")) {
        setError(`Invalid file format: ${f.name}. Allowed: ${accept}`);
        setStatus("error");
        return;
      }

      if (f.size > maxSizeBytes) {
        setError(`File ${f.name} exceeds ${maxSizeMb}MB size limit.`);
        setStatus("error");
        return;
      }

      validatedFiles.push(f);
      if (f.type.startsWith("image/")) {
        const thumb = await generateThumbnail(f);
        newPreviews.push({ name: f.name, url: thumb, type: 'image', size: f.size });
      } else if (f.name.endsWith('.pdf') || f.type.includes('pdf')) {
        newPreviews.push({ name: f.name, url: null, type: 'pdf', size: f.size });
      } else {
        newPreviews.push({ name: f.name, url: null, type: 'excel', size: f.size });
      }
    }

    setError("");
    setStatus("idle");

    if (isMultipleMode) {
      if (setFiles) {
        setFiles(prev => [...(prev || []), ...validatedFiles].slice(0, maxFiles));
      }
      setPreviews(prev => [...prev, ...newPreviews].slice(0, maxFiles));
    } else {
      if (setFile) setFile(validatedFiles[0]);
      setPreviews(newPreviews.slice(0, 1));
    }
    e.target.value = "";
  }, [accept, generateThumbnail, isMultipleMode, maxFiles, maxSizeMb, setFile, setFiles]);

  const removeFileAt = (idx) => {
    if (isMultipleMode && setFiles) {
      setFiles(prev => (prev || []).filter((_, i) => i !== idx));
    } else if (setFile) {
      setFile(null);
    }
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = useCallback(async () => {
    if (currentFiles.length === 0) return;
    setStatus("uploading");
    setUploadProgress(0);
    setError("");

    startTransition(async () => {
      try {
        const payload = isMultipleMode ? currentFiles : currentFiles[0];
        await onSubmit(payload, (progress) => {
          setUploadProgress(progress);
        });
        setStatus("success");
      } catch (err) {
        setError(err?.message || "Upload error");
        setStatus("error");
      }
    });
  }, [currentFiles, isMultipleMode, onSubmit]);

  const resetAll = useCallback(() => {
    if (isMultipleMode && setFiles) setFiles([]);
    if (setFile) setFile(null);
    setPreviews([]);
    setStatus("idle");
    setError("");
    setUploadProgress(0);
  }, [isMultipleMode, setFile, setFiles]);

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {title}
            {required && <span className="text-rose-500 font-normal text-sm">*</span>}
          </h3>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {currentFiles.length > 0 && (
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {currentFiles.length} file{currentFiles.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {currentFiles.length > 0 ? (
          <div className="space-y-3">
            {/* Grid of files */}
            <div className={`grid gap-3 ${currentFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {currentFiles.map((f, idx) => {
                const prev = previews[idx];
                const isImg = f.type?.startsWith("image/") || prev?.type === 'image';
                const isPdf = f.name?.endsWith(".pdf") || f.type?.includes("pdf") || prev?.type === 'pdf';
                const isExcel = f.name?.endsWith(".xlsx") || f.name?.endsWith(".xls") || f.name?.endsWith(".csv") || prev?.type === 'excel';

                return (
                  <div
                    key={`${f.name}-${idx}`}
                    className="relative rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-between group overflow-hidden"
                  >
                    <div
                      className="relative h-28 w-full overflow-hidden rounded-xl bg-white border border-slate-200 flex items-center justify-center cursor-pointer"
                      onClick={() => {
                        if (isImg && prev?.url) setLightboxImg(prev.url);
                      }}
                    >
                      {isImg && prev?.url ? (
                        <>
                          <img src={prev.url} alt={f.name} className="h-full w-full object-cover group-hover:scale-105 transition" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                            <Maximize2 className="h-5 w-5" />
                          </div>
                        </>
                      ) : isExcel ? (
                        <div className="flex flex-col items-center justify-center text-emerald-600">
                          <FileSpreadsheet className="h-8 w-8 mb-1" />
                          <span className="text-[10px] font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded">Excel</span>
                        </div>
                      ) : isPdf ? (
                        <div className="flex flex-col items-center justify-center text-rose-600">
                          <FileText className="h-8 w-8 mb-1" />
                          <span className="text-[10px] font-bold uppercase bg-rose-50 px-2 py-0.5 rounded">PDF</span>
                        </div>
                      ) : (
                        <FileText className="h-8 w-8 text-slate-500" />
                      )}
                    </div>

                    <div className="mt-2 min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-700" title={f.name}>{f.name}</p>
                      <p className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(0)} KB</p>
                    </div>

                    {status !== "uploading" && status !== "success" && (
                      <button
                        type="button"
                        onClick={() => removeFileAt(idx)}
                        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700 transition cursor-pointer"
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add More Button */}
            {isMultipleMode && currentFiles.length < maxFiles && (
              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-4 flex items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition">
                <input
                  type="file"
                  accept={accept}
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Plus className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">Add More Photos / Files ({maxFiles - currentFiles.length} remaining)</span>
              </label>
            )}
          </div>
        ) : (
          <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 transition hover:border-[#1a6b9e] hover:bg-blue-50/20 cursor-pointer">
            <input
              type="file"
              accept={accept}
              multiple={isMultipleMode}
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            />
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm group-hover:border-[#1a6b9e]/30 transition">
              <CloudUpload className="h-6 w-6 text-slate-400 group-hover:text-[#1a6b9e] transition" />
            </div>
            <p className="text-sm font-semibold text-slate-700 group-hover:text-[#1a6b9e] transition text-center">
              Drag & drop or click to upload {isMultipleMode ? 'multiple files' : 'file'}
            </p>
            <p className="mt-1 text-xs text-slate-400 text-center">
              Supported files: {accept.replace(/\./g, " ")} (up to {maxFiles} files, max {maxSizeMb}MB each)
            </p>
          </div>
        )}
      </div>

      {status === "uploading" && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-600">
            <span className="flex items-center">
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading to server & Drive…
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="mt-4 flex items-center justify-center text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl py-2">
          <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> Uploaded successfully
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 flex items-start text-sm font-medium text-rose-800 bg-rose-50 border border-rose-100 rounded-xl p-3">
          <AlertCircle className="h-4 w-4 mr-2 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Upload failed</p>
            <p className="text-xs text-rose-600/90 mt-0.5 truncate">{error}</p>
          </div>
          <button type="button" onClick={() => setStatus("idle")} className="ml-2 text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {currentFiles.length > 0 && status !== "success" && status !== "uploading" && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isPending}
            className="flex-2 flex items-center justify-center gap-2 rounded-xl bg-[#0f3f5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a6b9e] shadow-sm transition active:scale-[0.98] disabled:opacity-50"
          >
            Confirm & Upload ({currentFiles.length})
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img src={lightboxImg} alt="Preview" className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-2 right-2 h-9 w-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
