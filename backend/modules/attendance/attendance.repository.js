const mongoose = require("mongoose");
const {
  Attendance,
  Trainer,
  College,
  Company,
  Course,
  Schedule,
  ScheduleDocument,
  User,
} = require("../../models");

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const uniqueObjectIds = (items = []) =>
  Array.from(new Set(items.map((item) => String(item)))).map(toObjectId);

const buildAttendanceSearchFilters = async (search = "") => {
  const normalizedSearch = String(search || "").trim();
  if (!normalizedSearch) {
    return [];
  }

  const regex = new RegExp(escapeRegex(normalizedSearch), "i");

  const [users, trainers, companies, colleges, courses, schedules] = await Promise.all([
    User.find({
      $or: [{ name: regex }, { email: regex }],
    }).select("_id").lean(),
    Trainer.find({
      $or: [
        { name: regex },
        { email: regex },
        { trainerId: regex },
        { phone: regex },
      ],
    }).select("_id").lean(),
    Company.find({ name: regex }).select("_id").lean(),
    College.find({
      $or: [{ name: regex }, { code: regex }],
    }).select("_id").lean(),
    Course.find({
      $or: [{ name: regex }, { title: regex }],
    }).select("_id").lean(),
    Schedule.find({
      $or: [{ subject: regex }, { topic: regex }],
    }).select("_id").lean(),
  ]);

  const userIds = users.map((item) => item._id);
  const directTrainerIds = trainers.map((item) => item._id);
  const companyIds = companies.map((item) => item._id);
  const directCollegeIds = colleges.map((item) => item._id);
  const courseIds = courses.map((item) => item._id);
  const directScheduleIds = schedules.map((item) => item._id);

  let trainerIds = directTrainerIds;
  if (userIds.length > 0) {
    const trainersByUser = await Trainer.find({
      userId: { $in: userIds },
    }).select("_id").lean();

    trainerIds = uniqueObjectIds([
      ...directTrainerIds,
      ...trainersByUser.map((item) => item._id),
    ]);
  }

  let collegeIds = directCollegeIds;
  if (companyIds.length > 0) {
    const collegesByCompany = await College.find({
      companyId: { $in: companyIds },
    }).select("_id").lean();

    collegeIds = uniqueObjectIds([
      ...directCollegeIds,
      ...collegesByCompany.map((item) => item._id),
    ]);
  }

  let scheduleIds = directScheduleIds;
  if (courseIds.length > 0) {
    const schedulesByCourse = await Schedule.find({
      courseId: { $in: courseIds },
    }).select("_id").lean();

    scheduleIds = uniqueObjectIds([
      ...directScheduleIds,
      ...schedulesByCourse.map((item) => item._id),
    ]);
  }

  const filters = [
    { syllabus: regex },
    { status: regex },
    { verificationStatus: regex },
    { geoVerificationStatus: regex },
    { checkOutVerificationStatus: regex },
    { assignedDate: regex },
  ];

  const parsedDay = parseInt(normalizedSearch.replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(parsedDay) && parsedDay > 0 && parsedDay < 1000) {
    filters.push({ dayNumber: parsedDay });
  }

  if (trainerIds.length > 0) {
    filters.push({ trainerId: { $in: trainerIds } });
  }
  if (collegeIds.length > 0) {
    filters.push({ collegeId: { $in: collegeIds } });
  }
  if (courseIds.length > 0) {
    filters.push({ courseId: { $in: courseIds } });
  }
  if (scheduleIds.length > 0) {
    filters.push({ scheduleId: { $in: scheduleIds } });
  }

  return filters;
};

const ATTENDANCE_LIST_CHECK_OUT_SELECT_FIELDS = [
  "checkOut.time",
  "checkOut.finalStatus",
  "checkOut.location.lat",
  "checkOut.location.lng",
  "checkOut.location.accuracy",
  "checkOut.location.address",
  "checkOut.location.distanceFromCollege",
  "checkOut.photos.url",
  "checkOut.photos.uploadedAt",
  "checkOut.photos.validationStatus",
  "checkOut.photos.validationReason",
  "checkOut.photos.latitude",
  "checkOut.photos.longitude",
  "checkOut.photos.capturedAt",
  "checkOut.photos.distanceKm",
  "checkOut.photos.validationSource",
];

