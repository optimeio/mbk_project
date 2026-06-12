"use client";

import { useState, useEffect } from 'react';
import { ChannelList, useChatContext } from 'stream-chat-react';
import { Search, Megaphone, Users, MessageCircle, X, Plus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import UserAvatar from './UserAvatar';
import { truncate, getChannelDisplayName } from '../utils/helpers';
import { canCreateGroup, canBroadcast, resolveUserRole, ROLES, isSuperAdminRole, isSpocRole, isTrainerRole } from '../services/streamClient';
import { useSocket } from '@/context/SocketContext';

const T = {
  bg: '#1a567b',
  bgCard: '#1d5f87',
  bgHover: 'rgba(255,255,255,0.1)',
  bgActive: '#0f3f5c',
  border: 'rgba(255,255,255,0.14)',
  borderHov: 'rgba(255,255,255,0.24)',
  green: '#7fd8ff',
  greenL: '#4cc3f0',
  text: '#f3f9ff',
  textSec: '#d9ecf9',
  textMuted: '#cbe6f5',
  textDim: '#9bc9e1',
};

const DT = {
  bg: '#0a0a0a',
  bgCard: '#0f0f0f',
  bgHover: 'rgba(255,255,255,0.06)',
  bgActive: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.08)',
  borderHov: 'rgba(255,255,255,0.15)',
  text: '#ffffff',
  textSec: '#aaaaaa',
  textMuted: '#888888',
  textDim: '#555555',
  green: '#38a169',
};

const DIRECT_CUSTOM_TYPES = new Set(['direct', 'spoc-trainer']);
const GROUP_CUSTOM_TYPES = new Set(['group', 'trainer-group']);
const BROADCAST_CUSTOM_TYPES = new Set(['announcement', 'broadcast']);

const normalize = (value) => String(value || '').toLowerCase();
const getMemberCount = (channel) => Object.keys(channel?.state?.members || {}).length;
const getAttachmentPreviewText = (attachment = {}) => {
  const type = String(attachment.type || '').toLowerCase();
  if (type === 'image') return 'Photo';
  if (type === 'video') return 'Video';
  if (type === 'audio' || type === 'voice') return 'Audio';
  if (type === 'file') return attachment.name || 'Document';
  return attachment.name || 'Attachment';
};

const getLatestMessageText = (channel, latestMessagePreview) => {
  const directPreview =
    (typeof latestMessagePreview === 'string' && latestMessagePreview.trim()) ||
    (typeof latestMessagePreview?.messageObject?.text === 'string' && latestMessagePreview.messageObject.text.trim()) ||
    (typeof latestMessagePreview?.text === 'string' && latestMessagePreview.text.trim()) ||
    '';

  if (directPreview) return directPreview;

  const stateMessages = Array.isArray(channel?.state?.messages) ? channel.state.messages : [];
  const lastStateMessage = stateMessages[stateMessages.length - 1];
  const stateText = String(lastStateMessage?.text || '').trim();
  if (stateText) return stateText;

  const stateAttachment = Array.isArray(lastStateMessage?.attachments)
    ? lastStateMessage.attachments[0]
    : null;
  if (stateAttachment) return getAttachmentPreviewText(stateAttachment);

  const latestMessages = Array.isArray(channel?.state?.latestMessages) ? channel.state.latestMessages : [];
  const lastLatestMessage = latestMessages[latestMessages.length - 1];
  const latestText = String(lastLatestMessage?.text || '').trim();
  if (latestText) return latestText;

  const latestAttachment = Array.isArray(lastLatestMessage?.attachments)
    ? lastLatestMessage.attachments[0]
    : null;
  if (latestAttachment) return getAttachmentPreviewText(latestAttachment);

  return '';
};

const isBroadcastChannel = (channel, announcementChannelId = null) => {
  const customType = normalize(channel?.data?.customType);
  const matchesAnnouncementId =
    announcementChannelId && String(channel?.id || '') === String(announcementChannelId);

  return (
    matchesAnnouncementId ||
    channel?.type === 'admin-announcement-channel' ||
    channel?.data?.is_announcement === true ||
    BROADCAST_CUSTOM_TYPES.has(customType)
  );
};

const isGroupChannel = (channel, announcementChannelId = null) => {
  const customType = normalize(channel?.data?.customType);
  return (
    channel?.type === 'trainer-group-channel' ||
    channel?.data?.is_group === true ||
    GROUP_CUSTOM_TYPES.has(customType) ||
    (!isBroadcastChannel(channel, announcementChannelId) && getMemberCount(channel) > 2)
  );
};

