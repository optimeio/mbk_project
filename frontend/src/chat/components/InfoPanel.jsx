"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Users, FileText, Pin, LogOut, Trash2, UserMinus, UserPlus, Shield, ShieldCheck, Image as ImageIcon, Video, Link2 } from 'lucide-react';
import UserAvatar from './UserAvatar';
import NewChatModal from './NewChatModal';
import { getChannelDisplayName } from '../utils/helpers';
import { chatService } from '@/services/chatService';
import api from '@/services/api';
import { resolveUserRole, isSuperAdminRole, isSpocRole, isTrainerRole } from '../services/streamClient';

const T = { 
  bg: '#ffffff', bgPage: '#f2f7f4', border: 'rgba(45,122,82,0.12)', 
  text: '#122c1e', muted: '#5a8c6e', dim: '#8ab89a', 
  green: '#2d7a52', greenL: '#38a169', red: '#e05252' 
};

const URL_REGEX = /https?:\/\/[^\s]+/gi;

const mapRealtimeHistoryMessage = (message = {}) => {
  const messageType = String(message.type || 'text').toLowerCase();
  const mediaUrl = message.mediaUrl || null;
  const attachments = [];

  if (mediaUrl) {
    if (messageType === 'image') {
      attachments.push({
        type: 'image',
        asset_url: mediaUrl,
        image_url: mediaUrl,
        name: message.fileName || 'Image',
        file_size: message.fileSize || null,
      });
    } else if (messageType === 'video') {
      attachments.push({
        type: 'video',
        asset_url: mediaUrl,
        video_url: mediaUrl,
        name: message.fileName || 'Video',
        file_size: message.fileSize || null,
      });
    } else if (messageType === 'audio' || messageType === 'voice') {
      attachments.push({
        type: 'audio',
        asset_url: mediaUrl,
        name: message.fileName || (messageType === 'voice' ? 'Voice message' : 'Audio'),
        file_size: message.fileSize || null,
      });
    } else {
      attachments.push({
        type: 'file',
        asset_url: mediaUrl,
        name: message.fileName || 'Document',
        file_size: message.fileSize || null,
      });
    }
  }

  return {
    id: message.id || message._id || `history-${Date.now()}-${Math.random()}`,
    text: String(message.text || ''),
    created_at: message.createdAt || message.created_at || new Date().toISOString(),
    user: {
      id: message.senderId || message.user?.id || '',
      name: message.sender?.name || message.user?.name || '',
    },
    attachments,
  };
};

import { useChat } from '../context/ChatContext';

const RoleBadge = ({ role }) => {
  const normalizedRole = resolveUserRole({ role });
  const isAdm = isSuperAdminRole(normalizedRole) || isSpocRole(normalizedRole);
  const isTrainer = isTrainerRole(normalizedRole);
  
  let label =
    normalizedRole === 'SuperAdmin'
      ? 'Super Admin'
      : normalizedRole === 'SPOCAdmin'
        ? 'SPOC Admin'
        : normalizedRole === 'Trainer'
          ? 'Trainer'
          : normalizedRole?.replace(/([A-Z])/g, ' $1').trim() || 'User';
  if (label === 'admin') label = 'Admin';

  return (
    <span style={{ 
      fontSize: 10, 
      fontWeight: 700, 
      padding: '2px 6px', 
      borderRadius: 4, 
      background: isAdm ? 'rgba(45,122,82,0.1)' : isTrainer ? 'rgba(56,161,105,0.06)' : 'rgba(138,184,154,0.1)',
      color: isAdm ? T.green : isTrainer ? T.greenL : T.dim,
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      textTransform: 'uppercase'
    }}>
      {isAdm ? <ShieldCheck size={10} /> : isTrainer ? <Users size={10} /> : <Users size={10} />}
      {label}
    </span>
  );
};

const notifyChatChannelChanged = (action, channelId) => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("mbk:chat-channel-changed", {
      detail: { action, channelId },
    }),
  );
};

