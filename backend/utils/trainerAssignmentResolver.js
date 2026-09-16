const { TrainerAssignment, College } = require('../models');

/**
 * Resolves the display name of a trainer.
 * @param {Object} trainer 
 * @returns {string}
 */
function resolveTrainerDisplayName(trainer) {
  if (!trainer) return '';
  const first = String(trainer.firstName || '').trim();
  const last = String(trainer.lastName || '').trim();
  const email = String(trainer.email || '').trim();
  
  if (first || last) {
    return `${first} ${last}`.trim();
  }
  return email;
}

/**
 * Syncs/Creates a TrainerAssignment record for a trainer and a college.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function syncTrainerAssignmentRecord({ trainer, trainerName, collegeName, driveFolderId }) {
  try {
    let assignment = await TrainerAssignment.findOne({
      trainer_id: trainer._id,
      collegeName: collegeName,
      active: true
    });

    if (!assignment) {
      assignment = new TrainerAssignment({
        trainer_id: trainer._id,
        trainerName: trainerName || resolveTrainerDisplayName(trainer),
        collegeName,
        active: true,
        driveFolderId,
        assignedAt: new Date(),
        status: 'assigned'
      });
    } else {
      if (driveFolderId) {
        assignment.driveFolderId = driveFolderId;
      }
    }

    await assignment.save();
    return assignment;
  } catch (error) {
    console.error('[TrainerAssignmentResolver] Sync error:', error);
    throw error;
  }
}

function getCurrentISTTotalMinutes() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function resolveScheduleSessionToken(sched) {
  if (!sched) return 'FN';
  const s = String(sched.session || sched.sessionType || '').toUpperCase().trim();
  if (s === 'FN' || s === 'AN') return s;
  const rawStart = String(sched.startTime || sched.time || '').trim();
  const match = rawStart.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const ampm = (match[3] || '').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h >= 13 ? 'AN' : 'FN';
  }
  return 'FN';
}

/**
 * Finds the active college assignment for a trainer.
 * @param {Object} trainer 
 * @param {Object} [user] 
 * @param {string} [targetScheduleId]
 * @returns {Promise<{assignment: Object, college: Object, schedule: Object}|null>}
 */
async function getActiveAssignment(trainer, user, targetScheduleId = null) {
  try {
    if (!trainer) return null;

    const { Schedule } = require('../models');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    // 0a. If specific scheduleId is requested
    if (targetScheduleId) {
      const schedule = await Schedule.findById(targetScheduleId).populate('collegeId').lean();
      if (schedule?.collegeId) {
        const college = schedule.collegeId;
        const mockAssignment = {
          collegeName: college.name || schedule.collegeName,
          driveFolderId: college.googleDriveFolderId || trainer.collegeDriveFolderId,
          active: true,
          scheduleId: schedule._id,
          session: resolveScheduleSessionToken(schedule),
        };
        return { assignment: mockAssignment, college, schedule };
      }
    }

    // 0b. Priority: Check trainer's non-cancelled schedules for today
    const candidateSchedules = await Schedule.find({
      trainerId: trainer._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
      status: { $nin: ['cancelled', 'CANCELLED'] },
      isActive: { $ne: false },
    }).populate('collegeId').lean();

    if (candidateSchedules.length > 0) {
      const totalMins = getCurrentISTTotalMinutes();
      const anSchedule = candidateSchedules.find((s) => resolveScheduleSessionToken(s) === 'AN');
      const fnSchedule = candidateSchedules.find((s) => resolveScheduleSessionToken(s) === 'FN');

      // Before 1:30 PM (810 mins): pick FN session. At/After 1:30 PM (810 mins): pick AN session.
      const activeSchedule = totalMins >= 13 * 60 + 30
        ? (anSchedule || fnSchedule || candidateSchedules[0])
        : (fnSchedule || anSchedule || candidateSchedules[0]);

      if (activeSchedule?.collegeId) {
        const college = activeSchedule.collegeId;
        const mockAssignment = {
          collegeName: college.name || activeSchedule.collegeName,
          driveFolderId: college.googleDriveFolderId || trainer.collegeDriveFolderId,
          active: true,
          scheduleId: activeSchedule._id,
          session: resolveScheduleSessionToken(activeSchedule),
        };
        return { assignment: mockAssignment, college, schedule: activeSchedule };
      }
    }

    // 1. Find the latest active TrainerAssignment
    const assignment = await TrainerAssignment.findOne({
      trainer_id: trainer._id,
      active: true
    }).sort({ assignedAt: -1 });

    if (assignment) {
      const college = await College.findOne({ name: assignment.collegeName });
      return { assignment, college };
    }

    // 2. Fallback: Check trainer's linked collegeId
    if (trainer.collegeId) {
      const college = await College.findById(trainer.collegeId);
      if (college) {
        const mockAssignment = {
          collegeName: college.name,
          driveFolderId: trainer.collegeDriveFolderId || college.googleDriveFolderId,
          active: true
        };
        return { assignment: mockAssignment, college };
      }
    }

    // 3. Fallback: Check trainer's colleges array
    if (Array.isArray(trainer.colleges) && trainer.colleges.length > 0) {
      const firstCol = trainer.colleges[0];
      let college = null;
      if (firstCol.collegeId) {
        college = await College.findById(firstCol.collegeId);
      }
      if (!college && firstCol.collegeName) {
        college = await College.findOne({ name: firstCol.collegeName });
      }

      const collegeName = college ? college.name : (firstCol.collegeName || 'Assigned College');
      const mockAssignment = {
        collegeName,
        driveFolderId: firstCol.googleDriveFolderId || (college && college.googleDriveFolderId),
        active: true
      };

      return {
        assignment: mockAssignment,
        college: college || {
          _id: firstCol.collegeId || null,
          name: collegeName,
          latitude: 13.0827,
          longitude: 80.2707,
          geofenceRadius: 150000 // Flexible geofence
        }
      };
    }

    // 4. Fallback: Any college in DB or default fallback center
    const anyCollege = await College.findOne({ isArchived: { $ne: true } }).lean();
    const fallbackCollegeName = anyCollege ? anyCollege.name : 'MBK Training Center';

    const defaultAssignment = {
      collegeName: fallbackCollegeName,
      driveFolderId: trainer.collegeDriveFolderId || (anyCollege && anyCollege.googleDriveFolderId),
      active: true
    };

    return {
      assignment: defaultAssignment,
      college: anyCollege || {
        name: fallbackCollegeName,
        latitude: 13.0827,
        longitude: 80.2707,
        geofenceRadius: 150000
      }
    };
  } catch (error) {
    console.error('[TrainerAssignmentResolver] getActiveAssignment error:', error);
    return null;
  }
}

module.exports = {
  resolveTrainerDisplayName,
  syncTrainerAssignmentRecord,
  getActiveAssignment
};
