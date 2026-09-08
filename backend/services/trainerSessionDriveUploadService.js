const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const {
  Trainer,
  College,
  Schedule,
  Attendance,
  ScheduleDocument,
} = require('../models');
const {
  isTrainingDriveEnabled,
  uploadToDriveWithRetry,
  ensureDriveFolder,
  findDriveFolder,
} = require('../modules/drive/driveGateway');
const {
  ensureTrainerCollegeHierarchy,
} = require('../modules/drive/driveTrainerDocuments.service');

const normalizeSessionType = (session = '') => {
  const str = String(session || '').toUpperCase().trim();
  if (str.includes('AN')) return 'AN';
  return 'FN';
};

/**
 * Resolves the precise Google Drive folder ID for a trainer daily session workflow action.
 * Hierarchy:
 * Root (NM Trainers)
 *   └── [Trainer Name]
 *         └── [College Name]
 *               └── Day [X]
 *                     ├── FN
 *                     │     ├── Check-In
 *                     │     ├── Student Attendance
 *                     │     ├── Student Activities
 *                     │     └── Check-Out
 *                     └── AN
 *                           ├── Check-In
 *                           ├── Student Attendance
 *                           ├── Student Activities
 *                           └── Check-Out
 */
const resolveTrainerSessionDriveFolder = async ({
  trainer,
  trainerId,
  collegeId,
  dayNumber = 1,
  session = 'FN',
  folderType = 'checkIn', // 'checkIn' | 'attendance' | 'studentActivities' | 'checkOut'
}) => {
  if (!isTrainingDriveEnabled()) return null;

  try {
    let resolvedTrainer = trainer;
    if (!resolvedTrainer && trainerId) {
      resolvedTrainer = await Trainer.findById(trainerId);
    }
    if (!resolvedTrainer) {
      console.warn('[SESSION-DRIVE] Trainer not found for folder resolution');
      return null;
    }

    let collegeName = 'Unknown College';
    if (collegeId) {
      const collegeDoc = await College.findById(collegeId).select('name').lean();
      if (collegeDoc?.name) {
        collegeName = collegeDoc.name.trim();
      }
    }

    const safeDayNumber = Math.max(1, Math.min(12, Number(dayNumber) || 1));
    const sessionKey = normalizeSessionType(session) === 'AN' ? 'anFolder' : 'fnFolder';
    const sessionLabel = normalizeSessionType(session) === 'AN' ? 'AN' : 'FN';

    // 1. Ensure full hierarchy exists in Google Drive
    const hierarchy = await ensureTrainerCollegeHierarchy({
      trainer: resolvedTrainer,
      collegeName,
      totalDays: 12,
    });

    const dayMeta = (hierarchy.dayFoldersByDayNumber || {})[safeDayNumber];
    if (!dayMeta) {
      console.warn(`[SESSION-DRIVE] Day ${safeDayNumber} folder meta not resolved for trainer ${resolvedTrainer._id}`);
      return null;
    }

    const sessionMeta = dayMeta[sessionKey] || dayMeta.fnFolder || dayMeta;

    let targetFolderId = null;

    if (folderType === 'checkIn') {
      targetFolderId = sessionMeta?.checkInFolder?.id || sessionMeta?.geoTagFolder?.id || dayMeta?.checkInFolder?.id;
      if (!targetFolderId && sessionMeta?.id) {
        const folder = await ensureDriveFolder({ folderName: 'Check-In', parentFolderId: sessionMeta.id });
        targetFolderId = folder?.id;
      }
    } else if (folderType === 'attendance') {
      targetFolderId = sessionMeta?.attendanceFolder?.id || dayMeta?.attendanceFolder?.id;
      if (!targetFolderId && sessionMeta?.id) {
        const folder = await ensureDriveFolder({ folderName: 'Student Attendance', parentFolderId: sessionMeta.id });
        targetFolderId = folder?.id;
      }
    } else if (folderType === 'studentActivities' || folderType === 'activities' || folderType === 'activity') {
      targetFolderId = sessionMeta?.studentActivitiesFolder?.id || dayMeta?.studentActivitiesFolder?.id;
      if (!targetFolderId && sessionMeta?.id) {
        const folder = await ensureDriveFolder({ folderName: 'Student Activities', parentFolderId: sessionMeta.id });
        targetFolderId = folder?.id;
      }
    } else if (folderType === 'checkOut') {
      targetFolderId = sessionMeta?.checkOutFolder?.id || dayMeta?.checkOutFolder?.id;
      if (!targetFolderId && sessionMeta?.id) {
        const folder = await ensureDriveFolder({ folderName: 'Check-Out', parentFolderId: sessionMeta.id });
        targetFolderId = folder?.id;
      }
    }

    if (!targetFolderId && sessionMeta?.id) {
      targetFolderId = sessionMeta.id;
    } else if (!targetFolderId && dayMeta?.id) {
      targetFolderId = dayMeta.id;
    }

    return targetFolderId;
  } catch (err) {
    console.error('[SESSION-DRIVE] Folder resolution error:', err.message);
    return null;
  }
};