const isDirectChannel = (channel, announcementChannelId = null) => {
  const customType = normalize(channel?.data?.customType);
  const memberCount = getMemberCount(channel);
  return (
    ((channel?.type === 'trainer-spoc-private' ||
      DIRECT_CUSTOM_TYPES.has(customType)) &&
      memberCount >= 2) ||
    (!isBroadcastChannel(channel, announcementChannelId) &&
      !isGroupChannel(channel, announcementChannelId) &&
      memberCount === 2)
  );
};

function ChannelPreviewCustom({
  channel,
  setActiveChannel,
  activeChannel,
  latestMessagePreview,
  users: propUsers,
  isDark,
  announcementChannelId,
}) {
  const K = isDark ? DT : T;
  const { client } = useChatContext();
  const { isOnline: isSocketOnline } = useSocket();
  const listNameColor = isDark ? K.text : '#21a35f';
  const listMessageColor = isDark ? K.textDim : '#5d9876';
  const listTimeColor = isDark ? K.textDim : '#79ac8a';

  const isActive = channel.id === activeChannel?.id;
  const unread = channel.countUnread() || 0;
  const name = getChannelDisplayName(channel, client.userID, propUsers);
  const isAnn = isBroadcastChannel(channel, announcementChannelId);
  const isGroup = isGroupChannel(channel, announcementChannelId);
  const previewText = getLatestMessageText(channel, latestMessagePreview);
  const members = Object.values(channel.state?.members || {});
  const otherMember = members.find((m) => m.user_id !== client.userID);
  const otherUser = otherMember?.user_id && propUsers?.[otherMember.user_id] ? propUsers[otherMember.user_id] : otherMember?.user;
  const isOnline = isSocketOnline(otherMember?.user_id) || otherUser?.online;

  return (
    <button
      onClick={() => setActiveChannel(channel)}
      className="channel-preview-button"
      style={{
        width: 'calc(100% - 16px)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        margin: '4px 8px',
        textAlign: 'left',
        background: isActive ? K.bgActive : 'transparent',
        border: `1px solid ${isActive ? K.borderHov : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all .15s',
        boxShadow: isActive && !isDark ? '0 2px 8px rgba(45,122,82,0.08)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = K.bgHover;
          e.currentTarget.style.borderColor = K.border;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      {isAnn ? (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(45,122,82,0.12)',
            border: `1px solid ${T.border}`,
          }}
        >
          <Megaphone size={18} color={T.green} />
        </div>
      ) : isGroup ? (
        <div
          className={isOnline ? 'animate-status-pulse' : ''}
          style={{
            width: 50,
            height: 50,
            borderRadius: 12,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(45,122,82,0.1)',
            border: `1px solid ${T.border}`,
          }}
        >
          <Users size={20} color={T.green} />
        </div>
      ) : (
        <UserAvatar user={otherUser} size="md" showStatus isOnline={isOnline} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: unread > 0 ? 800 : 700,
                color: isOnline ? '#22c55e' : (isActive ? K.text : listNameColor),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </span>
            {!isAnn && !isGroup && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  display: 'inline-block',
                  background: isOnline ? '#22c55e' : (isActive ? K.textDim : '#8ec9a7'),
                }}
              />
            )}
          </div>
          {channel.data?.last_message_at && (
            <span style={{ fontSize: 10, color: isActive ? K.textDim : listTimeColor, flexShrink: 0, fontWeight: 500 }}>
              {new Date(channel.data.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <span
            style={{
              fontSize: 12,
              color: isActive ? (unread > 0 ? K.textMuted : K.textDim) : listMessageColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '85%',
              fontWeight: unread > 0 ? 500 : 400,
            }}
          >
            {truncate(previewText, 30) || 'No messages yet'}
          </span>
          {unread > 0 && (
            <span
              style={{
                flexShrink: 0,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 800,
                color: 'white',
                background: `linear-gradient(135deg,${K.green},${T.greenL})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(45,122,82,0.3)',
              }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

import { useChat } from '../context/ChatContext';

export default function Sidebar({
  filter,
  sort,
  activeChannel,
  setActiveChannel,
  onNewChat,
  onNewGroup,
  onBroadcast,
  onLogout,
  activeNav,
  setActiveNav,
  tabItems = [],
  workflowHint = '',
  isMobile,
  permissions = {},
  announcementChannelId = null,
}) {
  const { currentUser, users, isDark } = useChat();
  const K = isDark ? DT : T;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const router = useRouter();
  const currentUserId = currentUser?.id || currentUser?._id || '';

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const normalizedQuery = debouncedQuery;

  const userRole = resolveUserRole(currentUser);
  const canGroup = typeof permissions?.canCreateGroup === 'boolean'
    ? permissions.canCreateGroup
    : canCreateGroup(userRole);
  const canBcast = typeof permissions?.canSendAnnouncements === 'boolean'
    ? permissions.canSendAnnouncements
    : (typeof permissions?.canBroadcast === 'boolean'
      ? permissions.canBroadcast
      : canBroadcast(userRole));
  const tabsToRender = Array.isArray(tabItems) && tabItems.length
    ? tabItems
    : [
        { id: 'chats', label: 'Chats' },
        { id: 'groups', label: 'Groups' },
        { id: 'broadcasts', label: 'Broadcasts' },
      ];
  const isAdminUser = isSuperAdminRole(userRole);
  const isSpocUser = isSpocRole(userRole);
  const isTrainerUser = isTrainerRole(userRole);

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', height: '100%', background: K.bgCard, borderRight: `1px solid ${K.border}`, userSelect: 'none' }}>
      <div style={{ padding: isMobile ? '16px 20px 12px' : '24px 20px 16px', flexShrink: 0, background: K.bgCard }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 12 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button
                onClick={() => router.push(userRole === ROLES.TRAINER ? '/trainer/dashboard' : '/dashboard')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: K.green }}
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h2 style={{ fontSize: isMobile ? 22 : 20, fontWeight: 800, color: K.green, margin: 0, letterSpacing: '-0.02em' }}>
              {isMobile ? 'MBK Chat' : (activeNav === 'chats' ? 'Messages' : activeNav === 'groups' ? 'Groups' : 'Broadcasts')}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={currentUser?.name || currentUser?.email || 'Profile'}
              aria-label="Profile avatar"
            >
              <UserAvatar
                user={currentUser}
                size={isMobile ? 'sm' : 'md'}
                showStatus={false}
              />
            </div>
            {activeNav === 'chats' ? (
              <button onClick={onNewChat} style={{ width: 34, height: 34, borderRadius: '50%', background: K.bgHover, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s', color: K.green }} onMouseEnter={(e) => (e.currentTarget.style.background = K.bgActive)} onMouseLeave={(e) => (e.currentTarget.style.background = K.bgHover)}><Plus size={18} /></button>
            ) : activeNav === 'groups' && canGroup ? (
              <button onClick={onNewGroup} style={{ width: 34, height: 34, borderRadius: '50%', background: K.bgHover, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s', color: K.green }} onMouseEnter={(e) => (e.currentTarget.style.background = K.bgActive)} onMouseLeave={(e) => (e.currentTarget.style.background = K.bgHover)}><Plus size={18} /></button>
            ) : activeNav === 'broadcasts' && canBcast ? (
              <button onClick={onBroadcast} style={{ width: 34, height: 34, borderRadius: '50%', background: K.bgHover, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s', color: K.green }} onMouseEnter={(e) => (e.currentTarget.style.background = K.bgActive)} onMouseLeave={(e) => (e.currentTarget.style.background = K.bgHover)}><Plus size={18} /></button>
            ) : null}
          </div>
        </div>
        {!!workflowHint && (
          <p
            style={{
              margin: '-4px 0 10px',
              fontSize: 11,
              color: K.textMuted,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {workflowHint}
          </p>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {tabsToRender.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveNav && setActiveNav(tab.id)}
              style={{
                border: `1px solid ${activeNav === tab.id ? K.green : K.border}`,
                background: activeNav === tab.id ? K.bgActive : K.bgCard,
                color: activeNav === tab.id ? K.green : K.textSec,
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all .2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={16} color={K.textDim} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            id="chat-sidebar-search"
            name="chatSearchQuery"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            style={{ width: '100%', padding: '12px 16px 12px 42px', fontSize: 13, background: K.bg, border: `1px solid ${K.border}`, borderRadius: 24, color: K.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'all .25s', fontWeight: 500 }}
            onFocus={(e) => { e.target.style.borderColor = K.green; e.target.style.background = isDark ? '#1a1a1a' : '#ffffff'; e.target.style.boxShadow = isDark ? '0 0 0 4px rgba(255,255,255,0.05)' : '0 0 0 4px rgba(45,122,82,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = K.border; e.target.style.background = K.bg; e.target.style.boxShadow = 'none'; }}
          />
          {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: K.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>}
        </div>
      </div>

      <div className="custom-channel-list" style={{ flex: 1, overflowY: 'auto', background: isDark ? K.bg : '#f2f7f4', paddingTop: 4, minHeight: 0 }}>
        <style>{`
          .custom-channel-list .str-chat__channel-list-messenger {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            min-height: 0 !important;
          }
          .custom-channel-list .str-chat__channel-list-messenger__main {
            order: 2 !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .custom-channel-list .str-chat__load-more-button {
            display: none !important;
          }
        `}</style>
        <ChannelList
          filters={filter}
          sort={sort}
          channelRenderFilterFn={(channels) => {
            let filteredChannels = channels;

            if (activeNav === 'groups') {
              filteredChannels = filteredChannels.filter(
                (channel) =>
                  isGroupChannel(channel, announcementChannelId) &&
                  !isBroadcastChannel(channel, announcementChannelId),
              );
            } else if (activeNav === 'broadcasts') {
              filteredChannels = filteredChannels.filter((channel) => isBroadcastChannel(channel, announcementChannelId));
            } else {
              filteredChannels = filteredChannels.filter((channel) => isDirectChannel(channel, announcementChannelId));
            }

            // --- Deduplication Logic (Direct Chats) ---
            const seenKeys = new Set();
            filteredChannels = filteredChannels.filter((channel) => {
              if (isDirectChannel(channel, announcementChannelId)) {
                const members = Object.keys(channel.state?.members || {}).sort();
                const key = members.join('_');
                if (seenKeys.has(key)) return false;
                seenKeys.add(key);
              }
              return true;
            });

            if (!normalizedQuery) {
              return filteredChannels;
            }

            return filteredChannels.filter((channel) => {
              const channelName = getChannelDisplayName(channel, currentUserId, users).toLowerCase();
              const stateMessages = Array.isArray(channel.state?.messages) ? channel.state.messages : [];
              const lastMessageText = String(stateMessages[stateMessages.length - 1]?.text || '').toLowerCase();
              return (
                channelName.includes(normalizedQuery) ||
                lastMessageText.includes(normalizedQuery)
              );
            });
          }}
          Preview={(p) => (
            <ChannelPreviewCustom
              {...p}
              isDark={isDark}
              activeChannel={activeChannel}
              setActiveChannel={setActiveChannel}
              users={users}
              announcementChannelId={announcementChannelId}
            />
          )}
          EmptyStateIndicator={() => (
            <div style={{ padding: '60px 24px', textAlign: 'left', color: K.textDim }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>
                <MessageCircle size={32} color={K.green} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 800, color: K.text, marginBottom: 12 }}>
                {activeNav === 'broadcasts'
                  ? 'No broadcasts yet'
                  : activeNav === 'groups'
                    ? 'No groups yet'
                    : 'No chats yet'}
              </p>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: K.textSec, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeNav === 'broadcasts' ? (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}><span>-</span><span>{isAdminUser ? 'Click + to send an announcement to Trainers and SPOCs.' : 'Wait for Super Admin announcements to appear here.'}</span></div>
                    <div style={{ display: 'flex', gap: 8 }}><span>-</span><span>Broadcast lane is read-only for SPOC and Trainer roles.</span></div>
                  </>
                ) : activeNav === 'groups' ? (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}><span>-</span><span>{isAdminUser || isSpocUser ? 'Create a trainer group using + button.' : 'Join trainer groups created by SPOC/Admin.'}</span></div>
                    <div style={{ display: 'flex', gap: 8 }}><span>-</span><span>Use groups for team coordination and shared files.</span></div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}><span>-</span><span>{isTrainerUser ? 'Start direct chat with SPOC/Admin from + button.' : 'Start direct chat with trainers or SPOCs.'}</span></div>
                    <div style={{ display: 'flex', gap: 8 }}><span>-</span><span>Messages update instantly through Socket.IO.</span></div>
                  </>
                )}
              </div>
              <p style={{ fontSize: 12, marginTop: 20, color: K.textMuted, fontWeight: 600 }}>Select a lane to continue</p>
            </div>
          )}
        />
      </div>
    </aside>
  );
}
