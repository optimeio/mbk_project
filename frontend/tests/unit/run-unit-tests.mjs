import assert from "node:assert/strict";
import {
  LONG_RENDER_THRESHOLD_MS,
  createProfilerCallback,
  shouldFlagLongRender,
} from "../../src/shared/lib/renderProfiler.js";
import {
  buildAssignMutationInput,
  buildAssignModalSeed,
  buildLoadedSessionsLabel,
  createAssignClickHandler,
  createDeleteClickHandler,
  getAssignSubmissionError,
  guardAssignSubmission,
  shouldShowLoadMore,
} from "../../src/portals/spoc/scheduler/schedulerUiState.js";
import {
  buildPendingSchedules,
  isScheduleActionableForTrainerWorkflow,
} from "../../src/portals/trainer/TrainerSchedule/scheduleProcessing.js";
import {
  normalizeGeoSubmissionStatus,
  resolveCheckOutStatusFilter,
} from "../../src/modules/attendance/utils/geoVerificationStatus.js";
import {
  GEO_UPLOAD_ABSOLUTE_MAX_BYTES,
  GEO_UPLOAD_HARD_MAX_BYTES,
  GEO_UPLOAD_MAX_PIXELS,
  GEO_UPLOAD_TARGET_MAX_BYTES,
  formatUploadBytes,
  getGeoUploadSizeState,
  getPixelBudgetMaxDimension,
  shouldAutoCompressGeoImage,
} from "../../src/portals/trainer/TrainerSchedule/geoImageUploadPolicy.js";
import {
  buildDriveSyncDryRunPreviewModel,
  formatDriveSyncDryRunPreviewMessage,
  normalizeDriveSyncDryRunNormalization,
  runDriveSyncDryRunPreview,
} from "../../src/portals/admin/driveSyncPreview.js";

