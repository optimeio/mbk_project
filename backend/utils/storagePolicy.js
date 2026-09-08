const fs = require("fs/promises");

/** Production / Render: persist files in Google Drive only (512MB disk limit). */
const isDriveOnlyStorage = () => {
  const mode = String(process.env.STORAGE_MODE || "").trim().toLowerCase();
  if (mode === "drive" || mode === "drive_only") return true;
  if (String(process.env.DISABLE_LOCAL_FILE_FALLBACK || "").trim() === "1") {
    return true;
  }
  return String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
};

const removeLocalUploadFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("[STORAGE] Failed to delete local upload:", error.message);
    }
  }
};

const cleanupUploadedFiles = async (files = []) => {
  await Promise.all(
    files.map((file) => removeLocalUploadFile(file?.path || file)),
  );
};

const cleanupFilesByField = async (filesByField = {}) => {
  const paths = [];
  for (const fieldFiles of Object.values(filesByField)) {
    const list = Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles];
    list.forEach((file) => {
      if (file?.path) paths.push(file.path);
    });
  }
  await cleanupUploadedFiles(paths);
};

const buildDriveUploadError = (error, fallback = "Google Drive upload failed.") => {
  const err = new Error(error?.message || fallback);
  err.statusCode = 503;
  return err;
};

module.exports = {
  isDriveOnlyStorage,
  removeLocalUploadFile,
  cleanupUploadedFiles,
  cleanupFilesByField,
  buildDriveUploadError,
};
