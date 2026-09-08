// src/chat/components/ChatMessageList.jsx
"use client";

import { useChat } from "@/context/ChatContext";

export default function ChatMessageList() {
  const { messages } = useChat();

  return (
    <ul className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, idx) => (
        <li
          key={msg.id || idx}
          className="max-w-3/4 bg-white/10 rounded-lg px-3 py-2 text-sm"
        >
          <div className="font-medium">{msg.sender?.name || "You"}</div>
          <div className="break-words">{msg.content}</div>
          <div className="text-xs opacity-70 mt-1">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </li>
      ))}
    </ul>
  );
}