/**
 * Uploads a trainer daily workflow file directly to the dedicated Google Drive subfolder
 * and registers it in ScheduleDocument and Attendance records.
 */
const uploadTrainerSessionFileToDrive = async ({
  trainer,
  collegeId,
  scheduleId = null,
  attendanceId = null,
  dayNumber = 1,
  session = 'FN',
  folderType = 'checkIn', // 'checkIn' | 'attendance' | 'studentActivities' | 'checkOut'
  file, // multer file object { path, filename, originalname, mimetype, buffer }
  fileName = null,
  isExcel = false,
}) => {
  if (!isTrainingDriveEnabled() || !file) return null;

  try {
    let fileBuffer = null;
    if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      fileBuffer = await fs.promises.readFile(file.path);
    } else {
      console.warn('[SESSION-DRIVE] File buffer or path missing for upload');
      return null;
    }

    const originalName = fileName || file.originalname || file.filename || path.basename(file.path || 'upload.jpg');
    const mimeType = file.mimetype || (originalName.endsWith('.pdf') ? 'application/pdf' : (originalName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'image/jpeg'));

    const safeDayNumber = Math.max(1, Math.min(12, Number(dayNumber) || 1));
    const normalizedSession = normalizeSessionType(session);

    // Resolve target Google Drive folder
    const targetFolderId = await resolveTrainerSessionDriveFolder({
      trainer,
      collegeId,
      dayNumber: safeDayNumber,
      session: normalizedSession,
      folderType,
    });

    if (!targetFolderId) {
      console.warn(`[SESSION-DRIVE] Could not find target folder for ${folderType} (Day ${safeDayNumber}, ${normalizedSession})`);
      return null;
    }

    // Upload with retries
    const driveUpload = await uploadToDriveWithRetry(
      {
        fileBuffer,
        mimeType,
        originalName,
        folderId: targetFolderId,
        fileName: originalName,
      },
      { attempts: 3, initialDelayMs: 500 }
    );

    const driveFileId = driveUpload?.fileId || driveUpload?.driveFileId || driveUpload?.id;
    if (!driveFileId) {
      console.warn('[SESSION-DRIVE] Upload succeeded but no driveFileId returned');
      return null;
    }

    const previewUrl = `https://lh3.googleusercontent.com/d/${driveFileId}=w1200`;
    const driveViewLink = driveUpload?.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;
    const driveDownloadLink = driveUpload?.webContentLink || `https://drive.google.com/uc?export=download&id=${driveFileId}`;

    console.log(`[SESSION-DRIVE] ✅ Uploaded ${originalName} to Drive folder ${targetFolderId} (File ID: ${driveFileId})`);

    // Clean up temporary local file to keep storage purely cloud-based
    if (file.path && fs.existsSync(file.path)) {
      try {
        await fs.promises.unlink(file.path);
      } catch (_unlinkErr) {
        // Ignore unlink error
      }
    }

    // Persist to ScheduleDocument with Google Drive URL
    try {
      const fileField =
        folderType === 'checkIn'
          ? 'checkInPhoto'
          : folderType === 'attendance'
          ? (isExcel ? 'attendanceExcel' : 'attendanceDocument')
          : folderType === 'studentActivities'
          ? 'studentActivity'
          : 'checkOutPhoto';

      const fileType =
        folderType === 'attendance'
          ? (isExcel ? 'excel' : (originalName.endsWith('.pdf') ? 'pdf' : 'attendance'))
          : folderType === 'studentActivities'
          ? 'activity'
          : 'geotag';

      await ScheduleDocument.create({
        scheduleId: scheduleId ? new mongoose.Types.ObjectId(scheduleId) : undefined,
        attendanceId: attendanceId ? new mongoose.Types.ObjectId(attendanceId) : undefined,
        trainerId: trainer?._id ? new mongoose.Types.ObjectId(trainer._id) : undefined,
        collegeId: collegeId ? new mongoose.Types.ObjectId(collegeId) : undefined,
        fileName: originalName,
        fileUrl: previewUrl,
        fileType,
        fileField,
        dayNumber: safeDayNumber,
        session: normalizedSession,
        driveFileId,
        driveViewLink,
        driveDownloadLink,
        driveFolderId: targetFolderId,
        uploadedAt: new Date(),
      });
    } catch (docErr) {
      console.warn('[SESSION-DRIVE] Warning saving ScheduleDocument:', docErr.message);
    }

    return {
      ...driveUpload,
      id: driveFileId,
      fileId: driveFileId,
      driveFileId,
      driveFolderId: targetFolderId,
      previewUrl,
      fileUrl: previewUrl,
      webViewLink: driveViewLink,
      webContentLink: driveDownloadLink,
    };
  } catch (error) {
    console.error('[SESSION-DRIVE] Error uploading trainer file to Drive:', error.message);
    return null;
  }
};

module.exports = {
  normalizeSessionType,
  resolveTrainerSessionDriveFolder,
  uploadTrainerSessionFileToDrive,
};
