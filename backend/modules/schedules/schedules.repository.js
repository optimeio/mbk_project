const mongoose = require("mongoose");
const {
  Attendance,
  College,
  Company,
  Course,
  Department,
  ActivityLog,
  Notification,
  Schedule,
  Trainer,
  User,
} = require("../../models");

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeCompanyCode = (value) =>
  String(value || "").trim().toUpperCase();

const findScopedCompanyIdentifiersByUser = async (user) => {
  if (!user) {
    return {
      scopedCompanyIds: [],
      scopedCompanyCodes: [],
    };
  }

  const scopedCompanyIds = new Set();
  const scopedCompanyCodes = new Set();

  const userId = user?._id || user?.id || user?.userId || null;

  if (user?.companyId) {
    scopedCompanyIds.add(String(user.companyId));
  }

  if (Array.isArray(user?.companyIds)) {
    user.companyIds.forEach((companyId) => {
      if (companyId) scopedCompanyIds.add(String(companyId));
    });
  }

  if (user?.companyCode) {
    scopedCompanyCodes.add(normalizeCompanyCode(user.companyCode));
  }

  if (Array.isArray(user?.companyCodes)) {
    user.companyCodes.forEach((companyCode) => {
      if (companyCode) scopedCompanyCodes.add(normalizeCompanyCode(companyCode));
    });
  }

  if ((!scopedCompanyIds.size && !scopedCompanyCodes.size) && userId) {
    const linkedCompanies = await Company.find({
      $or: [
        { adminId: userId },
        { userId: userId },
      ],
    })
      .select("_id companyCode")
      .lean();

    linkedCompanies.forEach((company) => {
      if (company?._id) scopedCompanyIds.add(String(company._id));
      if (company?.companyCode) scopedCompanyCodes.add(normalizeCompanyCode(company.companyCode));
    });
  }

  return {
    scopedCompanyIds: [...scopedCompanyIds],
    scopedCompanyCodes: [...scopedCompanyCodes],
  };
};

const buildSchedulesListQuery = (filter = {}) =>
  Schedule.find({ ...filter, isActive: { $ne: false } })
    .populate("collegeId", "name location")
    .populate("companyId", "name")
    .populate("courseId", "title")
    .populate({
      path: "trainerId",
      select: "trainerId specialization",
      populate: { path: "userId", select: "name email phone" },
    })
    .populate("createdBy", "name")
    .sort({ scheduledDate: 1, startTime: 1 });

const listSchedules = async ({
  filter = {},
  shouldPaginate = false,
  page = 1,
  limit = null,
}) => {
  const schedulesQuery = buildSchedulesListQuery(filter);

  if (shouldPaginate && Number.isFinite(limit) && limit > 0) {
    schedulesQuery.skip((page - 1) * limit).limit(limit);
  }

  const schedules = await schedulesQuery.lean();
  const total = shouldPaginate
    ? await Schedule.countDocuments(filter)
    : schedules.length;

  return {
    schedules,
    total,
  };
};

const listLiveDashboardSchedules = async ({ filter = {} } = {}) =>
  Schedule.find(filter)
    .populate("collegeId", "name location")
    .populate("companyId", "name")
    .populate("courseId", "title")
    .populate({
      path: "trainerId",
      select: "trainerId specialization",
      populate: { path: "userId", select: "name email phone" },
    })
    .sort({ startTime: 1 })
    .lean();

const listLatestAttendanceByScheduleIds = async ({ scheduleIds = [] } = {}) => {
  if (!Array.isArray(scheduleIds) || !scheduleIds.length) {
    return [];
  }

  return Attendance.find({ scheduleId: { $in: scheduleIds } })
    .select(
      "scheduleId status checkInTime checkOutTime location geoVerificationStatus verificationStatus updatedAt createdAt",
    )
    .sort({ scheduleId: 1, createdAt: -1 })
    .lean();
};

const listDepartmentSchedules = async ({ departmentId }) =>
  Schedule.find({ departmentId, isActive: true })
    .sort({ dayNumber: 1, scheduledDate: 1, createdAt: 1 })
    .populate({
      path: "trainerId",
      select: "trainerId phone profilePicture",
      populate: { path: "userId", select: "name email profilePicture" },
    });

