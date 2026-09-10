import scheduleService from "@/services/scheduleService";
import { api } from "@/services/api";

const DASHBOARD_SCHEDULE_SUMMARY_TTL_MS = 45_000;
const trainerScheduleSummaryCache = new Map();
const trainerScheduleSummaryInFlight = new Map();

const canUseSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export const normalizeTrainerId = (trainerId) => {
  if (!trainerId) return "";
  if (typeof trainerId === "string" || typeof trainerId === "number") {
    return String(trainerId).trim();
  }
  if (typeof trainerId === "object") {
    return String(
      trainerId._id ||
      trainerId.id ||
      trainerId.trainerId ||
      trainerId.userId?.id ||
      trainerId.userId?._id ||
      "",
    ).trim();
  }
  return String(trainerId).trim();
};

const getTrainerSummaryCacheKey = (trainerId) => normalizeTrainerId(trainerId);

export const buildScheduleItem = (schedule = {}) => {
  const collegeName = (() => {
    const raw =
      (typeof schedule?.collegeId === "object" ? schedule?.collegeId?.name : null) ||
      (typeof schedule?.college === "object" ? schedule?.college?.name : null) ||
      schedule?.collegeName ||
      (typeof schedule?.college === "string" ? schedule.college : null);
    if (!raw) return "Assigned College";
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") return raw.name || raw.title || "Assigned College";
    return String(raw);
  })();

  const courseName = (() => {
    const raw =
      (typeof schedule?.courseId === "object" ? schedule?.courseId?.name || schedule?.courseId?.title : null) ||
      (typeof schedule?.course === "object" ? schedule?.course?.name || schedule?.course?.title : null) ||
      schedule?.courseName ||
      (typeof schedule?.course === "string" && schedule.course !== "Unknown Course" ? schedule.course : null);
    if (!raw) return "Embedded System & IoT";
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") return raw.name || raw.title || "Embedded System & IoT";
    return String(raw);
  })();

  const collegeLocation = (() => {
    const raw =
      (typeof schedule?.collegeId === "object" ? schedule?.collegeId?.location || schedule?.collegeId?.address : null) ||
      schedule?.collegeLocation ||
      schedule?.location ||
      schedule?.address;

    if (!raw) return "College Campus Location";
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") {
      if (typeof raw.address === "string" && raw.address.trim()) return raw.address.trim();
      if (typeof raw.name === "string" && raw.name.trim()) return raw.name.trim();
      if (raw.lat != null && raw.lng != null) return `${raw.lat}, ${raw.lng}`;
      return "College Campus Location";
    }
    return String(raw);
  })();

  const startTime = schedule?.startTime || (schedule?.time ? String(schedule.time).split("-")[0].trim() : "09:00 AM");
  const endTime = schedule?.endTime || (schedule?.time ? String(schedule.time).split("-")[1]?.trim() : "01:00 PM");

  const startHourMatch = String(startTime).match(/(\d+)/);
  const startHour = startHourMatch ? parseInt(startHourMatch[1], 10) : 9;
  const isPM = String(startTime).toUpperCase().includes("PM") && startHour !== 12;
  const hour24 = isPM ? startHour + 12 : startHour;
  const sessionType = hour24 < 13 ? "FN Session" : "AN Session";

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedDateObj = schedule?.scheduledDate ? new Date(schedule.scheduledDate) : null;
  const isValidSchedDate = Boolean(schedDateObj && !isNaN(schedDateObj.getTime()));
  const schedDayTime = isValidSchedDate ? new Date(schedDateObj).setHours(0, 0, 0, 0) : null;

  let isTimeOut = false;
  if (schedDayTime && schedDayTime < today.getTime()) {
    isTimeOut = true;
  } else if (schedDayTime && schedDayTime === today.getTime()) {
    const endMatch = String(endTime).match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (endMatch) {
      let endH = parseInt(endMatch[1], 10);
      const endM = parseInt(endMatch[2], 10) || 0;
      const endP = (endMatch[3] || "").toUpperCase();
      if (endP === "PM" && endH < 12) endH += 12;
      if (endP === "AM" && endH === 12) endH = 0;
      const endObj = new Date(today);
      endObj.setHours(endH, endM, 0, 0);
      if (now >= endObj) {
        isTimeOut = true;
      }
    }
  }

  const att = schedule?.attendance || schedule?.attendanceRecord || {};
  const lateRequestStatus = schedule?.lateRequestStatus || att?.lateRequestStatus;
  const verificationStatus = schedule?.verificationStatus || att?.verificationStatus;
  const isLateRequest = Boolean(schedule?.isLateRequest || att?.isLateRequest);
  const hasUploadedImage = Boolean(
    schedule?.imageUrl || schedule?.checkInImage ||
    att?.imageUrl || att?.checkInImage
  );

  const rawStatus = String(schedule?.attendanceStatus || schedule?.status || att?.status || att?.attendanceStatus || "").trim().toLowerCase();
  const isClockedOutOrPresent = Boolean(
    rawStatus === "approved" ||
    rawStatus === "completed" ||
    rawStatus === "present" ||
    schedule?.checkInTime ||
    schedule?.checkOutTime ||
    att?.checkInTime ||
    att?.checkOutTime ||
    att?.checkOut?.time ||
    att?.status === "Present"
  );

  let computedStatus = isLateRequest || lateRequestStatus === "pending"
    ? "pending"
    : isClockedOutOrPresent
    ? "completed"
    : isTimeOut
    ? "timeout"
    : schedule?.attendanceStatus || schedule?.status || "scheduled";

  const dateLabel = (() => {
    if (!isValidSchedDate) return "Unscheduled";
    try {
      return schedDateObj.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unscheduled";
    }
  })();

  return {
    id: schedule?._id || schedule?.id,
    college: collegeName,
    course: courseName,
    collegeLocation,
    startTime,
    endTime,
    sessionType,
    isTimeOut,
    timingLabel: `${startTime} - ${endTime} (${sessionType})`,
    dateLabel,
    rawDate: schedule?.scheduledDate,
    dayNumber: schedule?.dayNumber || "1",
    status: computedStatus,
    lateRequestStatus,
    verificationStatus,
    isLateRequest,
    hasUploadedImage,
  };
};

