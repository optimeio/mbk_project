
import { ROLES, CHANNEL_TYPES, normalizeRole } from '../services/streamClient';
export { ROLES, CHANNEL_TYPES, normalizeRole };
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

// ─── Date / Time ──────────────────────────────────────────────
export function formatMessageTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d))     return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function formatRelativeTime(date) {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatLastSeen(date) {
  if (!date) return 'Unknown';
  const d = new Date(date);
  if (isToday(d))     return `Today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, yyyy');
}

// ─── Strings ──────────────────────────────────────────────────
export function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function truncate(str, len = 45) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// ─── Role Helpers ─────────────────────────────────────────────
export const ROLE_META = {
  [ROLES.SUPER_ADMIN]: {
    label:  'Super Admin',
    badge:  'SA',
    color:  'bg-surface-700',
    text:   'text-brand-300',
    border: 'border-brand-600/40',
    ring:   'ring-brand-600',
    dot:    '#2d7a52',   /* MBK dark green */
  },
  'SuperAdmin': {
    label:  'Super Admin',
    badge:  'SA',
    color:  'bg-surface-700',
    text:   'text-brand-300',
    border: 'border-brand-600/40',
    ring:   'ring-brand-600',
    dot:    '#2d7a52',   /* MBK dark green */
  },
  'superadmin': {
    label:  'Super Admin',
    badge:  'SA',
    color:  'bg-surface-700',
    text:   'text-brand-300',
    border: 'border-brand-600/40',
    ring:   'ring-brand-600',
    dot:    '#2d7a52',   /* MBK dark green */
  },
  [ROLES.SPOC_ADMIN]: {
    label:  'SPOC Admin',
    badge:  'SP',
    color:  'bg-brand-700',
    text:   'text-brand-300',
    border: 'border-brand-500/35',
    ring:   'ring-brand-500',
    dot:    '#38a169',   /* MBK mid green */
  },
  [ROLES.TRAINER]: {
    label:  'Trainer',
    badge:  'TR',
    color:  'bg-surface-800',
    text:   'text-brand-400',
    border: 'border-brand-400/30',
    ring:   'ring-brand-400',
    dot:    '#4abb7e',   /* MBK light green */
  },
};

export function getRoleMeta(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_META[normalizedRole] || ROLE_META[role] || ROLE_META[ROLES.TRAINER];
}

// ─── Channel Helpers ──────────────────────────────────────────
export function getChannelIcon(channelType) {
  switch (channelType) {
    case CHANNEL_TYPES.ANNOUNCEMENT: return '📢';
    case CHANNEL_TYPES.GROUP:        return '👥';
    case CHANNEL_TYPES.PRIVATE:      return '🔒';
    default:                          return '💬';
  }
}

export function getChannelDisplayName(channel, currentUserId, users = {}) {
  if (channel.data?.name) return channel.data.name;

  const members = Object.values(channel.state?.members || {});
  let other = members.find(m => m.user_id !== currentUserId);
  
  // 🚀 FALLBACK 1: If no other member found in state, check last messages
  if (!other && channel.state?.messages?.length > 0) {
    const lastOtherMsg = [...channel.state.messages].reverse().find(m => m.user?.id !== currentUserId);
    if (lastOtherMsg) {
      other = { user_id: lastOtherMsg.user.id, user: lastOtherMsg.user };
    }
  }

  const otherId = other?.user_id || other?.user?.id || members.find(m => m.user_id !== currentUserId)?.user_id;
  
  // High priority: Backend provided name (reliable)
  const nameFromMap = otherId ? users[otherId]?.name : null;
  // Fallback: Stream provided name
  const nameFromStream = other?.user?.name || other?.user?.id || members.find(m => m.user_id === otherId)?.user?.name;

  return nameFromMap || nameFromStream || otherId || 'Unknown';
}

// ─── File Helpers ─────────────────────────────────────────────
export const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/gif':  ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/ogg': ['.ogg'],
};

export function isImageFile(mimeType) {
  return mimeType?.startsWith('image/');
}

export function isVideoFile(mimeType) {
  return mimeType?.startsWith('video/');
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ─── Notification Helpers ─────────────────────────────────────
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function showBrowserNotification(title, body, icon) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon, badge: '/favicon.ico' });
  }
}

// ─── Permission Helpers ───────────────────────────────────────
export function canCreateGroup(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === ROLES.SPOC_ADMIN || normalizedRole === ROLES.SUPER_ADMIN;
}

export function canBroadcast(role) {
  return normalizeRole(role) === ROLES.SUPER_ADMIN;
}

export function canViewAllChannels(role) {
  return normalizeRole(role) === ROLES.SUPER_ADMIN;
}

export function canMessageTrainers(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === ROLES.SPOC_ADMIN || normalizedRole === ROLES.SUPER_ADMIN;
}

export const canInitiateChat = (currentUserRole, targetRole) => {
  const currentRole = normalizeRole(currentUserRole);
  const nextRole = normalizeRole(targetRole);
  if (currentRole === ROLES.SUPER_ADMIN) return true;
  if (currentRole === ROLES.SPOC_ADMIN) {
    return [ROLES.TRAINER, ROLES.SPOC_ADMIN].includes(nextRole);
  }
  if (currentRole === ROLES.TRAINER) {
    return nextRole === ROLES.SPOC_ADMIN || nextRole === ROLES.SUPER_ADMIN;
  }
  return false;
};
