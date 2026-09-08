const { Schedule, Trainer, College } = require("../../models");
const { ensureTrainerCollegeHierarchy } = require("./driveTrainerDocuments.service");

const SCHEDULE_DRIVE_FOLDER_SELECT =
  "trainerId companyId courseId collegeId departmentId dayNumber driveFolderId driveFolderName driveFolderLink dayFolderId dayFolderName dayFolderLink attendanceFolderId attendanceFolderName attendanceFolderLink geoTagFolderId geoTagFolderName geoTagFolderLink";

const toDayNumber = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasCompleteScheduleFolderRefs = (schedule = {}) =>
  Boolean(
    schedule.dayFolderId &&
      schedule.attendanceFolderId &&
      schedule.geoTagFolderId,
  );

const buildScheduleFolderStateFromDayMeta = (dayNumber, dayMeta = {}, schedule = {}) => {
  const rawSession = String(schedule?.sessionType || schedule?.session || '').toUpperCase();
  const startTime = String(schedule?.startTime || '').trim();
  let sessionKey = 'fnFolder';
  if (rawSession.includes('AN')) {
    sessionKey = 'anFolder';
  } else if (!rawSession.includes('FN') && startTime) {
    const hourMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (hourMatch) {
      let hour = parseInt(hourMatch[1], 10);
      const isPM = hourMatch[3] && hourMatch[3].toUpperCase() === 'PM';
      if (isPM && hour < 12) hour += 12;
      if (!isPM && hourMatch[3] && hourMatch[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
      if (hour >= 13) sessionKey = 'anFolder';
    }
  }

  const sessionMeta = dayMeta?.[sessionKey] || dayMeta?.fnFolder || dayMeta;

  return {
    dayFolderId: dayMeta.id || dayMeta.dayFolderId || null,
    dayFolderName: dayMeta.name || `Day ${dayNumber}`,
    dayFolderLink: dayMeta.link || null,
    attendanceFolderId:
      sessionMeta.attendanceFolder?.id ||
      dayMeta.attendanceFolder?.id ||
      dayMeta.attendance ||
      null,
    attendanceFolderName: "Student Attendance",
    attendanceFolderLink:
      sessionMeta.attendanceFolder?.link ||
      dayMeta.attendanceFolder?.link ||
      null,
    geoTagFolderId:
      sessionMeta.checkInFolder?.id ||
      dayMeta.geoTagFolder?.id ||
      dayMeta.geo_tag ||
      null,
    geoTagFolderName: "Check-In",
    geoTagFolderLink:
      sessionMeta.checkInFolder?.link ||
      dayMeta.geoTagFolder?.link ||
      null,
    driveFolderId: dayMeta.id || dayMeta.dayFolderId || null,
    driveFolderName: dayMeta.name || `Day ${dayNumber}`,
    driveFolderLink: dayMeta.link || null,
  };
};

const persistTrainerCollegeDayFolders = async ({
  trainer,
  collegeId,
  collegeName,
  hierarchy,
}) => {
  if (!trainer?._id || !collegeId || !hierarchy?.collegeFolder?.id) return;

  let collegeEntry = (trainer.colleges || []).find(
    (entry) => String(entry.collegeId) === String(collegeId),
  );

  if (!collegeEntry) {
    collegeEntry = {
      collegeId,
      collegeName: collegeName || "",
      assignedDate: new Date(),
      active: true,
      status: "active",
    };
    trainer.colleges = trainer.colleges || [];
    trainer.colleges.push(collegeEntry);
    collegeEntry = trainer.colleges[trainer.colleges.length - 1];
  }

  collegeEntry.googleDriveFolderId = hierarchy.collegeFolder.id;
  collegeEntry.googleDriveFolderName = collegeName || collegeEntry.collegeName;
  collegeEntry.collegeLink = hierarchy.collegeFolder.link || null;

  if (hierarchy.dayFoldersByDayNumber) {
    collegeEntry.dayFolders = Object.entries(hierarchy.dayFoldersByDayNumber).map(
      ([dayKey, folders]) => ({
        day: Number(dayKey),
        dayFolderId: folders.id,
        attendance: folders.attendanceFolder?.id || null,
        geo_tag: folders.geoTagFolder?.id || null,
        excel_sheet: null,
      }),
    );
  }

  if (hierarchy.trainerFolder?.id) {
    trainer.driveFolderId = hierarchy.trainerFolder.id;
    trainer.driveFolderName = hierarchy.trainerFolder.name || trainer.driveFolderName;
    trainer.googleDriveFolderId = hierarchy.trainerFolder.id;
  }

  trainer.collegeDriveFolderId = hierarchy.collegeFolder.id;
  trainer.collegeDriveFolderName = collegeName || trainer.collegeDriveFolderName;
  await trainer.save();
};

const resolveTrainerCollegeScheduleFolders = async ({
  scheduleId,
  scheduleDoc = null,
} = {}) => {
  if (!scheduleId) return null;

  let fullSchedule = scheduleDoc;
  if (
    !fullSchedule?.collegeId ||
    !fullSchedule?.trainerId ||
    fullSchedule.dayNumber === undefined
  ) {
    fullSchedule = await Schedule.findById(scheduleId).select(SCHEDULE_DRIVE_FOLDER_SELECT);
  }

  if (!fullSchedule?.trainerId || !fullSchedule?.collegeId) {
    return null;
  }

  if (hasCompleteScheduleFolderRefs(fullSchedule)) {
    return {
      ...buildScheduleFolderStateFromDayMeta(
        toDayNumber(fullSchedule.dayNumber),
        {
          id: fullSchedule.dayFolderId,
          name: fullSchedule.dayFolderName,
          link: fullSchedule.dayFolderLink,
          attendanceFolder: {
            id: fullSchedule.attendanceFolderId,
            link: fullSchedule.attendanceFolderLink,
          },
          geoTagFolder: {
            id: fullSchedule.geoTagFolderId,
            link: fullSchedule.geoTagFolderLink,
          },
        },
      ),
      departmentId: fullSchedule.departmentId,
      dayNumber: fullSchedule.dayNumber,
    };
  }

  const dayNumber = toDayNumber(fullSchedule.dayNumber);
  if (!Number.isFinite(dayNumber) || dayNumber <= 0) {
    return null;
  }

  const trainer = await Trainer.findById(fullSchedule.trainerId).select(
    "colleges driveFolderId driveFolderName googleDriveFolderId collegeDriveFolderId firstName lastName name email trainerId",
  );
  if (!trainer) return null;

  const collegeId = String(fullSchedule.collegeId);
  let collegeEntry = Array.isArray(trainer.colleges)
    ? trainer.colleges.find((entry) => String(entry.collegeId) === collegeId)
    : null;

  let dayFolderEntry = Array.isArray(collegeEntry?.dayFolders)
    ? collegeEntry.dayFolders.find((entry) => Number(entry.day) === dayNumber)
    : null;

  if (!dayFolderEntry?.dayFolderId && !dayFolderEntry?.attendance) {
    const college = await College.findById(fullSchedule.collegeId).select("name");
    if (!college?.name) return null;

    try {
      const hierarchy = await ensureTrainerCollegeHierarchy({
        trainer,
        collegeName: college.name,
        totalDays: 12,
      });
      const dayMeta = hierarchy?.dayFoldersByDayNumber?.[dayNumber];
      if (!dayMeta?.id) return null;

      await persistTrainerCollegeDayFolders({
        trainer,
        collegeId: fullSchedule.collegeId,
        collegeName: college.name,
        hierarchy,
      });

      dayFolderEntry = {
        dayFolderId: dayMeta.id,
        attendance: dayMeta.attendanceFolder?.id || null,
        geo_tag: dayMeta.geoTagFolder?.id || null,
      };
    } catch (error) {
      console.warn(
        `[GOOGLE-DRIVE] Trainer college hierarchy ensure failed for schedule ${scheduleId}:`,
        error.message,
      );
      return null;
    }
  }

  if (
    !dayFolderEntry?.dayFolderId &&
    !dayFolderEntry?.attendance &&
    !dayFolderEntry?.geo_tag
  ) {
    return null;
  }

  const scheduleFolderState = buildScheduleFolderStateFromDayMeta(dayNumber, {
    id: dayFolderEntry.dayFolderId,
    attendance: dayFolderEntry.attendance,
    geo_tag: dayFolderEntry.geo_tag,
  });

  await Schedule.findByIdAndUpdate(scheduleId, { $set: scheduleFolderState });

  return {
    ...scheduleFolderState,
    departmentId: fullSchedule.departmentId,
    dayNumber,
  };
};

module.exports = {
  SCHEDULE_DRIVE_FOLDER_SELECT,
  hasCompleteScheduleFolderRefs,
  resolveTrainerCollegeScheduleFolders,
  buildScheduleFolderStateFromDayMeta,
};
