"use client";

import React from 'react';
import { Search, Info, MoreVertical, ArrowLeft, Megaphone, Users } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { getChannelDisplayName } from '../utils/helpers';
import { useSocket } from '@/context/SocketContext';
import { useChat } from '../context/ChatContext';

const T = { text:'#111b21', muted:'#667781', dim:'#8696a0' };
const D = { text:'#e9edef', muted:'#8696a0', dim:'#667781' };

export default function ChatHeader({ 
  channel, 
  showInfoPanel, 
  setShowInfoPanel, 
  setActiveChannel, 
  isMobile 
}) {
  const { currentUser, users, isDark } = useChat();
  const K = isDark ? D : T;
  const { isOnline: isSocketOnline } = useSocket();

  if(!channel) return null;
  const isAnn  = channel.data?.is_announcement;
  const isGrp  = channel.data?.is_group;
  const members= Object.values(channel.state?.members||{});
  const currentUserId = currentUser?.id || currentUser?._id;
  const name   = getChannelDisplayName(channel, currentUserId, users);

  const otherMember = !isGrp && !isAnn ? members.find(m => (m.user_id || m.user?.id) !== currentUserId) : null;
  const otherUserId = otherMember?.user_id || otherMember?.user?.id;
  const otherUser = otherUserId && users?.[otherUserId] ? users[otherUserId] : otherMember?.user;
  const isOnline = isSocketOnline(otherUserId) || otherUser?.online;

  return (
    <header className="chat-header-section" style={{ height: 60, background: isDark ? '#202c33' : '#f0f2f5', display: 'flex', alignItems: 'center', padding: '0 15px', borderBottom: isDark ? '1px solid #222e35' : '1px solid #ddd', flexShrink: 0, zIndex: 100 }}>
      {isMobile && (
        <button className="mobile-back-btn" onClick={() => setActiveChannel && setActiveChannel(null)} style={{ display: 'flex', marginRight: 10, background: 'none', border: 'none', color: K.dim }}>
          <ArrowLeft size={20} />
        </button>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:12, flex:1 }}>
        {isAnn ? <div className="avatar-placeholder"><Megaphone size={16} /></div> : isGrp ? <div className="avatar-placeholder"><Users size={18}/></div> : <UserAvatar user={otherUser} size="sm" showStatus isOnline={isOnline}/>}
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontSize:15, fontWeight:700, color: isOnline ? '#22c55e' : K.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</h2>
          <p style={{ fontSize:12, color:K.muted, margin:0 }}>{isAnn ? 'Announcement' : isGrp ? `${members.length} members` : (isOnline ? 'online' : 'last seen recently')}</p>
        </div>
      </div>
      <div style={{ display:'flex', gap:15, color:K.dim }}>
        <Search size={20} style={{ cursor:'pointer' }}/>
        <Info size={20} style={{ cursor:'pointer' }} onClick={() => setShowInfoPanel(!showInfoPanel)}/>
        <MoreVertical size={20} style={{ cursor:'pointer' }}/>
      </div>
      <style>{`
        @media (max-width: 768px) { .mobile-back-btn { display: flex !important; } }
        .avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: ${isDark ? '#3b4a54' : '#dfe5e7'}; display: flex; align-items: center; justify-content: center; color: ${K.muted}; }
      `}</style>
    </header>
  );
}
