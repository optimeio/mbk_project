"use client";

import { memo, useEffect } from "react";
import {
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  PhotoIcon,
  VideoCameraIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import CTAButton from "@/components/common/CTAButton";
import OptimizedImage from "@/components/common/OptimizedImage";

import { formatGeoValidationSourceLabel } from "@/components/common/GeoVerificationReportCard";

const GEO_TAG_MATCH_RADIUS_LABEL = "10 KM";

const toNumericCoordinate = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const buildGoogleMapsSearchUrl = (latitude, longitude) => {
  const normalizedLatitude = toNumericCoordinate(latitude);
  const normalizedLongitude = toNumericCoordinate(longitude);

  if (!Number.isFinite(normalizedLatitude) || !Number.isFinite(normalizedLongitude)) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${normalizedLatitude},${normalizedLongitude}`;
};

const formatDistanceLabel = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)} km` : "N/A";
};

const getFriendlyGeoFailureReason = (reason) => {
  const normalizedReason = String(reason || "").trim().toLowerCase();

  if (!normalizedReason) {
    return "Verification failed. Please capture the image again.";
  }
  if (normalizedReason.includes("date not matched")) {
    return "The photo date does not match the assigned training date.";
  }
  if (normalizedReason.includes("location not matched")) {
    return `The image was captured outside the allowed ${GEO_TAG_MATCH_RADIUS_LABEL} college area.`;
  }
  if (normalizedReason.includes("geo mismatch")) {
    return "The image GPS stamp does not match the embedded image data.";
  }
  if (normalizedReason.includes("time mismatch")) {
    return "The image time does not match the printed stamp time.";
  }
  if (normalizedReason.includes("no readable location")) {
    return "GPS or date details could not be read. Upload the original GPS camera image.";
  }

  return reason;
};

const getGeoSlotStatusMessage = (slot, isVerified, isPending) => {
  const numericDistance = Number(slot?.distance);
  const hasDistance = Number.isFinite(numericDistance);
  const formattedDistance = hasDistance ? `${numericDistance.toFixed(2)} km` : null;

  if (isVerified) {
    return formattedDistance
      ? `Location matched within ${GEO_TAG_MATCH_RADIUS_LABEL} and date verified. Distance: ${formattedDistance}.`
      : `Location matched within ${GEO_TAG_MATCH_RADIUS_LABEL} and date verified.`;
  }

  if (isPending && slot?.reason) {
    return getFriendlyGeoFailureReason(slot.reason);
  }

  return slot?.uploaded
    ? "Image uploaded and stored for final submit."
    : "Capture or upload the image for this slot.";
};

const getGeoSlotHeadline = (slot, isVerified, isPending) => {
  if (isVerified) return "Success";
  if (isPending) return "Failed";
  return "Waiting";
};

const CheckOutModal = ({
  allThreeImagesUploaded,
  allThreeImagesVerified,
  checkOutData,
  checkOutImageSlots,
  checkOutValidationResults,
  closeCheckOutModal,
  derivedCheckOutFinalStatus,
  getLiveLocation,
  handleCheckOutSubmit,
  handleGeoImageUpload,
  isSubmittingCheckOut,
  locationStatus,
  openGeoValidationDetails,
  selectedSchedule,
  setCheckOutData,
  uploadedGeoImageCount,
  uploadingCheckOutSlot,
  uploadingCheckOutPhase,
}) => {
  useEffect(() => {
    getLiveLocation().catch((error) => console.error("Auto-location failed:", error));
  }, [getLiveLocation]);

  return (
    <div className="dashboard-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm sm:bg-white/60">
      <div className="dashboard-modal-panel h-full w-full overflow-y-auto bg-white p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {selectedSchedule.geoValidationComment ? "Re-Check Out" : "Automated Check-Out"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Upload exactly 3 geo-tagged images. After all 3 uploads are ready, you can submit check-out.
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Image rule: target up to 3 MB and 3 MP (recommended minimum 550 KB). Larger files are auto-optimized before upload.
            </p>
          </div>
          <button onClick={closeCheckOutModal} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-4 mb-6 border border-indigo-100">
          <p className="text-sm font-semibold text-indigo-900">Day {selectedSchedule.dayNumber}</p>
          <p className="mt-1 text-sm text-indigo-700">{selectedSchedule.college}</p>
          <p className="mt-1 text-xs text-indigo-600">{selectedSchedule.date} | {selectedSchedule.time}</p>
        </div>

        <div className="space-y-6">
          {selectedSchedule.geoValidationComment ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                Previous Check-Out Pending
              </p>
              <p className="mt-2 text-sm text-amber-800">{selectedSchedule.geoValidationComment}</p>
            </div>
          ) : null}

          <div className={`rounded-2xl p-4 border ${
            locationStatus.detected
              ? "bg-green-50 border-green-100"
              : locationStatus.error
                ? "bg-red-50 border-red-100"
                : "bg-blue-50 border-blue-100"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <MapPinIcon className={`h-5 w-5 ${
                locationStatus.detected
                  ? "text-green-600"
                  : locationStatus.error
                    ? "text-red-500"
                    : "text-blue-500 animate-pulse"
              }`} />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Live GPS Reference
              </span>
            </div>
            {locationStatus.loading ? (
              <p className="text-sm text-blue-600 font-medium animate-pulse italic">Detecting live GPS...</p>
            ) : null}
            {locationStatus.detected && locationStatus.details ? (
              <div className="space-y-2">
                <p className="text-sm text-green-700 font-bold">Live GPS captured successfully</p>
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-gray-500 bg-white/50 p-2 rounded-lg">
                  <p>LAT: {locationStatus.details.lat.toFixed(5)}</p>
                  <p>LNG: {locationStatus.details.lng.toFixed(5)}</p>
                  <p>ACC: {locationStatus.details.accuracy}m</p>
                  <p className="text-green-600 font-black">READY</p>
                </div>
              </div>
            ) : null}
            {locationStatus.error ? (
              <p className="text-xs text-red-600 font-bold italic">{locationStatus.error}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl border px-3 py-3 ${
              allThreeImagesUploaded ? "border-green-100 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-600"
            }`}>
              <p className="text-[10px] font-black uppercase tracking-wide">Geo-Tag Images</p>
              <p className="mt-1 text-xs">{uploadedGeoImageCount} of 3 images uploaded</p>
            </div>
            <div className={`rounded-xl border px-3 py-3 ${
              allThreeImagesVerified ? "border-green-100 bg-green-50 text-green-700" : "border-amber-100 bg-amber-50 text-amber-700"
            }`}>
              <p className="text-[10px] font-black uppercase tracking-wide">Final Status</p>
              <p className="mt-1 text-xs">
                {derivedCheckOutFinalStatus === "completed" ? "Completed" : "Pending"}
              </p>
            </div>
          </div>

          {allThreeImagesUploaded && !allThreeImagesVerified ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700">Verification Pending</p>
              <p className="mt-2 text-sm text-amber-800">
                All 3 images are uploaded, but at least one image is pending or failed auto verification.
                You can submit check-out now and SPOC/Admin can complete manual review.
              </p>
            </div>
          ) : null}

          {checkOutValidationResults.length ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Latest Image Verification
              </p>
              <div className="mt-3 space-y-2">
                {checkOutValidationResults.map((item) => (
                  <div
                    key={`validation-${item.imageIndex}`}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      item.status === "verified"
                        ? "border-green-100 bg-green-50 text-green-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }`}
                  >
                    <span className="font-black uppercase">
                      Image {item.imageIndex}: {item.status === "verified" ? "Success" : "Failed"}
                    </span>
                    {item.source ? (
                      <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                        {formatGeoValidationSourceLabel(item.source)}
                      </span>
                    ) : null}
                    {item.reason ? <span className="ml-2">{getFriendlyGeoFailureReason(item.reason)}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 uppercase tracking-tighter">
                Check-out Time
              </span>
            </div>
            <span className="text-lg font-black text-gray-900">{checkOutData.checkOutTime}</span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                Geo-Tag Images (Exactly 3) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-gray-500 tracking-tighter uppercase">
                {uploadedGeoImageCount} / 3 Uploaded
              </span>
            </div>

            <div className="space-y-3">
              {checkOutImageSlots.map((slot) => {
                const isVerified = slot.status === "verified";
                const isPending = slot.status === "pending";
                const isUploading = uploadingCheckOutSlot === slot.slotIndex;
                const slotDisabled = isVerified || isUploading || isSubmittingCheckOut;
                const statusMessage = getGeoSlotStatusMessage(slot, isVerified, isPending);
                const statusHeadline = getGeoSlotHeadline(slot, isVerified, isPending);
                const statusDescription = isVerified
                  ? "Location and date verified successfully."
                  : isPending
                    ? "Verification failed for this image."
                    : statusMessage;
                const mapUrl = buildGoogleMapsSearchUrl(slot.latitude, slot.longitude);
                const failureReason = isPending ? getFriendlyGeoFailureReason(slot.reason) : null;

                return (
                  <div
                    key={`geo-slot-${slot.slotIndex}`}
                    className={`rounded-2xl border p-4 ${
                      isVerified
                        ? "border-green-200 bg-green-50"
                        : isPending
                          ? "border-red-200 bg-red-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900">Image {slot.slotIndex + 1}</p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {slot.imageName || "Upload a GeoTag image for this slot"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                          isVerified
                            ? "bg-green-100 text-green-700"
                            : isPending
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isVerified ? "Success" : isPending ? "Failed" : "Not Uploaded"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-[96px,1fr] gap-4">
                      <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                        {slot.previewUrl ? (
                          <OptimizedImage
                            src={slot.previewUrl}
                            alt={`Geo proof ${slot.slotIndex + 1}`}
                            width={96}
                            height={96}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <PhotoIcon className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className={`rounded-2xl border px-3 py-3 ${
                          isVerified
                            ? "border-green-100 bg-white/80"
                            : isPending
                              ? "border-red-100 bg-white/80"
                              : "border-gray-100 bg-gray-50"
                        }`}>
                          <p className={`text-[11px] font-black uppercase tracking-wide ${
                            isVerified
                              ? "text-green-700"
                              : isPending
                                ? "text-red-700"
                                : "text-gray-500"
                          }`}>
                            {statusHeadline}
                          </p>
                          <p className={`mt-1 text-sm font-semibold ${
                            isVerified
                              ? "text-green-700"
                              : isPending
                                ? "text-red-700"
                                : "text-gray-600"
                          }`}>
                            {statusDescription}
                          </p>
                          {isVerified ? (
                            <p className="mt-2 text-xs text-green-700">
                              Distance: {formatDistanceLabel(slot.distance)}
                            </p>
                          ) : null}
                          {failureReason ? (
                            <p className="mt-2 text-xs font-medium text-red-700">
                              Reason: {failureReason}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {mapUrl ? (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wide text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                            >
                              Open map
                            </a>
                          ) : null}

                          {slot.verificationReport ? (
                            <CTAButton
                              type="button"
                              onClick={() => openGeoValidationDetails(slot)}
                              variant="secondary"
                              size="sm"
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              View details
                            </CTAButton>
                          ) : null}
                        </div>

                        {isVerified ? (
                          <p className="text-[11px] font-bold text-green-700">
                            Verified image locked. Replacement is blocked.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <label className={`cursor-pointer rounded-xl border-2 border-dashed px-3 py-3 text-center transition-all ${
                              slotDisabled
                                ? "cursor-not-allowed border-indigo-100 bg-indigo-50/50 opacity-60"
                                : "border-indigo-200 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100/60"
                            }`}>
                              <CameraIcon className="mx-auto h-5 w-5 text-indigo-500" />
                              <span className="mt-1 block text-[10px] font-black uppercase text-indigo-700">
                                {slot.uploaded ? "Recapture" : "Capture"}
                              </span>
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg"
                                capture="environment"
                                disabled={slotDisabled}
                                onChange={(event) => {
                                  const nextFile = event.target.files?.[0];
                                  if (nextFile) {
                                    handleGeoImageUpload(slot.slotIndex, nextFile);
                                  }
                                  event.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                            <label className={`cursor-pointer rounded-xl border-2 border-dashed px-3 py-3 text-center transition-all ${
                              slotDisabled
                                ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
                            }`}>
                              <PhotoIcon className="mx-auto h-5 w-5 text-gray-500" />
                              <span className="mt-1 block text-[10px] font-black uppercase text-gray-700">
                                {slot.uploaded ? "Replace" : "Upload"}
                              </span>
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                disabled={slotDisabled}
                                onChange={(event) => {
                                  const nextFile = event.target.files?.[0];
                                  if (nextFile) {
                                    handleGeoImageUpload(slot.slotIndex, nextFile);
                                  }
                                  event.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}

                        {isUploading ? (
                          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                            {uploadingCheckOutPhase === "compressing"
                              ? "Compressing image..."
                              : "Uploading and verifying image..."}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className={`text-center text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 ${
              allThreeImagesUploaded
                ? allThreeImagesVerified
                  ? "text-green-600"
                  : "text-amber-600"
                : "text-gray-500"
            }`}>
              <CheckCircleIcon className="h-3 w-3" />
              {!allThreeImagesUploaded
                ? "Upload all 3 images to unlock check out"
                : allThreeImagesVerified
                  ? "All 3 images are verified and ready for check out"
                  : "All 3 images uploaded. Submit now for manual review if needed."}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Activity Photos ({checkOutData.activityPhotos.length}/5)
                </label>
                <label className={`cursor-pointer flex items-center justify-center h-12 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors group ${
                  checkOutData.activityPhotos.length >= 5 ? "opacity-50 cursor-not-allowed" : ""
                }`}>
                  <PhotoIcon className={`h-5 w-5 ${
                    checkOutData.activityPhotos.length ? "text-green-500" : "text-gray-400"
                  } group-hover:scale-110 transition-transform`} />
                  <input
                    type="file"
                    accept="image/*"
                    disabled={checkOutData.activityPhotos.length >= 5}
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0];
                      if (nextFile) {
                        setCheckOutData((previous) => ({
                          ...previous,
                          activityPhotos: [...previous.activityPhotos, nextFile].slice(0, 5),
                        }));
                      }
                      event.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Activity Videos ({checkOutData.activityVideos.length}/5)
                </label>
                <label className={`cursor-pointer flex items-center justify-center h-12 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors group ${
                  checkOutData.activityVideos.length >= 5 ? "opacity-50 cursor-not-allowed" : ""
                }`}>
                  <VideoCameraIcon className={`h-5 w-5 ${
                    checkOutData.activityVideos.length ? "text-green-500" : "text-gray-400"
                  } group-hover:scale-110 transition-transform`} />
                  <input
                    type="file"
                    accept="video/*"
                    disabled={checkOutData.activityVideos.length >= 5}
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0];
                      if (nextFile) {
                        setCheckOutData((previous) => ({
                          ...previous,
                          activityVideos: [...previous.activityVideos, nextFile].slice(0, 5),
                        }));
                      }
                      event.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {checkOutData.activityPhotos.length || checkOutData.activityVideos.length ? (
              <div className="flex flex-wrap gap-2">
                {checkOutData.activityPhotos.map((_, index) => (
                  <div
                    key={`p-${index}`}
                    className="flex items-center gap-1 bg-green-50 text-[8px] font-black text-green-700 px-2 py-1 rounded-full border border-green-100"
                  >
                    PHOTO {index + 1}
                    <XCircleIcon
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() =>
                        setCheckOutData((previous) => ({
                          ...previous,
                          activityPhotos: previous.activityPhotos.filter((_, itemIndex) => itemIndex !== index),
                        }))}
                    />
                  </div>
                ))}
                {checkOutData.activityVideos.map((_, index) => (
                  <div
                    key={`v-${index}`}
                    className="flex items-center gap-1 bg-blue-50 text-[8px] font-black text-blue-700 px-2 py-1 rounded-full border border-blue-100"
                  >
                    VIDEO {index + 1}
                    <XCircleIcon
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() =>
                        setCheckOutData((previous) => ({
                          ...previous,
                          activityVideos: previous.activityVideos.filter((_, itemIndex) => itemIndex !== index),
                        }))}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <CTAButton
            onClick={closeCheckOutModal}
            disabled={isSubmittingCheckOut}
            variant="ghost"
            className={`px-6 py-3.5 text-sm font-bold rounded-2xl transition-colors ${
              allThreeImagesUploaded ? "flex-1" : "w-full"
            } ${
              isSubmittingCheckOut ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Cancel
          </CTAButton>
          {allThreeImagesUploaded ? (
            <CTAButton
              onClick={handleCheckOutSubmit}
              loading={isSubmittingCheckOut}
              disabled={isSubmittingCheckOut}
              variant="primary"
              className={`flex-2 px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center transition-all shadow-lg ${
                isSubmittingCheckOut
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-green-200"
              }`}
              icon={<CheckCircleIcon className="h-5 w-5 mr-2" />}
            >
              CHECK OUT
            </CTAButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
export default memo(CheckOutModal);