export const buildTrainerDashboardSnapshotKey = (trainerId) => {
  const normalizedTrainerId = normalizeTrainerId(trainerId);
  if (!normalizedTrainerId) return "";
  return `trainer-dashboard:v2:${normalizedTrainerId}`;
};

export const clearTrainerDashboardScheduleSummaryCache = (trainerId) => {
  const cacheKey = normalizeTrainerId(trainerId);
  if (!cacheKey) return;
  trainerScheduleSummaryCache.delete(cacheKey);
};

export const clearTrainerDashboardSnapshot = (trainerId) => {
  const normalizedTrainerId = normalizeTrainerId(trainerId);
  if (!normalizedTrainerId || !canUseSessionStorage()) return;

  const snapshotKey = buildTrainerDashboardSnapshotKey(normalizedTrainerId);
  window.sessionStorage.removeItem(snapshotKey);
};

export const signalTrainerDashboardRefresh = (trainerId) => {
  const normalizedTrainerId = normalizeTrainerId(trainerId);
  if (!normalizedTrainerId) return;

  const refreshKey = `trainer-dashboard:refresh:${normalizedTrainerId}`;
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  window.localStorage.setItem(refreshKey, String(Date.now()));
};

export const getStatusMeta = (status = "") => {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "approved" || normalized === "completed" || normalized === "present") {
    return {
      label: "Present",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold",
    };
  }

  if (normalized === "pending") {
    return {
      label: "Awaiting Admin Approval",
      className: "bg-amber-50 text-amber-800 border border-amber-200 font-bold",
    };
  }

  if (normalized === "rejected") {
    return {
      label: "Rejected",
      className: "bg-rose-50 text-rose-700 border border-rose-200",
    };
  }

  if (normalized === "inprogress") {
    return {
      label: "In Progress",
      className: "bg-sky-50 text-sky-700 border border-sky-200",
    };
  }

  if (normalized === "timeout" || normalized === "expired" || normalized === "closed" || normalized === "absent") {
    return {
      label: "Absent",
      className: "bg-rose-50 text-rose-700 border border-rose-200 font-bold",
    };
  }

  return {
    label: "Scheduled",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  };
};