const buildGeoVerificationAttendanceQuery = (filters = {}) =>
  Attendance.find(filters)
    .select(
      [
        "_id",
        "trainerId",
        "collegeId",
        "courseId",
        "scheduleId",
        "dayNumber",
        "assignedDate",
        "date",
        "syllabus",
        "checkIn",
        "checkInTime",
        "checkInPhoto",
        "checkInImage",
        "checkInGeoImageUrl",
        "imageUrl",
        "check_in_image",
        "clock_in_image",
        "checkInLocation",
        "signatureUrl",
        "attendancePdfUrl",
        "studentAttendancePdfUrl",
        "attendanceExcelUrl",
        "studentAttendanceExcelUrl",
        "attendancePhoto",
        "attendancePhotoUrl",
        "attendanceDocumentUrl",
        "attendanceFile",
        "attendanceDocument",
        "studentsPhotoUrl",
        "students",
        "geoVerificationStatus",
        "geoValidationComment",
        "checkOutVerificationStatus",
        "checkOutVerificationMode",
        "checkOutVerificationReason",
        "checkOutCapturedAt",
        "checkOutLatitude",
        "checkOutLongitude",
        "checkOutGeoDistanceMeters",
        "checkOutVerifiedAt",
        "driveSyncStatus",
        "checkOutTime",
        ...ATTENDANCE_LIST_CHECK_OUT_SELECT_FIELDS,
        "checkOutGeoImageUrl",
        "checkOutGeoImageUrls",
        "activityPhotos",
        "activityVideos",
        "latitude",
        "longitude",
        "createdAt",
        "status",
      ].join(" "),
    )
    .populate({
      path: "trainerId",
      select: "name trainerId userId",
      populate: { path: "userId", select: "name email" },
    })
    .populate({
      path: "collegeId",
      select: "name latitude longitude companyId",
      populate: { path: "companyId", select: "name" },
    })
    .populate({
      path: "courseId",
      select: "name title",
    })
    .populate({
      path: "scheduleId",
      select: "subject dayNumber courseId",
      populate: { path: "courseId", select: "name title" },
    })
    .sort({ date: -1, createdAt: -1 })
    .lean();

const buildDefaultAttendanceQuery = (filters = {}) =>
  Attendance.find(filters)
    .select(
      [
        "_id",
        "trainerId",
        "collegeId",
        "courseId",
        "scheduleId",
        "batchId",
        "dayNumber",
        "assignedDate",
        "date",
        "syllabus",
        "checkIn",
        "checkInTime",
        "checkInPhoto",
        "checkInImage",
        "checkInGeoImageUrl",
        "imageUrl",
        "check_in_image",
        "clock_in_image",
        "checkInLocation",
        "signatureUrl",
        "attendancePdfUrl",
        "studentAttendancePdfUrl",
        "attendanceExcelUrl",
        "studentAttendanceExcelUrl",
        "attendancePhoto",
        "attendancePhotoUrl",
        "attendanceDocumentUrl",
        "attendanceFile",
        "attendanceDocument",
        "studentsPhotoUrl",
        "students",
        "activityPhotos",
        "activityVideos",
        "checkOutTime",
        "studentsPresent",
        "studentsAbsent",
        "verificationStatus",
        "geoVerificationStatus",
        "geoValidationComment",
        "checkOutVerificationStatus",
        "checkOutVerificationMode",
        "checkOutVerificationReason",
        "checkOutCapturedAt",
        "checkOutLatitude",
        "checkOutLongitude",
        "checkOutGeoDistanceMeters",
        "driveSyncStatus",
        ...ATTENDANCE_LIST_CHECK_OUT_SELECT_FIELDS,
        "checkOutGeoImageUrl",
        "checkOutGeoImageUrls",
        "createdAt",
        "status",
      ].join(" "),
    )
    .populate({
      path: "trainerId",
      select: "name trainerId userId email phone",
      populate: { path: "userId", select: "name email" },
    })
    .populate({
      path: "collegeId",
      select: "name latitude longitude companyId code",
      populate: { path: "companyId", select: "name" },
    })
    .populate({
      path: "courseId",
      select: "name title",
    })
    .populate({
      path: "scheduleId",
      select: "dayNumber subject courseId",
      populate: { path: "courseId", select: "name title" },
    })
    .sort({ date: -1, createdAt: -1 })
    .lean();

