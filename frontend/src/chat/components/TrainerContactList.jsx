"use client";

import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { getOrCreatePrivateChannel } from '../services/streamClient';

const T = {
  bg:        '#eaf3ee',
  card:      '#ffffff',
  cardHov:   'rgba(45,122,82,0.06)',
  border:    'rgba(45,122,82,0.14)',
  borderHov: 'rgba(45,122,82,0.3)',
  green:     '#2d7a52',
  greenL:    '#38a169',
  text:      '#122c1e',
  textSec:   '#2d5c3e',
  textDim:   '#8ab89a',
};

function TrainerCard({ trainer, currentUserId, onMessage }) {
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const initial = (trainer.name || '?').charAt(0).toUpperCase();

  const handleMessage = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await getOrCreatePrivateChannel(currentUserId, trainer.portalUserId || trainer.id);
      if (onMessage) onMessage(result?.channelId);
    } catch (err) {
      console.error('TrainerCard: failed to create channel', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        margin: '3px 8px',
        borderRadius: 12,
        background: hovered ? T.cardHov : T.card,
        border: `1px solid ${hovered ? T.borderHov : T.border}`,
        transition: 'all .15s',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg,${T.green},${T.greenL})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: 'white',
          boxShadow: '0 2px 8px rgba(45,122,82,0.2)',
        }}>
          {initial}
        </div>
        {/* Online dot */}
        {trainer.isOnline && (
          <div style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 11, height: 11, borderRadius: '50%',
            background: '#22c55e', border: '2px solid #fff',
          }} />
        )}
      </div>

      {/* Name & role */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: T.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {trainer.name}
        </div>
        <div style={{ fontSize: 10, color: T.green, fontWeight: 600, marginTop: 1 }}>
          {trainer.roleLabel || trainer.role || 'Trainer'}
        </div>
      </div>

      {/* WhatsApp-style Message button */}
      <button
        onClick={handleMessage}
        disabled={loading}
        title={`Message ${trainer.name}`}
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 20, border: 'none', cursor: loading ? 'wait' : 'pointer',
          fontSize: 11, fontWeight: 700, color: 'white',
          background: loading
            ? 'rgba(45,122,82,0.4)'
            : `linear-gradient(135deg,${T.green},${T.greenL})`,
          boxShadow: loading ? 'none' : '0 2px 8px rgba(45,122,82,0.25)',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(45,122,82,0.35)'; } }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(45,122,82,0.25)'; }}
      >
        {loading
          ? <Loader2 size={13} style={{ animation: 'spin .7s linear infinite' }} />
          : <MessageCircle size={13} />
        }
        {loading ? 'Opening…' : 'Message'}
      </button>
    </div>
  );
}

export default function TrainerContactList({ contacts = [], currentUserId, onChannelCreated }) {
  const [search, setSearch] = useState('');

  const trainers = contacts
    .filter(c => (c.role || c.roleLabel || '').toLowerCase().includes('trainer'))
    .filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg }}>
      {/* Search bar */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search trainers…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 12px', fontSize: 12, borderRadius: 10,
            border: `1px solid ${T.border}`, background: T.card,
            color: T.text, outline: 'none', fontFamily: 'inherit', fontWeight: 500,
          }}
          onFocus={e => { e.target.style.borderColor = T.green; e.target.style.boxShadow = '0 0 0 3px rgba(45,122,82,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Trainer list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 8 }}>
        {trainers.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: T.textDim, fontSize: 12, fontWeight: 500 }}>
            {contacts.length === 0 ? 'No trainers available yet.' : 'No trainers match your search.'}
          </div>
        ) : (
          trainers.map(trainer => (
            <TrainerCard
              key={trainer.portalUserId || trainer.id || trainer.name}
              trainer={trainer}
              currentUserId={currentUserId}
              onMessage={onChannelCreated}
            />
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