export const getBadgeClasses = (type) => {
  const normalizedType = String(type || "").toLowerCase();
  if (normalizedType === "attendance") return "bg-blue-50 text-blue-700 border-blue-200";
  if (normalizedType === "schedule") return "bg-amber-50 text-amber-700 border-amber-200";
  if (normalizedType === "salary") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalizedType === "complaints" || normalizedType === "complaint") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (normalizedType === "chat" || normalizedType === "announcement") {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }
  if (normalizedType === "approval") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
};

export const formatTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

/**
 * Merge schedules with attendance records so the dashboard shows correct statuses.
 * - If admin approved → "present"
 * - If trainer uploaded (pending admin review) → "pending"
 * - If no upload / no attendance record → "absent" (show Request button)
 */
const toYMD = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export const buildTrainerDashboardScheduleSummary = (
  currentSchedules = [],
  previousSchedules = [],
  attendanceRecords = [],
) => {
  const mergedSchedules = new Map();

  [...previousSchedules, ...currentSchedules].forEach((schedule) => {
    mergedSchedules.set(schedule?._id || schedule?.id, schedule);
  });

  const allSchedules = Array.from(mergedSchedules.values());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextItems = [];
  const recentItems = [];
  let completedCount = 0;
  let pendingCount = 0;
  const uniqueColleges = new Set();

  allSchedules.forEach((schedule) => {
    const scheduleDate = new Date(schedule?.scheduledDate);
    scheduleDate.setHours(0, 0, 0, 0);
    const schedYMD = toYMD(schedule?.scheduledDate);
    const sId = String(schedule?._id || schedule?.id || "");

    // Find matching attendance record for this schedule
    const matchingAtt = attendanceRecords.find((r) => {
      const rSchedId = String(
        (typeof r.scheduleId === "object" ? r.scheduleId?._id : r.scheduleId) || ""
      );
      if (sId && rSchedId && sId === rSchedId) return true;
      const rYMD = toYMD(r.date || r.assignedDate || r.checkInTime || r.createdAt);
      const rDay = Number(r.dayNumber || 1);
      const sDay = Number(schedule?.dayNumber || 1);
      return rYMD === schedYMD && rDay === sDay;
    });

    const collegeKey =
      schedule?.collegeId?._id ||
      schedule?.college?._id ||
      schedule?.collegeId?.id ||
      schedule?.college?.id ||
      schedule?.collegeId?.name ||
      schedule?.college?.name;

    if (collegeKey) {
      uniqueColleges.add(collegeKey);
    }

    // Determine real status from attendance record
    let resolvedStatus;
    let resolvedLateRequestStatus;
    let resolvedVerificationStatus;
    let resolvedIsLateRequest = false;
    let hasUploadedImage = false;

    if (matchingAtt) {
      const lateReqNorm = String(matchingAtt.lateRequestStatus || "").toLowerCase();
      const verifNorm = String(matchingAtt.verificationStatus || "").toLowerCase();
      const statusNorm = String(matchingAtt.status || matchingAtt.attendanceStatus || "").toLowerCase();

      resolvedLateRequestStatus = matchingAtt.lateRequestStatus;
      resolvedVerificationStatus = matchingAtt.verificationStatus;
      resolvedIsLateRequest = Boolean(matchingAtt.isLateRequest);
      hasUploadedImage = Boolean(
        matchingAtt.imageUrl || matchingAtt.checkInImage ||
        matchingAtt.checkInTime || matchingAtt.checkIn?.time
      );

      // Status priority: approved > pending upload > absent
      if (lateReqNorm === "approved" || verifNorm === "approved" || statusNorm === "present") {
        resolvedStatus = "completed"; // present/approved
      } else if (
        lateReqNorm === "pending" ||
        (matchingAtt.isLateRequest && lateReqNorm !== "rejected") ||
        (verifNorm === "pending" && hasUploadedImage)
      ) {
        resolvedStatus = "pending"; // uploaded, awaiting approval
      } else if (hasUploadedImage) {
        resolvedStatus = "pending"; // has check-in image = pending review
      } else {
        resolvedStatus = "timeout"; // no upload = absent
      }
    } else {
      // No attendance record: use schedule-derived status
      const formatted = buildScheduleItem(schedule);
      resolvedStatus = formatted.status;
      resolvedLateRequestStatus = formatted.lateRequestStatus;
      resolvedVerificationStatus = formatted.verificationStatus;
      resolvedIsLateRequest = formatted.isLateRequest;
      hasUploadedImage = false;
    }

    const formatted = buildScheduleItem(schedule);
    const item = {
      ...formatted,
      status: resolvedStatus,
      lateRequestStatus: resolvedLateRequestStatus,
      verificationStatus: resolvedVerificationStatus,
      isLateRequest: resolvedIsLateRequest,
      hasUploadedImage,
      hasAttendanceRecord: Boolean(matchingAtt),
      attendanceId: matchingAtt?._id || matchingAtt?.id,
    };

    const isCompletedOrClosed =
      resolvedStatus === "completed" ||
      resolvedStatus === "pending" || // pending approval = past session
      String(schedule?.attendanceStatus || schedule?.status || "").toLowerCase() === "present";

    if (scheduleDate > today || (scheduleDate.getTime() === today.getTime() && !item.isTimeOut && !isCompletedOrClosed)) {
      nextItems.push(item);
    } else {
      recentItems.push(item);
    }

    if (resolvedStatus === "completed") {
      completedCount += 1;
    } else if (resolvedStatus === "pending") {
      pendingCount += 1;
    }
  });

  nextItems.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
  recentItems.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

  return {
    upcomingSchedules: nextItems,
    recentActivities: recentItems.slice(0, 5),
    stats: {
      upcoming: nextItems.length,
      completed: completedCount,
      pending: pendingCount,
      colleges: uniqueColleges.size,
    },
  };
};

