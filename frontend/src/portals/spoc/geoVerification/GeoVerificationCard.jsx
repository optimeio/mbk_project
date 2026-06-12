"use client";

import { memo, useMemo, useState } from "react";
import GeoVerificationReportCard, {
    formatGeoValidationSourceLabel,
} from "@/components/common/GeoVerificationReportCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowDownTrayIcon,
    ClockIcon,
    ExclamationCircleIcon,
    MapPinIcon,
    PhotoIcon,
    UserIcon,
    VideoCameraIcon,
} from "@heroicons/react/24/outline";
import {
    calculateDistanceMeters,
    formatDate,
    formatTime,
    getActivityUrl,
    getPhotoEntries,
    getPreferredCheckOutLocation,
    normalizeGeoStatus,
    toFiniteNumber,
} from "./utils";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

const GeoVerificationCard = memo(function GeoVerificationCard({
    submission,
    accessToken,
    onSelectImage,
    onDownload,
}) {
    const trainerName = submission.trainerId?.userId?.name || submission.trainerId?.name || "Unknown Trainer";
    const courseName =
        submission.courseId?.name ||
        submission.courseId?.title ||
        submission.scheduleId?.courseId?.name ||
        submission.scheduleId?.courseId?.title ||
        submission.scheduleId?.subject ||
        submission.topic ||
        "Course";
    const collegeName = submission.collegeId?.name || "Unknown College";
    const location = getPreferredCheckOutLocation(submission);
    const distanceMeters =
        typeof location?.distanceFromCollege === "number"
            ? location.distanceFromCollege
            : calculateDistanceMeters(
                  toFiniteNumber(location?.lat),
                  toFiniteNumber(location?.lng),
                  toFiniteNumber(submission.collegeId?.latitude),
                  toFiniteNumber(submission.collegeId?.longitude)
              );
    const withinRange = typeof distanceMeters === "number" ? distanceMeters <= 10000 : null;
    const photoEntries = getPhotoEntries(submission);
    const resolvedCheckOutTime =
        submission.checkOut?.time ||
        submission.checkOutTime ||
        submission.checkOutCapturedAt ||
        (Array.isArray(submission?.checkOut?.photos)
            ? submission.checkOut.photos.find((photo) => photo?.capturedAt)?.capturedAt
            : null);
    const [showPhotoEvidence, setShowPhotoEvidence] = useState(false);
    const [showActivityEvidence, setShowActivityEvidence] = useState(false);
    const activityPhotos = useMemo(
        () => (Array.isArray(submission.activityPhotos) ? submission.activityPhotos : []),
        [submission.activityPhotos]
    );
    const activityVideos = useMemo(
        () => (Array.isArray(submission.activityVideos) ? submission.activityVideos : []),
        [submission.activityVideos]
    );
    const hasActivityEvidence = activityPhotos.length > 0 || activityVideos.length > 0;
    const { user } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleManualApprove = async () => {
        if (!window.confirm("Are you sure you want to MANUALLY approve this geo-tag verification? This will mark the check-out as VERIFIED in the audit trail.")) return;
        
        setIsProcessing(true);
        try {
            await api.post("/v1/attendance/verify-geo", {
                attendanceId: submission._id,
                spocId: user?.id || user?._id
            });
            toast.success("Geo-tag approved manually");
            // In a real app, we'd trigger a refetch or update parent state
            // For now, we rely on the manual reload or future signal
            window.location.reload(); 
        } catch (error) {
            console.error("Manual approval failed:", error);
            toast.error(error?.response?.data?.message || "Failed to approve geo-tag manually");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualReject = async () => {
        const reason = window.prompt("Enter reason for rejection (required):");
        if (!reason) {
            if (reason === "") toast.error("Rejection reason is required");
            return;
        }

        setIsProcessing(true);
        try {
            await api.post("/v1/attendance/reject-geo", {
                attendanceId: submission._id,
                spocId: user?.id || user?._id,
                reason
            });
            toast.success("Geo-tag rejected manually");
            window.location.reload();
        } catch (error) {
            console.error("Manual rejection failed:", error);
            toast.error(error?.response?.data?.message || "Failed to reject geo-tag manually");
        } finally {
            setIsProcessing(false);
        }
    };

    const statusKey = normalizeGeoStatus(submission);
    const statusMeta =
        statusKey === "auto_verified"
            ? { label: "Auto Verified", className: "bg-green-100 text-green-700" }
            : statusKey === "manually_verified"
                ? { label: "Verified", className: "bg-green-100 text-green-700" }
                : statusKey === "manual_review"
                    ? { label: "Manual Review", className: "bg-blue-100 text-blue-700" }
                    : statusKey === "rejected"
                        ? { label: "Rejected", className: "bg-red-100 text-red-700" }
                        : { label: "Pending", className: "bg-amber-100 text-amber-700" };

    return (
        <article
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            style={{ contentVisibility: "auto", containIntrinsicSize: "760px" }}
        >
            <div className="border-b border-gray-100 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-indigo-50 p-2.5">
                            <UserIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-bold uppercase tracking-tight text-gray-900">
                                    {trainerName}
                                </h2>
                                <Badge className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                                    Topic: {courseName}
                                </Badge>
                            </div>
                            <p className="mt-1.5 text-sm font-medium text-gray-600">{collegeName}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                <Badge className="rounded-full bg-gray-100 px-2.5 py-1">
                                    Day {submission.dayNumber || "-"}
                                </Badge>
                                <Badge className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">
                                    {formatDate(submission.date)} /{" "}
                                    {formatTime(resolvedCheckOutTime)}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <Badge className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusMeta.className}`}>
                            {statusMeta.label}
                        </Badge>
                        {submission.checkOutVerificationMode === "MANUAL" && (
                            <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-[10px] uppercase text-blue-600">
                                Manual Override
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4 px-4 py-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <ClockIcon className="h-4 w-4" />
                            Check-Out Time
                        </div>
                        <p className="mt-2 text-sm font-semibold text-gray-900">
                            {formatTime(resolvedCheckOutTime)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <MapPinIcon className="h-4 w-4" />
                            Distance From College
                        </div>
                        <p className="mt-2 text-sm font-semibold text-gray-900">
                            {typeof distanceMeters === "number"
                                ? `${(distanceMeters / 1000).toFixed(distanceMeters >= 1000 ? 1 : 2)} KM`
                                : "Not available"}
                        </p>
                        {withinRange !== null ? (
                            <p
                                className={`mt-1 text-xs font-medium ${
                                    withinRange ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {withinRange ? "Within 10 KM range" : "Outside 10 KM range"}
                            </p>
                        ) : null}
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <ExclamationCircleIcon className="h-4 w-4" />
                            {location?.source === "geo-tag-image"
                                ? "Verification Source"
                                : "GPS Accuracy"}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-gray-900">
                            {location?.source === "geo-tag-image"
                                ? "Geo-tag image"
                                : location?.accuracy
                                  ? `${location.accuracy} m`
                                  : "Not available"}
                        </p>
                    </div>
                </div>

                {Number.isFinite(toFiniteNumber(location?.lat)) &&
                Number.isFinite(toFiniteNumber(location?.lng)) ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Captured Location
                                </p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">
                                    {Number(location?.lat).toFixed(4)}, {Number(location?.lng).toFixed(4)}
                                </p>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="rounded-full border-indigo-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                            >
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${location?.lat},${location?.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open in Maps
                                </a>
                            </Button>
                        </div>
                    </div>
                ) : null}

                {["pending", "manual_review", "rejected"].includes(statusKey) ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                <div>
                                    <p className="font-semibold text-base">
                                        {statusKey === "manual_review"
                                            ? "Manual review required"
                                            : statusKey === "rejected"
                                                ? "Verification Rejected"
                                                : "Auto-validation is pending"}
                                    </p>
                                    <p className="mt-1 text-sm">
                                        {submission.checkOutVerificationReason ||
                                            submission.geoValidationComment ||
                                            "This check-out did not satisfy the date and location rules."}
                                    </p>
                                    {submission.geoValidationComment && (
                                        <p className="mt-2 text-xs font-medium text-amber-600 uppercase tracking-wider">
                                            Auto-System Diagnostic: {submission.geoValidationComment}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {statusKey === "manual_review" && (
                                <div className="flex shrink-0 gap-2 sm:flex-col lg:flex-row">
                                    <Button
                                        onClick={handleManualApprove}
                                        disabled={isProcessing}
                                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <CheckCircleIcon className="mr-1.5 h-4 w-4" />
                                        Approve
                                    </Button>
                                    <Button
                                        onClick={handleManualReject}
                                        disabled={isProcessing}
                                        variant="outline"
                                        className="rounded-xl border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-md hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <XCircleIcon className="mr-1.5 h-4 w-4" />
                                        Reject
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
                
                {photoEntries.length > 0 && photoEntries.some(p => p.validationCode === 'EXIF_GPS_MISSING') ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <div className="flex items-start gap-3">
                            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="font-semibold">
                                    {photoEntries.filter(p => p.validationCode === 'EXIF_GPS_MISSING').length} image(s) missing GPS metadata
                                </p>
                                <p className="mt-1">
                                    At least one photo was uploaded without embedded GPS/date location data (likely a screenshot or gallery image). These cannot be verified against the college location.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Geo-tag photo evidence</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{photoEntries.length} file(s)</span>
                            {photoEntries.length > 0 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPhotoEvidence((previous) => !previous)}
                                    className="rounded-full border-indigo-200 px-3 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
                                >
                                    {showPhotoEvidence ? "Hide evidence" : "Show evidence"}
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {photoEntries.length === 0 ? (
                        <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-400">
                            <PhotoIcon className="h-8 w-8" />
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide">
                                No geo-tag image uploaded
                            </p>
                        </div>
                    ) : showPhotoEvidence ? (
                        <div className="grid gap-4">
                            {photoEntries.map((photoEntry, index) => (
                                <div
                                    key={photoEntry.key}
                                    className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                                >
                                    <div className="group relative">
                                        <button
                                            type="button"
                                            onClick={() => onSelectImage(photoEntry.url)}
                                            className="block h-44 w-full overflow-hidden bg-gray-100"
                                        >
                                            <img
                                                src={photoEntry.url}
                                                alt={`Check-out evidence ${index + 1}`}
                                                loading="lazy"
                                                decoding="async"
                                                fetchPriority="low"
                                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                            />
                                        </button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon"
                                            onClick={() =>
                                                onDownload(
                                                    photoEntry.url,
                                                    `checkout-evidence-${submission._id}-${index + 1}.jpg`
                                                )
                                            }
                                            className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white/90 text-gray-700 shadow-sm hover:bg-white"
                                        >
                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-3 border-t border-gray-200 bg-white p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                                                        String(photoEntry.validationStatus || "")
                                                            .trim()
                                                            .toLowerCase() === "verified"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-amber-100 text-amber-700"
                                                    }`}
                                                >
                                                    {String(photoEntry.validationStatus || "")
                                                        .trim()
                                                        .toLowerCase() === "verified"
                                                        ? "Verified"
                                                        : photoEntry.validationCode === "EXIF_GPS_MISSING"
                                                            ? "Missing GPS"
                                                            : "Pending"}
                                                </Badge>
                                                {photoEntry.validationSource ? (
                                                    <Badge className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                                                        {formatGeoValidationSourceLabel(photoEntry.validationSource)}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <span className="text-[11px] font-semibold text-gray-500">
                                                Image {index + 1}
                                            </span>
                                        </div>

                                        {photoEntry.validationReason ? (
                                            <p className="text-sm text-amber-700">{photoEntry.validationReason}</p>
                                        ) : null}

                                        {photoEntry.verificationReport ? (
                                            <GeoVerificationReportCard
                                                report={photoEntry.verificationReport}
                                                source={photoEntry.validationSource}
                                                title={`Evidence ${index + 1} report`}
                                            />
                                        ) : (
                                            <div className="grid gap-2 rounded-xl border border-gray-200 bg-slate-50 p-3 text-xs text-gray-600 sm:grid-cols-3">
                                                <p className="font-medium">Lat: {photoEntry.latitude ?? "N/A"}</p>
                                                <p className="font-medium">Lng: {photoEntry.longitude ?? "N/A"}</p>
                                                <p className="font-medium">
                                                    Distance:{" "}
                                                    {typeof photoEntry.distanceKm === "number"
                                                        ? `${photoEntry.distanceKm.toFixed(2)} km`
                                                        : "N/A"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3 text-xs text-indigo-700">
                            Photo evidence is available. Click <span className="font-semibold">Show evidence</span> to render full previews and validation details.
                        </div>
                    )}
                </div>

                {hasActivityEvidence ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-indigo-900">Activity evidence</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowActivityEvidence((previous) => !previous)}
                                className="rounded-full border-indigo-200 px-3 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
                            >
                                {showActivityEvidence ? "Hide activity" : "Show activity"}
                            </Button>
                        </div>
                        {showActivityEvidence ? (
                            <div className="mt-3 flex flex-wrap gap-3">
                            {activityPhotos.map((photoPath, index) => {
                                const photoUrl = getActivityUrl("photos", photoPath, accessToken);
                                if (!photoUrl) return null;

                                return (
                                    <button
                                        key={`${submission._id}-activity-photo-${index}`}
                                        type="button"
                                        onClick={() => onSelectImage(photoUrl)}
                                        className="overflow-hidden rounded-xl border border-indigo-100 bg-white"
                                    >
                                        <img
                                            src={photoUrl}
                                            alt={`Activity ${index + 1}`}
                                            loading="lazy"
                                            decoding="async"
                                            fetchPriority="low"
                                            className="h-16 w-16 object-cover"
                                        />
                                    </button>
                                );
                            })}

                            {activityVideos.map((videoPath, index) => {
                                const videoUrl = getActivityUrl("videos", videoPath, accessToken);
                                if (!videoUrl) return null;

                                return (
                                    <Button
                                        key={`${submission._id}-activity-video-${index}`}
                                        asChild
                                        variant="outline"
                                        size="icon"
                                        className="h-16 w-16 rounded-xl border-indigo-100 bg-white text-indigo-600 hover:bg-indigo-50"
                                    >
                                        <a
                                            href={videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <VideoCameraIcon className="h-6 w-6" />
                                        </a>
                                    </Button>
                                );
                            })}
                            </div>
                        ) : (
                            <p className="mt-3 text-xs text-indigo-700">
                                Activity media exists for this submission. Expand only when needed to keep the page lightweight.
                            </p>
                        )}
                    </div>
                ) : null}
            </div>
        </article>
    );
});

GeoVerificationCard.displayName = "GeoVerificationCard";

export default GeoVerificationCard;
