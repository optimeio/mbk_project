"use client";

import React from "react";
import Image from "next/image";

import { MBK_CARRIERZ_BRAND, PORTAL_BRAND_IMAGE_CLASS } from "@/shared/config/portalBrand";

/**
 * Keeps the portal shell usable if the topbar throws during render.
 * Renders a minimal static header instead of blanking the whole viewport.
 */
class PortalTopbarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[PortalTopbar] render error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <header
          className="relative z-40 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"
          role="banner"
        >
          <div className="flex h-20 items-center justify-between gap-4 px-4 md:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Portal
              </p>
              <h1 className="mt-1 truncate text-xl font-semibold text-slate-900 md:text-2xl">
                Overview
              </h1>
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d6e5f0] bg-white p-1 shadow-sm"
              aria-hidden
            >
              <Image
                src={MBK_CARRIERZ_BRAND.logo.sm}
                alt=""
                width={32}
                height={32}
                className={PORTAL_BRAND_IMAGE_CLASS}
              />
            </div>
          </div>
        </header>
      );
    }

    return this.props.children;
  }
}

export default PortalTopbarErrorBoundary;
