const toNumber = (value) => Number(value || 0);
const toArray = (value) => (Array.isArray(value) ? value : []);

export const normalizeDriveSyncDryRunSummary = (summary = {}) => ({
  totalScanned: toNumber(summary.totalScanned),
  candidateMatches: toNumber(summary.candidateMatches),
  attendanceWouldBackfill: toNumber(summary.attendanceWouldBackfill),
  geoWouldBackfill: toNumber(summary.geoWouldBackfill),
  refreshedLinksWouldChange: toNumber(summary.refreshedLinksWouldChange),
  skippedAmbiguous: toNumber(summary.skippedAmbiguous),
  unchanged: toNumber(summary.unchanged),
  warnings: toArray(summary.warnings),
  errors: toArray(summary.errors),
});

export const normalizeDriveSyncDryRunNormalization = (normalization = {}) => {
  const proposedActions = normalization?.proposedActions || {};
  return {
    departmentsAnalyzed: toNumber(normalization.departmentsAnalyzed),
    dayFoldersDetected: toNumber(normalization.dayFoldersDetected),
    duplicateDayFolders: toNumber(normalization.duplicateDayFolders),
    canonicalDayFolders: toNumber(normalization.canonicalDayFolders),
    ambiguousDayFolders: toNumber(normalization.ambiguousDayFolders),
    filesMatchedSafely: toNumber(normalization.filesMatchedSafely),
    proposedActions: {
      keep: toNumber(proposedActions.keep),
      link: toNumber(proposedActions.link),
      move: toNumber(proposedActions.move),
      skip: toNumber(proposedActions.skip),
    },
  };
};

export const buildDriveSyncDryRunPreviewModel = (responseData = {}) => {
  const reconciliation = responseData?.reconciliation || {};
  return {
    summary: normalizeDriveSyncDryRunSummary(reconciliation),
    normalization: normalizeDriveSyncDryRunNormalization(reconciliation.normalization || {}),
  };
};

export const buildDriveSyncScopePayload = ({
  collegeId,
  departmentId,
} = {}) => ({
  collegeId,
  departmentId: departmentId || undefined,
});

export const extractDriveSyncResponseData = (response) =>
  response?.data?.data || response?.data || {};

export const formatDriveSyncDryRunPreviewMessage = (summary) => {
  const normalized = normalizeDriveSyncDryRunSummary(summary);
  const warningPreview = normalized.warnings.slice(0, 3);
  const errorPreview = normalized.errors.slice(0, 3);

  const lines = [
    "Drive sync dry-run preview (no database updates):",
    "",
    `Files Scanned: ${normalized.totalScanned}`,
    `Candidate Matches: ${normalized.candidateMatches}`,
    `Attendance Would Backfill: ${normalized.attendanceWouldBackfill}`,
    `GeoTag Would Backfill: ${normalized.geoWouldBackfill}`,
    `Refreshed Links Would Change: ${normalized.refreshedLinksWouldChange}`,
    `Skipped Ambiguous: ${normalized.skippedAmbiguous}`,
    `Unchanged: ${normalized.unchanged}`,
    "",
    `Warnings: ${normalized.warnings.length}`,
  ];

  warningPreview.forEach((warning, index) => {
    lines.push(`- Warning ${index + 1}: ${warning}`);
  });

  if (normalized.warnings.length > warningPreview.length) {
    lines.push(`- ...and ${normalized.warnings.length - warningPreview.length} more warnings`);
  }

  lines.push(`Errors: ${normalized.errors.length}`);

  errorPreview.forEach((error, index) => {
    lines.push(`- Error ${index + 1}: ${error}`);
  });

  if (normalized.errors.length > errorPreview.length) {
    lines.push(`- ...and ${normalized.errors.length - errorPreview.length} more errors`);
  }

  return lines.join("\n");
};

export const runDriveSyncDryRunPreview = async ({
  apiClient,
  collegeId,
  departmentId,
  normalizeDuplicates = false,
  canonicalMappingsOnly = false,
}) => {
  const query = new URLSearchParams();
  query.set("dryRun", "true");
  if (normalizeDuplicates) query.set("normalizeDuplicates", "true");
  if (canonicalMappingsOnly) query.set("canonicalMappingsOnly", "true");
  const endpoint = `/drive-hierarchy/sync-db?${query.toString()}`;
  const response = await apiClient.post(
    endpoint,
    buildDriveSyncScopePayload({ collegeId, departmentId }),
  );

  const responseData = extractDriveSyncResponseData(response);
  const previewModel = buildDriveSyncDryRunPreviewModel(responseData);
  const summary = previewModel.summary;
  const canonicalMapping = responseData?.canonicalMapping || {};

  return {
    responseData,
    previewModel,
    summary,
    canonicalMapping: {
      canonicalMappingsWouldChange: toNumber(canonicalMapping.canonicalMappingsWouldChange),
      canonicalMappingsUpdated: toNumber(canonicalMapping.canonicalMappingsUpdated),
      ambiguousDaysSkipped: toNumber(canonicalMapping.ambiguousDaysSkipped),
      unchanged: toNumber(canonicalMapping.unchanged),
      warnings: toArray(canonicalMapping.warnings),
      errors: toArray(canonicalMapping.errors),
    },
    message: formatDriveSyncDryRunPreviewMessage(summary),
  };
};
