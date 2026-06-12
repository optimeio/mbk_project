"use client";

import { useEffect } from "react";

const CHAT_STYLE_HREF = "/styles/chat-noncritical.css";

export default function DeferredChatStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const existing = document.querySelector('link[data-chat-noncritical="stylesheet"]');
    if (existing) return;

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = CHAT_STYLE_HREF;
    stylesheet.setAttribute("data-chat-noncritical", "stylesheet");
    document.head.appendChild(stylesheet);
  }, []);

  return null;
}