const listDepartmentAttendanceDocs = async ({ scheduleIds = [] } = {}) => {
  if (!Array.isArray(scheduleIds) || !scheduleIds.length) {
    return [];
  }

  return Attendance.find({ scheduleId: { $in: scheduleIds } })
    .sort({ createdAt: -1 })
    .select(
      "scheduleId status verificationStatus geoVerificationStatus approvedBy latitude longitude studentsPresent studentsAbsent checkInTime checkOutTime attendancePdfUrl attendanceExcelUrl studentsPhotoUrl signatureUrl checkOutGeoImageUrl checkOutGeoImageUrls activityPhotos activityVideos",
    );
};

const listTrainerSchedules = async ({ filter = {} } = {}) => {
  let queryFilter = { ...filter, isActive: { $ne: false } };

  if (filter.trainerId) {
    const rawIds = Array.isArray(filter.trainerId?.$in)
      ? filter.trainerId.$in
      : [filter.trainerId];

    const validObjectIds = rawIds
      .map((id) => String(id || "").trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validObjectIds.length > 0) {
      queryFilter.trainerId = { $in: validObjectIds };
    } else {
      return [];
    }
  }

  return Schedule.find(queryFilter)
    .populate("collegeId", "name principalName phone")
    .populate("companyId", "name")
    .populate("courseId", "title")
    .populate("trainerId", "id")
    .sort({ scheduledDate: 1, startTime: 1 })
    .lean();
};

const listTrainerAttendanceDocs = async ({ scheduleIds = [] } = {}) => {
  if (!Array.isArray(scheduleIds) || !scheduleIds.length) {
    return [];
  }

  return Attendance.find({ scheduleId: { $in: scheduleIds } })
    .select(
      "scheduleId assignedDate date images finalStatus verificationStatus geoVerificationStatus verificationComment geoValidationComment checkIn checkInTime checkInImage checkInPhoto checkOut status createdAt attendancePdfUrl attendanceExcelUrl studentsPhotoUrl signatureUrl checkOutGeoImageUrl checkOutGeoImageUrls activityPhotos activityVideos driveAssets isLateRequest lateRequestStatus lateRequestReason attendanceStatus",
    )
    .sort({ scheduleId: 1, createdAt: -1 })
    .lean();
};

const getScheduleByIdForAssignment = async ({ scheduleId } = {}) =>
  Schedule.findById(scheduleId);

const getScheduleByIdForUpdate = async ({ scheduleId } = {}) =>
  Schedule.findById(scheduleId);

const getScheduleByIdForDelete = async ({ scheduleId } = {}) =>
  Schedule.findById(scheduleId);

const createScheduleDocument = async ({ schedulePayload } = {}) =>
  Schedule.create(schedulePayload);

const findDuplicateSchedule = async ({ collegeId, trainerId, dayNumber, scheduledDate, session } = {}) => {
  if (!collegeId || !trainerId) return null;
  const mongoose = require("mongoose");
  if (!mongoose.Types.ObjectId.isValid(collegeId) || !mongoose.Types.ObjectId.isValid(trainerId)) {
    return null;
  }

  const query = {
    collegeId,
    trainerId,
    dayNumber: Number(dayNumber) || 1,
    status: { $nin: ["cancelled", "CANCELLED"] },
    isActive: { $ne: false },
  };

  if (session) {
    query.session = session;
  }

  if (scheduledDate) {
    const d = new Date(scheduledDate);
    if (!isNaN(d.getTime())) {
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      query.$or = [
        { scheduledDate: { $gte: startOfDay, $lte: endOfDay } },
        { date: { $gte: startOfDay, $lte: endOfDay } },
      ];
    }
  }
  return Schedule.findOne(query);
};

const saveScheduleDocument = async ({ schedule }) => schedule.save();

const deleteScheduleDocument = async ({ schedule }) => schedule.deleteOne();

const getTrainerByIdWithUser = async ({ trainerId } = {}) =>
  Trainer.findById(trainerId).populate("userId");

const getCollegeById = async ({ collegeId } = {}) =>
  College.findById(collegeId);

const getCourseById = async ({ courseId } = {}) =>
  Course.findById(courseId);

const getUserById = async ({ userId } = {}) =>
  User.findById(userId);

