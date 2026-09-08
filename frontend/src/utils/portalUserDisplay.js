import { getDocumentImagePreviewCandidates } from "@/utils/imageUtils";

/** @returns {boolean} True when value is a plain object suitable for portal user fields. */
export const isPortalRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Coerce nullable auth/profile payloads into a safe object.
 * Default parameters alone do not protect against explicit `null`.
 */
export const normalizePortalUser = (user) =>
  isPortalRecord(user) ? user : {};

export const getPortalUserDisplayName = (user) => {
  const safeUser = normalizePortalUser(user);

  const composedName = [safeUser.firstName, safeUser.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    safeUser.name
    || safeUser.displayName
    || composedName
    || safeUser.email
    || "Portal User"
  );
};

/**
 * First letter of the trainer's first name (e.g. "S" for Sukhel).
 * Falls back to the first token of display name, then email.
 */
export const getPortalUserInitial = (user) => {
  const safeUser = normalizePortalUser(user);

  const firstName = String(safeUser.firstName || "").trim();
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }

  const displayName = getPortalUserDisplayName(safeUser);
  const firstToken = String(displayName).trim().split(/\s+/)[0] || "";
  if (firstToken) {
    return firstToken.charAt(0).toUpperCase();
  }

  const emailInitial = String(safeUser.email || "U").trim().charAt(0);
  return emailInitial ? emailInitial.toUpperCase() : "U";
};

export const collectPortalUserAvatarSources = (user, profile = null) => {
  const safeUser = normalizePortalUser(user);
  const merged = normalizePortalUser(profile);
  const nestedUser = isPortalRecord(merged.userId) ? merged.userId : null;

  const rawSources = [
    merged.documentProgress?.selfiePhoto,
    merged.documents?.selfiePhoto,
    merged.photo,
    merged.profilePicture,
    merged.documentProgress?.passportPhoto,
    merged.documents?.passportPhoto,
    nestedUser?.profilePicture,
    safeUser.profilePicture,
    safeUser.photo,
    safeUser.documentProgress?.selfiePhoto,
    safeUser.documents?.selfiePhoto,
  ];

  return Array.from(
    new Set(
      rawSources.flatMap((source) => getDocumentImagePreviewCandidates(source)),
    ),
  );
};
