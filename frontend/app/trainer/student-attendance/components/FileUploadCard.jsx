"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Loader2, X, CheckCircle2, AlertCircle, CloudUpload, FileSpreadsheet, FileText } from "lucide-react";

export default function FileUploadCard({
  title = "Upload File",
  accept = "*/*",
  maxSizeMb = 5, // Default to 5MB according to requirements
  file,
  setFile,
  onSubmit,
  required = false,
  description = "",
}) {
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle|compressing|uploading|success|error
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionRatio, setCompressionRatio] = useState(null);
  const [isPending, startTransition] = useTransition();

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Generate a thumbnail on the client to avoid loading large images in full resolution
  const generateThumbnail = useCallback((imageFile) => {
    return new Promise((resolve) => {
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
      reader.readAsDataURL(imageFile);
    });
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Strict validation: File type check (based on accept string)
    const fileExtension = "." + selected.name.split(".").pop().toLowerCase();
    const allowedExtensions = accept !== "*/*" 
      ? new Set(accept.toLowerCase().split(",").map(ext => ext.trim())) 
      : null;

    if (allowedExtensions && !allowedExtensions.has(fileExtension)) {
      setError(`Invalid file type. Allowed formats: ${accept.replace(/\./g, " ")}`);
      setStatus("error");
      setFile(null);
      setPreview(null);
      setCompressionRatio(null);
      return;
    }

    // Strict validation: 5MB size limit on frontend
    const maxSizeBytes = 5 * 1024 * 1024;
    if (selected.size > maxSizeBytes) {
      setError("File size exceeds the maximum limit of 5MB");
      setStatus("error");
      setFile(null);
      setPreview(null);
      setCompressionRatio(null);
      return;
    }

    setError("");
    setStatus("idle");
    setCompressionRatio(null);

    // If it is an image, compress and resize it on the client side
    if (selected.type.startsWith("image/")) {
      setStatus("compressing");
      
      // Generate canvas thumbnail preview instantly
      const thumbUrl = await generateThumbnail(selected);
      setPreview(thumbUrl);

      const compressionOptions = {
        maxSizeMB: 1, // Target web-optimized size under 1MB
        maxWidthOrHeight: 1280, // Web-optimized dimensions
        useWebWorker: true,
      };

      try {
        const imageCompression = (await import("browser-image-compression")).default;
        const compressedBlob = await imageCompression(selected, compressionOptions);
        const compressedFile = new File([compressedBlob], selected.name, {
          type: selected.type,
          lastModified: Date.now(),
        });

        // Calculate compression stats
        const ratio = ((1 - (compressedFile.size / selected.size)) * 100).toFixed(0);
        setCompressionRatio(ratio > 0 ? ratio : null);
        
        setFile(compressedFile);
        setStatus("idle");
      } catch (err) {
        console.warn("Client compression failed, using original file:", err);
        setFile(selected);
        setStatus("idle");
      }
    } else {
      setFile(selected);
      setPreview(null);
    }
  }, [accept, generateThumbnail, setFile]);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setStatus("uploading");
    setUploadProgress(0);
    setError("");

    startTransition(async () => {
      try {
        // Run the onSubmit upload and pass the progress tracking callback
        await onSubmit(file, (progress) => {
          setUploadProgress(progress);
        });
        setStatus("success");
      } catch (err) {
        setError(err?.message || "Upload error");
        setStatus("error");
      }
    });
  }, [file, onSubmit]);

  const reset = useCallback(() => {
    setFile(null);
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setStatus("idle");
    setError("");
    setUploadProgress(0);
    setCompressionRatio(null);
  }, [preview, setFile]);

  // Determine file icon
  const isExcel = file?.name?.endsWith(".xlsx") || file?.name?.endsWith(".xls") || file?.type?.includes("spreadsheet");
  const isPdf = file?.name?.endsWith(".pdf") || file?.type === "application/pdf";

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {title}
          {required && <span className="text-rose-500 font-normal text-sm">*</span>}
        </h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {file ? (
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6">
            {preview ? (
              <div className="relative mb-3 h-32 w-full max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="preview thumbnail" className="max-h-full max-w-full object-contain" loading="lazy" />
              </div>
            ) : (
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                {isExcel ? (
                  <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                ) : isPdf ? (
                  <FileText className="h-8 w-8 text-rose-600" />
                ) : (
                  <FileText className="h-8 w-8" />
                )}
              </div>
            )}

            <div className="text-center max-w-full">
              <p className="truncate text-sm font-semibold text-slate-700 px-4">{file.name}</p>
              <p className="text-xs text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB 
                {compressionRatio && (
                  <span className="text-emerald-600 font-medium ml-1">(-{compressionRatio}% compressed)</span>
                )}
              </p>
            </div>

            {status !== "uploading" && status !== "success" && (
              <button
                type="button"
                onClick={reset}
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 transition hover:border-[#1a6b9e] hover:bg-blue-50/20 cursor-pointer">
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            />
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm group-hover:border-[#1a6b9e]/30 transition">
              <CloudUpload className="h-6 w-6 text-slate-400 group-hover:text-[#1a6b9e] transition" />
            </div>
            <p className="text-sm font-semibold text-slate-700 group-hover:text-[#1a6b9e] transition text-center">
              Drag & drop or click to upload
            </p>
            <p className="mt-1 text-xs text-slate-400 text-center">
              Supported files: {accept.replace(/\./g, " ")} (max 5MB)
            </p>
          </div>
        )}
      </div>

      {status === "compressing" && (
        <div className="mt-4 flex items-center justify-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl py-2 animate-pulse">
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-amber-600" /> Web-optimizing & compressing image…
        </div>
      )}

      {status === "uploading" && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-600">
            <span className="flex items-center">
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading to server…
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

      {file && status !== "success" && status !== "uploading" && status !== "compressing" && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isPending}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f3f5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a6b9e] shadow-sm transition active:scale-[0.98] disabled:opacity-50"
        >
          Confirm and Upload
        </button>
      )}
    </div>
  );
}