const getScheduleById = async ({ scheduleId } = {}) =>
  Schedule.findById(scheduleId)
    .populate("collegeId")
    .populate("companyId")
    .populate("courseId")
    .populate("trainerId")
    .populate("createdBy", "id name email");

const listAssociationsCompanies = async () =>
  Company.find({ isActive: true })
    .select("_id name")
    .sort({ name: 1 });

const listAssociationsCourses = async () =>
  Course.find({})
    .select("_id title companyId colleges")
    .sort({ title: 1 });

const listAssociationsColleges = async () =>
  College.find({})
    .select("_id name companyId courseId department")
    .sort({ name: 1 });

const listAssociationsTrainers = async () =>
  Trainer.find({
    $or: [
      { status: { $in: ["APPROVED", "approved", "ACTIVE", "active", "Active", "Verified", "verified"] } },
      { verificationStatus: { $in: ["APPROVED", "VERIFIED", "approved", "verified", "Active", "active"] } },
      { registrationStatus: { $in: ["approved", "APPROVED", "verified", "VERIFIED", "active", "ACTIVE"] } },
      { isApproved: true },
      { isVerified: true },
      { status: { $exists: false } },
    ],
    status: { $ne: "REJECTED" },
  })
    .select("_id name firstName lastName email phone mobile trainerId companyId companyCode userId status verificationStatus registrationStatus")
    .populate("userId", "name firstName lastName email phoneNumber companyId isActive")
    .sort({ firstName: 1 });

const listAssociationsDepartments = async () =>
  Department.find({ isActive: { $ne: false } })
    .select("_id name companyId courseId collegeId")
    .sort({ name: 1 });

const listCollegesByIds = async ({ collegeIds = [] } = {}) =>
  College.find({ _id: { $in: collegeIds } });

const listExistingDaySlotSchedules = async ({
  collegeIds = [],
  departmentIds = [],
  dayNumbers = [],
} = {}) =>
  Schedule.find({
    collegeId: { $in: collegeIds },
    departmentId: { $in: departmentIds },
    dayNumber: { $in: dayNumbers },
    isActive: { $ne: false },
  }).select(
    "_id trainerId collegeId departmentId dayNumber scheduledDate dayFolderId dayFolderName dayFolderLink attendanceFolderId attendanceFolderName attendanceFolderLink geoTagFolderId geoTagFolderName geoTagFolderLink driveFolderId driveFolderName driveFolderLink",
  );

const insertManySchedules = async ({ schedules = [] } = {}) =>
  Schedule.insertMany(schedules);

const bulkWriteSchedules = async ({ operations = [] } = {}) =>
  Schedule.bulkWrite(operations, { ordered: false });

const listSchedulesByIds = async ({ scheduleIds = [] } = {}) =>
  Schedule.find({ _id: { $in: scheduleIds } });

const insertAssociationsDepartments = async ({ departments = [] } = {}) =>
  Department.insertMany(departments, { ordered: false });

const findCompanyByNameCaseInsensitive = async ({ companyName } = {}) =>
  Company.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(companyName)}$`, "i") },
  });

const createCompanyDocument = async ({ payload = {} } = {}) =>
  Company.create(payload);

const saveCompanyDocument = async ({ company }) =>
  company.save();

const findCourseByTitleAndCompany = async ({ courseTitle, companyId } = {}) =>
  Course.findOne({
    title: { $regex: new RegExp(`^${escapeRegex(courseTitle)}$`, "i") },
    companyId,
  });

const createCourseDocument = async ({ payload = {} } = {}) =>
  Course.create(payload);

const findCollegeByNameAndCourse = async ({ collegeName, courseId } = {}) =>
  College.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(collegeName)}$`, "i") },
    courseId,
  });

const createCollegeDocument = async ({ payload = {} } = {}) =>
  College.create(payload);

const findTrainerByCustomIdWithUser = async ({ trainerCustomId } = {}) =>
  Trainer.findOne({
    trainerId: { $regex: new RegExp(`^${escapeRegex(trainerCustomId)}$`, "i") },
  }).populate("userId");

const createUserDocument = async ({ payload = {} } = {}) =>
  User.create(payload);

const createTrainerDocument = async ({ payload = {} } = {}) =>
  Trainer.create(payload);

const findApprovedAttendanceByCollegeAndDateRange = async ({
  collegeId,
  startDate,
  endDate,
} = {}) =>
  Attendance.findOne({
    collegeId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
    verificationStatus: "approved",
  });

