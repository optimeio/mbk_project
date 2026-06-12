"use client";

import React from 'react';
import { Trash2, Check, CheckCheck } from 'lucide-react';
import { isSuperAdminRole, isSpocRole } from '../services/streamClient';
import { useChat } from '../context/ChatContext';
import { 
  AudioMessage, 
  ImageMedia, 
  FileMessage, 
  VideoMessage 
} from './attachments/AttachmentComponents';

const T = { text:'#111b21', muted:'#667781', dim:'#8696a0', border:'#ddd' };
const D = { text:'#e9edef', muted:'#8696a0', dim:'#667781', border:'#222e35' };

export default function MessageBubble({ msg, isMine, isMobile, onDeleteMessage }) {
  const { isDark, currentUser } = useChat();
  const K = isDark ? D : T;
  const userRole = currentUser?.role;
  const isAdmin = isSuperAdminRole(userRole) || isSpocRole(userRole);
  const timeValue = msg.created_at || msg.createdAt;
  const time = timeValue ? new Date(timeValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const attachments = msg.attachments || [];
  const uploadProgress = Math.max(0, Math.min(100, Number(msg.uploadProgress || 0)));
  const isUploading = msg.uploadStatus === 'uploading';
  const isUploadFailed = msg.uploadStatus === 'failed';

  const handleDelete = async () => {
    if (typeof onDeleteMessage !== 'function') return;
    try {
      await onDeleteMessage(msg, isMine);
    } catch (err) {
      console.error('Delete message failed:', err);
    }
  };

  return (
    <div style={{ display:'flex', width:'100%', justifyContent: isMine?'flex-end':'flex-start', marginBottom: 4 }}>
      <div
        className={isMobile ? `wa-bubble ${isMine ? 'wa-bubble-sent' : 'wa-bubble-recv'}` : ''}
        style={{
          maxWidth: '85%',
          padding: attachments.length ? (['image', 'video'].includes(attachments[0].type) ? '4px' : '6px') : '6px 12px 8px',
          borderRadius: 12,
          fontSize: '14.5px',
          position: 'relative',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
          background: isMobile
            ? undefined
            : (isMine ? (isDark?'#005c4b':'#d9fdd3') : (isDark?'#202c33':'#ffffff')),
          color: isDark ? '#e9edef' : '#111b21',
          lineHeight: 1.4,
          wordWrap: 'break-word',
          overflow: 'hidden'
        }}
      >
        {!isMine && msg.user?.name && <div style={{ fontSize:12, fontWeight:700, color:isDark?'#8696a0':'#00a884', marginBottom:2, padding: '2px 4px' }}>{msg.user.name}</div>}

        {attachments.map((at, i) => (
          <div key={i} style={{ marginBottom: i < attachments.length - 1 || msg.text ? 6 : 0 }}>
            {at.type === 'image' ? (
              <ImageMedia at={at} />
            ) : at.type === 'audio' ? (
              <AudioMessage at={at} isMine={isMine} isDark={isDark} themes={K} />
            ) : at.type === 'video' ? (
              <VideoMessage at={at} />
            ) : (
              <FileMessage at={at} isDark={isDark} themes={K} />
            )}
          </div>
        ))}

        {msg.text && (
          <div style={{ padding: attachments.length ? '6px 8px 8px' : 0 }}>
            {msg.text}
          </div>
        )}

        {isUploading && (
          <div style={{ padding: '4px 8px 6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: isDark ? 'rgba(233,237,239,0.8)' : '#667781', marginBottom: 4 }}>
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#00a884', transition: 'width 120ms linear' }} />
            </div>
          </div>
        )}

        {isUploadFailed && (
          <div style={{ padding: '2px 8px 6px', fontSize: 11, color: '#ff8f8f' }}>
            Upload failed. Try sending again.
          </div>
        )}

        <div style={{ fontSize:11, color:isMine ? (isDark?'rgba(233,237,239,0.7)':'rgba(102,119,129,0.7)') : (isDark?'rgba(233,237,239,0.6)':'rgba(102,119,129,0.7)'), textAlign:'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: attachments.length && !msg.text ? -22 : 2, marginRight: attachments.length && !msg.text ? 8 : 0, background: attachments.length && !msg.text ? (isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)') : 'transparent', padding: attachments.length && !msg.text ? '2px 6px' : '0 4px', borderRadius: 10, float: 'right', zIndex: 1, position: 'relative' }}>
          {time}
          {isMine && (
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {msg.isPending ? <Check size={14} opacity={0.5} /> : (msg.status === 'read' || (msg.readBy && msg.readBy.length > 0)) ? <CheckCheck size={14} color="#53bdeb" /> : <CheckCheck size={14} opacity={0.6} />}
            </span>
          )}
          {isAdmin && !msg.isPending && !msg.isDeleted && typeof onDeleteMessage === 'function' && (
            <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, marginLeft: 8, padding: 0 }} title="Delete Message">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
