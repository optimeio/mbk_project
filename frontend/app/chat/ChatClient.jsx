"use client";

import dynamic from "next/dynamic";

// Heavy chat components are lazily imported to avoid hydration issues.
const ChatWorkspace = dynamic(() => import("@/chat/components/ChatLayout"));

export default function ChatClient() {
  return <ChatWorkspace />;
}