export const fetchTrainerDashboardScheduleSummary = async (trainerId) => {
  if (!trainerId) {
    return null;
  }

  const cacheKey = getTrainerSummaryCacheKey(trainerId);
  const cachedEntry = trainerScheduleSummaryCache.get(cacheKey);
  if (cachedEntry?.expiresAt > Date.now()) {
    return cachedEntry.data;
  }

  if (trainerScheduleSummaryInFlight.has(cacheKey)) {
    return trainerScheduleSummaryInFlight.get(cacheKey);
  }

  const task = (async () => {
    const currentDate = new Date();
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);

    // Fetch schedules AND attendance records in parallel for accurate status
    const [currentRes, previousRes, attendanceRes] = await Promise.all([
      scheduleService.getTrainerSchedule(trainerId, {
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      }),
      scheduleService.getTrainerSchedule(trainerId, {
        month: previousDate.getMonth() + 1,
        year: previousDate.getFullYear(),
      }),
      api.get(`/attendance/trainer/${trainerId}`).catch(() => null),
    ]);

    const extractArray = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.data?.data)) return raw.data.data;
      if (Array.isArray(raw.schedules)) return raw.schedules;
      return [];
    };

    const attendanceRecords = extractArray(attendanceRes);

    const summary = buildTrainerDashboardScheduleSummary(
      currentRes?.data || [],
      previousRes?.data || [],
      attendanceRecords,
    );

    trainerScheduleSummaryCache.set(cacheKey, {
      data: summary,
      expiresAt: Date.now() + DASHBOARD_SCHEDULE_SUMMARY_TTL_MS,
    });

    return summary;
  })();

  trainerScheduleSummaryInFlight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    trainerScheduleSummaryInFlight.delete(cacheKey);
  }
};
