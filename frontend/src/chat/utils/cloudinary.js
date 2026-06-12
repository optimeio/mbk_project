import axios from 'axios';
import imageCompression from 'browser-image-compression';

const CLOUD_NAME = 'djayl5qxw';
const UPLOAD_PRESET = 'chat_upload';
const ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

const MB = 1024 * 1024;
export const FILE_SIZE_LIMITS = {
  image: 2 * MB,
  video: 20 * MB,
  pdf: 10 * MB,
};

export const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
  initialQuality: 0.8,
};

const toSafeString = (value) => String(value || '').trim();

export const isImageFile = (file) => toSafeString(file?.type).startsWith('image/');
export const isVideoFile = (file) => toSafeString(file?.type).startsWith('video/');
export const isPdfFile = (file) =>
  toSafeString(file?.type) === 'application/pdf' ||
  toSafeString(file?.name).toLowerCase().endsWith('.pdf');

export const formatBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
};

export const validateUploadFile = (file) => {
  if (!file) {
    return { ok: false, reason: 'No file selected.' };
  }

  if (isImageFile(file)) {
    if (file.size > FILE_SIZE_LIMITS.image) {
      return {
        ok: false,
        reason: `Image too large. Max ${formatBytes(FILE_SIZE_LIMITS.image)} allowed.`,
      };
    }
    return { ok: true, kind: 'image' };
  }

  if (isVideoFile(file)) {
    if (file.size > FILE_SIZE_LIMITS.video) {
      return {
        ok: false,
        reason: `Video too large. Max ${formatBytes(FILE_SIZE_LIMITS.video)} allowed.`,
      };
    }
    return { ok: true, kind: 'video' };
  }

  if (isPdfFile(file)) {
    if (file.size > FILE_SIZE_LIMITS.pdf) {
      return {
        ok: false,
        reason: `PDF too large. Max ${formatBytes(FILE_SIZE_LIMITS.pdf)} allowed.`,
      };
    }
    return { ok: true, kind: 'pdf' };
  }

  return { ok: true, kind: 'file' };
};

export const buildOptimizedImageUrl = (url) => {
  const raw = toSafeString(url);
  if (!raw) return raw;

  const marker = '/upload/';
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) return raw;

  const prefix = raw.slice(0, markerIndex + marker.length);
  const suffix = raw.slice(markerIndex + marker.length);

  if (suffix.startsWith('w_500,q_auto,f_auto/')) {
    return raw;
  }

  return `${prefix}w_500,q_auto,f_auto/${suffix}`;
};

export const compressImageBeforeUpload = async (file) => {
  if (!isImageFile(file)) return file;
  try {
    const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Image compression failed, using original file:', error);
    return file;
  }
};

/**
 * Direct frontend upload to Cloudinary (unsigned preset).
 * Supports image/video/pdf via `auto/upload`.
 */
export const uploadFileToCloudinary = async (file, options = {}) => {
  const { onProgress, signal } = options;
  const validation = validateUploadFile(file);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const uploadFile = isImageFile(file)
    ? await compressImageBeforeUpload(file)
    : file;

  const formData = new FormData();
  formData.append('file', uploadFile);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await axios.post(ENDPOINT, formData, {
    signal,
    onUploadProgress: (event) => {
      if (typeof onProgress !== 'function') return;
      const loaded = Number(event?.loaded || 0);
      const total = Number(event?.total || uploadFile.size || 0);
      const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
      onProgress(percent);
    },
  });

  const data = response?.data || {};
  const secureUrl = data?.secure_url;
  if (!secureUrl) {
    throw new Error('Cloudinary upload failed: secure URL not returned');
  }

  return {
    secureUrl,
    optimizedUrl: isImageFile(file) ? buildOptimizedImageUrl(secureUrl) : secureUrl,
    publicId: data?.public_id || null,
    resourceType: data?.resource_type || null,
    format: data?.format || null,
    bytes: Number.isFinite(data?.bytes) ? data.bytes : uploadFile.size,
  };
};

/**
 * Backward compatible helper used by existing callsites.
 * Returns optimized image URL when applicable.
 */
export const uploadToCloudinary = async (file, options = {}) => {
  const result = await uploadFileToCloudinary(file, options);
  return result.optimizedUrl || result.secureUrl;
};
