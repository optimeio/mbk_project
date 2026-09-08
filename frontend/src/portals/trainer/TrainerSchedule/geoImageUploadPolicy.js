export const KB = 1024;
export const MB = 1024 * 1024;

export const GEO_UPLOAD_SOFT_MIN_BYTES = 550 * KB;
export const GEO_UPLOAD_TARGET_MAX_BYTES = 3 * MB;
export const GEO_UPLOAD_HARD_MAX_BYTES = 15 * MB;
export const GEO_UPLOAD_ABSOLUTE_MAX_BYTES = 25 * MB;
export const GEO_UPLOAD_MAX_MEGAPIXELS = 3;
export const GEO_UPLOAD_MAX_PIXELS = GEO_UPLOAD_MAX_MEGAPIXELS * 1_000_000;

export const formatUploadBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${Math.round(bytes)} B`;
};

export const getGeoUploadSizeState = (size = 0) => {
  if (!Number.isFinite(size) || size <= 0) return "invalid";
  if (size > GEO_UPLOAD_ABSOLUTE_MAX_BYTES) return "too_large_absolute";
  if (size > GEO_UPLOAD_HARD_MAX_BYTES) return "too_large_hard";
  if (size > GEO_UPLOAD_TARGET_MAX_BYTES) return "too_large_target";
  if (size < GEO_UPLOAD_SOFT_MIN_BYTES) return "too_small_soft";
  return "within_target";
};

export const getPixelBudgetMaxDimension = (dimensions) => {
  const width = Number(dimensions?.width || 0);
  const height = Number(dimensions?.height || 0);
  const pixels = width * height;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 2048;
  }

  if (pixels <= GEO_UPLOAD_MAX_PIXELS) {
    return Math.max(width, height);
  }

  const scale = Math.sqrt(GEO_UPLOAD_MAX_PIXELS / pixels);
  return Math.max(640, Math.floor(Math.max(width * scale, height * scale)));
};

export const shouldAutoCompressGeoImage = ({ size = 0, pixels = 0 } = {}) => {
  const sizeState = getGeoUploadSizeState(size);
  const overPixelBudget = Number.isFinite(pixels) && pixels > GEO_UPLOAD_MAX_PIXELS;
  return (
    sizeState === "too_large_target" ||
    sizeState === "too_large_hard" ||
    overPixelBudget
  );
};
