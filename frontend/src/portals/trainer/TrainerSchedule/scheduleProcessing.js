const DAY_IN_MS = 24 * 60 * 60 * 1000;

const ASSIGNED_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const SCHEDULE_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const resolveEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();

  if (typeof value === "object") {
    if (value._id) return String(value._id).trim();
    if (value.id) return String(value.id).trim();
    if (value.userId) return String(value.userId).trim();
    if (value.authUserId) return String(value.authUserId).trim();
    if (value.uid) return String(value.uid).trim();
  }

  return String(value).trim();
};

export const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const NON_ACTIONABLE_SCHEDULE_STATUSES = new Set(["cancelled", "completed"]);
const NON_ACTIONABLE_ATTENDANCE_SESSION_STATUSES = new Set(["cancelled", "canceled"]);

const getScheduleStatusToken = (schedule = {}) =>
  normalizeStatus(schedule.rawStatus || schedule.status);

const getAttendanceSessionStatusToken = (schedule = {}) =>
  normalizeStatus(
    schedule.attendancePresenceStatus
    || schedule.attendanceSessionStatus
    || schedule.attendanceLifecycleStatus
    || schedule.sessionStatus,
  );

export const isScheduleActionableForTrainerWorkflow = (schedule = {}) => {
  if (!schedule || typeof schedule !== "object") return false;
  if (schedule.isActionable === false) return false;
  if (schedule.isActive === false) return false;

  const scheduleStatusToken = getScheduleStatusToken(schedule);
  if (NON_ACTIONABLE_SCHEDULE_STATUSES.has(scheduleStatusToken)) return false;

  const attendanceSessionToken = getAttendanceSessionStatusToken(schedule);
  if (NON_ACTIONABLE_ATTENDANCE_SESSION_STATUSES.has(attendanceSessionToken)) return false;

  const resolvedScheduleId =
    resolveEntityId(schedule.id) || resolveEntityId(schedule._id) || resolveEntityId(schedule.scheduleId);
  if (!resolvedScheduleId) return false;

  const resolvedTrainerId = resolveEntityId(schedule.trainerId);
  const resolvedCollegeId = resolveEntityId(schedule.collegeId);
  const resolvedDayNumber = Number(schedule.dayNumber);

  if (!resolvedTrainerId || !resolvedCollegeId) return false;
  if (!Number.isFinite(resolvedDayNumber) || resolvedDayNumber <= 0) return false;

  return true;
};

const getStartOfDay = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

export const formatScheduleDateLabel = (value) => {
  if (!value) return "Unscheduled";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unscheduled";
  return SCHEDULE_DATE_FORMATTER.format(parsed);
};

