"use client";

import React, { useEffect, useState, useCallback, memo } from "react";
import {
  Chat,
  Channel,
  Thread,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import "./ChatPage.css";

import { useChat } from "./hooks/useChat";
import WhatsAppSidebar from "./components/WhatsAppSidebar";
import WhatsAppChatWindow from "./components/WhatsAppChatWindow";

const ChatPage = () => {
  const { client } = useChat();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!client) return;

    // 🚀 Professional: Browser Notification Logic
    const handleNewMessage = (event) => {
      if (event.user.id !== client.userID && Notification.permission === "granted") {
        new Notification(`${event.user.name || "New Message"}`, {
          body: event.message.text,
          icon: event.user.image,
        });
      }
    };

    client.on("message.new", handleNewMessage);

    // Request permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      client.off("message.new", handleNewMessage);
    };
  }, [client]);

  // 🔍 Optimized Search Logic
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await client.search(
        { members: { $in: [client.userID] } },
        query,
        { limit: 10 }
      );
      setSearchResults(result.results);
      console.log("🔍 Search Results:", result.results);
    } catch (err) {
      console.error("Search Error:", err);
    }
  }, [client]);

  if (!client) return (
    <div className="chat-loading">
      <div className="spinner"></div>
      <p>Initializing secure chat session...</p>
    </div>
  );

  return (
    <Chat client={client} theme="messaging light">
      <div className="wa-app-container">
        
        {/* Sidebar */}
        <WhatsAppSidebar 
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          searchResults={searchResults}
        />

        {/* Chat Window */}
        <div className="wa-main-content">
          <Channel>
            <WhatsAppChatWindow />
            <Thread />
          </Channel>
        </div>

      </div>
    </Chat>
  );
};

export default memo(ChatPage);
