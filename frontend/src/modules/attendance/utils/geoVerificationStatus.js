const toStatusToken = (value) =>
  String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

export const resolveCheckOutStatusFilter = (filterStatus) => {
  if (filterStatus === "all") return undefined;
  if (filterStatus === "pending") return "pending_or_review";
  if (filterStatus === "manual_review") return "manual_review_required";
  if (filterStatus === "completed") return "completed";
  return filterStatus;
};

export const normalizeGeoSubmissionStatus = (submission = {}) => {
  const checkOutStatusToken = toStatusToken(submission?.checkOutVerificationStatus);
  if (["auto_verified", "approved", "completed"].includes(checkOutStatusToken)) {
    return "auto_verified";
  }
  if (["verified", "manual_verified", "manually_verified"].includes(checkOutStatusToken)) {
    return "manually_verified";
  }
  if (["manual_review_required", "manual_review", "review_required", "under_review"].includes(checkOutStatusToken)) {
    return "manual_review";
  }
  if (["rejected", "manual_rejected", "manually_rejected"].includes(checkOutStatusToken)) {
    return "rejected";
  }
  if (["pending", "pending_checkout", "in_progress"].includes(checkOutStatusToken)) {
    return "pending";
  }

  if (
    toStatusToken(submission?.geoVerificationStatus) === "pending"
    && (submission?.checkOutVerificationReason || submission?.geoValidationComment)
  ) {
    return "manual_review";
  }

  const geoStatusToken = toStatusToken(submission?.geoVerificationStatus || submission);
  if (geoStatusToken === "approved" || geoStatusToken === "completed") return "auto_verified";
  if (geoStatusToken === "rejected") return "rejected";
  return "pending";
};

