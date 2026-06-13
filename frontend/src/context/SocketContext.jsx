"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { FILE_BASE_URL } from '@/services/api';

const noop = () => {};
const defaultSocketContextValue = {
  socket: null,
  onlineUsers: {},
  joinRooms: noop,
  joinChat: noop,
  getJoinedRooms: () => [],
  isOnline: () => false,
};

const SocketContext = createContext(defaultSocketContextValue);
export const SOCKET_JOIN_ROOMS_EVENT = 'mbk:socket-join-rooms';

const coerceScalarUserId = (value) => {
  if (value == null) return null;
  if (typeof value === 'object') {
    return (
      coerceScalarUserId(value?.id)
      || coerceScalarUserId(value?._id)
      || coerceScalarUserId(value?.userId)
      || coerceScalarUserId(value?.uid)
      || null
    );
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const resolveUserId = (user) => (
  coerceScalarUserId(user?.authUserId)
  || coerceScalarUserId(user?.userId)
  || coerceScalarUserId(user?.id)
  || coerceScalarUserId(user?._id)
  || coerceScalarUserId(user?.uid)
  || null
);

const resolveAccessToken = (user) =>
  user?.accessToken ||
  (typeof window !== 'undefined'
    ? localStorage.getItem('accessToken') || localStorage.getItem('token')
    : null);

const normalizeRoomIds = (rooms = []) => {
  if (!Array.isArray(rooms)) return [];
  return Array.from(
    new Set(
      rooms
        .map((room) => String(room || '').trim())
        .filter(Boolean),
    ),
  );
};

const sanitizeSocketUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Ignore template placeholders like "<URL>" or "YOUR_URL_HERE"
  if (/[<>]/.test(raw) || /your[_\s-]*url/i.test(raw)) return "";

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:", "ws:", "wss:"].includes(parsed.protocol)) return "";

    const trimmedPath = parsed.pathname
      .replace(/\/(api|socket\.io)\/?$/i, "")
      .replace(/\/+$/, "");

    return `${parsed.protocol}//${parsed.host}${trimmedPath}`;
  } catch {
    return "";
  }
};

const shouldUseWebSocketOnly = (socketUrl) => {
  const forceWebSocketOnly =
    globalThis?.process?.env?.NEXT_PUBLIC_FORCE_WEBSOCKET === "true";

  if (!forceWebSocketOnly) {
    return false;
  }

  try {
    const target = new URL(socketUrl, typeof window !== "undefined" ? window.location.origin : undefined);
    return ["localhost", "127.0.0.1"].includes(target.hostname);
  } catch {
    return false;
  }
};