export const getAssignedDateKey = (value) => {
  if (!value) return "";
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const parts = ASSIGNED_DATE_PARTS_FORMATTER.formatToParts(parsed);
  const year = parts.find((item) => item.type === "year")?.value;
  const month = parts.find((item) => item.type === "month")?.value;
  const day = parts.find((item) => item.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
};

export const getScheduleBadge = (schedule) => {
  const normalizedStatus = normalizeStatus(schedule.status);
  const normalizedAttendanceStatus = normalizeStatus(schedule.attendanceStatus);
  const normalizedGeoVerificationStatus = normalizeStatus(schedule.geoVerificationStatus);
  const normalizedFinalStatus = normalizeStatus(schedule.checkOut?.finalStatus || schedule.finalStatus);
  const normalizedDayStatus = normalizeStatus(schedule.dayStatus);
  const hasCompletedCheckOut = (
    normalizedFinalStatus === "completed"
    || (normalizedGeoVerificationStatus === "approved" && normalizedAttendanceStatus === "approved")
    || normalizedDayStatus === "completed"
  );

  if (schedule.status === "COMPLETED" || normalizedStatus === "completed" || hasCompletedCheckOut) {
    return { label: "Completed", className: "bg-green-100 text-green-800" };
  }

  if (normalizeStatus(schedule.attendanceStatus) === "rejected") {
    return { label: "Check-In Rejected", className: "bg-red-100 text-red-700" };
  }

  const hasCheckInEvidence = Boolean(
    schedule.checkInTime ||
    schedule.checkIn?.time ||
    schedule.checkInImage ||
    schedule.attendanceUploaded
  );
  if (
    normalizedAttendanceStatus === "pending" ||
    normalizeStatus(schedule.attendancePresenceStatus) === "pending" ||
    (hasCheckInEvidence && normalizedAttendanceStatus !== "approved" && normalizedAttendanceStatus !== "rejected" && !hasCompletedCheckOut)
  ) {
    return {
      label: "Check-In Pending Approval",
      className: "bg-amber-100 text-amber-800 border border-amber-200",
    };
  }

  if (schedule.geoValidationComment && normalizedGeoVerificationStatus !== "approved") {
    return { label: "Check-Out Pending", className: "bg-amber-100 text-amber-700" };
  }

  if (schedule.isLateRequest || schedule.attendance?.isLateRequest || schedule.attendance?.lateRequestStatus === "pending") {
    return { label: "Attendance Requested", className: "bg-indigo-100 text-indigo-800 border border-indigo-200" };
  }

  if (normalizedStatus === "inprogress") {
    return { label: "In Progress", className: "bg-yellow-100 text-yellow-800" };
  }

  if (normalizedStatus === "completed") {
    return {
      label: "Completed",
      className: "bg-blue-50 text-blue-700 border border-blue-100",
    };
  }

  if (normalizedStatus === "absent" || schedule.status === "absent") {
    return { label: "Absent", className: "bg-rose-100 text-rose-800 border border-rose-200" };
  }

  if (normalizedStatus === "rescheduled" || schedule.status === "RESCHEDULED" || (schedule.rescheduleReason && !isCompleted && !hasCompletedCheckOut)) {
    return { label: "Rescheduled", className: "bg-amber-100 text-amber-800 border border-amber-300" };
  }

  if (schedule.status === "scheduled" || normalizedStatus === "assigned") {
    return { label: "Scheduled", className: "bg-indigo-50 text-indigo-700" };
  }

  const fallbackStatus = String(schedule.status || "scheduled");
  return {
    label: fallbackStatus.charAt(0).toUpperCase() + fallbackStatus.slice(1).toLowerCase(),
    className: "bg-gray-100 text-gray-800",
  };
};

export const parseScheduleTime = (dateValue, timeStr) => {
  if (!dateValue || !timeStr) return null;
  const baseDate = new Date(dateValue);
  if (Number.isNaN(baseDate.getTime())) return null;

  let rawTime = String(timeStr).trim().toUpperCase();
  if (rawTime.includes("-")) {
    rawTime = rawTime.split("-")[0].trim();
  }

  const match = rawTime.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3];

  if (meridian === "PM" && hours < 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  const resultDate = new Date(baseDate);
  resultDate.setHours(hours, minutes, 0, 0);
  return resultDate;
};

export const parseScheduleEndTime = (dateValue, timeStr) => {
  if (!dateValue || !timeStr) return null;
  const baseDate = new Date(dateValue);
  if (Number.isNaN(baseDate.getTime())) return null;

  let rawTime = String(timeStr).trim().toUpperCase();
  if (rawTime.includes("-")) {
    const parts = rawTime.split("-");
    rawTime = parts[parts.length - 1].trim();
  }

  const match = rawTime.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3];

  if (meridian === "PM" && hours < 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  const resultDate = new Date(baseDate);
  resultDate.setHours(hours, minutes, 0, 0);
  return resultDate;
};

export const buildScheduleUiState = (schedule = {}, referenceDate = new Date()) => {
  const now = referenceDate || new Date();
  const today = getStartOfDay(now);
  const scheduleDateRaw = schedule.rawDate || schedule.scheduledDate;
  const scheduleDay = getStartOfDay(scheduleDateRaw);
  const firstDayOfCurrentMonth = today
    ? new Date(today.getFullYear(), today.getMonth(), 1)
    : null;
  const normalizedScheduleStatus = normalizeStatus(schedule.status);
  const normalizedAttendanceStatus = normalizeStatus(schedule.attendanceStatus);
  const normalizedGeoVerificationStatus = normalizeStatus(schedule.geoVerificationStatus);
  const normalizedFinalStatus = normalizeStatus(
    schedule.checkOut?.finalStatus || schedule.finalStatus,
  );
  const isAttendanceApproved = normalizedAttendanceStatus === "approved";
  const normalizedDayStatus = normalizeStatus(schedule.dayStatus);
  const hasPersistedCheckOutEvidence = Boolean(
    schedule.checkOut?.time
    || (Array.isArray(schedule.checkOut?.photos) && schedule.checkOut.photos.some((item) =>
      Boolean(String(item?.url || "").trim())))
    || (Array.isArray(schedule.checkOut?.images) && schedule.checkOut.images.some((item) =>
      Boolean(String(item?.image || "").trim())))
    || (Array.isArray(schedule.images) && schedule.images.some((item) =>
      Boolean(String(item?.image || "").trim()))),
  );
  const isAttendanceRejected = normalizedAttendanceStatus === "rejected";
  const hasCompletedCheckOut = (
    normalizedFinalStatus === "completed"
    || (normalizedGeoVerificationStatus === "approved" && normalizeStatus(schedule.attendanceStatus) === "approved")
    || normalizedDayStatus === "completed"
  );
  const isGeoPending = (
    Boolean(schedule.geoValidationComment) && normalizedGeoVerificationStatus !== "approved"
  ) || (
    hasPersistedCheckOutEvidence
    && normalizedFinalStatus === "pending"
    && normalizedGeoVerificationStatus !== "approved"
  ) || (
    normalizedDayStatus === "pending"
    && schedule.geoTagUploaded === true
    && normalizedGeoVerificationStatus !== "approved"
  );
  const isInProgress = normalizedScheduleStatus === "inprogress";
  const isCompleted = schedule.status === "COMPLETED"
    || normalizedScheduleStatus === "completed"
    || hasCompletedCheckOut;
  const isScheduleActionable = isScheduleActionableForTrainerWorkflow(schedule);
  const isFutureDate = Boolean(scheduleDay && today && scheduleDay > today);
  const isPastDate = Boolean(scheduleDay && today && scheduleDay < today);
  const isToday = Boolean(scheduleDay && today && scheduleDay.getTime() === today.getTime());

  // Time Window Calculations for Today's FN / AN Sessions
  const startTimeVal = schedule.startTime || (schedule.time ? String(schedule.time).split("-")[0].trim() : "09:00 AM");
  const endTimeVal = schedule.endTime || (schedule.time ? String(schedule.time).split("-")[1]?.trim() : "01:00 PM");

  const sessionStartObj = parseScheduleTime(scheduleDateRaw, startTimeVal);
  const sessionEndObj = parseScheduleEndTime(scheduleDateRaw, endTimeVal);

  const startHour = sessionStartObj ? sessionStartObj.getHours() : 9;
  const sessionLabel = startHour < 13 ? "FN Session" : "AN Session";

  // 1-hour check-in cutoff window (e.g. 9:00 AM -> cutoff at 10:00 AM)
  const checkInCutoffObj = sessionStartObj
    ? new Date(sessionStartObj.getTime() + 60 * 60 * 1000)
    : null;

  const isPastCutoffTime = isToday && checkInCutoffObj ? now > checkInCutoffObj : false;
  const isSessionClosedByTime = isToday && sessionEndObj ? now >= sessionEndObj : false;

  const diffDays = scheduleDay && today
    ? Math.floor((today.getTime() - scheduleDay.getTime()) / DAY_IN_MS)
    : Number.POSITIVE_INFINITY;
  const isWithinGracePeriod = Number.isFinite(diffDays) && diffDays >= 0 && diffDays <= 7;

  const hasCheckInEvidence = Boolean(
    schedule.checkInTime ||
    schedule.checkIn?.time ||
    schedule.checkInImage ||
    schedule.attendanceUploaded
  );
  const isCheckInPending = (
    !isCompleted &&
    !isAttendanceApproved &&
    !isAttendanceRejected &&
    (
      normalizedAttendanceStatus === "pending" ||
      normalizeStatus(schedule.attendancePresenceStatus) === "pending" ||
      hasCheckInEvidence
    )
  );

  let primaryAction = null;

  if (!isScheduleActionable) {
    primaryAction = null;
  } else if (schedule.isLateRequest || schedule.attendance?.isLateRequest || schedule.attendance?.lateRequestStatus === "pending") {
    primaryAction = {
      kind: "late-request-pending",
      label: "Attendance Requested (Pending Approval)",
      disabled: true,
    };
  } else if (isAttendanceRejected) {
    primaryAction = { kind: "checkin", label: "Re-Check In" };
  } else if (isCheckInPending) {
    primaryAction = {
      kind: "checkin-pending",
      label: "Check-In Submitted (Pending Approval)",
      disabled: true,
    };
  } else if (isGeoPending) {
    primaryAction = { kind: "checkout", label: "Re-Check Out" };
  } else if (isAttendanceApproved && !isCompleted) {
    primaryAction = hasCompletedCheckOut
      ? null
      : { kind: "checkout", label: "Check Out" };
  } else if (
    normalizedScheduleStatus === "scheduled" ||
    normalizedScheduleStatus === "rescheduled" ||
    normalizedScheduleStatus === "assigned"
  ) {
    if (isSessionClosedByTime && !isCompleted) {
      primaryAction = {
        kind: "expired-info",
        label: `Absent - ${sessionLabel} Closed (Time Passed)`,
      };
    } else if (isToday) {
      if (isPastCutoffTime) {
        primaryAction = {
          kind: "late-checkin",
          label: `Request Approval to Check-In (${sessionLabel})`,
          isLate: true,
        };
      } else {
        primaryAction = {
          kind: "checkin",
          label: `Check In (${sessionLabel})`,
        };
      }
    } else if (isWithinGracePeriod) {
      primaryAction = {
        kind: "checkin",
        label: isPastDate ? "Request Attendance" : "Check In",
        isLate: isPastDate,
      };
    } else if (isFutureDate) {
      primaryAction = {
        kind: "scheduled-info",
        label: `Scheduled for ${schedule.date}`,
      };
    } else {
      primaryAction = {
        kind: "expired-info",
        label: "Absent - Session Expired (Beyond 7 days)",
      };
    }
  } else if (isInProgress) {
    primaryAction = {
      kind: "checkout",
      label: schedule.geoValidationComment ? "Re-Check Out" : "Check Out",
    };
  }

  return {
    badge: getScheduleBadge(schedule),
    isAttendanceRejected,
    isGeoPending,
    isInProgress,
    isCompleted,
    isScheduleActionable,
    isFutureDate,
    isPastDate,
    isWithinGracePeriod,
    isCheckInPending,
    isBeforeCurrentMonth: Boolean(
      scheduleDay && firstDayOfCurrentMonth && scheduleDay < firstDayOfCurrentMonth,
    ),
    showPastScheduleIndicator: isPastDate && !isCompleted && !isCheckInPending && isScheduleActionable,
    shouldShowCompletedText:
      normalizedScheduleStatus === "completed"
      && !isAttendanceRejected
      && !schedule.geoValidationComment,
    primaryAction,
  };
};

export const decorateScheduleForRender = (schedule = {}, referenceDate = new Date()) => ({
  ...schedule,
  ui: buildScheduleUiState(schedule, referenceDate),
});

export const transformScheduleRecord = (
  schedule = {},
  {
    currentTrainerId = "",
    normalizeStatusValue = false,
    referenceDate = new Date(),
  } = {},
) => {
  const statusValue = schedule.status || "scheduled";

  return decorateScheduleForRender(
    {
      id: schedule._id || schedule.id,
      company: schedule.company?.name || "",
      course: schedule.course?.name || "",
      trainerId: resolveEntityId(schedule.trainerId),
      collegeId: resolveEntityId(schedule.collegeId),
      courseId: resolveEntityId(schedule.courseId),
      college: schedule.collegeId?.name || "",
      dayNumber: schedule.dayNumber,
      date: formatScheduleDateLabel(schedule.scheduledDate),
      time: schedule.startTime && schedule.endTime
        ? `${schedule.startTime} - ${schedule.endTime}`
        : "Time not set",
      status: normalizeStatusValue ? normalizeStatus(statusValue) : statusValue,
      rawStatus: statusValue,
      isActive: schedule.isActive !== false,
      rawDate: schedule.scheduledDate,
      assignedDate: schedule.assignedDate || getAssignedDateKey(schedule.scheduledDate),
      images: Array.isArray(schedule.images) ? schedule.images : [],
      finalStatus: schedule.finalStatus || null,
      attendanceStatus: schedule.attendanceStatus || null,
      attendancePresenceStatus: schedule.attendancePresenceStatus || schedule.attendanceSessionStatus || null,
      geoVerificationStatus: schedule.geoVerificationStatus || null,
      verificationComment: schedule.verificationComment || null,
      geoValidationComment: schedule.geoValidationComment || null,
      checkIn: schedule.checkIn || null,
      checkInTime: schedule.checkInTime || schedule.checkIn?.time || null,
      checkInImage: schedule.checkInImage || schedule.checkIn?.photo || null,
      attendancePdfUrl: schedule.attendancePdfUrl || null,
      checkOut: schedule.checkOut || null,
      dayStatus: schedule.dayStatus || null,
      dayStatusLabel: schedule.dayStatusLabel || null,
      attendanceUploaded: schedule.attendanceUploaded ?? null,
      geoTagUploaded: schedule.geoTagUploaded ?? null,
      rescheduleReason: schedule.rescheduleReason || null,
      subject: schedule.subject || "",
    },
    referenceDate,
  );
};

export const transformScheduleRecords = (schedules = [], options = {}) =>
  schedules.map((schedule) => transformScheduleRecord(schedule, options));

export const buildPendingSchedules = (schedules = [], options = {}) =>
  transformScheduleRecords(schedules, {
    ...options,
    normalizeStatusValue: true,
  }).filter((schedule) => {
    if (!isScheduleActionableForTrainerWorkflow(schedule)) return false;

    const isCancelled = schedule.rawStatus === "cancelled" || schedule.status === "cancelled";
    const isCompleted = schedule.rawStatus === "completed" || schedule.rawStatus === "COMPLETED";

    if (isCancelled || isCompleted) return false;

    const attendanceStatusToken = normalizeStatus(schedule.attendanceStatus);
    const geoStatusToken = normalizeStatus(schedule.geoVerificationStatus);
    const finalStatusToken = normalizeStatus(schedule.finalStatus || schedule.checkOut?.finalStatus);
    const isCompletedByAttendanceState = attendanceStatusToken === "approved"
      && (geoStatusToken === "approved" || finalStatusToken === "completed");

    if (isCompletedByAttendanceState) return false;

    const needsAction = (schedule.status === "scheduled"
      || schedule.ui.isInProgress
      || schedule.ui.isAttendanceRejected
      || schedule.ui.isGeoPending);

    return schedule.ui.isBeforeCurrentMonth && needsAction;
  });

export const prepareCollegeStudents = (students = []) => {
  const sortedStudents = [...students].sort((firstStudent, secondStudent) => {
    const firstRoll = parseInt(firstStudent.rollNo, 10) || 0;
    const secondRoll = parseInt(secondStudent.rollNo, 10) || 0;
    return firstRoll - secondRoll;
  });

  const attendance = {};
  sortedStudents.forEach((student) => {
    attendance[student._id] = true;
  });

  return {
    students: sortedStudents,
    attendance,
    counts: {
      present: sortedStudents.length,
      absent: 0,
    },
  };
};
