// src/chat/components/ChatSidebar.jsx
"use client";

import { useChat } from "@/context/ChatContext";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function ChatSidebar({ onSelect }) {
  const { chats, selectedChatId, selectChat } = useChat();

  const handleSelect = (chat) => {
    selectChat(chat.id);
    if (onSelect) onSelect(chat.id);
  };

  return (
    <aside className="w-64 bg-gradient-to-br from-[#0f3f5c] to-[#1a6b9f] text-white flex flex-col">
      <header className="p-4 flex items-center border-b border-white/20">
        <h2 className="text-xl font-semibold flex-1">Chats</h2>
      </header>
      <ul className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <li
            key={chat.id}
            onClick={() => handleSelect(chat)}
            className={`cursor-pointer p-3 hover:bg-white/10 transition-colors ${selectedChatId === chat.id ? "bg-white/20" : ""}`}
          >
            <div className="font-medium truncate">{chat.title || "Untitled"}</div>
            <div className="text-sm opacity-80 truncate">{chat.lastMessage}</div>
          </li>
        ))}
      </ul>
      <footer className="p-4 border-t border-white/20">
        <button
          onClick={() => alert("Start new chat – not implemented")}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-white/10 py-2 hover:bg-white/20 transition"
        >
          <ArrowLeftIcon className="h-5 w-5" /> New Chat
        </button>
      </footer>
    </aside>
  );
}