const deferSocketConnect = (callback, delayMs = 150) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const runConnect = () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    callback();
  };

  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(runConnect, { timeout: 1200 });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(runConnect, delayMs);
  return () => window.clearTimeout(handle);
};

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const pathname = usePathname() || '';
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const { currentUser } = useAuth();
  const socketUserId = resolveUserId(currentUser);
  const socketAccessToken = resolveAccessToken(currentUser);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({}); // userId -> { role, online: true }
  const socketRef = useRef(null);
  const pendingRoomsRef = useRef(new Set());
  const joinedRoomsRef = useRef(new Set());

  const flushPendingRooms = useCallback((targetSocket = socketRef.current) => {
    if (!targetSocket?.connected) return;

    const pendingRooms = normalizeRoomIds(Array.from(pendingRoomsRef.current));
    if (!pendingRooms.length) return;

    targetSocket.emit('join_rooms', { rooms: pendingRooms });
    pendingRooms.forEach((room) => {
      pendingRoomsRef.current.delete(room);
      joinedRoomsRef.current.add(room);
    });
  }, []);

  const joinRooms = useCallback(
    (rooms = []) => {
      const normalizedRooms = normalizeRoomIds(rooms);
      if (!normalizedRooms.length) return;

      normalizedRooms.forEach((room) => pendingRoomsRef.current.add(room));
      flushPendingRooms();
    },
    [flushPendingRooms],
  );

  const joinChat = useCallback((payload = {}) => {
    const targetSocket = socketRef.current;
    if (!targetSocket) return;

    const normalizedPayload =
      typeof payload === 'string'
        ? { roomId: payload }
        : payload && typeof payload === 'object'
          ? payload
          : {};

    const roomCandidate =
      normalizedPayload.roomId ||
      normalizedPayload.chatId ||
      normalizedPayload.channelId ||
      null;

    if (!roomCandidate) return;
    targetSocket.emit('join_chat', normalizedPayload);
  }, []);

  const getSocketConnectDelayMs = () =>
    pathnameRef.current.startsWith('/chat') ? 150 : 2000;

  useEffect(() => {
    const handleJoinRoomsEvent = (event) => {
      const payload = event?.detail;
      const rooms =
        Array.isArray(payload)
          ? payload
          : payload?.rooms || payload?.roomIds || payload?.channels || [];
      joinRooms(rooms);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SOCKET_JOIN_ROOMS_EVENT, handleJoinRoomsEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SOCKET_JOIN_ROOMS_EVENT, handleJoinRoomsEvent);
      }
    };
  }, [joinRooms]);

  useEffect(() => {
    if (!socketUserId) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      setOnlineUsers({});
      pendingRoomsRef.current.clear();
      joinedRoomsRef.current.clear();
      return;
    }

    const userId = socketUserId;
    const accessToken = socketAccessToken;

    // Prefer an explicit socket URL.
    // Otherwise prefer the backend origin directly, with same-origin only as a final fallback.
    const explicitSocketUrl = sanitizeSocketUrl(
      globalThis?.process?.env?.NEXT_PUBLIC_SOCKET_URL?.trim() || '',
    );

    const socketUrl =
      explicitSocketUrl ||
      FILE_BASE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '') ||
      '';
    if (!socketUrl) {
      setSocket(null);
      return;
    }

    let isDisposed = false;
    let cancelDeferredConnect = () => {};
    let cancelSocketBootstrap = () => {};

    const scheduleSocketConnect = () => {
      cancelDeferredConnect();
      cancelDeferredConnect = deferSocketConnect(() => {
        const activeSocket = socketRef.current;
        if (!isDisposed && activeSocket && !activeSocket.connected && !activeSocket.active) {
          activeSocket.connect();
        }
      }, getSocketConnectDelayMs());
    };

    const bootstrapSocket = async () => {
      if (isDisposed || socketRef.current) {
        return;
      }

      try {
        if (isDisposed || socketRef.current) {
          return;
        }

        const { io } = await import('socket.io-client');
        if (isDisposed || socketRef.current) {
          return;
        }

        const webSocketOnly = shouldUseWebSocketOnly(socketUrl);
        const newSocket = io(socketUrl, {
          path: '/socket.io',
          transports: webSocketOnly ? ['websocket'] : ['polling', 'websocket'],
          upgrade: !webSocketOnly,
          rememberUpgrade: false,
          autoConnect: false,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          // Let pagehide/pageshow manage teardown so the page remains bfcache-friendly.
          closeOnBeforeunload: false,
          withCredentials: true,
          auth: {
            userId: String(userId),
            token: accessToken || undefined,
          },
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        const registerSocketUser = () => {
          newSocket.emit('register', {
            userId: String(userId),
            token: accessToken || undefined,
          });
        };

        newSocket.on('connect', () => {
          registerSocketUser();
          newSocket.emit('online_users');
          flushPendingRooms(newSocket);
        });

        newSocket.on('registered', () => {
          flushPendingRooms(newSocket);
        });

        newSocket.on('user_online', ({ userId: id, role }) => {
          setOnlineUsers(prev => ({ ...prev, [id]: { role, online: true } }));
        });

        newSocket.on('user_offline', ({ userId: id }) => {
          setOnlineUsers(prev => ({ ...prev, [id]: { ...prev[id], online: false } }));
        });

        newSocket.on('online', ({ userId: id, role, online }) => {
          if (!id) return;
          setOnlineUsers((prev) => ({
            ...prev,
            [id]: {
              role: role || prev[id]?.role,
              online: Boolean(online),
            },
          }));
        });

        newSocket.on('online_users', (payload = {}) => {
          const users = Array.isArray(payload?.users) ? payload.users : [];
          if (!users.length) {
            setOnlineUsers({});
            return;
          }

          const next = {};
          users.forEach((item) => {
            const id = String(item?.userId || "").trim();
            if (!id) return;
            next[id] = {
              role: item?.role || null,
              online: true,
            };
          });
          setOnlineUsers(next);
        });

        newSocket.on('rooms_joined', ({ rooms }) => {
          normalizeRoomIds(rooms).forEach((room) => joinedRoomsRef.current.add(room));
        });

        newSocket.on('connect_error', (err) => {
          if (isDisposed) return;
          const message = err?.message || String(err);
          if (message === 'xhr poll error') {
            return;
          }
          console.warn('Socket connect error:', message);
        });

        newSocket.on('auth_error', (payload) => {
          console.warn('Socket auth error:', payload?.message || payload);
        });

        scheduleSocketConnect();
      } catch (error) {
        if (!isDisposed) {
          console.warn('Failed to load socket client:', error);
        }
      }
    };

    const scheduleSocketBootstrap = () => {
      cancelSocketBootstrap();
      cancelSocketBootstrap = deferSocketConnect(() => {
        void bootstrapSocket();
      }, getSocketConnectDelayMs());
    };

    const handlePageHide = () => {
      cancelSocketBootstrap();
      cancelDeferredConnect();
      const activeSocket = socketRef.current;
      if (activeSocket?.connected || activeSocket?.active) {
        activeSocket.removeAllListeners();
        activeSocket.disconnect();
      }
    };

    const handlePageShow = () => {
      if (socketRef.current) {
        scheduleSocketConnect();
        return;
      }
      scheduleSocketBootstrap();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    scheduleSocketBootstrap();

    return () => {
      isDisposed = true;
      cancelSocketBootstrap();
      cancelDeferredConnect();
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      const activeSocket = socketRef.current;
      if (activeSocket?.connected || activeSocket?.active) {
        activeSocket.removeAllListeners();
        activeSocket.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
    };
  }, [flushPendingRooms, socketAccessToken, socketUserId]);

  const getJoinedRooms = useCallback(() => Array.from(joinedRoomsRef.current), []);
  const isOnline = useCallback((id) => onlineUsers[id]?.online || false, [onlineUsers]);

  const value = useMemo(() => ({
    socket,
    onlineUsers,
    joinRooms,
    joinChat,
    getJoinedRooms,
    isOnline,
  }), [getJoinedRooms, isOnline, joinChat, joinRooms, onlineUsers, socket]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