export default function InfoPanel({ channel, groupCandidates = [], onClose }) {
  const { currentUser, users, isDark } = useChat();

  const currentUserId = currentUser?.id || currentUser?._id;
  const userRole = currentUser?.role;
  const isSuperAdmin = isSuperAdminRole(userRole);
  const isAdmin = isSuperAdminRole(userRole) || isSpocRole(userRole);
  
  const name = channel ? getChannelDisplayName(channel, currentUserId, users) : '';
  const isGrp = channel?.data?.is_group;
  const isAnn = channel?.data?.is_announcement;
  const isBroadcastChannel = channel ? (
    Boolean(isAnn) ||
    String(channel?.data?.customType || '').toLowerCase() === 'broadcast' ||
    String(channel?.id || '').toLowerCase().startsWith('broadcast-')
  ) : false;
  const members = channel ? Object.values(channel.state?.members || {}) : [];
  
  let otherMember = channel && !isGrp && !isAnn && !isBroadcastChannel ? members.find(m => m.user_id !== currentUserId) : null;
  
  // 🚀 FALLBACK: If no other member found in state, check last messages
  if (channel && !isGrp && !isAnn && !isBroadcastChannel && !otherMember && channel.state?.messages?.length > 0) {
    const lastOtherMsg = [...channel.state.messages].reverse().find(m => m.user?.id !== currentUserId);
    if (lastOtherMsg) {
      otherMember = { user_id: lastOtherMsg.user.id, user: lastOtherMsg.user };
    }
  }

  const otherUserId = otherMember?.user_id || otherMember?.user?.id || null;
  const isDirectConversation = channel && !isGrp && !isAnn && !isBroadcastChannel && Boolean(otherUserId);
  const otherUser = otherMember?.user_id && users?.[otherMember.user_id] ? users[otherMember.user_id] : otherMember?.user;
  const isOnline = otherUser?.online;

  const [expanded, setExpanded] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [panelMessages, setPanelMessages] = useState(() => channel?.state?.messages || []);
  const toggleExpand = (section) => setExpanded(prev => prev === section ? null : section);

  useEffect(() => {
    if (!channel || isDirectConversation) return;
    setPanelMessages(channel.state?.messages || []);
  }, [channel?.id, channel?.state?.messages, isDirectConversation]);

  useEffect(() => {
    if (!channel || !isDirectConversation || !otherUserId) return;

    let active = true;
    const loadDirectHistory = async () => {
      try {
        const response = await chatService.getMessageHistory(otherUserId, 1, 200);
        if (!active) return;
        const history = Array.isArray(response?.data) ? response.data : [];
        setPanelMessages(history.map(mapRealtimeHistoryMessage));
      } catch (err) {
        console.error('Failed to load info-panel history:', err);
        if (active) {
          setPanelMessages(channel.state?.messages || []);
        }
      }
    };

    loadDirectHistory();
    return () => {
      active = false;
    };
  }, [channel?.id, isDirectConversation, otherUserId]);

  const pinnedMessages = useMemo(
    () => panelMessages.filter((message) => message.pinned),
    [panelMessages],
  );

  const allAttachments = useMemo(
    () => panelMessages.flatMap((message) => message.attachments || []),
    [panelMessages],
  );

  const mediaFiles = useMemo(
    () => allAttachments.filter((attachment) => ['image', 'video'].includes(String(attachment.type || '').toLowerCase())),
    [allAttachments],
  );

  const documentFiles = useMemo(
    () => allAttachments.filter((attachment) => !['image', 'video', 'audio'].includes(String(attachment.type || '').toLowerCase())),
    [allAttachments],
  );

  const sharedLinks = useMemo(() => {
    const foundLinks = panelMessages.flatMap((message) => {
      const text = String(message.text || '');
      const links = text.match(URL_REGEX) || [];
      return links.map((linkUrl) => ({
        url: linkUrl,
        messageId: message.id || message._id,
        createdAt: message.created_at || message.createdAt || null,
      }));
    });

    const seen = new Set();
    return foundLinks.filter((item) => {
      if (!item?.url) return false;
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [panelMessages]);

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear all messages in this channel?')) return;
    try {
      const data = await api.delete(`/chat/channel/${channel.id}/messages?type=${channel.type}`);
      if (data.success) {
        alert('Chat cleared successfully');
        onClose();
      } else {
        alert(data.message || 'Error clearing chat');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to clear chat');
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!window.confirm('Remove this member from the channel?')) return;
    try {
      const data = await chatService.removeGroupMember(channel.id, memberUserId);
      if (data.success) {
        alert('Member removed successfully');
      } else {
        alert(data.message || 'Error removing member');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to remove member');
    }
  };

  const handleLeaveChannel = async () => {
    if (!window.confirm('Leave this channel?')) return;
    try {
      const data = await chatService.leaveChannel(channel.id, channel.type);
      if (data.success) {
        alert('You left the channel');
        onClose();
        notifyChatChannelChanged('leave', channel.id);
      } else {
        alert(data.message || 'Error leaving channel');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to leave channel');
    }
  };

  const handleDeleteChannel = async () => {
    const channelLabel = isBroadcastChannel ? 'broadcast' : isGrp ? 'group' : 'channel';
    if (!window.confirm(`Delete this ${channelLabel} for everyone? This cannot be undone.`)) return;
    try {
      const data = await chatService.deleteChannel(channel.id, channel.type);
      if (data.success) {
        alert(`${channelLabel.charAt(0).toUpperCase() + channelLabel.slice(1)} deleted for all users`);
        onClose();
        notifyChatChannelChanged('delete', channel.id);
      } else {
        alert(data.message || `Error deleting ${channelLabel}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete channel');
    }
  };

  if (!channel) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0, x: 20 }}
      animate={{ width: 320, opacity: 1, x: 0 }}
      exit={{ width: 0, opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        flexShrink: 0,
        height: '100%',
        background: T.bg,
        borderLeft: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '-4px 0 16px rgba(45,122,82,0.03)',
        zIndex: 5
      }}
    >
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>Channel Details</h3>
        <button 
          onClick={onClose}
          style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,82,82,0.1)'; e.currentTarget.style.color = '#e05252'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.muted; }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          {isAnn ? (
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(45,122,82,0.1)', border: `1px solid rgba(45,122,82,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 16 }}>📢</div>
          ) : isGrp ? (
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(45,122,82,0.08)', border: `1px solid rgba(45,122,82,0.18)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Users size={36} color={T.green} /></div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <UserAvatar user={otherUser} size="lg" showStatus isOnline={isOnline} />
            </div>
          )}
          
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: '0 0 4px 0', textAlign: 'center' }}>{name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             {isAnn ? <span style={{ fontSize: 13, color: T.muted }}>Announcement</span> : isGrp ? <span style={{ fontSize: 13, color: T.muted }}>{members.length} Members</span> : <RoleBadge role={otherUser?.role || otherUser?.portal_role} />}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {/* 🟢 PRIMARY: CLEAR FOR ME (LOCAL) */}
          <button 
            onClick={() => {
              if (window.confirm('Clear all messages from your view? (This won\'t delete them for others)')) {
                localStorage.setItem(`mbk_cleared_${channel.id}`, Date.now().toString());
                notifyChatChannelChanged('clear-view', channel.id);
                onClose();
              }
            }}
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(45,122,82,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .25s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,122,82,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(45,122,82,0.05)'}
          >
            <Trash2 size={18} color={T.green} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>Clear My View</span>
          </button>

          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {/* 🚪 LEAVE CHANNEL */}
            <button 
              onClick={handleLeaveChannel}
              style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${T.border}`, background: T.bgPage, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <LogOut size={16} color={T.muted} />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>Leave</span>
            </button>

            {/* 🔴 SECONDARY: GLOBAL CLEAR (ADMIN ONLY) */}
            {isAdmin && (
              <button 
                onClick={handleClearChat}
                style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(224,82,82,0.1)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Trash2 size={14} color={T.red} />
                <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>Global Clear</span>
              </button>
            )}
          </div>

          {isSuperAdmin && (isGrp || isAnn || isBroadcastChannel) && (
            <button
              onClick={handleDeleteChannel}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(224,82,82,0.22)', background: 'rgba(224,82,82,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Trash2 size={16} color={T.red} />
              <span style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>
                Delete {isBroadcastChannel ? 'Broadcast' : 'Group'} For Everyone
              </span>
            </button>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div onClick={() => toggleExpand('members')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(45,122,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={16} color={T.green} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Members</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isAdmin && (isGrp || isBroadcastChannel) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
                  style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', color: T.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <UserPlus size={14} />
                </button>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, background: T.bgPage, padding: '2px 8px', borderRadius: 10 }}>{members.length}</span>
            </div>
          </div>
          {expanded === 'members' && (
            <div style={{ padding: '8px 0 12px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {members.map((m, i) => {
                const isMe = m.user_id === currentUserId;
                const mRole = m.user?.portal_role || m.user?.role;
                const mOnline = m.user?.online;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', group: 'true' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ position: 'relative' }}>
                        <UserAvatar user={m.user} size="xs" />
                        {mOnline && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: `2px solid ${T.bg}` }} />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.user?.name || users?.[m.user_id]?.name || m.user?.id || m.user_id} {isMe && '(Me)'}
                        </span>
                        <RoleBadge role={mRole} />
                      </div>
                    </div>
                    {isAdmin && !isMe && (
                      <button 
                        onClick={() => handleRemoveMember(m.user_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.dim, transition: 'color .2s' }}
                        onMouseEnter={e => e.currentTarget.style.color = T.red}
                        onMouseLeave={e => e.currentTarget.style.color = T.dim}
                        title="Remove member"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div onClick={() => toggleExpand('pins')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(45,122,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pin size={16} color={T.green} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Pinned Messages</span>
            </div>
            {pinnedMessages.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: T.green, background: 'rgba(45,122,82,0.08)', padding: '2px 8px', borderRadius: 10 }}>{pinnedMessages.length}</span>}
          </div>
          {expanded === 'pins' && (
            <div style={{ padding: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pinnedMessages.length === 0 ? <span style={{ fontSize: 12, color: T.muted }}>No pinned messages yet</span> : 
                pinnedMessages.map(m => (
                  <div key={m.id} style={{ fontSize: 12, color: T.text, background: T.bgPage, padding: 8, borderRadius: 8, borderLeft: `2px solid ${T.green}` }}>
                    <span style={{ fontWeight: 600 }}>{m.user?.name}: </span>
                    {m.text?.substring(0,40)}{m.text?.length > 40 && '...'}
                  </div>
                ))
              }
            </div>
          )}

          <div onClick={() => toggleExpand('media')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(45,122,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={16} color={T.green} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Media Files</span>
            </div>
            {mediaFiles.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: T.dim, background: T.bgPage, padding: '2px 8px', borderRadius: 10 }}>{mediaFiles.length}</span>}
          </div>
          {expanded === 'media' && (
            <div style={{ padding: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mediaFiles.length === 0 ? <span style={{ fontSize: 12, color: T.muted }}>No media shared yet</span> :
                mediaFiles.map((file, index) => (
                  <a key={`${file.asset_url || file.image_url || ''}-${index}`} href={file.asset_url || file.image_url || '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    {file.type === 'image' ? (
                      <img src={file.image_url || file.asset_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: `1px solid ${T.border}` }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: T.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.border}` }}>
                        <Video size={14} color={T.dim} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: 12, color: T.text, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{file.name || 'Media file'}</span>
                      <span style={{ fontSize: 10, color: T.muted }}>{file.type}</span>
                    </div>
                  </a>
                ))
              }
            </div>
          )}

          <div onClick={() => toggleExpand('documents')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(45,122,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={16} color={T.green} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Documents</span>
            </div>
            {documentFiles.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: T.dim, background: T.bgPage, padding: '2px 8px', borderRadius: 10 }}>{documentFiles.length}</span>}
          </div>
          {expanded === 'documents' && (
            <div style={{ padding: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documentFiles.length === 0 ? <span style={{ fontSize: 12, color: T.muted }}>No documents shared yet</span> :
                documentFiles.map((file, index) => (
                  <a key={`${file.asset_url || ''}-${index}`} href={file.asset_url || '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: T.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.border}` }}>
                      <FileText size={14} color={T.dim} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: 12, color: T.text, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{file.name || 'Document'}</span>
                      <span style={{ fontSize: 10, color: T.muted }}>{file.mime_type || 'file'}</span>
                    </div>
                  </a>
                ))
              }
            </div>
          )}

          <div onClick={() => toggleExpand('links')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderTop: `1px solid ${T.border}`, borderBottom: expanded !== 'links' ? `1px solid ${T.border}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(45,122,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Link2 size={16} color={T.green} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Links</span>
            </div>
            {sharedLinks.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: T.dim, background: T.bgPage, padding: '2px 8px', borderRadius: 10 }}>{sharedLinks.length}</span>}
          </div>
          {expanded === 'links' && (
            <div style={{ padding: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: `1px solid ${T.border}` }}>
              {sharedLinks.length === 0 ? <span style={{ fontSize: 12, color: T.muted }}>No links shared yet</span> :
                sharedLinks.map((linkItem) => (
                  <a key={linkItem.url} href={linkItem.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.green, textDecoration: 'none', wordBreak: 'break-all' }}>
                    {linkItem.url}
                  </a>
                ))
              }
            </div>
          )}

          {isSuperAdminRole(userRole) && (
            <>
              <div onClick={() => toggleExpand('audit')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderTop: `1px solid ${T.border}`, borderBottom: expanded !== 'audit' ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(45,122,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={16} color={T.green} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Audit Logs</span>
                </div>
              </div>
              {expanded === 'audit' && <AuditLogSection channelId={channel.id} isDark={false} />}
            </>
          )}
        </div>
      </div>

      <NewChatModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        mode="add-member"
        client={channel.client}
        currentUser={currentUser}
        channelId={channel.id}
        existingMemberIds={members.map(m => m.user_id || m.user?.id)}
        groupCandidates={groupCandidates}
        onChannelCreated={() => {
           // Refresh logic if needed, Stream usually updates automatically
           setShowAddModal(false);
        }}
      />
    </motion.div>
  );
}

function AuditLogSection({ channelId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await api.get(`/chat/validation-logs`, {
          params: { channelId, limit: 100 },
        });
        setLogs(res?.data?.data || res?.data?.logs || []);
      } catch (error) {
        try {
          const fallback = await api.get(`/chat/channel/${channelId}/audit-log`);
          setLogs(fallback?.data?.logs || []);
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [channelId]);

  if (loading) return <div style={{ padding: 10, fontSize: 12, color: T.dim }}>Loading logs...</div>;

  return (
    <div style={{ padding: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
      {logs.length === 0 ? <span style={{ fontSize: 12, color: T.muted }}>No audit events logged</span> : 
        logs.map((log, i) => (
          <div key={i} style={{ fontSize: 11, color: T.text, background: T.bgPage, padding: 8, borderRadius: 8, borderLeft: `2px solid ${log.status === 'failed' ? T.red : T.green}` }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>
              {String(log.action || 'event').toUpperCase()}
              {log.event ? ` • ${String(log.event).toUpperCase()}` : ''}
            </div>
            <div style={{ color: T.muted }}>
              By: {log.actorName || log.actorId || 'system'} ({log.actorRole || log.senderRole || 'unknown'})
            </div>
            <div style={{ color: T.muted }}>
              Lane: {log.lane || 'unknown'} • Status: {log.status || 'info'}
            </div>
            {log.messageId && <div style={{ color: T.dim, marginTop: 2 }}>Message: {String(log.messageId).slice(-8)}</div>}
            {log.details?.text && <div style={{ fontStyle: 'italic', marginTop: 4 }}>"{log.details.text.substring(0, 30)}..."</div>}
            {log.errorMessage && <div style={{ color: T.red, marginTop: 4 }}>{log.errorMessage}</div>}
            <div style={{ fontSize: 9, color: T.dim, marginTop: 4 }}>{new Date(log.timestamp).toLocaleString()}</div>
          </div>
        ))
      }
    </div>
  );
}
