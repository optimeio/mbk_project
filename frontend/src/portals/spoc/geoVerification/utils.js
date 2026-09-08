"use client";

import { FILE_BASE_URL } from "@/services/api";
import { getSecureImageUrl } from "@/utils/imageUtils";
import { normalizeGeoSubmissionStatus } from "@/modules/attendance/utils/geoVerificationStatus";

export const STATUS_TABS = [
    { key: "pending", label: "Pending" },
    { key: "manual_review", label: "Manual Review" },
    { key: "completed", label: "Completed" },
    { key: "all", label: "All" },
];

export const INITIAL_VISIBLE_COUNT = 8;
export const VISIBLE_INCREMENT = 8;

export const normalizeGeoStatus = (submission = {}) =>
    normalizeGeoSubmissionStatus(submission);

export const formatDate = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date unavailable";
    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const formatTime = (value) => {
    if (!value) return "Time unavailable";
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    return String(value);
};

export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    if ([lat1, lon1, lat2, lon2].some((item) => typeof item !== "number" || Number.isNaN(item))) {
        return null;
    }

    const radius = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;

    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const toFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export const getPreferredCheckOutPhoto = (submission) => {
    const photos = Array.isArray(submission?.checkOut?.photos) ? submission.checkOut.photos : [];

    return (
        photos.find((photo) =>
            String(photo?.validationStatus || "").trim().toLowerCase() === "verified" &&
            Number.isFinite(toFiniteNumber(photo?.latitude)) &&
            Number.isFinite(toFiniteNumber(photo?.longitude))
        ) ||
        photos.find((photo) =>
            Number.isFinite(toFiniteNumber(photo?.latitude)) &&
            Number.isFinite(toFiniteNumber(photo?.longitude))
        ) ||
        null
    );
};

export const getPreferredCheckOutLocation = (submission) => {
    const preferredPhoto = getPreferredCheckOutPhoto(submission);
    if (preferredPhoto) {
        const distanceKm = toFiniteNumber(preferredPhoto?.distanceKm);
        return {
            lat: toFiniteNumber(preferredPhoto?.latitude),
            lng: toFiniteNumber(preferredPhoto?.longitude),
            distanceFromCollege: Number.isFinite(distanceKm) ? distanceKm * 1000 : null,
            accuracy: null,
            source: "geo-tag-image",
        };
    }

    const fallbackLocation = submission?.checkOut?.location || null;
    return {
        lat: toFiniteNumber(
            submission?.checkOutLatitude ??
                fallbackLocation?.lat ??
                submission?.latitude
        ),
        lng: toFiniteNumber(
            submission?.checkOutLongitude ??
                fallbackLocation?.lng ??
                submission?.longitude
        ),
        distanceFromCollege: toFiniteNumber(
            submission?.checkOutGeoDistanceMeters ?? fallbackLocation?.distanceFromCollege
        ),
        accuracy: toFiniteNumber(fallbackLocation?.accuracy),
        source: "live-location",
    };
};

export const getPhotoEntries = (submission) => {
    if (Array.isArray(submission?.checkOut?.photos) && submission.checkOut.photos.length) {
        return submission.checkOut.photos
            .map((photo, index) => {
                const fileUrl = getSecureImageUrl(photo?.url || photo);
                if (!fileUrl) return null;

                return {
                    key: `${submission?._id || "submission"}-photo-${index}`,
                    url: fileUrl,
                    validationStatus: photo?.validationStatus || null,
                    validationReason: photo?.validationReason || null,
                    validationCode: photo?.validationCode || photo?.verificationReport?.reasonCode || null,
                    missingFields: photo?.missingFields || photo?.verificationReport?.missingFields || [],
                    validationSource:
                        photo?.validationSource || photo?.verificationReport?.source || null,
                    latitude: photo?.latitude ?? null,
                    longitude: photo?.longitude ?? null,
                    distanceKm: photo?.distanceKm ?? null,
                    verificationReport: photo?.verificationReport || null,
                };
            })
            .filter(Boolean);
    }

    if (Array.isArray(submission?.checkOutGeoImageUrls) && submission.checkOutGeoImageUrls.length) {
        return submission.checkOutGeoImageUrls
            .map((photo, index) => {
                const fileUrl = getSecureImageUrl(photo);
                if (!fileUrl) return null;

                return {
                    key: `${submission?._id || "submission"}-legacy-photo-${index}`,
                    url: fileUrl,
                    validationStatus: null,
                    validationReason: null,
                    validationSource: null,
                    latitude: null,
                    longitude: null,
                    distanceKm: null,
                    verificationReport: null,
                };
            })
            .filter(Boolean);
    }

    if (submission?.checkOutGeoImageUrl) {
        const fileUrl = getSecureImageUrl(submission.checkOutGeoImageUrl);
        return fileUrl
            ? [
                  {
                      key: `${submission?._id || "submission"}-legacy-photo-single`,
                      url: fileUrl,
                      validationStatus: null,
                      validationReason: null,
                      validationSource: null,
                      latitude: null,
                      longitude: null,
                      distanceKm: null,
                      verificationReport: null,
                  },
              ]
            : [];
    }

    return [];
};

export const getActivityUrl = (folder, assetPath, token) => {
    const fileName = String(assetPath || "").split(/[/\\]/).pop();
    if (!fileName) return null;
    return `${FILE_BASE_URL}/api/uploads/attendance/${folder}/${fileName}${
        token ? `?token=${token}` : ""
    }`;
};
