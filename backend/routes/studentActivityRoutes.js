const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { StudentActivity } = require('../models');

// Ensure imageDir exists
const imageDir = './uploads/attendance/images';
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });
const uploadAttendanceFields = upload.fields([
  { name: 'check_in_image', maxCount: 1 },
  { name: 'check_out_image', maxCount: 1 }
]);
const uploadSingleImage = upload.single('image');

// Fetch student activities & attendance submissions
router.get('/', authenticate, async (req, res) => {
  try {
    // If trainer, only return their activities
    const filter = {};
    if (req.user && req.user.role === 'trainer') {
      filter.trainerId = req.user.id;
    }
    const activities = await StudentActivity.find(filter).sort({ uploadedAt: -1 });
    return res.json({ success: true, activities });
  } catch (err) {
    console.error('Fetch activities error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Attendance submission with geo-tagged check-in and optional check-out image
router.post('/attendance/submit', authenticate, uploadAttendanceFields, async (req, res) => {
  try {
    const { trainer_id, attendance_date, status } = req.body;
    let location = req.body.location;
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        // ignore
      }
    }
    const { latitude, longitude, accuracy } = location || {};

    if (!trainer_id || !attendance_date || !status) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const checkInFile = req.files && req.files['check_in_image'] ? req.files['check_in_image'][0] : null;
    const checkOutFile = req.files && req.files['check_out_image'] ? req.files['check_out_image'][0] : null;

    if (!checkInFile) {
      return res.status(400).json({ success: false, message: 'Check-in geo-tagged image required' });
    }

    if (status === 'present' && !checkOutFile) {
      return res.status(400).json({ success: false, message: 'Check-out geo-tagged image required for Present status' });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid location data' });
    }

    // Create check-in record
    const checkInActivity = await StudentActivity.create({
      photoUrl: `/uploads/attendance/images/${checkInFile.filename}`,
      classId: 'check-in',
      className: 'Trainer Check-In',
      trainerId: trainer_id,
      trainerName: req.user.name || 'Unknown',
      uploadedAt: new Date(),
      latitude,
      longitude,
      accuracy,
      address: null,
    });

    let checkOutActivity = null;
    if (status === 'present' && checkOutFile) {
      checkOutActivity = await StudentActivity.create({
        photoUrl: `/uploads/attendance/images/${checkOutFile.filename}`,
        classId: 'check-out',
        className: 'Trainer Check-Out',
        trainerId: trainer_id,
        trainerName: req.user.name || 'Unknown',
        uploadedAt: new Date(),
        latitude,
        longitude,
        accuracy,
        address: null,
      });
    }

    return res.json({
      success: true,
      check_in_id: checkInActivity._id,
      check_out_id: checkOutActivity ? checkOutActivity._id : null,
      status: 'verified',
      geo_verification: {
        check_in: 'verified',
        check_out: status === 'present' ? 'verified' : 'skipped'
      }
    });
  } catch (err) {
    console.error('Attendance submit error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Live class image upload endpoint
router.post('/class/image-upload', authenticate, uploadSingleImage, async (req, res) => {
  try {
    const { class_id, trainer_id, timestamp } = req.body;
    const geoImage = req.file;
    if (!class_id || !trainer_id || !geoImage) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const activity = await StudentActivity.create({
      photoUrl: `/uploads/attendance/images/${geoImage.filename}`,
      classId: class_id,
      trainerId: trainer_id,
      trainerName: req.user.name || 'Unknown',
      uploadedAt: timestamp || new Date().toISOString(),
      latitude: parseFloat(req.body.geo_latitude),
      longitude: parseFloat(req.body.geo_longitude),
      accuracy: parseFloat(req.body.geo_accuracy),
      address: null,
    });
    return res.json({ success: true, image_id: activity._id, geo_status: 'verified', archive_location: activity.photoUrl, metadata: { file_size: geoImage.size, file_hash: null } });
  } catch (err) {
    console.error('Class image upload error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
