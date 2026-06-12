"use client";

import { useMemo } from "react";

const CHECK_OUT_IMAGE_SLOT_COUNT = 3;

const buildValidationResultsFromSlots = (slots = []) =>
  slots
    .filter((slot) => slot.uploaded)
    .map((slot) => ({
      imageIndex: slot.slotIndex + 1,
      status: slot.status === "verified" ? "verified" : "pending",
      reason: slot.reason || null,
      distance: slot.distance ?? null,
      latitude: slot.latitude ?? null,
      longitude: slot.longitude ?? null,
      source: slot.validationSource || slot.verificationReport?.source || null,
    }));

export default function useScheduleHook(checkOutImageSlots) {
  const uploadedGeoImageCount = useMemo(
    () => checkOutImageSlots.filter((slot) => slot.uploaded).length,
    [checkOutImageSlots],
  );

  const verifiedGeoImageCount = useMemo(
    () => checkOutImageSlots.filter((slot) => slot.status === "verified").length,
    [checkOutImageSlots],
  );

  const checkOutValidationResults = useMemo(
    () => buildValidationResultsFromSlots(checkOutImageSlots),
    [checkOutImageSlots],
  );

  const allThreeImagesUploaded = uploadedGeoImageCount === CHECK_OUT_IMAGE_SLOT_COUNT;
  const allThreeImagesVerified =
    allThreeImagesUploaded && verifiedGeoImageCount === CHECK_OUT_IMAGE_SLOT_COUNT;

  return {
    allThreeImagesUploaded,
    allThreeImagesVerified,
    checkOutValidationResults,
    derivedCheckOutFinalStatus: allThreeImagesVerified ? "completed" : "pending",
    uploadedGeoImageCount,
    verifiedGeoImageCount,
  };
}
