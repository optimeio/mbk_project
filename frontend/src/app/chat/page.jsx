// src/app/chat/page.jsx
"use client";

import { ChatProvider, useChat } from "@/context/ChatContext";
import ChatSidebar from "@/chat/components/ChatSidebar";
import ChatMessageList from "@/chat/components/ChatMessageList";
import ChatInput from "@/chat/components/ChatInput";
import ChatHeader from "@/chat/components/ChatHeader";

function ChatLayout() {
  const { selectedChatId, chats } = useChat();
  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ChatHeader chatTitle={selectedChat?.title} />
        <ChatMessageList />
        <ChatInput />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}
