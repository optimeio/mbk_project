"use client";

import PortalViewport from "@/components/common/PortalViewport";

export default function ChatRouteLayout({ children }) {
  return (
    <PortalViewport
      compact
      showTopbar={false}
      contentWrapperClassName="overflow-hidden"
      contentInnerClassName="h-full p-0 md:p-0"
    >
      {children}
    </PortalViewport>
  );
}
