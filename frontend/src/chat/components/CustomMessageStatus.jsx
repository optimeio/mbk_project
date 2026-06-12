import React from 'react';
import { useMessageContext, useChatContext } from 'stream-chat-react';
import { Check, CheckCheck, Clock } from 'lucide-react';

/**
 * Renders WhatsApp-style message receipts:
 * 🕒 Sending...
 * ✔ Sent to server (Single grey)
 * ✔✔ Delivered to client (Double grey)
 * ✔✔ Read by user (Double blue)
 */
export default function CustomMessageStatus() {
  const { message, isMyMessage } = useMessageContext();
  const { client } = useChatContext();

  // Only show receipts for messages sent by the current user
  if (!isMyMessage() || !message) return null;

  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';
  const isReceived = message.status === 'received';
  
  // Calculate who has read the message (excluding the sender)
  const currentUserId = client.userID;
  const readByCount = Object.values(message.readBy || {}).filter(
    (readObj) => readObj.user?.id !== currentUserId
  ).length;

  const isRead = readByCount > 0;

  // Render the appropriate icon
  let icon = null;

  if (isFailed) {
    icon = <span style={{ color: '#e05252', fontSize: 10, fontWeight: 700 }}>Failed</span>;
  } else if (isSending) {
    icon = <Clock size={12} color="#8ab89a" />;
  } else if (isRead) {
    icon = <CheckCheck size={14} color="#3b82f6" />; // Double Blue Tick
  } else if (isReceived) {
    // If it's a 1-on-1 and they are online but haven't read, it's double grey. 
    // Stream natively doesn't split "delivered" vs "sent" strictly without push receipts,
    // so we usually default `received` to Double Grey to match WhatsApp behavior for delivered.
    icon = <CheckCheck size={14} color="#8ab89a" />; // Double Grey Tick
  } else {
    icon = <Check size={14} color="#8ab89a" />; // Single Grey Tick (Fallback)
  }

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      marginLeft: 4, 
      verticalAlign: 'middle',
      opacity: 0.9 
    }}>
      {icon}
    </div>
  );
}
