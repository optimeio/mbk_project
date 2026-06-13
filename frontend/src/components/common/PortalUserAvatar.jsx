"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  collectPortalUserAvatarSources,
  getPortalUserInitial,
  isPortalRecord,
  normalizePortalUser,
} from "@/utils/portalUserDisplay";

export const PORTAL_AVATAR_CONTAINER_CLASS =
  "h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[#d6e5f0] bg-[#f4f9fc] shadow-sm";

export const PORTAL_AVATAR_HERO_SIZE_CLASS = "h-14 w-14 sm:h-16 sm:w-16";

export const PORTAL_AVATAR_FALLBACK_CLASS =
  "flex h-full w-full items-center justify-center rounded-2xl bg-[#f4f9fc] text-sm font-semibold uppercase leading-none text-[#1d5f87]";

export const PORTAL_AVATAR_HERO_FALLBACK_CLASS =
  "flex h-full w-full items-center justify-center rounded-2xl bg-[#f4f9fc] text-lg font-semibold uppercase leading-none text-[#1d5f87] sm:text-xl";

function PortalUserAvatar({
  user = null,
  profile = null,
  className = PORTAL_AVATAR_CONTAINER_CLASS,
  fallbackClassName = PORTAL_AVATAR_FALLBACK_CLASS,
  imageClassName = "h-full w-full object-cover object-center",
  initial: initialOverride,
  sources: sourcesOverride,
  alt,
  isLoading = false,
}) {
  const safeUser = useMemo(() => normalizePortalUser(user), [user]);
  const safeProfile = useMemo(
    () => (isPortalRecord(profile) ? profile : null),
    [profile],
  );

  const avatarSources = useMemo(
    () => sourcesOverride || collectPortalUserAvatarSources(safeUser, safeProfile),
    [safeProfile, safeUser, sourcesOverride],
  );

  const initial = initialOverride
    || getPortalUserInitial(safeProfile || safeUser);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [avatarSources]);

  const activeSrc = avatarSources[sourceIndex] || "";
  const showImage =
    !isLoading
    && Boolean(activeSrc)
    && sourceIndex < avatarSources.length;

  const handleImageError = useCallback(() => {
    setSourceIndex((currentIndex) => {
      if (currentIndex < avatarSources.length - 1) {
        return currentIndex + 1;
      }
      return avatarSources.length;
    });
  }, [avatarSources.length]);

  const resolvedAlt = alt || `${initial} profile photo`;

  return (
    <Avatar className={className}>
      {showImage ? (
        <AvatarImage
          src={activeSrc}
          alt={resolvedAlt}
          className={imageClassName}
          onError={handleImageError}
        />
      ) : null}
      <AvatarFallback
        delayMs={0}
        className={fallbackClassName}
      >
        {isLoading ? (
          <span
            className="inline-block h-4 w-4 animate-pulse rounded-full bg-[#1d5f87]/20"
            aria-hidden
          />
        ) : (
          <span aria-hidden className="select-none">{initial}</span>
        )}
      </AvatarFallback>
    </Avatar>
  );
}

export default memo(PortalUserAvatar);