const tests = [
  {
    name: "shouldFlagLongRender flags durations strictly above threshold",
    run: () => {
      assert.equal(shouldFlagLongRender(49.99, LONG_RENDER_THRESHOLD_MS), false);
      assert.equal(shouldFlagLongRender(50, LONG_RENDER_THRESHOLD_MS), false);
      assert.equal(shouldFlagLongRender(50.01, LONG_RENDER_THRESHOLD_MS), true);
    },
  },
  {
    name: "createProfilerCallback logs payload for long renders",
    run: () => {
      const logs = [];
      let nowMs = 2000;

      const callback = createProfilerCallback({
        id: "GeoVerificationList",
        thresholdMs: 50,
        logger: (message, payload) => logs.push({ message, payload }),
        now: () => nowMs,
      });

      callback("GeoVerificationList", "update", 61.234, 80.2, 10.2, 45.67);

      assert.equal(logs.length, 1);
      assert.match(logs[0].message, /GeoVerificationList update render took 61\.23ms/);
      assert.equal(logs[0].payload.id, "GeoVerificationList");
      assert.equal(logs[0].payload.phase, "update");
      assert.equal(logs[0].payload.actualDurationMs, 61.23);
      assert.equal(logs[0].payload.baseDurationMs, 80.2);
    },
  },
  {
    name: "createProfilerCallback throttles repeated long-render logs",
    run: () => {
      const logs = [];
      let nowMs = 2000;

      const callback = createProfilerCallback({
        id: "TrainerList",
        thresholdMs: 50,
        logger: (message) => logs.push(message),
        now: () => nowMs,
      });

      callback("TrainerList", "mount", 75, 75, 0, 16);
      callback("TrainerList", "update", 82, 82, 16, 40);
      nowMs += 1600;
      callback("TrainerList", "update", 79, 79, 40, 66);

      assert.equal(logs.length, 2);
    },
  },
  {
    name: "buildAssignModalSeed preserves scheduler modal-open defaults",
    run: () => {
      const modalSeed = buildAssignModalSeed({
        _id: "sch-001",
        trainerId: "trainer-7",
        scheduledDate: "2026-04-10T09:00:00.000Z",
        startTime: "10:30",
        endTime: "15:45",
        rescheduleReason: "Classroom shift",
      });

      assert.equal(modalSeed.scheduleId, "sch-001");
      assert.deepEqual(modalSeed.form, {
        trainerId: "trainer-7",
        scheduledDate: "2026-04-10",
        startTime: "10:30",
        endTime: "15:45",
        rescheduleReason: "Classroom shift",
      });
    },
  },
  {
    name: "createAssignClickHandler wires list assign action to modal opener",
    run: () => {
      const calls = [];
      const schedule = { id: "sch-22", trainerId: "trainer-3" };
      const onOpenAssignModal = (payload) => calls.push(payload);

      const handler = createAssignClickHandler({
        schedule,
        onOpenAssignModal,
      });
      handler();

      assert.equal(calls.length, 1);
      assert.equal(calls[0], schedule);
    },
  },
  {
    name: "createDeleteClickHandler wires delete action to resolved schedule id",
    run: () => {
      const calls = [];
      const onDeleteSchedule = (scheduleId) => calls.push(scheduleId);

      createDeleteClickHandler({
        schedule: { _id: "legacy-id-11" },
        onDeleteSchedule,
      })();

      assert.deepEqual(calls, ["legacy-id-11"]);
    },
  },
  {
    name: "scheduler list pagination helpers keep load-more behavior stable",
    run: () => {
      assert.equal(
        buildLoadedSessionsLabel({ loadedCount: 12, total: 44 }),
        "12 / 44 Sessions Loaded",
      );
      assert.equal(
        buildLoadedSessionsLabel({ loadedCount: 12, total: undefined }),
        "12 Sessions Loaded",
      );
      assert.equal(shouldShowLoadMore({ hasNextPage: true }), true);
      assert.equal(shouldShowLoadMore({ hasNextPage: false }), false);
    },
  },
  {
    name: "assign form guard enforces required trainer/date/time fields",
    run: () => {
      assert.equal(
        getAssignSubmissionError({
          scheduleId: "",
          assignData: {
            trainerId: "trainer-1",
            scheduledDate: "2026-04-17",
            startTime: "10:00",
            endTime: "11:00",
          },
        }),
        "Missing schedule selection",
      );

      assert.equal(
        getAssignSubmissionError({
          scheduleId: "sch-1",
          assignData: {
            trainerId: "trainer-1",
            scheduledDate: "",
            startTime: "10:00",
            endTime: "11:00",
          },
        }),
        "Please select a session date",
      );

      assert.equal(
        getAssignSubmissionError({
          scheduleId: "sch-1",
          assignData: {
            trainerId: "trainer-1",
            scheduledDate: "2026-04-17",
            startTime: "",
            endTime: "11:00",
          },
        }),
        "Please select session start and end times",
      );
    },
  },
  {
    name: "assign mutation input keeps reason/date/time path and trims values",
    run: () => {
      const payload = buildAssignMutationInput({
        scheduleId: "sch-9",
        assignData: {
          trainerId: " trainer-9 ",
          scheduledDate: " 2026-04-20 ",
          startTime: " 09:15 ",
          endTime: " 10:45 ",
          rescheduleReason: "  Room shift requested  ",
        },
      });

      assert.equal(payload.error, null);
      assert.deepEqual(payload.assignPayload, {
        trainerId: "trainer-9",
        scheduledDate: "2026-04-20",
        startTime: "09:15",
        endTime: "10:45",
        rescheduleReason: "Room shift requested",
      });
    },
  },
  {
    name: "guardAssignSubmission invokes submit callback only on valid input",
    run: () => {
      const validCalls = [];
      const invalidCalls = [];

      const invalidResult = guardAssignSubmission({
        scheduleId: "sch-invalid",
        assignData: {
          trainerId: "",
          scheduledDate: "",
          startTime: "",
          endTime: "",
        },
        onValidSubmit: (input) => validCalls.push(input),
        onInvalidSubmit: (message) => invalidCalls.push(message),
      });

      assert.equal(invalidResult.isValid, false);
      assert.equal(validCalls.length, 0);
      assert.equal(invalidCalls.length, 1);

      const validResult = guardAssignSubmission({
        scheduleId: "sch-valid",
        assignData: {
          trainerId: "trainer-5",
          scheduledDate: "2026-04-23",
          startTime: "09:00",
          endTime: "17:00",
          rescheduleReason: "  ",
        },
        onValidSubmit: (input) => validCalls.push(input),
        onInvalidSubmit: (message) => invalidCalls.push(message),
      });

      assert.equal(validResult.isValid, true);
      assert.equal(validCalls.length, 1);
      assert.equal(validCalls[0].assignPayload.rescheduleReason, "");
    },
  },
  {
    name: "trainer schedule actionable helper rejects inactive, cancelled, completed, and cancelled attendance states",
    run: () => {
      assert.equal(
        isScheduleActionableForTrainerWorkflow({
          id: "sched-active",
          isActive: true,
          status: "scheduled",
          trainerId: "trainer-1",
          collegeId: "college-1",
          dayNumber: 1,
          attendancePresenceStatus: "Present",
        }),
        true,
      );
      assert.equal(
        isScheduleActionableForTrainerWorkflow({
          id: "sched-inactive",
          isActive: false,
          status: "scheduled",
        }),
        false,
      );
      assert.equal(
        isScheduleActionableForTrainerWorkflow({
          id: "sched-cancelled",
          status: "cancelled",
        }),
        false,
      );
      assert.equal(
        isScheduleActionableForTrainerWorkflow({
          id: "sched-completed",
          status: "COMPLETED",
        }),
        false,
      );
      assert.equal(
        isScheduleActionableForTrainerWorkflow({
          id: "sched-att-cancelled",
          status: "inprogress",
          attendancePresenceStatus: "cancelled",
        }),
        false,
      );
      assert.equal(
        isScheduleActionableForTrainerWorkflow({
          id: "sched-missing-college",
          isActive: true,
          status: "scheduled",
          trainerId: "trainer-1",
          dayNumber: 1,
        }),
        false,
      );
    },
  },
  {
    name: "trainer pending schedule builder keeps only actionable past-month records",
    run: () => {
      const schedules = [
        {
          _id: "sched-valid-past",
          isActive: true,
          status: "scheduled",
          trainerId: "trainer-1",
          collegeId: "college-1",
          scheduledDate: "2026-03-10T05:30:00.000Z",
          dayNumber: 1,
        },
        {
          _id: "sched-inactive-past",
          isActive: false,
          status: "scheduled",
          trainerId: "trainer-1",
          collegeId: "college-1",
          scheduledDate: "2026-03-11T05:30:00.000Z",
          dayNumber: 2,
        },
        {
          _id: "sched-cancelled-past",
          isActive: true,
          status: "cancelled",
          trainerId: "trainer-1",
          collegeId: "college-1",
          scheduledDate: "2026-03-12T05:30:00.000Z",
          dayNumber: 3,
        },
        {
          _id: "sched-completed-past",
          isActive: true,
          status: "COMPLETED",
          trainerId: "trainer-1",
          collegeId: "college-1",
          scheduledDate: "2026-03-13T05:30:00.000Z",
          dayNumber: 4,
        },
        {
          _id: "sched-current-month",
          isActive: true,
          status: "scheduled",
          trainerId: "trainer-1",
          collegeId: "college-1",
          scheduledDate: "2026-04-07T05:30:00.000Z",
          dayNumber: 5,
        },
      ];

      const pending = buildPendingSchedules(schedules, {
        currentTrainerId: "trainer-1",
        referenceDate: new Date("2026-04-08T05:30:00.000Z"),
      });

      assert.equal(pending.length, 1);
      assert.equal(pending[0]?.id, "sched-valid-past");
    },
  },
  {
    name: "trainer pending schedule builder keeps failed checkout evidence as re-checkout instead of check-in",
    run: () => {
      const pending = buildPendingSchedules(
        [
          {
            _id: "sched-failed-geo",
            isActive: true,
            status: "scheduled",
            trainerId: "trainer-1",
            collegeId: "college-1",
            scheduledDate: "2026-03-18T05:30:00.000Z",
            dayNumber: 1,
            geoVerificationStatus: "pending",
            finalStatus: "PENDING",
            checkOut: {
              time: "2026-03-18T15:30:00.000Z",
              finalStatus: "PENDING",
              photos: [{ url: "/uploads/geo-slot-1.jpg" }],
            },
          },
        ],
        {
          currentTrainerId: "trainer-1",
          referenceDate: new Date("2026-04-08T05:30:00.000Z"),
        },
      );

      assert.equal(pending.length, 1);
      assert.equal(pending[0]?.ui?.isGeoPending, true);
      assert.equal(pending[0]?.ui?.primaryAction?.kind, "checkout");
      assert.equal(pending[0]?.ui?.primaryAction?.label, "Re-Check Out");
    },
  },
  {
    name: "trainer pending schedule builder treats pending day status with geotag upload as re-checkout",
    run: () => {
      const pending = buildPendingSchedules(
        [
          {
            _id: "sched-daystate-pending",
            isActive: true,
            status: "scheduled",
            trainerId: "trainer-1",
            collegeId: "college-1",
            scheduledDate: "2026-03-20T05:30:00.000Z",
            dayNumber: 1,
            dayStatus: "pending",
            geoTagUploaded: true,
            geoVerificationStatus: "pending",
          },
        ],
        {
          currentTrainerId: "trainer-1",
          referenceDate: new Date("2026-04-08T05:30:00.000Z"),
        },
      );

      assert.equal(pending.length, 1);
      assert.equal(pending[0]?.ui?.isGeoPending, true);
      assert.equal(pending[0]?.ui?.primaryAction?.kind, "checkout");
    },
  },
  {
    name: "trainer pending schedule builder keeps plain past scheduled days on check-in action",
    run: () => {
      const pending = buildPendingSchedules(
        [
          {
            _id: "sched-plain-past",
            isActive: true,
            status: "scheduled",
            trainerId: "trainer-1",
            collegeId: "college-1",
            scheduledDate: "2026-03-19T05:30:00.000Z",
            dayNumber: 1,
            geoVerificationStatus: null,
            finalStatus: null,
            checkOut: {
              time: null,
              finalStatus: "PENDING",
              photos: [],
            },
          },
        ],
        {
          currentTrainerId: "trainer-1",
          referenceDate: new Date("2026-04-08T05:30:00.000Z"),
        },
      );

      assert.equal(pending.length, 1);
      assert.equal(pending[0]?.ui?.isGeoPending, false);
      assert.notEqual(pending[0]?.ui?.primaryAction?.kind, "checkout");
    },
  },
  {
    name: "trainer pending schedule builder excludes completed check-out records even when raw schedule status is stale",
    run: () => {
      const pending = buildPendingSchedules(
        [
          {
            _id: "sched-stale-complete",
            isActive: true,
            status: "scheduled",
            trainerId: "trainer-1",
            collegeId: "college-1",
            scheduledDate: "2026-03-27T05:30:00.000Z",
            dayNumber: 1,
            attendanceStatus: "approved",
            geoVerificationStatus: "approved",
            finalStatus: "COMPLETED",
            checkOut: {
              time: "17:05",
              finalStatus: "COMPLETED",
              photos: [{ url: "uploads/attendance/geo/sample.jpg", validationStatus: "verified" }],
            },
          },
        ],
        {
          currentTrainerId: "trainer-1",
          referenceDate: new Date("2026-04-08T05:30:00.000Z"),
        },
      );

      assert.equal(pending.length, 0);
    },
  },
  {
    name: "geo upload policy classifies size states with target, hard, and absolute limits",
    run: () => {
      assert.equal(getGeoUploadSizeState(2.5 * 1024 * 1024), "within_target");
      assert.equal(getGeoUploadSizeState(GEO_UPLOAD_TARGET_MAX_BYTES + 1), "too_large_target");
      assert.equal(getGeoUploadSizeState(GEO_UPLOAD_HARD_MAX_BYTES + 1), "too_large_hard");
      assert.equal(getGeoUploadSizeState(GEO_UPLOAD_ABSOLUTE_MAX_BYTES + 1), "too_large_absolute");
    },
  },
  {
    name: "geo upload policy requests compression only when size or megapixel budget exceeds limits",
    run: () => {
      assert.equal(
        shouldAutoCompressGeoImage({
          size: GEO_UPLOAD_TARGET_MAX_BYTES - 10 * 1024,
          pixels: GEO_UPLOAD_MAX_PIXELS - 1,
        }),
        false,
      );
      assert.equal(
        shouldAutoCompressGeoImage({
          size: GEO_UPLOAD_TARGET_MAX_BYTES + 1024,
          pixels: GEO_UPLOAD_MAX_PIXELS - 1,
        }),
        true,
      );
      assert.equal(
        shouldAutoCompressGeoImage({
          size: GEO_UPLOAD_TARGET_MAX_BYTES - 1024,
          pixels: GEO_UPLOAD_MAX_PIXELS + 1000,
        }),
        true,
      );
    },
  },
  {
    name: "geo upload policy keeps pixel-budget resize dimension bounded and positive",
    run: () => {
      const maxDimForLargeImage = getPixelBudgetMaxDimension({
        width: 6000,
        height: 4000,
      });
      assert.equal(Number.isFinite(maxDimForLargeImage), true);
      assert.equal(maxDimForLargeImage > 0, true);
      assert.equal(maxDimForLargeImage < 6000, true);

      const maxDimForSmallImage = getPixelBudgetMaxDimension({
        width: 1200,
        height: 800,
      });
      assert.equal(maxDimForSmallImage, 1200);
    },
  },
  {
    name: "geo upload policy formats upload bytes for trainer-facing diagnostics",
    run: () => {
      assert.equal(formatUploadBytes(0), "0 B");
      assert.equal(formatUploadBytes(1024), "1 KB");
      assert.equal(formatUploadBytes(3 * 1024 * 1024), "3.00 MB");
    },
  },
  {
    name: "geo verification status normalization keeps failed auto-verification records in manual review",
    run: () => {
      const failedAutoVerification = normalizeGeoSubmissionStatus({
        checkOutVerificationStatus: "MANUAL_REVIEW_REQUIRED",
        checkOutVerificationMode: "AUTO",
        checkOutVerificationReason: "Image 1: missing EXIF date/latitude/longitude metadata",
        geoVerificationStatus: "pending",
      });
      const legacyPendingWithReason = normalizeGeoSubmissionStatus({
        checkOutVerificationStatus: null,
        geoVerificationStatus: "pending",
        geoValidationComment: "Missing EXIF GPS/date metadata",
      });

      assert.equal(failedAutoVerification, "manual_review");
      assert.equal(legacyPendingWithReason, "manual_review");
    },
  },
  {
    name: "geo verification filter mapping keeps pending/manual/completed parity-safe tokens",
    run: () => {
      assert.equal(resolveCheckOutStatusFilter("pending"), "pending_or_review");
      assert.equal(resolveCheckOutStatusFilter("manual_review"), "manual_review_required");
      assert.equal(resolveCheckOutStatusFilter("completed"), "completed");
      assert.equal(resolveCheckOutStatusFilter("all"), undefined);
    },
  },
  {
    name: "drive sync dry-run preview calls dry-run endpoint and returns normalized summary",
    run: async () => {
      const calls = [];
      const apiClient = {
        post: async (endpoint, payload) => {
          calls.push({ endpoint, payload });
          return {
            data: {
              data: {
                reconciliation: {
                  totalScanned: 11,
                  candidateMatches: 7,
                  attendanceWouldBackfill: 2,
                  geoWouldBackfill: 1,
                  refreshedLinksWouldChange: 1,
                  skippedAmbiguous: 1,
                  unchanged: 4,
                  warnings: ["Skipped one ambiguous file"],
                  errors: [],
                  normalization: {
                    departmentsAnalyzed: 1,
                    dayFoldersDetected: 6,
                    duplicateDayFolders: 2,
                    canonicalDayFolders: 4,
                    ambiguousDayFolders: 1,
                    filesMatchedSafely: 5,
                    proposedActions: {
                      keep: 3,
                      link: 2,
                      move: 1,
                      skip: 1,
                    },
                  },
                },
              },
            },
          };
        },
      };

      const preview = await runDriveSyncDryRunPreview({
        apiClient,
        collegeId: "college-1",
        departmentId: "dept-1",
      });

      assert.equal(calls.length, 1);
      assert.equal(calls[0].endpoint, "/drive-hierarchy/sync-db?dryRun=true");
      assert.deepEqual(calls[0].payload, {
        collegeId: "college-1",
        departmentId: "dept-1",
      });
      assert.equal(preview.summary.totalScanned, 11);
      assert.equal(preview.summary.candidateMatches, 7);
      assert.equal(preview.previewModel.normalization.duplicateDayFolders, 2);
      assert.equal(preview.previewModel.normalization.proposedActions.link, 2);
      assert.match(preview.message, /Drive sync dry-run preview/i);
      assert.match(preview.message, /Files Scanned: 11/);
    },
  },
  {
    name: "drive sync dry-run normalization defaults keep additive counters stable",
    run: () => {
      const normalized = normalizeDriveSyncDryRunNormalization({
        departmentsAnalyzed: 2,
        dayFoldersDetected: 9,
        proposedActions: {
          keep: 4,
        },
      });

      assert.equal(normalized.departmentsAnalyzed, 2);
      assert.equal(normalized.dayFoldersDetected, 9);
      assert.equal(normalized.proposedActions.keep, 4);
      assert.equal(normalized.proposedActions.link, 0);
      assert.equal(normalized.proposedActions.move, 0);
      assert.equal(normalized.proposedActions.skip, 0);
    },
  },
  {
    name: "drive sync dry-run preview model builds summary and normalization safely",
    run: () => {
      const model = buildDriveSyncDryRunPreviewModel({
        reconciliation: {
          totalScanned: 3,
          candidateMatches: 2,
          normalization: {
            duplicateDayFolders: 1,
            proposedActions: { skip: 2 },
          },
        },
      });

      assert.equal(model.summary.totalScanned, 3);
      assert.equal(model.summary.candidateMatches, 2);
      assert.equal(model.normalization.duplicateDayFolders, 1);
      assert.equal(model.normalization.proposedActions.skip, 2);
    },
  },
  {
    name: "drive sync dry-run preview formatter includes warnings and errors summary",
    run: () => {
      const message = formatDriveSyncDryRunPreviewMessage({
        totalScanned: 3,
        candidateMatches: 2,
        attendanceWouldBackfill: 1,
        geoWouldBackfill: 0,
        refreshedLinksWouldChange: 1,
        skippedAmbiguous: 1,
        unchanged: 1,
        warnings: ["Legacy folder skipped"],
        errors: ["Drive metadata read timeout"],
      });

      assert.match(message, /Warnings: 1/);
      assert.match(message, /Errors: 1/);
      assert.match(message, /Legacy folder skipped/);
      assert.match(message, /Drive metadata read timeout/);
    },
  },
];

let failedCount = 0;

for (const testCase of tests) {
  try {
    await testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failedCount += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(error);
  }
}

if (failedCount > 0) {
  console.error(`\n${failedCount} client unit test(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${tests.length} client unit tests passed.`);
