"use client";

import io from 'socket.io-client';
import { API_BASE_URL } from '@/services/api';
import { getSocketOrigin } from '@/config/apiConfig';

const sanitizeSocketUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/[<>]/.test(raw) || /your[_\s-]*url/i.test(raw)) return '';

    try {
        const parsed = new URL(raw);
        if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) return '';
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return '';
    }
};

const shouldUseWebSocketOnly = (socketUrl) => {
    const forceWebSocketOnly =
        globalThis?.process?.env?.NEXT_PUBLIC_FORCE_WEBSOCKET === 'true';

    if (!forceWebSocketOnly) {
        return false;
    }

    try {
        const target = new URL(
            socketUrl,
            typeof window !== 'undefined' ? window.location.origin : undefined,
        );
        return ['localhost', '127.0.0.1'].includes(target.hostname);
    } catch {
        return false;
    }
};

const getSocketUrl = () => {
    const explicit = sanitizeSocketUrl(
        globalThis?.process?.env?.NEXT_PUBLIC_SOCKET_URL || '',
    );
    if (explicit) {
        return explicit;
    }

    // Prefer explicit backend origin when available.
    if (API_BASE_URL.startsWith('http')) {
        return API_BASE_URL.replace(/\/api\/?$/i, '');
    }

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return getSocketOrigin();
};

const socketUrl = getSocketUrl();
const webSocketOnly = shouldUseWebSocketOnly(socketUrl);

const socket = io(socketUrl, {
    path: '/socket.io',
    transports: webSocketOnly ? ['websocket'] : ['polling', 'websocket'],
    upgrade: !webSocketOnly,
    rememberUpgrade: false,
    autoConnect: false,
    reconnection: true,
    closeOnBeforeunload: false,
});

export const connectSocket = () => {
    if (!socket.connected) {
        socket.connect();
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};

export const subscribeToAttendanceUpdates = (callback) => {
    socket.on('attendance_submitted', callback);
};

export const unsubscribeFromAttendanceUpdates = () => {
    socket.off('attendance_submitted');
};

export default socket;
