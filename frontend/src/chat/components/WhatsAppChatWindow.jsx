"use client";

import React, { useState } from 'react';
import { 
  Window, 
  MessageList, 
  MessageInput, 
  ChannelHeader,
  useChannelStateContext 
} from 'stream-chat-react';
import FilePreviewOverlay from './FilePreviewOverlay';
import VoiceRecorder from './VoiceRecorder';

const WhatsAppChatWindow = () => {
  const { channel } = useChannelStateContext();
  const [previewData, setPreviewData] = useState({ isOpen: false, fileUrl: '', fileType: '', fileName: '' });

  const handleOpenAttachment = (attachment) => {
    // Determine type
    let type = 'file';
    if (attachment.type === 'image' || attachment.image_url) type = 'image';
    if (attachment.type === 'video' || attachment.video_url) type = 'video';
    if (attachment.mime_type?.includes('pdf')) type = 'pdf';

    setPreviewData({
      isOpen: true,
      fileUrl: attachment.asset_url || attachment.image_url || attachment.video_url,
      fileType: type,
      fileName: attachment.title || attachment.fallback || 'File'
    });
  };

  const closePreview = () => setPreviewData({ ...previewData, isOpen: false });

  if (!channel) return (
    <div className="wa-chat-empty">
      <div className="wa-empty-content">
        <div className="wa-empty-icon">📱</div>
        <h2>MBK Chat for Desktop</h2>
        <p>Send and receive messages without keeping your phone online.</p>
        <p className="wa-empty-footer">🔒 End-to-end encrypted</p>
      </div>
    </div>
  );

  return (
    <div className="wa-chat-window">
      <Window>
        <div className="wa-chat-header">
           <ChannelHeader />
        </div>
        <MessageList 
          onOpenAttachment={handleOpenAttachment}
          // Some versions of stream use handleOpenAttachment or provide it via context
        />
        <div className="wa-message-input-container">
          <MessageInput focus />
          <VoiceRecorder channel={channel} />
        </div>
      </Window>

      <FilePreviewOverlay 
        {...previewData}
        onClose={closePreview}
      />
    </div>
  );
};

export default WhatsAppChatWindow;
