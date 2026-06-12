export {
  ATTENDANCE_VERIFICATION_QUERY_KEY,
  DEFAULT_ATTENDANCE_PAGINATION,
  GEO_VERIFICATION_QUERY_KEY,
  TRAINER_ACTIVITY_QUERY_KEY,
  TRAINER_OVERALL_ATTENDANCE_QUERY_KEY,
  getAttendanceSubmissionDetails,
  listAttendanceSubmissions,
  listTrainerActivity,
  unwrapAttendanceCollection,
  verifyAttendanceSubmission,
} from "@/modules/attendance/api/attendanceApi";

export {
  default as useAttendanceVerificationList,
  buildAttendanceVerificationListQueryKey,
  getAttendanceVerificationListQueryOptions,
} from "@/modules/attendance/hooks/useAttendanceVerificationList";
export {
  default as useGeoVerificationSubmissions,
  buildGeoVerificationSubmissionsQueryKey,
  getGeoVerificationSubmissionsQueryOptions,
} from "@/modules/attendance/hooks/useGeoVerificationSubmissions";
export {
  default as useTrainerActivityQuery,
  buildTrainerActivityQueryKey,
  getTrainerActivityQueryOptions,
} from "@/modules/attendance/hooks/useTrainerActivityQuery";
export {
  default as useTrainerOverallAttendanceQuery,
  buildTrainerOverallAttendanceQueryKey,
  getTrainerOverallAttendanceQueryOptions,
} from "@/modules/attendance/hooks/useTrainerOverallAttendanceQuery";
export { default as useVerifyAttendanceSubmission } from "@/modules/attendance/hooks/useVerifyAttendanceSubmission";
