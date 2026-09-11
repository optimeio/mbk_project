const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const haversine = require("haversine-distance");
const xlsx = require("xlsx");
const { authenticate } = require("../middleware/auth");
const { Trainer, College, Attendance, StudentActivity, Student, TrainerAssignment, Schedule } = require("../models");
const { getActiveAssignment } = require("../utils/trainerAssignmentResolver");
const { uploadAttendance } = require("../config/upload");

// helper to calculate distance in meters
function getDistanceInMeters(lat1, lng1, lat2, lng2) {
  return haversine(
    { latitude: Number(lat1), longitude: Number(lng1) },
    { latitude: Number(lat2), longitude: Number(lng2) }
  );
}

function escapeRegExp(string) {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 1. GET /api/teacher/current-assignment
router.get("/current-assignment", authenticate, async (req, res) => {
  try {
    const trainer = await Trainer.findOne({ userId: req.user.id }).populate("userId");
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer profile not found" });
    }

    let college = null;
    let assignment = null;

    if (req.query.scheduleId) {
      const schedule = await Schedule.findById(req.query.scheduleId).populate('collegeId').lean();
      if (schedule?.collegeId) {
        college = schedule.collegeId;
        assignment = {
          collegeName: college.name || schedule.collegeName,
          driveFolderId: college.googleDriveFolderId || trainer.collegeDriveFolderId,
          active: true,
        };
      }
    }

    if (!college) {
      const result = await getActiveAssignment(trainer, req.user);
      if (result) {
        college = result.college;
        assignment = result.assignment;
      }
    }

    if (!assignment && !college) {
      return res.json({ success: false, message: "No active college assignment found" });
    }

    const resolvedAssignment = {
      collegeName: college ? college.name : assignment?.collegeName,
      collegeId: college ? college._id : null,
      latitude: college ? (college.latitude != null ? college.latitude : college.location?.lat) : null,
      longitude: college ? (college.longitude != null ? college.longitude : college.location?.lng) : null,
      geofenceRadius: college ? (college.geofenceRadius || 150) : 150
    };

    return res.json({ success: true, assignment: resolvedAssignment });
  } catch (error) {
    console.error("GET current-assignment error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 1b. GET /api/attendance/today-status
router.get("/attendance/today-status", authenticate, async (req, res) => {
  try {
    const trainer = await Trainer.findOne({ userId: req.user.id });
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer profile not found" });
    }

    const { scheduleId } = req.query;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let todaySchedule = null;
    if (scheduleId) {
      todaySchedule = await Schedule.findOne({
        _id: scheduleId,
        trainerId: trainer._id,
        status: { $nin: ['cancelled', 'CANCELLED'] },
        isActive: { $ne: false },
      }).populate('collegeId', 'name').lean();
    }

    if (!todaySchedule) {
      todaySchedule = await Schedule.findOne({
        trainerId: trainer._id,
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ['cancelled', 'CANCELLED'] },
        isActive: { $ne: false },
      }).populate('collegeId', 'name').lean();
    }

    let attendanceRecord = null;
    if (todaySchedule?._id) {
      attendanceRecord = await Attendance.findOne({
        trainerId: trainer._id,
        scheduleId: todaySchedule._id,
      }).lean();
    }

    if (!attendanceRecord && !scheduleId) {
      attendanceRecord = await Attendance.findOne({
        trainerId: trainer._id,
        date: { $gte: todayStart, $lte: todayEnd }
      }).lean();
    }

    const hasScheduleToday = Boolean(todaySchedule);
    const scheduleInfo = todaySchedule
      ? {
          scheduleId: todaySchedule._id,
          collegeName: todaySchedule.collegeId?.name || todaySchedule.collegeName || null,
          dayNumber: todaySchedule.dayNumber,
          startTime: todaySchedule.startTime,
          endTime: todaySchedule.endTime,
          subject: todaySchedule.subject || null,
          venue: todaySchedule.venue || null,
        }
      : null;

    if (!attendanceRecord) {
      return res.json({
        success: true,
        clockedIn: false,
        step: 2,
        attendanceId: null,
        hasScheduleToday,
        scheduleInfo,
      });
    }

    const clockedIn = Boolean(
      (attendanceRecord.checkIn && attendanceRecord.checkIn.time) ||
      attendanceRecord.checkInTime ||
      attendanceRecord.imageUrl ||
      attendanceRecord.checkInImage
    );
    const hasAttendanceFile = Boolean(
      attendanceRecord.attendanceExcelUrl ||
      attendanceRecord.attendancePhotoUrl ||
      attendanceRecord.scannedAttendancePdfUrl ||
      (attendanceRecord.students && attendanceRecord.students.length > 0)
    );
    const hasActivity = Boolean(
      attendanceRecord.activityLogId ||
      attendanceRecord.activitiesSubmitted ||
      (attendanceRecord.activityPhotos && attendanceRecord.activityPhotos.length > 0) ||
      attendanceRecord.remarks ||
      attendanceRecord.syllabus
    );
    const clockedOut = Boolean(
      (attendanceRecord.checkOut && attendanceRecord.checkOut.time) ||
      attendanceRecord.checkOutTime ||
      attendanceRecord.completedAt ||
      attendanceRecord.checkOutCapturedAt ||
      attendanceRecord.checkOutImage ||
      attendanceRecord.checkOutGeoImageUrl ||
      attendanceRecord.status === 'Present'
    );

    let step = 2; // Default Clock-In step
    if (clockedOut) {
      step = 6; // Summary (Completed)
    } else if (hasActivity) {
      step = 5; // Clock-out
    } else if (hasAttendanceFile) {
      step = 4; // Activities
    } else if (clockedIn) {
      step = 3; // Student Attendance
    }

    return res.json({
      success: true,
      clockedIn,
      hasAttendanceFile,
      hasActivity,
      clockedOut,
      step,
      attendanceId: attendanceRecord._id,
      checkInTime: attendanceRecord.checkIn?.time || attendanceRecord.checkInTime || null,
      checkOutTime: attendanceRecord.checkOut?.time || attendanceRecord.checkOutTime || null,
      durationMinutes: attendanceRecord.workingDurationMinutes || null,
      hasScheduleToday,
      scheduleInfo,
    });
  } catch (error) {
    console.error("GET today-status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


// 2. POST /api/location/validate
router.post("/location/validate", authenticate, async (req, res) => {
  try {
    let { latitude, longitude } = req.body;

    const trainer = await Trainer.findOne({ userId: req.user.id }).populate("userId");
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer profile not found" });
    }

    const result = await getActiveAssignment(trainer, req.user);
    if (!result || !result.college) {
      return res.json({ success: true, isInside: true, message: "No active college assignment found" });
    }

    const { college } = result;

    const collegeLat = college.latitude != null ? college.latitude : college.location?.lat;
    const collegeLng = college.longitude != null ? college.longitude : college.location?.lng;

    if (latitude == null || longitude == null || collegeLat == null || collegeLng == null) {
      return res.json({ success: true, isInside: true, distanceMeters: 0, allowedRadius: college.geofenceRadius || 150 });
    }

    const distance = getDistanceInMeters(latitude, longitude, collegeLat, collegeLng);
    const radius = college.geofenceRadius || 150;
    const isInside = distance <= radius;

    if (!isInside) {
      return res.json({
        success: true,
        isInside: false,
        distanceMeters: Math.round(distance * 10) / 10,
        allowedRadius: radius,
        message: "You are outside the assigned college location."
      });
    }

    return res.json({
      success: true,
      isInside: true,
      distanceMeters: Math.round(distance * 10) / 10,
      allowedRadius: radius
    });
  } catch (error) {
    console.error("POST validate-location error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Helper to upload files to trainer's specific day/session folder on Google Drive
async function uploadTrainerFileToDrive({
  trainer,
  collegeId,
  scheduleId = null,
  attendanceId = null,
  dayNumber = 1,
  session = 'FN',
  file,
  isExcel = false,
  folderType = 'checkIn',
}) {
  try {
    const { uploadTrainerSessionFileToDrive } = require('../services/trainerSessionDriveUploadService');
    return await uploadTrainerSessionFileToDrive({
      trainer,
      collegeId,
      scheduleId,
      attendanceId,
      dayNumber,
      session,
      folderType: folderType === 'day' ? 'studentActivities' : folderType,
      file,
      isExcel,
    });
  } catch (error) {
    console.error('[DRIVE-UPLOAD] Error in uploadTrainerFileToDrive:', error.message);
    return null;
  }
}

// 3. POST /api/attendance/clock-in
router.post("/attendance/clock-in", authenticate, uploadAttendance, async (req, res) => {
  try {
    let { latitude, longitude, timestamp } = req.body;
    if (latitude == null) latitude = 0;
    if (longitude == null) longitude = 0;

    const trainer = await Trainer.findOne({ userId: req.user.id }).populate("userId");
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer profile not found" });
    }

    const result = await getActiveAssignment(trainer, req.user);
    // Bypass mode: allow clock-in even with no assignment
    const college = result?.college || null;
    let distance = 0;

    // Only enforce geofence if we have a real college with coordinates
    if (college) {
      const collegeLat = college.latitude != null ? college.latitude : college.location?.lat;
      const collegeLng = college.longitude != null ? college.longitude : college.location?.lng;

      if (collegeLat != null && collegeLng != null) {
        distance = getDistanceInMeters(latitude, longitude, collegeLat, collegeLng);
        const radius = college.geofenceRadius || 9999999;
        const isFallbackCoords = (Number(latitude) === 0 && Number(longitude) === 0);
        // Only block if geofenceRadius is explicitly set small (< 10km), trainer is outside, and we don't have fallback coords
        if (!isFallbackCoords && radius < 10000 && distance > radius) {
          return res.status(400).json({
            success: false,
            message: `You are outside the assigned college location. Distance: ${Math.round(distance)}m, Geofence: ${radius}m`
          });
        }
      }
    }

    // File validation
    const checkInImageFile = req.files && (req.files['check_in_image'] || req.files['clock_in_image'])
      ? (req.files['check_in_image'] || req.files['clock_in_image'])[0]
      : null;
    if (!checkInImageFile) {
      return res.status(400).json({ success: false, message: "Clock-in photo capture is required" });
    }

    // Check duplicate clock-in for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      trainerId: trainer._id,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (existingAttendance && existingAttendance.checkIn && existingAttendance.checkIn.time) {
      if (existingAttendance.finalStatus === "COMPLETED") {
        existingAttendance.finalStatus = "active";
        existingAttendance.status = "clocked_in";
        await existingAttendance.save();
      }
      return res.json({ 
        success: true, 
        attendanceId: existingAttendance._id,
        message: "Session active for today" 
      });
    }

    const checkInUrl = `/uploads/attendance/images/${checkInImageFile.filename}`;
    const checkInTime = timestamp ? new Date(timestamp) : new Date();

    // Resolve dayNumber from today's schedule
    const { Schedule } = require("../models");
    const schedule = await Schedule.findOne({
      trainerId: trainer._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
      isActive: { $ne: false }
    });
    const dayNumber = schedule?.dayNumber || 1;

    // Calculate late cutoff deadline based on session type
    const sessionType = schedule?.session || "FULL_DAY";
    let deadlineMins = 10 * 60 + 30; // 10:30 AM default for FN/FULL_DAY
    if (sessionType === "AN") {
      deadlineMins = 15 * 60; // 3:00 PM for AN
    }

    const checkInDateObj = new Date(checkInTime);
    const checkInMins = checkInDateObj.getHours() * 60 + checkInDateObj.getMinutes();
    
    // Check if session has ended
    let sessionEnded = false;
    if (sessionType === "FN" && checkInMins >= 13 * 60) {
      sessionEnded = true; // after 1:00 PM FN is ended
    } else if (sessionType === "AN" && checkInMins >= 17 * 60) {
      sessionEnded = true; // after 5:00 PM AN is ended
    } else if (sessionType === "FULL_DAY" && checkInMins >= 17 * 60) {
      sessionEnded = true;
    }

    if (sessionEnded) {
      return res.status(400).json({
        success: false,
        message: "Session has already ended. Check-in is not allowed."
      });
    }

    const isLate = checkInMins > deadlineMins;
    const computedStatus = isLate ? "Late" : "Present";
    const computedAttendanceStatus = isLate ? "LATE" : "PRESENT";

    const attendanceRecord = await Attendance.findOneAndUpdate(
      { trainerId: trainer._id, date: { $gte: todayStart, $lte: todayEnd } },
      {
        $set: {
          trainerId: trainer._id,
          collegeId: schedule?.collegeId || college?._id || null,
          scheduleId: schedule?._id || null,
          date: new Date(),
          dayNumber: dayNumber,
          status: computedStatus,
          attendanceStatus: computedAttendanceStatus,
          isLate: isLate,
          lateGraceDeadline: `${Math.floor(deadlineMins / 60)}:${String(deadlineMins % 60).padStart(2, '0')}`,
          checkIn: {
            time: checkInTime,
            photo: checkInUrl,
            location: {
              lat: Number(latitude),
              lng: Number(longitude),
              distanceFromCollege: Math.round(distance * 10) / 10,
              address: req.body.address || "Assigned College Perimeter"
            }
          },
          imageUrl: checkInUrl,
          checkInPhoto: checkInUrl,
          checkInImage: checkInUrl,
          checkInGeoImageUrl: checkInUrl,
          verificationStatus: "pending",
          geoVerificationStatus: "pending",
          finalStatus: "PENDING"
        }
      },
      { upsert: true, new: true }
    );

    // Asynchronously upload check-in image to Google Drive
    if (checkInImageFile && (schedule?.collegeId || college?._id)) {
      uploadTrainerFileToDrive({
        trainer,
        collegeId: schedule?.collegeId || college?._id,
        scheduleId: schedule?._id,
        attendanceId: attendanceRecord._id,
        dayNumber,
        session: sessionType,
        folderType: 'checkIn',
        file: checkInImageFile,
        isExcel: false
      }).then(driveFile => {
        const fileId = driveFile?.fileId || driveFile?.driveFileId || driveFile?.id;
        if (fileId) {
          Attendance.findByIdAndUpdate(attendanceRecord._id, {
            $set: {
              "checkIn.driveFileId": fileId,
              "driveFileId": fileId,
              "checkInGeoImageUrl": driveFile.webViewLink || `/uploads/attendance/images/${checkInImageFile.filename}`,
            }
          }).catch(dbErr => console.error("Failed to update clock-in driveFileId in DB:", dbErr));
        }
      }).catch(err => console.error("[DRIVE-UPLOAD-ASYNC] Clock-in upload failed:", err));
    }

    return res.json({
      success: true,
      attendanceId: attendanceRecord._id,
      clockInTime: checkInTime,
      message: "Clock-In recorded successfully."
    });
  } catch (error) {
    console.error("POST clock-in error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. POST /api/student-attendance/upload (Unified Excel, PDF, or Photo Uploader)
router.post("/student-attendance/upload", authenticate, uploadAttendance, async (req, res) => {
  try {
    const { attendanceId, latitude, longitude } = req.body;

    const uploadedFile = (req.files && (
      req.files['attendanceDocument']?.[0] ||
      req.files['attendanceFile']?.[0] ||
      req.files['attendanceExcel']?.[0] ||
      req.files['attendancePdf']?.[0] ||
      req.files['attendancePhoto']?.[0] ||
      req.files['file']?.[0] ||
      req.files['document']?.[0]
    )) || req.file;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: "Attendance document (Excel, PDF, or Photo) is required" });
    }

    const trainer = await Trainer.findOne({ userId: req.user.id });
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer profile not found" });
    }

    let attendanceRecord = null;
    if (attendanceId && mongoose.Types.ObjectId.isValid(String(attendanceId))) {
      attendanceRecord = await Attendance.findById(attendanceId);
    }
    if (!attendanceRecord) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      attendanceRecord = await Attendance.findOne({
        trainerId: trainer._id,
        date: { $gte: todayStart, $lte: todayEnd }
      });
    }

    if (!attendanceRecord) {
      const activeAssignment = await getActiveAssignment(trainer, req.user);
      const collegeId = activeAssignment?.college?._id || trainer.collegeId || null;
      attendanceRecord = new Attendance({
        trainerId: trainer._id,
        collegeId,
        date: new Date(),
        dayNumber: 1,
        status: 'clocked_in',
        attendanceStatus: 'PRESENT',
        checkIn: { time: new Date() }
      });
      await attendanceRecord.save();
    }

    const ext = path.extname(uploadedFile.originalname || '').toLowerCase();
    const relativePath = path.relative(path.join(__dirname, '..'), uploadedFile.path).replace(/\\/g, '/');
    const fileUrl = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

    const isExcel = ext === '.xlsx' || ext === '.xls' || ext === '.csv';
    const isPdf = ext === '.pdf' || ext === '.doc' || ext === '.docx';

    if (isExcel) {
      try {
        const workbook = xlsx.readFile(uploadedFile.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);
        if (rows.length > 0) {
          const college = await College.findById(attendanceRecord.collegeId);
          const studentsList = [];
          for (const row of rows) {
            const rollNo = String(row.RollNo || row.rollNo || row["Roll Number"] || "").trim();
            const registerNo = String(row.RegisterNo || row.registerNo || row["Registration Number"] || "").trim();
            const name = String(row.Name || row.name || row["Student Name"] || "").trim();
            const rawStatus = String(row.Status || row.status || row["Attendance"] || "Absent").trim().toLowerCase();
            const status = rawStatus === "present" || rawStatus === "p" ? "Present" : "Absent";
            if (!name && !rollNo) continue;
            studentsList.push({ rollNo, registerNo, name, status });
          }
          attendanceRecord.students = studentsList;
          attendanceRecord.studentsPresent = studentsList.filter(s => s.status === "Present").length;
          attendanceRecord.studentsAbsent = studentsList.filter(s => s.status === "Absent").length;
        }
      } catch (err) {
        console.warn("[EXCEL-PARSER] Warning parsing Excel rows:", err.message);
      }
      attendanceRecord.attendanceExcelUrl = fileUrl;
    } else if (isPdf) {
      attendanceRecord.attendancePdfUrl = fileUrl;
      attendanceRecord.attendanceExcelUrl = fileUrl; // Fallback for list display
    } else {
      attendanceRecord.attendancePhotoUrl = fileUrl;
      attendanceRecord.studentsPhotoUrl = fileUrl;
    }

    attendanceRecord.attendanceDocumentUrl = fileUrl;
    await attendanceRecord.save();

    // Asynchronously upload attendance document to Google Drive
    if (attendanceRecord.collegeId) {
      uploadTrainerFileToDrive({
        trainer,
        collegeId: attendanceRecord.collegeId,
        scheduleId: attendanceRecord.scheduleId,
        attendanceId: attendanceRecord._id,
        dayNumber: attendanceRecord.dayNumber || 1,
        session: new Date().getHours() >= 13 ? 'AN' : 'FN',
        file: uploadedFile,
        isExcel: isExcel,
        folderType: 'attendance'
      }).then(driveFile => {
        const fileId = driveFile?.fileId || driveFile?.driveFileId || driveFile?.id;
        if (fileId) {
          Attendance.findByIdAndUpdate(attendanceRecord._id, {
            $set: {
              "driveAssets.attendanceDriveFileId": fileId,
              "driveAssets.excelDriveFileId": fileId,
              "attendanceDocumentDriveFileId": fileId,
            }
          }).catch(dbErr => console.error("Failed to update driveFileId in DB:", dbErr));
        }
      }).catch(err => console.error("[DRIVE-UPLOAD-ASYNC] Attendance document upload failed:", err));
    }

    return res.json({
      success: true,
      fileUrl,
      attendanceId: attendanceRecord._id,
      message: `Attendance document (${isExcel ? 'Excel' : isPdf ? 'PDF' : 'Photo'}) uploaded successfully!`
    });
  } catch (error) {
    console.error("POST student-attendance/upload error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
});

// 4b. POST /api/student-attendance/photo
router.post("/student-attendance/photo", authenticate, uploadAttendance, async (req, res) => {
  try {
    const photoFile = (req.files && (
      req.files['attendancePhoto']?.[0] ||
      req.files['attendance_photo']?.[0] ||
      req.files['photo']?.[0] ||
      req.files['studentsPhoto']?.[0] ||
      req.files['image']?.[0]
    )) || req.file;

    if (!photoFile) {
      return res.status(400).json({ success: false, message: "Attendance photo is required" });
    }

    const trainer = await Trainer.findOne({ userId: req.user.id });
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer profile not found" });
    }

    const { attendanceId } = req.body || {};
    let attendanceRecord = null;
    if (attendanceId) {
      attendanceRecord = await Attendance.findById(attendanceId);
    }

    if (!attendanceRecord) {
      attendanceRecord = await Attendance.findOne({
        trainerId: trainer._id,
        status: { $in: ['clocked_in', 'active', 'pending'] }
      }).sort({ createdAt: -1 });
    }

    if (!attendanceRecord) {
      // Auto-create daily session if not clocked in yet
      const activeAssignment = await getActiveAssignment(trainer, req.user);
      const collegeId = activeAssignment?.college?._id || trainer.collegeId || null;
      attendanceRecord = new Attendance({
        trainerId: trainer._id,
        collegeId,
        date: new Date(),
        dayNumber: 1,
        status: 'clocked_in',
        checkIn: { time: new Date() }
      });
      await attendanceRecord.save();
    }

    const photoUrl = `/uploads/attendance/images/${photoFile.filename}`;
    attendanceRecord.attendancePhotoUrl = photoUrl;
    // We can also default present/absent counts if needed, but since it's just a photo we may skip modifying counts
    // or just leave them as whatever they are.
    await attendanceRecord.save();

    // Asynchronously upload attendance photo to Google Drive (in attendance folder)
    if (attendanceRecord.collegeId) {
      uploadTrainerFileToDrive({
        trainer,
        collegeId: attendanceRecord.collegeId,
        scheduleId: attendanceRecord.scheduleId,
        attendanceId: attendanceRecord._id,
        dayNumber: attendanceRecord.dayNumber || 1,
        session: new Date().getHours() >= 13 ? 'AN' : 'FN',
        file: photoFile,
        isExcel: false,
        folderType: 'attendance' // Forces it to the attendance folder
      }).then(driveFile => {
        const fileId = driveFile?.fileId || driveFile?.driveFileId || driveFile?.id;
        if (fileId) {
          Attendance.findByIdAndUpdate(attendanceRecord._id, {
            $set: { "driveAssets.photoDriveFileId": fileId }
          }).catch(dbErr => console.error("Failed to update photo driveFileId in DB:", dbErr));
        }
      }).catch(err => console.error("[DRIVE-UPLOAD-ASYNC] Attendance photo upload failed:", err));
    }

    return res.json({
      success: true,
      message: "Attendance photo uploaded successfully."
    });
  } catch (error) {
    console.error("POST student-attendance/photo error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 5. POST /api/student-attendance/live
router.post("/student-attendance/live", authenticate, async (req, res) => {
  try {
    const { attendanceId, students, signatureBase64 } = req.body;
    if (!attendanceId) {
      return res.status(400).json({ success: false, message: "attendanceId is required" });
    }
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ success: false, message: "Students attendance array is required" });
    }

    const attendanceRecord = await Attendance.findById(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({ success: false, message: "Active daily attendance session not found" });
    }

    const trainer = await Trainer.findOne({ userId: req.user.id });
    if (!trainer || String(attendanceRecord.trainerId) !== String(trainer._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized attendance session access" });
    }

    // Save signature image
    let signatureUrl = attendanceRecord.signatureUrl;
    if (signatureBase64 && signatureBase64.startsWith("data:image")) {
      const matches = signatureBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], "base64");
        const filename = `sig-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
        const signatureDir = "./uploads/attendance/signatures";
        
        if (!fs.existsSync(signatureDir)) {
          fs.mkdirSync(signatureDir, { recursive: true });
        }
        
        const filePath = path.join(signatureDir, filename);
        fs.writeFileSync(filePath, buffer);
        signatureUrl = `/uploads/attendance/signatures/${filename}`;
      }
    }

    const college = await College.findById(attendanceRecord.collegeId);
    const studentsList = [];

    for (const item of students) {
      let studentId = item.studentId;
      if (!studentId && college) {
        const studentRecord = await Student.findOne({
          collegeId: college._id,
          $or: [
            { rollNo: item.rollNo },
            { registerNo: item.registerNo }
          ].filter(q => q.rollNo || q.registerNo)
        });
        if (studentRecord) {
          studentId = studentRecord._id;
        }
      }

      studentsList.push({
        studentId,
        rollNo: item.rollNo || "",
        registerNo: item.registerNo || "",
        name: item.name || "Unknown",
        status: item.status === "Present" ? "Present" : "Absent"
      });
    }

    const presentCount = studentsList.filter(s => s.status === "Present").length;
    const absentCount = studentsList.filter(s => s.status === "Absent").length;

    attendanceRecord.students = studentsList;
    attendanceRecord.studentsPresent = presentCount;
    attendanceRecord.studentsAbsent = absentCount;
    attendanceRecord.signatureUrl = signatureUrl;
    await attendanceRecord.save();

    // Asynchronously upload signature to Google Drive if saved
    if (signatureUrl && attendanceRecord.collegeId) {
      const sigLocalPath = path.join(__dirname, '..', signatureUrl.replace(/^\//, ''));
      if (fs.existsSync(sigLocalPath)) {
        uploadTrainerFileToDrive({
          trainer,
          collegeId: attendanceRecord.collegeId,
          scheduleId: attendanceRecord.scheduleId,
          attendanceId: attendanceRecord._id,
          dayNumber: attendanceRecord.dayNumber || 1,
          session: new Date().getHours() >= 13 ? 'AN' : 'FN',
          folderType: 'attendance',
          file: { path: sigLocalPath, originalname: path.basename(sigLocalPath), mimetype: 'image/png' },
          isExcel: false,
        }).catch(err => console.error("[DRIVE-UPLOAD-ASYNC] Signature upload failed:", err));
      }
    }

    return res.json({
      success: true,
      message: "Live attendance records and signature saved successfully."
    });
  } catch (error) {
    console.error("POST student-attendance/live error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 6. POST /api/student-activities
router.post("/student-activities", authenticate, uploadAttendance, async (req, res) => {
  try {
    const { attendanceId, title, description, latitude, longitude } = req.body;
    if (!attendanceId) {
      return res.status(400).json({ success: false, message: "attendanceId is required" });
    }
    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Activity title and description are required" });
    }

    const attendanceRecord = await Attendance.findById(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({ success: false, message: "Active daily attendance session not found" });
    }

    const trainer = await Trainer.findOne({ userId: req.user.id });
    if (!trainer || String(attendanceRecord.trainerId) !== String(trainer._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized attendance session access" });
    }

    const photoFiles = req.files && req.files['activityPhotos'] ? req.files['activityPhotos'] : [];
    const photoUrls = photoFiles.map(f => `/uploads/attendance/photos/${f.filename}`);

    const college = await College.findById(attendanceRecord.collegeId);
    const collegeName = college ? college.name : "Assigned College";

    // Create activity records in DB for each uploaded image (matches legacy Schema)
    for (const file of photoFiles) {
      await StudentActivity.create({
        photoUrl: `/uploads/attendance/photos/${file.filename}`,
        classId: attendanceRecord.collegeId.toString(),
        className: collegeName,
        trainerId: trainer._id,
        trainerName: req.user.name || "Teacher",
        uploadedAt: new Date(),
        latitude: Number(latitude || college.latitude || 0),
        longitude: Number(longitude || college.longitude || 0),
        address: req.body.address || collegeName
      });
    }

    // Link activity images to the current attendance session
    attendanceRecord.activityPhotos = [
      ...(attendanceRecord.activityPhotos || []),
      ...photoUrls
    ];
    // Keep description or details in syllabus or remarks
    attendanceRecord.remarks = `${attendanceRecord.remarks || ""}\nActivity: ${title} - ${description}`;
    await attendanceRecord.save();

    // Asynchronously upload activity photos to Google Drive
    if (photoFiles.length > 0 && attendanceRecord.collegeId) {
      photoFiles.forEach(file => {
        uploadTrainerFileToDrive({
          trainer,
          collegeId: attendanceRecord.collegeId,
          scheduleId: attendanceRecord.scheduleId,
          attendanceId: attendanceRecord._id,
          dayNumber: attendanceRecord.dayNumber || 1,
          session: new Date().getHours() >= 13 ? 'AN' : 'FN',
          file: file,
          isExcel: false,
          folderType: 'studentActivities'
        }).then(driveFile => {
          if (driveFile?.id) {
            const driveUrl = driveFile.previewUrl || driveFile.webViewLink || `https://lh3.googleusercontent.com/d/${driveFile.id}=w1200`;
            const localFileUrl = `/uploads/attendance/photos/${file.filename}`;
            console.log(`[DRIVE-UPLOAD-ASYNC] Student activity photo ${file.filename} uploaded to Drive: ${driveFile.id}`);
            
            Attendance.findById(attendanceRecord._id).then(att => {
              if (att) {
                const photos = (att.activityPhotos || []).map(p => p === localFileUrl ? driveUrl : p);
                if (!photos.includes(driveUrl)) photos.push(driveUrl);
                att.activityPhotos = Array.from(new Set(photos.filter(Boolean)));
                return att.save();
              }
            }).catch(dbErr => console.error("Failed to update activityPhotos drive link in DB:", dbErr));

            StudentActivity.updateMany(
              { trainerId: trainer._id, classId: attendanceRecord.collegeId.toString(), photoUrl: localFileUrl },
              { $set: { photoUrl: driveUrl, driveFileId: driveFile.id } }
            ).catch(err => console.error("Error updating student activity drive link:", err));
          }
        }).catch(err => console.error("[DRIVE-UPLOAD-ASYNC] Student activity upload failed:", err));
      });
    }

    return res.json({
      success: true,
      imagesCount: photoUrls.length,
      message: "Student activities saved successfully."
    });
  } catch (error) {
    console.error("POST student-activities error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 7. POST /api/attendance/clock-out
router.post("/attendance/clock-out", authenticate, uploadAttendance, async (req, res) => {
  try {
    let { attendanceId, latitude, longitude, timestamp } = req.body;
    if (!attendanceId) {
      return res.status(400).json({ success: false, message: "attendanceId is required" });
    }
    if (latitude == null) latitude = 0;
    if (longitude == null) longitude = 0;

    const attendanceRecord = await Attendance.findById(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({ success: false, message: "Active daily attendance session not found" });
    }

    const trainer = await Trainer.findOne({ userId: req.user.id });
    if (!trainer || String(attendanceRecord.trainerId) !== String(trainer._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized attendance session access" });
    }

    if (!attendanceRecord.checkIn || !attendanceRecord.checkIn.time) {
      return res.status(400).json({ success: false, message: "You have not clocked in for this session yet" });
    }

    // Allow updating or completing the clock-out record smoothly

    // Geofence check
    const college = await College.findById(attendanceRecord.collegeId);
    const collegeLat = college ? (college.latitude != null ? college.latitude : college.location?.lat) : null;
    const collegeLng = college ? (college.longitude != null ? college.longitude : college.location?.lng) : null;

    let distance = 0;
    if (collegeLat != null && collegeLng != null) {
      distance = getDistanceInMeters(latitude, longitude, collegeLat, collegeLng);
      const radius = college.geofenceRadius || 150;
      const isFallbackCoords = (Number(latitude) === 0 && Number(longitude) === 0);
      if (!isFallbackCoords && distance > radius) {
        return res.status(400).json({
          success: false,
          message: `You are outside the assigned college location. Distance: ${Math.round(distance)}m, Geofence: ${radius}m`
        });
      }
    }

    // File validation
    const checkOutImageFile = req.files && (req.files['check_out_image'] || req.files['clock_out_image'])
      ? (req.files['check_out_image'] || req.files['clock_out_image'])[0]
      : null;
    if (!checkOutImageFile) {
      return res.status(400).json({ success: false, message: "Clock-out photo capture is required" });
    }

    const clockOutTime = timestamp ? new Date(timestamp) : new Date();
    const clockInTime = new Date(attendanceRecord.checkIn.time);
    const diffMs = clockOutTime - clockInTime;
    const durationMinutes = Math.max(0, Math.round(diffMs / 1000 / 60));

    const checkOutUrl = `/uploads/attendance/images/${checkOutImageFile.filename}`;

    attendanceRecord.checkOut = {
      time: clockOutTime,
      finalStatus: "COMPLETED",
      location: {
        lat: Number(latitude),
        lng: Number(longitude),
        distanceFromCollege: Math.round(distance * 10) / 10,
        address: req.body.address || "Assigned College Perimeter"
      }
    };

    attendanceRecord.checkOutTime = clockOutTime.toISOString();
    attendanceRecord.checkOutLatitude = Number(latitude);
    attendanceRecord.checkOutLongitude = Number(longitude);
    attendanceRecord.checkOutGeoDistanceMeters = distance;
    attendanceRecord.checkOutGeoImageUrl = checkOutUrl;
    attendanceRecord.checkOutGeoImageUrls = [checkOutUrl];
    attendanceRecord.finalStatus = "COMPLETED";
    attendanceRecord.completedAt = clockOutTime;
    attendanceRecord.workingDurationMinutes = durationMinutes;
    await attendanceRecord.save();

    // Asynchronously upload check-out image to Google Drive
    if (checkOutImageFile && attendanceRecord.collegeId) {
      uploadTrainerFileToDrive({
        trainer,
        collegeId: attendanceRecord.collegeId,
        scheduleId: attendanceRecord.scheduleId,
        attendanceId: attendanceRecord._id,
        dayNumber: attendanceRecord.dayNumber || 1,
        session: new Date().getHours() >= 13 ? 'AN' : 'FN',
        file: checkOutImageFile,
        isExcel: false,
        folderType: 'checkOut',
      }).then(driveFile => {
        const fileId = driveFile?.fileId || driveFile?.driveFileId || driveFile?.id;
        const driveUrl = driveFile?.previewUrl || driveFile?.webViewLink || (fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w1200` : null);
        if (fileId) {
          Attendance.findByIdAndUpdate(attendanceRecord._id, {
            $set: {
              "checkOut.driveFileId": fileId,
              "checkOutGeoImageUrl": driveUrl || checkOutUrl,
              "checkOutGeoImageUrls": [driveUrl || checkOutUrl],
            }
          }).catch(dbErr => console.error("Failed to update clock-out driveFileId in DB:", dbErr));
        }
      }).catch(err => console.error("[DRIVE-UPLOAD-ASYNC] Clock-out upload failed:", err));
    }

    return res.json({
      success: true,
      clockOutTime,
      durationMinutes,
      message: "Clock-Out registered successfully."
    });
  } catch (error) {
    console.error("POST clock-out error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
