"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";

import {
  MBK_CARRIERZ_BRAND,
  PORTAL_BRAND_CONTAINER_CLASS,
  PORTAL_BRAND_CONTAINER_COMPACT_CLASS,
  PORTAL_BRAND_IMAGE_CLASS,
} from "@/shared/config/portalBrand";

function PortalBrandMark({
  href = "/trainer/dashboard",
  compact = false,
  className,
  imageClassName = PORTAL_BRAND_IMAGE_CLASS,
  title = MBK_CARRIERZ_BRAND.title,
}) {
  const [showTextFallback, setShowTextFallback] = useState(false);
  const containerClassName =
    className
    || (compact ? PORTAL_BRAND_CONTAINER_COMPACT_CLASS : PORTAL_BRAND_CONTAINER_CLASS);
  const logoSize = compact ? 28 : 32;

  return (
    <Link
      href={href}
      prefetch
      className={`${containerClassName} transition hover:border-[#b8d4e8] hover:bg-[#f8fbfd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5f87]/30`}
      aria-label={title}
      title={title}
    >
      {showTextFallback ? (
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1d5f87]">
          MBK
        </span>
      ) : (
        <Image
          src={MBK_CARRIERZ_BRAND.logo.sm}
          alt={title}
          width={logoSize}
          height={logoSize}
          className={imageClassName}
          sizes={compact ? "28px" : "32px"}
          onError={() => setShowTextFallback(true)}
          priority
        />
      )}
    </Link>
  );
}

export { PORTAL_BRAND_CONTAINER_CLASS, PORTAL_BRAND_CONTAINER_COMPACT_CLASS };
export default memo(PortalBrandMark);
