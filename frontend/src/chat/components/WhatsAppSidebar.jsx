"use client";

import React, { useState, useEffect } from 'react';
import { useChatContext } from 'stream-chat-react';
import UserAvatar from './UserAvatar';

const WhatsAppSidebar = ({ onSelectChannel, searchQuery, onSearchChange }) => {
  const { client, setActiveChannel } = useChatContext();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const filter = { members: { $in: [client.userID] } };
        const sort = { last_message_at: -1 };
        const result = await client.queryChannels(filter, sort, {
          watch: true,
          presence: true,
        });
        setChannels(result);
      } catch (err) {
        console.error('Error fetching channels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [client]);

  return (
    <div className="wa-sidebar">
      <div className="wa-sidebar-header">MBK Chat</div>

      <div className="wa-search-container">
        <div className="wa-search-bar">
          <input 
            placeholder="Search chats..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="wa-channel-list">
        {loading ? (
          <div className="wa-loading">Loading...</div>
        ) : (
          channels.map((ch) => {
            const lastMsg = ch.state.messages.slice(-1)[0]?.text || "No messages";
            return (
              <div 
                key={ch.id} 
                className="wa-channel-item"
                onClick={() => setActiveChannel(ch)}
              >
                <UserAvatar user={ch.data} size={48} />
                <div className="wa-channel-info">
                   <div className="wa-channel-top">
                      <span className="wa-channel-name">{ch.data.name || "Chat"}</span>
                   </div>
                   <p className="wa-channel-last-msg">{lastMsg}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WhatsAppSidebar;
