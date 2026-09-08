const cloudinary = require("cloudinary").v2;
const CloudinaryStoragePkg = require("multer-storage-cloudinary");
const CloudinaryStorage = CloudinaryStoragePkg.CloudinaryStorage || CloudinaryStoragePkg;

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const hasCloudinaryConfig =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadDir = path.join(__dirname, "../uploads/trainer-documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Default storage: auto-converts to WebP/AVIF, limits max width to 1920px
const storage = hasCloudinaryConfig
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: "mbkcarrierz",
        allowed_formats: ["jpg", "png", "jpeg", "pdf", "webp"],
        // Auto quality + auto format (delivers WebP/AVIF to supported browsers)
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1920, crop: 'limit' },
        ],
        invalidate: true, // Purge CDN cache when the same public_id is re-uploaded
      },
    })
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    });

// Profile-photo storage: smaller max size + eager thumbnail generation
const profilePhotoStorage = hasCloudinaryConfig
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: "mbkcarrierz/profiles",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto' },
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // smart crop to face
        ],
        eager: [
          { width: 80, height: 80, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }, // thumbnail
        ],
        eager_async: true,
        invalidate: true,
      },
    })
  : storage; // Fallback to disk

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (for large documents/PDFs)
});

const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for profile photos
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

module.exports = { cloudinary, upload, uploadProfilePhoto };

