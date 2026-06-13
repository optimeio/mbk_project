// src/chat/components/ChatHeader.jsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

/**
 * Header for the chat view. Shows a back button and the chat title.
 * Expects `chatTitle` prop.
 */
export default function ChatHeader({ chatTitle }) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex items-center border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
      <button
        onClick={handleBack}
        className="mr-3 rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-accentLight"
      >
        <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
      </button>
      <h2 className="text-lg font-semibold text-gray-800">{chatTitle || "Chat"}</h2>
    </div>
  );
}