const findScheduleByCollegeCourseAndDateRange = async ({
  collegeId,
  courseId,
  startDate,
  endDate,
} = {}) =>
  Schedule.findOne({
    collegeId,
    courseId,
    scheduledDate: {
      $gte: startDate,
      $lte: endDate,
    },
  });

const findLastScheduleByCollege = async ({ collegeId } = {}) =>
  Schedule.findOne({ collegeId }).sort({ dayNumber: -1 });

const createScheduleInstance = async ({ payload = {} } = {}) =>
  new Schedule(payload);

const createNotificationDocument = async ({ payload = {} } = {}) =>
  Notification.create(payload);

const createActivityLogDocument = async ({ payload = {} } = {}) =>
  ActivityLog.create(payload);

const updateAttendanceStatusByScheduleId = async ({ scheduleId, status } = {}) =>
  Attendance.updateMany({ scheduleId }, { $set: { status } });

const resolveTrainerScheduleFilterContext = async ({ trainerIdentifier } = {}) => {
  const normalizedIdentifier = String(trainerIdentifier || "").trim();
  if (!normalizedIdentifier) {
    return {
      cacheTrainerId: "",
      filterTrainerIds: [],
    };
  }

  // Build lookup filters for MongoDB query against Trainer collection
  const trainerLookupFilters = [
    { email: { $regex: new RegExp(`^${escapeRegex(normalizedIdentifier)}$`, "i") } },
    { trainerId: { $regex: new RegExp(`^${escapeRegex(normalizedIdentifier)}$`, "i") } },
  ];
  if (mongoose.Types.ObjectId.isValid(normalizedIdentifier)) {
    trainerLookupFilters.push({ _id: normalizedIdentifier }, { userId: normalizedIdentifier });
  }

  const trainerDocs = await Trainer.find({ $or: trainerLookupFilters }).select("_id userId").lean();

  const resolvedIds = [];
  trainerDocs.forEach((doc) => {
    if (doc?._id) resolvedIds.push(String(doc._id));
    if (doc?.userId) resolvedIds.push(String(doc.userId?._id || doc.userId));
  });

  if (mongoose.Types.ObjectId.isValid(normalizedIdentifier)) {
    resolvedIds.push(normalizedIdentifier);
  }

  const uniqueObjectIds = Array.from(new Set(resolvedIds))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  return {
    cacheTrainerId: uniqueObjectIds[0] || normalizedIdentifier,
    filterTrainerIds: uniqueObjectIds,
  };
};

module.exports = {
  findScopedCompanyIdentifiersByUser,
  listSchedules,
  listLiveDashboardSchedules,
  listLatestAttendanceByScheduleIds,
  listDepartmentSchedules,
  listDepartmentAttendanceDocs,
  listTrainerSchedules,
  listTrainerAttendanceDocs,
  getScheduleByIdForAssignment,
  getScheduleByIdForUpdate,
  getScheduleByIdForDelete,
  createScheduleDocument,
  findDuplicateSchedule,
  saveScheduleDocument,
  deleteScheduleDocument,
  getTrainerByIdWithUser,
  getCollegeById,
  getCourseById,
  getUserById,
  getScheduleById,
  listAssociationsCompanies,
  listAssociationsCourses,
  listAssociationsColleges,
  listAssociationsTrainers,
  listAssociationsDepartments,
  listCollegesByIds,
  listExistingDaySlotSchedules,
  insertManySchedules,
  bulkWriteSchedules,
  listSchedulesByIds,
  insertAssociationsDepartments,
  findCompanyByNameCaseInsensitive,
  createCompanyDocument,
  saveCompanyDocument,
  findCourseByTitleAndCompany,
  createCourseDocument,
  findCollegeByNameAndCourse,
  createCollegeDocument,
  findTrainerByCustomIdWithUser,
  createUserDocument,
  createTrainerDocument,
  findApprovedAttendanceByCollegeAndDateRange,
  findScheduleByCollegeCourseAndDateRange,
  findLastScheduleByCollege,
  createScheduleInstance,
  createNotificationDocument,
  createActivityLogDocument,
  updateAttendanceStatusByScheduleId,
  resolveTrainerScheduleFilterContext,
};