const findAttendanceVerificationPage = async ({
  filters = {},
  view = "",
  shouldPaginate = true,
  page = 1,
  limit = 20,
}) => {
  if (view === "geo-verification") {
    const queryBuilder = buildGeoVerificationAttendanceQuery(filters);
    let totalPromise = Promise.resolve(null);
    if (shouldPaginate) {
      queryBuilder.skip((page - 1) * limit).limit(limit);
      totalPromise = Attendance.countDocuments(filters);
    }
    const [data, total] = await Promise.all([queryBuilder, totalPromise]);
    return { data, total };
  }

  const queryBuilder = buildDefaultAttendanceQuery(filters);
  const allAttendance = await queryBuilder;

  // Merge unrecorded schedules with assigned trainers
  const existingScheduleIds = new Set(
    allAttendance.map((a) => String(a.scheduleId?._id || a.scheduleId || "")).filter(Boolean)
  );

  let unrecordedSchedules = [];
  if (!filters.verificationStatus && !filters.geoVerificationStatus && !filters.checkOutVerificationStatus) {
    const scheduleFilters = {
      trainerId: { $ne: null },
    };
    if (existingScheduleIds.size > 0) {
      scheduleFilters._id = {
        $nin: Array.from(existingScheduleIds).map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
    if (filters.date) {
      scheduleFilters.$or = [
        { scheduledDate: filters.date },
        { date: filters.date },
      ];
    }

    try {
      unrecordedSchedules = await Schedule.find(scheduleFilters)
        .populate({
          path: "trainerId",
          select: "name trainerId userId email phone",
          populate: { path: "userId", select: "name email" },
        })
        .populate({
          path: "collegeId",
          select: "name latitude longitude companyId code",
          populate: { path: "companyId", select: "name" },
        })
        .populate({
          path: "courseId",
          select: "name title",
        })
        .lean();
    } catch (schErr) {
      console.warn("Failed to query unrecorded schedules in repository:", schErr.message);
    }
  }

  const syntheticRecords = unrecordedSchedules.map((s) => {
    const schedDate = s.scheduledDate || s.date || new Date();
    const dateStr = schedDate
      ? schedDate instanceof Date
        ? schedDate.toISOString().split("T")[0]
        : String(schedDate).split("T")[0]
      : null;
    return {
      _id: s._id,
      scheduleId: {
        _id: s._id,
        dayNumber: s.dayNumber || 1,
        subject: s.subject || s.topic || s.courseId?.title || s.courseId?.name || "",
        courseId: s.courseId || null,
      },
      trainerId: s.trainerId || null,
      collegeId: s.collegeId || null,
      courseId: s.courseId || null,
      dayNumber: s.dayNumber || 1,
      assignedDate: dateStr,
      date: schedDate,
      status: "Absent",
      attendanceStatus: "ABSENT",
      verificationStatus: "pending",
      geoVerificationStatus: "pending",
      checkInTime: null,
      checkOutTime: null,
      checkInLocation: null,
      checkInPhoto: null,
      attendancePdfUrl: null,
      attendanceExcelUrl: null,
      attendancePhoto: null,
      activityPhotos: [],
      documents: [],
      createdAt: s.createdAt || schedDate,
    };
  });

  const combinedRecords = [...allAttendance, ...syntheticRecords].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  const total = combinedRecords.length;
  const data = shouldPaginate
    ? combinedRecords.slice((page - 1) * limit, page * limit)
    : combinedRecords;

  return { data, total };
};

const findAttendanceDetailsById = async (attendanceId) =>
  Attendance.findById(attendanceId)
    .select(
      [
        "_id",
        "trainerId",
        "collegeId",
        "courseId",
        "scheduleId",
        "dayNumber",
        "assignedDate",
        "date",
        "syllabus",
        "status",
        "studentsPresent",
        "studentsAbsent",
        "students",
        "verificationStatus",
        "geoVerificationStatus",
        "checkOutVerificationStatus",
        "checkOutVerificationMode",
        "checkOutVerificationReason",
        "checkOutCapturedAt",
        "checkOutLatitude",
        "checkOutLongitude",
        "checkOutGeoDistanceMeters",
        "checkOutVerifiedAt",
        "checkOutVerifiedBy",
        "driveSyncStatus",
        "verifiedBy",
        "verifiedAt",
        "verificationComment",
        "approvedBy",
        "attendancePdfUrl",
        "studentAttendancePdfUrl",
        "attendanceExcelUrl",
        "studentAttendanceExcelUrl",
        "attendancePhoto",
        "attendanceFile",
        "attendanceDocument",
        "studentsPhotoUrl",
        "checkOutGeoImageUrl",
        "checkOutGeoImageUrls",
        "activityPhotos",
        "activityVideos",
        "checkIn",
        "checkInTime",
        "checkInPhoto",
        "checkInImage",
        "checkInGeoImageUrl",
        "checkInLocation",
        "signatureUrl",
        "checkOut",
        "checkOutTime",
        "latitude",
        "longitude",
        "finalStatus",
        "createdAt",
      ].join(" "),
    )
    .populate({
      path: "trainerId",
      select: "name trainerId userId",
      populate: { path: "userId", select: "name email" },
    })
    .populate({
      path: "collegeId",
      select: "name latitude longitude companyId",
      populate: { path: "companyId", select: "name" },
    })
    .populate({
      path: "courseId",
      select: "name title",
    })
    .populate({
      path: "scheduleId",
      select: "subject courseId",
      populate: { path: "courseId", select: "name title" },
    })
    .populate({
      path: "verifiedBy",
      select: "name email",
    })
    .populate({
      path: "checkOutVerifiedBy",
      select: "name email role",
    })
    .lean();

const findAttendanceByScheduleId = async (scheduleId) =>
  Attendance.find({ scheduleId })
    .select(
      [
        "_id",
        "trainerId",
        "collegeId",
        "scheduleId",
        "dayNumber",
        "assignedDate",
        "date",
        "status",
        "verificationStatus",
        "geoVerificationStatus",
        "checkOutVerificationStatus",
        "checkOutVerificationReason",
        "checkInTime",
        "checkOutTime",
        "createdAt",
      ].join(" "),
    )
    .populate({
      path: "trainerId",
      select: "name trainerId userId",
      populate: { path: "userId", select: "name email" },
    })
    .populate({
      path: "collegeId",
      select: "name latitude longitude companyId",
      populate: { path: "companyId", select: "name" },
    })
    .populate("verifiedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

const findAttendanceByTrainerId = async ({
  trainerId,
  month,
  year,
} = {}) => {
  if (!trainerId) return [];

  let trainerIds = [trainerId];
  if (mongoose.Types.ObjectId.isValid(trainerId)) {
    const objId = new mongoose.Types.ObjectId(trainerId);
    trainerIds.push(objId);

    try {
      const [trainerDoc, trainerByUser] = await Promise.all([
        Trainer.findById(objId).select("_id userId").lean(),
        Trainer.findOne({ userId: objId }).select("_id userId").lean(),
      ]);
      if (trainerDoc?._id) trainerIds.push(trainerDoc._id);
      if (trainerDoc?.userId) trainerIds.push(trainerDoc.userId);
      if (trainerByUser?._id) trainerIds.push(trainerByUser._id);
      if (trainerByUser?.userId) trainerIds.push(trainerByUser.userId);
    } catch (_) {
      // ignore lookup failures
    }
  }

  const validObjectIds = Array.from(new Set(trainerIds.map((id) => String(id))))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const filters = {
    $or: [
      { trainerId: { $in: validObjectIds } },
      { trainerId: trainerId },
    ],
  };

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    filters.date = { $gte: startDate, $lte: endDate };
  }

  return Attendance.find(filters)
    .populate("collegeId", "name code city state address location coordinates")
    .populate("courseId", "name title code")
    .populate("verifiedBy", "name email")
    .populate({
      path: "scheduleId",
      select: "subject dayNumber courseId collegeId scheduledDate",
      populate: [
        { path: "courseId", select: "name title code" },
        { path: "collegeId", select: "name code city state" },
      ],
    })
    .sort({ date: -1, createdAt: -1 })
    .lean();
};

const findAttendanceByCollegeId = async (collegeId) =>
  Attendance.find({ collegeId })
    .populate("trainerId")
    .populate("scheduleId")
    .populate("verifiedBy", "name")
    .sort({ date: -1 });

const findAttendanceDocuments = async ({ filters = {} } = {}) =>
  ScheduleDocument.find(filters)
    .populate("attendanceId", "verificationStatus geoVerificationStatus status date")
    .populate({
      path: "trainerId",
      select: "userId trainerCode",
      populate: { path: "userId", select: "name email" },
    })
    .populate(
      "scheduleId",
      "companyId courseId collegeId departmentId dayNumber scheduledDate startTime endTime status",
    )
    .populate("verifiedBy", "name email role")
    .sort({ createdAt: -1 });

const updateAttendanceVerificationStatus = async ({
  attendanceId,
  status,
  comment = "",
  approvedBy = null,
}) => {
  const updateData = {
    verificationStatus: status,
    verificationComment: comment || "",
    approvedBy,
    verifiedAt: new Date(),
  };

  if (status === "rejected") {
    updateData.geoVerificationStatus = "rejected";
    updateData.geoValidationComment = null;
    updateData.status = "Absent";
    updateData.checkOutTime = null;
    updateData.checkOutGeoImageUrl = null;
    updateData.checkOutGeoImageUrls = [];
    updateData.activityPhotos = [];
    updateData.activityVideos = [];
    updateData.images = [];
    updateData.finalStatus = "PENDING";
    updateData.checkOutCapturedAt = null;
    updateData.checkOutLatitude = null;
    updateData.checkOutLongitude = null;
    updateData.checkOutGeoDistanceMeters = null;
    updateData.checkOutVerificationStatus = "PENDING_CHECKOUT";
    updateData.checkOutVerificationMode = "AUTO";
    updateData.checkOutVerificationReason = null;
    updateData.checkOutVerifiedAt = null;
    updateData.checkOutVerifiedBy = null;
    updateData.driveSyncStatus = "PENDING";
    updateData.checkOut = {
      time: null,
      finalStatus: "PENDING",
      location: {
        lat: null,
        lng: null,
        accuracy: null,
        address: null,
        distanceFromCollege: null,
      },
      images: [],
      photos: [],
    };
    updateData.completedAt = null;
  }

  if (status === "approved") {
    updateData.status = "Present";
  }

  return Attendance.findByIdAndUpdate(
    attendanceId,
    updateData,
    { new: true, runValidators: true },
  );
};

const updateScheduleDocumentStatus = async ({
  documentId,
  status,
  verifiedBy = null,
  rejectReason = null,
}) => {
  const document = await ScheduleDocument.findById(documentId);
  if (!document) return null;

  document.status = status;
  if (status === "verified" || status === "rejected") {
    document.verifiedBy = verifiedBy;
    document.verifiedAt = new Date();
    document.rejectReason = status === "rejected" ? (rejectReason || "Rejected by SPOC") : null;
  }
  
  await document.save();
  return document;
};

const findAttendanceByScheduleOrDocument = async ({ attendanceId, scheduleId }) => {
  if (attendanceId) {
    return Attendance.findById(attendanceId);
  }
  if (scheduleId) {
    return Attendance.findOne({ scheduleId }).sort({ createdAt: -1 });
  }
  return null;
};

const updateGeoVerificationStatus = async ({
    attendanceId,
    status = "VERIFIED",
    mode = "MANUAL",
    verifiedBy = null,
    reason = null,
    comment = null,
}) => {
    const updateData = {
        checkOutVerificationStatus: status,
        checkOutVerificationMode: mode,
        checkOutVerifiedBy: verifiedBy,
        checkOutVerifiedAt: new Date(),
        checkOutVerificationReason: reason || null,
        geoValidationComment: comment || null,
    };

    if (status === "VERIFIED" || status === "AUTO_VERIFIED") {
        updateData.geoVerificationStatus = "approved";
        updateData.finalStatus = "COMPLETED";
        updateData.completedAt = new Date();
        updateData["checkOut.finalStatus"] = "COMPLETED";
    } else if (status === "REJECTED") {
        updateData.geoVerificationStatus = "rejected";
        updateData.finalStatus = "PENDING";
        updateData.completedAt = null;
        updateData["checkOut.finalStatus"] = "PENDING";
    }

    return Attendance.findByIdAndUpdate(
        attendanceId,
        updateData,
        { new: true, runValidators: true }
    );
};

const createManualAttendanceRecord = async (payload = {}) =>
  Attendance.create({
    ...payload,
    uploadedBy: "admin",
    isManualEntry: true,
    verificationStatus: "approved",
    verifiedAt: new Date(),
  });

module.exports = {
  buildAttendanceSearchFilters,
  findAttendanceByCollegeId,
  findAttendanceDocuments,
  findAttendanceByScheduleId,
  findAttendanceByTrainerId,
  findAttendanceVerificationPage,
  findAttendanceDetailsById,
  updateAttendanceVerificationStatus,
  updateGeoVerificationStatus,
  updateScheduleDocumentStatus,
  findAttendanceByScheduleOrDocument,
  createManualAttendanceRecord,
};
