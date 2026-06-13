// src/chat/components/ChatInput.jsx
"use client";

import { useState } from "react";
import { useChat } from "@/context/ChatContext";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

export default function ChatInput() {
  const [text, setText] = useState("");
  const { postMessage } = useChat();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await postMessage(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSend} className="flex items-center gap-2 p-4 border-t border-white/20 bg-gradient-to-br from-[#0f3f5c] to-[#1a6b9f]">
      <input
        type="text"
        placeholder="Type a message…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white"
      />
      <button type="submit" className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition">
        <PaperAirplaneIcon className="h-5 w-5 text-white" />
      </button>
    </form>
  );
}
