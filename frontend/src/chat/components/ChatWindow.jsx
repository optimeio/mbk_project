"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Channel, Thread, Window } from 'stream-chat-react';
import { ArrowLeft, Info } from 'lucide-react';
import { chatService } from '@/services/chatService';
import { useSocket } from '@/context/SocketContext';
import { useChat } from '../context/ChatContext';

// Extracted Components
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import InfoPanel from './InfoPanel';
import { getChannelDisplayName } from '../utils/helpers';
import { resolveUserRole, canBroadcast, isSuperAdminRole } from '../services/streamClient';
import { uploadFileToCloudinary } from '../utils/cloudinary';

const T = { 
  bg: '#ffffff', bgPage: '#f2f7f4', border: 'rgba(45,122,82,0.12)', 
  text: '#122c1e', muted: '#5a8c6e', dim: '#8ab89a', 
  green: '#2d7a52', greenL: '#38a169', red: '#e05252' 
};

const DIRECT_CUSTOM_TYPES = new Set(['direct', 'spoc-trainer']);
const GROUP_CUSTOM_TYPES = new Set(['group', 'trainer-group']);
const BROADCAST_CUSTOM_TYPES = new Set(['announcement', 'broadcast']);
const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)(\?|#|$)/i;
const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|mkv|m4v|3gp|ogv)(\?|#|$)/i;
const AUDIO_FILE_PATTERN = /\.(mp3|m4a|aac|wav|ogg|oga|weba|opus)(\?|#|$)/i;

const toSafeString = (value) => String(value || '').trim();
const buildDirectRoomId = (a, b) => `direct:${[toSafeString(a), toSafeString(b)].sort().join(':')}`;

const resolveRealtimeTypeFromFile = (file, forceType) => {
  if (forceType) return forceType;
  const mime = String(file?.type || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
};

const getAudioDurationFromFile = (file) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
};

const resolveAttachmentType = ({ messageType, mimeType, mediaUrl }) => {
  const normalizedType = String(messageType || '').toLowerCase();
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  const normalizedMediaUrl = String(mediaUrl || '').toLowerCase();

  if (normalizedMimeType.startsWith('image/')) return 'image';
  if (normalizedMimeType.startsWith('video/')) return 'video';
  if (normalizedMimeType.startsWith('audio/')) return 'audio';
  if (normalizedType === 'voice') return 'audio';
  if (normalizedType === 'image' || IMAGE_FILE_PATTERN.test(normalizedMediaUrl)) return 'image';
  if (normalizedType === 'video' || VIDEO_FILE_PATTERN.test(normalizedMediaUrl)) return 'video';
  if (normalizedType === 'audio' || AUDIO_FILE_PATTERN.test(normalizedMediaUrl)) return 'audio';
  return 'file';
};

const mapRealtimeMessageToUi = (message, users = {}) => {
  const id = toSafeString(message?.id || message?._id);
  if (!id) return null;
  const tempId = toSafeString(message?.tempId || message?.metadata?.tempId);

  const senderId = toSafeString(message?.senderId || message?.user?.id);
  const createdAt = message?.createdAt || message?.created_at || new Date().toISOString();
  const updatedAt = message?.updatedAt || message?.updated_at || createdAt;
  const isDeleted = Boolean(message?.isDeleted);
  const messageType = String(message?.type || 'text').toLowerCase();
  const mediaUrl = isDeleted ? null : (message?.fileUrl || message?.mediaUrl || null);
  const contentText = isDeleted
    ? 'This message was deleted'
    : String(message?.content || message?.text || '');
  const attachments = [];

  if (mediaUrl) {
    const resolvedAttachmentType = resolveAttachmentType({
      messageType,
      mimeType: message?.mimeType,
      mediaUrl,
    });

    if (resolvedAttachmentType === 'image') {
      attachments.push({ type: 'image', asset_url: mediaUrl, image_url: mediaUrl, thumb_url: mediaUrl, mime_type: message?.mimeType || 'image/*', name: message?.fileName || 'Image', file_size: message?.fileSize ?? null });
    } else if (resolvedAttachmentType === 'video') {
      attachments.push({ type: 'video', asset_url: mediaUrl, video_url: mediaUrl, mime_type: message?.mimeType || 'video/mp4', name: message?.fileName || 'Video', file_size: message?.fileSize ?? null });
    } else if (resolvedAttachmentType === 'audio') {
      attachments.push({ type: 'audio', asset_url: mediaUrl, audio_url: mediaUrl, mime_type: message?.mimeType || 'audio/*', name: messageType === 'voice' ? 'Voice message' : (message?.fileName || 'Audio'), file_size: message?.fileSize ?? null, duration: message?.duration ?? message?.metadata?.duration ?? null });
    } else {
      attachments.push({ type: 'file', asset_url: mediaUrl, mime_type: message?.mimeType || 'application/pdf', name: message?.fileName || 'Document', file_size: message?.fileSize ?? null });
    }
  }

  return {
    id,
    _id: id,
    tempId: tempId || null,
    text: contentText,
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt,
    status: message?.status || 'sent',
    type: messageType,
    isDeleted,
    attachments,
    hiddenFor: Array.isArray(message?.hiddenFor) ? message.hiddenFor : [],
    user: {
      id: senderId,
      name: users?.[senderId]?.name || message?.sender?.name || message?.user?.name || senderId || 'Unknown',
    },
  };
};

const extractSavedMessageFromSendResponse = (response) => {
  if (!response || typeof response !== 'object') return null;
  const candidates = [response?.data?.data, response?.data, response?.message, response];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    if (candidate.id || candidate._id) return candidate;
  }
  return null;
};

export default function ChatWindow({ channel, showInfoPanel, setShowInfoPanel, setActiveChannel, isMobile }) {
  const { client, currentUser, users, isDark } = useChat();
  const [messages, setMessages] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [typing, setTyping] = useState([]);
  const messagesEndRef = useRef(null);
  const typingStopTimeoutRef = useRef(null);
  const currentUserId = currentUser?.id || currentUser?._id;
  const currentRole = resolveUserRole(currentUser);
  const { socket, joinChat } = useSocket();

  const channelMembers = useMemo(() => Object.values(channel?.state?.members || {}), [channel]);
  const otherMember = useMemo(() => channelMembers.find((member) => (member.user_id || member.user?.id) !== currentUserId) || null, [channelMembers, currentUserId]);
  const otherUserId = otherMember?.user_id || otherMember?.user?.id || null;
  const customType = String(channel?.data?.customType || '').toLowerCase();

  const isBroadcastConversation = Boolean(
    channel?.data?.is_announcement ||
    channel?.type === 'admin-announcement-channel' ||
    BROADCAST_CUSTOM_TYPES.has(customType),
  );
  const isGroupConversation = Boolean(
    channel?.data?.is_group ||
    channel?.type === 'trainer-group-channel' ||
    GROUP_CUSTOM_TYPES.has(customType) ||
    (!isBroadcastConversation && channelMembers.length > 2),
  );
  const isLikelyDirectByType = channel?.type === 'trainer-spoc-private' || DIRECT_CUSTOM_TYPES.has(customType);
  const isDirectConversation = Boolean(otherUserId && !isBroadcastConversation && !isGroupConversation && (isLikelyDirectByType || channelMembers.length <= 2));
  const canSendBroadcastMessage = isSuperAdminRole(currentRole);
  const directRoomId = isDirectConversation ? buildDirectRoomId(currentUserId, otherUserId) : null;
  const channelTitle = useMemo(
    () => getChannelDisplayName(channel, currentUserId, users),
    [channel, currentUserId, users],
  );
  const channelSubtitle = useMemo(() => {
    if (isBroadcastConversation) return 'Announcement';
    if (isGroupConversation) return `${channelMembers.length} members`;
    return 'Direct chat';
  }, [channelMembers.length, isBroadcastConversation, isGroupConversation]);

  const clearedAt = useMemo(() => {
    if (typeof window === 'undefined' || !channel?.id) return 0;
    const rawValue = localStorage.getItem(`mbk_cleared_${channel.id}`) || '0';
    const parsedValue = parseInt(rawValue, 10);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }, [channel?.id]);

  const visibleMessages = useMemo(
    () =>
      messages.filter((message) => {
        if (!clearedAt) return true;
        return new Date(message.created_at || message.createdAt || message.updated_at || message.updatedAt).getTime() > clearedAt;
      }),
    [messages, clearedAt],
  );

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const emitSocketWithAck = useCallback(
    (eventName, payload) =>
      new Promise((resolve, reject) => {
        if (!socket?.connected) {
          reject(new Error('Socket is not connected'));
          return;
        }

        const timeout = setTimeout(() => reject(new Error(`Socket timeout for ${eventName}`)), 10000);
        socket.emit(eventName, payload, (ack = {}) => {
          clearTimeout(timeout);
          if (ack?.success) {
            resolve(ack?.data ?? null);
            return;
          }
          reject(new Error(ack?.message || `Socket ${eventName} failed`));
        });
      }),
    [socket],
  );

  const upsertRealtimeMessage = useCallback(
    (rawMessage) => {
      const mappedMessage = mapRealtimeMessageToUi(rawMessage, users);
      if (!mappedMessage) return;
      const incomingTempId = toSafeString(rawMessage?.tempId || mappedMessage?.tempId);

      if (incomingTempId) {
        setPendingMessages((prev) =>
          prev.filter((item) => String(item.id || item._id) !== incomingTempId),
        );
      }

      setMessages((prev) => {
        const index = prev.findIndex((item) => String(item.id || item._id) === mappedMessage.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...mappedMessage };
          return next;
        }

        if (incomingTempId) {
          const tempIndex = prev.findIndex((item) => String(item.id || item._id) === incomingTempId);
          if (tempIndex >= 0) {
            const next = [...prev];
            next[tempIndex] = { ...next[tempIndex], ...mappedMessage, id: mappedMessage.id, _id: mappedMessage.id, isPending: false };
            return next;
          }
        }

        const next = [...prev, mappedMessage];
        next.sort((a, b) => {
          const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
          const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
          return aTime - bTime;
        });
        return next;
      });
    },
    [users],
  );

  const sendRealtimePayload = useCallback(
    async (payload) => {
      const sendViaHttpFallback = async () => {
        const response = await chatService.sendMessage(payload);
        const savedMessage = extractSavedMessageFromSendResponse(response);
        if (savedMessage) {
          upsertRealtimeMessage({
            ...savedMessage,
            tempId: payload?.tempId || savedMessage?.tempId || savedMessage?.metadata?.tempId || null,
            receiverId: savedMessage?.receiverId || payload?.receiverId || null,
          });
        }
        return savedMessage;
      };

      if (!socket?.connected) {
        return sendViaHttpFallback();
      }

      try {
        return await emitSocketWithAck('send_message', payload);
      } catch (socketError) {
        if (/socket is not connected/i.test(String(socketError?.message || ''))) {
          return sendViaHttpFallback();
        }
        throw socketError;
      }
    },
    [emitSocketWithAck, socket, upsertRealtimeMessage],
  );

  const emitTypingState = useCallback(
    (isTyping) => {
      if (!socket?.connected || !isDirectConversation || !otherUserId) return;
      socket.emit('typing', {
        roomId: directRoomId,
        receiverId: otherUserId,
        isTyping: Boolean(isTyping),
      });
    },
    [socket, isDirectConversation, otherUserId, directRoomId],
  );

  const handleComposerTyping = useCallback(
    (value) => {
      if (!isDirectConversation || !otherUserId) return;
      const hasText = Boolean(String(value || '').trim());

      if (!hasText) {
        if (typingStopTimeoutRef.current) {
          clearTimeout(typingStopTimeoutRef.current);
          typingStopTimeoutRef.current = null;
        }
        emitTypingState(false);
        return;
      }

      emitTypingState(true);
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      typingStopTimeoutRef.current = setTimeout(() => {
        emitTypingState(false);
        typingStopTimeoutRef.current = null;
      }, 1200);
    },
    [emitTypingState, isDirectConversation, otherUserId],
  );

  const matchesActiveDirectChat = useCallback(
    (message) => {
      if (!isDirectConversation || !otherUserId || !message) return false;
      if (message.kind && message.kind !== 'chat_message') return false;

      const senderId = toSafeString(message.senderId);
      const receiverId = toSafeString(message.receiverId);
      const roomId = toSafeString(message.roomId);
      const selfId = toSafeString(currentUserId);
      const peerId = toSafeString(otherUserId);

      if (roomId && directRoomId && roomId === directRoomId) return true;

      return (
        (senderId === selfId && receiverId === peerId) ||
        (senderId === peerId && receiverId === selfId)
      );
    },
    [isDirectConversation, otherUserId, currentUserId, directRoomId],
  );

  const handleSendRealtimeMessage = useCallback(
    async ({ text = '', files = [], forceType = null, duration = 0, onUploadProgress, tempId = null } = {}) => {
      if (!isDirectConversation || !otherUserId) {
        throw new Error('Realtime direct chat target not found');
      }

      const trimmedText = String(text || '').trim();
      const safeFiles = Array.isArray(files) ? files : [];
      const normalizedTempId = toSafeString(tempId);

      if (trimmedText) {
        await sendRealtimePayload({
          receiverId: otherUserId,
          type: 'text',
          text: trimmedText,
          content: trimmedText,
          tempId: normalizedTempId || null,
        });
      }

      for (let fileIndex = 0; fileIndex < safeFiles.length; fileIndex += 1) {
        const file = safeFiles[fileIndex];
        const type = resolveRealtimeTypeFromFile(file, forceType);
        let mediaUrl = null;
        onUploadProgress?.({ fileIndex, progress: 0, status: 'uploading' });

        try {
          const uploadResult = await uploadFileToCloudinary(file, {
            onProgress: (progress) => {
              onUploadProgress?.({
                fileIndex,
                progress,
                status: 'uploading',
              });
            },
          });
          mediaUrl = uploadResult?.optimizedUrl || uploadResult?.secureUrl || null;
        } catch (uploadError) {
          onUploadProgress?.({
            fileIndex,
            progress: 0,
            status: 'error',
            error: uploadError?.message || `Upload failed for ${file?.name || 'attachment'}`,
          });
          throw uploadError;
        }

        if (!mediaUrl) {
          onUploadProgress?.({
            fileIndex,
            progress: 0,
            status: 'error',
            error: `Upload failed for ${file?.name || 'attachment'}`,
          });
          throw new Error(`Failed to upload file: ${file?.name || 'attachment'}`);
        }

        onUploadProgress?.({
          fileIndex,
          progress: 100,
          status: 'uploaded',
          uploadedUrl: mediaUrl,
        });

        const attachmentDuration =
          Number(duration) > 0
            ? Number(duration)
            : ((type === 'audio' || type === 'voice') ? await getAudioDurationFromFile(file) : null);

        await sendRealtimePayload({
          receiverId: otherUserId,
          type,
          fileUrl: mediaUrl,
          mediaUrl,
          tempId: normalizedTempId
            ? (trimmedText
              ? `${normalizedTempId}-f${fileIndex + 1}`
              : (fileIndex === 0 ? normalizedTempId : `${normalizedTempId}-f${fileIndex + 1}`))
            : null,
          mimeType: file?.type || null,
          fileName: file?.name || null,
          fileSize: Number.isFinite(file?.size) ? Number(file.size) : null,
          duration: Number.isFinite(attachmentDuration) && attachmentDuration > 0 ? attachmentDuration : null,
          metadata: forceType === 'voice' ? { source: 'voice_recorder' } : {},
        });
      }
    },
    [isDirectConversation, otherUserId, sendRealtimePayload],
  );
  const deleteMessageForMeAction = useCallback(
    async (messageId) => {
      try {
        await emitSocketWithAck('delete_message_for_me', { messageId });
      } catch {
        await chatService.deleteMessageForMe(messageId);
      }
    },
    [emitSocketWithAck],
  );

  const deleteMessageForEveryoneAction = useCallback(
    async (messageId) => {
      try {
        await emitSocketWithAck('delete_message_for_everyone', { messageId });
      } catch {
        await chatService.deleteMessageForEveryone(messageId);
      }
    },
    [emitSocketWithAck],
  );

  const handleDeleteMessage = useCallback(
    async (message, isMine) => {
      if (!isDirectConversation) return;

      const messageId = toSafeString(message?.id || message?._id);
      if (!messageId) return;

      if (isMine) {
        const deleteForEveryone = window.confirm('Delete for everyone?\nClick Cancel to delete only for you.');
        if (deleteForEveryone) {
          await deleteMessageForEveryoneAction(messageId);
          setMessages((prev) =>
            prev.map((item) => {
              if (String(item.id || item._id) !== messageId) return item;
              return { ...item, text: 'This message was deleted', attachments: [], isDeleted: true };
            }),
          );
          return;
        }
      }

      await deleteMessageForMeAction(messageId);
      setMessages((prev) => prev.filter((item) => String(item.id || item._id) !== messageId));
    },
    [isDirectConversation, deleteMessageForEveryoneAction, deleteMessageForMeAction],
  );

  useEffect(() => {
    if (!channel || !isDirectConversation || !otherUserId) return;

    let isMounted = true;

    const loadHistory = async () => {
      try {
        const historyResponse = await chatService.getMessageHistory(otherUserId, 1, 100);
        if (!isMounted) return;

        const historyItems = Array.isArray(historyResponse?.data?.data)
          ? historyResponse.data.data
          : (Array.isArray(historyResponse?.data) ? historyResponse.data : []);
        const mappedHistory = historyItems.map((item) => mapRealtimeMessageToUi(item, users)).filter(Boolean);

        setMessages((prev) => {
          const byId = new Map();
          mappedHistory.forEach((message) => {
            byId.set(String(message.id || message._id), message);
          });
          prev.forEach((message) => {
            const id = String(message.id || message._id);
            if (!byId.has(id)) {
              byId.set(id, message);
            }
          });
          const merged = Array.from(byId.values());
          merged.sort((a, b) => {
            const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
            const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
            return aTime - bTime;
          });
          return merged;
        });
        const deliverableMessageIds = historyItems
          .filter((item) => toSafeString(item?.senderId) === toSafeString(otherUserId) && String(item?.status || "") === "sent")
          .map((item) => toSafeString(item?.id || item?._id))
          .filter(Boolean);
        if (socket?.connected && deliverableMessageIds.length) {
          socket.emit("message_delivered", {
            messageIds: deliverableMessageIds,
            chatId: historyItems.find((item) => item?.chatId)?.chatId || null,
          });
        }
        setTimeout(() => scrollToBottom('auto'), 120);
      } catch (error) {
        console.error('Failed to load direct message history:', error);
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [channel?.id, isDirectConversation, otherUserId, socket?.connected]);

  useEffect(() => {
    if (!channel) return;

    if (!isDirectConversation) {
      setMessages([...channel.state.messages]);
    }

    const handleEvent = (e) => {
      if (isDirectConversation) return;
      setMessages([...channel.state.messages]);
      if (e.type === 'message.new') {
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
    };

    const handleTyping = (e) => {
      if (e.user?.id === currentUserId) return;
      if (e.type === 'typing.start') {
        setTyping(prev => [...new Set([...prev, e.user.name || e.user.id])]);
      } else {
        setTyping(prev => prev.filter(name => name !== (e.user.name || e.user.id)));
      }
    };

    const markAsRead = async () => {
      if (!channel?.client?.userID) return;
      try {
        await channel.markRead();
      } catch (e) {
        console.warn('Failed to mark channel as read:', e.message);
      }
    };

    channel.on('message.new', handleEvent);
    channel.on('message.updated', handleEvent);
    channel.on('message.deleted', handleEvent);
    channel.on('typing.start', handleTyping);
    channel.on('typing.stop', handleTyping);

    markAsRead();

    const handleViewportScroll = () => {
      if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') {
        setTimeout(() => scrollToBottom('smooth'), 150);
      }
    };

    const handleInputFocus = () => setTimeout(() => scrollToBottom('smooth'), 300);

    window.visualViewport?.addEventListener('resize', handleViewportScroll);
    window.addEventListener('wa-input-focus', handleInputFocus);

    setTimeout(() => scrollToBottom('auto'), 200);

    return () => {
      channel.off('message.new', handleEvent);
      channel.off('message.updated', handleEvent);
      channel.off('message.deleted', handleEvent);
      channel.off('typing.start', handleTyping);
      channel.off('typing.stop', handleTyping);
      window.visualViewport?.removeEventListener('resize', handleViewportScroll);
      window.removeEventListener('wa-input-focus', handleInputFocus);
    };
  }, [channel, currentUserId, isDirectConversation]);

  useEffect(() => {
    if (!socket || !isDirectConversation || !otherUserId) return;

    joinChat?.({
      roomId: directRoomId,
      receiverId: otherUserId,
    });

    const handleReceiveMessage = (payload) => {
      if (!matchesActiveDirectChat(payload)) return;
      upsertRealtimeMessage(payload);
      if (toSafeString(payload?.senderId) !== toSafeString(currentUserId) && payload?.id) {
        socket.emit('message_delivered', {
          messageId: toSafeString(payload.id || payload._id),
          chatId: payload.chatId || null,
        });
      }
      setTimeout(() => scrollToBottom('smooth'), 80);
    };

    const handleMessageDeleted = (payload = {}) => {
      const messageId = toSafeString(payload?.messageId);
      if (!messageId) return;

      if (payload.scope === 'me') {
        if (toSafeString(payload.userId) !== toSafeString(currentUserId)) return;
        setMessages((prev) => prev.filter((item) => String(item.id || item._id) !== messageId));
        return;
      }

      if (payload.scope === 'everyone') {
        setMessages((prev) =>
          prev.map((item) => {
            if (String(item.id || item._id) !== messageId) return item;
            return { ...item, text: 'This message was deleted', attachments: [], isDeleted: true };
          }),
        );
      }
    };

    const handleTypingEvent = (payload = {}) => {
      const fromId = toSafeString(payload?.from);
      const receiverId = toSafeString(payload?.receiverId);
      const roomId = toSafeString(payload?.roomId);
      const selfId = toSafeString(currentUserId);
      const peerId = toSafeString(otherUserId);

      if (!fromId || fromId === selfId) return;

      const matchesRoom = Boolean(roomId && directRoomId && roomId === directRoomId);
      const matchesDirect =
        (fromId === peerId && receiverId === selfId) ||
        (fromId === selfId && receiverId === peerId);

      if (!matchesRoom && !matchesDirect) return;

      if (payload.isTyping) {
        const typingName = users?.[peerId]?.name || 'Typing...';
        setTyping([typingName]);
      } else {
        setTyping((prev) => prev.filter((name) => name !== (users?.[peerId]?.name || 'Typing...')));
      }
    };

    socket.off('receive_message', handleReceiveMessage);
    socket.off('message_deleted', handleMessageDeleted);
    socket.off('typing', handleTypingEvent);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing', handleTypingEvent);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing', handleTypingEvent);
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      emitTypingState(false);
    };
  }, [socket, joinChat, isDirectConversation, otherUserId, directRoomId, currentUserId, matchesActiveDirectChat, upsertRealtimeMessage, users, emitTypingState]);

  const handleOptimisticUpdate = useCallback((id, patch) => {
    const nextPatch = typeof patch === 'function' ? patch : () => patch;
    setPendingMessages((prev) =>
      prev.map((message) => {
        if (message.id !== id) return message;
        return { ...message, ...nextPatch(message) };
      }),
    );
  }, []);

  const handleBackToList = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mbk_chat_force_list', '1');
    }
    setShowInfoPanel(false);
    if (setActiveChannel) {
      setActiveChannel(null);
    }
  }, [setActiveChannel, setShowInfoPanel]);

  if (!channel) return null;

  return (
    <Channel channel={channel}>
      <div className={isMobile ? 'wa-root-container' : 'whatsapp-window'} style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', background: isDark ? '#0b141a' : '#efeae2', position: 'relative' }}>
        {isMobile ? (
          <header
            className="chat-mobile-inline-header"
            style={{
              height: 60,
              background: isDark ? '#202c33' : '#f0f2f5',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 12px',
              borderBottom: isDark ? '1px solid #222e35' : '1px solid #ddd',
              flexShrink: 0,
              zIndex: 100,
            }}
          >
            <button
              type="button"
              onClick={handleBackToList}
              aria-label="Back to chats"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: isDark ? '#8696a0' : '#667781',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: isDark ? '#e9edef' : '#111b21',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {channelTitle}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: isDark ? '#8696a0' : '#667781',
                }}
              >
                {channelSubtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoPanel((prev) => !prev)}
              aria-label="Channel info"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: isDark ? '#8696a0' : '#667781',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Info size={20} />
            </button>
          </header>
        ) : (
          <ChatHeader
            channel={channel}
            showInfoPanel={showInfoPanel}
            setShowInfoPanel={setShowInfoPanel}
            setActiveChannel={setActiveChannel}
            isMobile={false}
          />
        )}

        <div className={isMobile ? 'wa-message-area' : 'chat-messages-area'} style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: isMobile ? '10px 16px' : '20px 5%', backgroundImage: (!isDark && !isMobile) ? 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' : 'none', backgroundRepeat: 'repeat', backgroundAttachment: 'local', backgroundSize: '400px', position: 'relative' }}>
          {[...visibleMessages, ...pendingMessages].map((msg, i) => (
            <MessageBubble
              key={msg.id || `pending-${i}`}
              msg={msg}
              isMine={msg.user?.id === currentUserId || msg.isPending}
              isMobile={isMobile}
              onDeleteMessage={isDirectConversation ? handleDeleteMessage : null}
            />
          ))}

          {typing.length > 0 && (
            <div style={{ padding: '6px 12px', fontSize: 12, color: isDark ? '#8696a0' : '#667781', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div className="typing-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
              {typing.join(', ')} {typing.length > 1 ? 'are' : 'is'} typing...
            </div>
          )}

          <div ref={messagesEndRef} style={{ height: 1, flexShrink: 0 }} />
        </div>

        <div className="chat-input-wrapper" style={{ flexShrink: 0 }}>
          {(isBroadcastConversation && !canSendBroadcastMessage) ? (
            <div style={{ padding: '15px 20px', textAlign: 'center', background: isDark ? '#202c33' : '#f2f7f4', color: isDark ? '#8696a0' : T.muted, fontSize: 13, borderTop: `1px solid ${T.border}`, borderRadius: '0 0 18px 0' }}>
              This is an admin broadcast lane. Trainers and SPOCs can read messages only.
            </div>
          ) : (
            <MessageComposer
              isDark={isDark}
              isMobile={isMobile}
              onOptimisticSend={(m) =>
                setPendingMessages((prev) => {
                  const id = String(m?.id || m?._id || '');
                  if (!id) return prev;
                  if (prev.some((item) => String(item.id || item._id) === id)) return prev;
                  return [...prev, m];
                })
              }
              onOptimisticRemove={(id) => setPendingMessages(prev => prev.filter(m => m.id !== id))}
              onOptimisticUpdate={handleOptimisticUpdate}
              onSendRealtimeMessage={isDirectConversation ? handleSendRealtimeMessage : null}
              onTyping={isDirectConversation ? handleComposerTyping : null}
            />
          )}
        </div>

        <div style={{ display: 'none' }}>
          <Window><Thread /></Window>
        </div>

        {isMobile && showInfoPanel ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Channel details"
            onClick={() => setShowInfoPanel(false)}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 220,
              background: 'rgba(11, 20, 26, 0.35)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(92vw, 320px)',
                height: '100%',
                background: isDark ? '#0f0f0f' : '#ffffff',
                borderLeft: isDark ? '1px solid #333' : '1px solid rgba(45,122,82,0.12)',
                boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.22)',
                overflow: 'hidden',
              }}
            >
              <InfoPanel
                channel={channel}
                onClose={() => setShowInfoPanel(false)}
              />
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .chat-messages-area::-webkit-scrollbar { width: 6px; }
        .chat-messages-area::-webkit-scrollbar-thumb { background: ${isDark ? '#3b4a54' : '#ced3d6'}; border-radius: 3px; }
      `}</style>
    </Channel>
  );
}
