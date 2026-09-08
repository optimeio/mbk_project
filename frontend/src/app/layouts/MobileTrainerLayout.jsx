"use client";

import { memo } from "react";

/**
 * Legacy wrapper kept for trainer portal pages.
 * Bottom navigation is handled once by PortalViewport → MobileBottomNav.
 */
const MobileTrainerLayout = ({ children }) => (
  <div className="min-h-0 w-full">{children}</div>
);

export default memo(MobileTrainerLayout);
