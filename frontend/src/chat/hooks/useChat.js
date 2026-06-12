"use client";

import { useEffect, useState, useRef } from "react";
import { StreamChat } from "stream-chat";
import API from "../../services/chatApi";
import { normalizeRole } from "../services/streamClient";
import { useSocket, SOCKET_JOIN_ROOMS_EVENT } from "@/context/SocketContext";

const toSocketRoomIds = (channels = []) => {
  if (!Array.isArray(channels)) return [];

  const roomIds = channels
    .map((channel) => {
      if (channel?.cid) return `channel:${channel.cid}`;
      if (channel?.type && channel?.id) return `channel:${channel.type}:${channel.id}`;
      return null;
    })
    .filter(Boolean);

  return Array.from(new Set(roomIds));
};

export const useChat = () => {
  const [client, setClient] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mbk_theme') === 'dark' : false));
  const initializedRef = useRef(false);
  const streamApiKeyRef = useRef(process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY || "");
  const socketContext = useSocket();
  const joinRooms = socketContext?.joinRooms;

  const toggleDarkMode = () => {
    setIsDark(prev => {
      const newVal = !prev;
      localStorage.setItem('mbk_theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    let mounted = true;
    let prewarmTimer = null;
    let fullBootstrapTimer = null;
    const init = async () => {
      // 🚀 PREMIUM: Try to load from local cache for instant UI
      const cached = localStorage.getItem('mbk_chat_bootstrap');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setBootstrap(parsed);
          if (parsed.users) setUsers(parsed.users);
        } catch (e) {
          localStorage.removeItem('mbk_chat_bootstrap');
        }
      }

      try {
        setLoading(true);
        // 🚀 Phase 1: FAST LOAD (Quick Bootstrap)
        const res = await API.get("/chat/quick-bootstrap");
        const data = res.data;
        const normalizedUser = data?.user
          ? {
              ...data.user,
              role: normalizeRole(
                data.user.role || data.user.portalRole || data.user.portal_role || data.user.portalRoleLabel,
                data.user.email
              ),
            }
          : null;
        const normalizedData = normalizedUser ? { ...data, user: normalizedUser, currentUser: normalizedUser } : data;
        const { user: userData, token } = normalizedData;

        setBootstrap(prev => ({ ...prev, ...normalizedData })); // Merge with initial cache if exists
        if (normalizedData.users) setUsers(prev => ({ ...prev, ...normalizedData.users }));
        
        // Don't fully overwrite localStorage yet, we want to keep full-bootstrap data if we have it
        const currentCached = JSON.parse(localStorage.getItem('mbk_chat_bootstrap') || '{}');
        localStorage.setItem('mbk_chat_bootstrap', JSON.stringify({ ...currentCached, ...normalizedData }));

        if (normalizedData?.enabled === false) {
          if (mounted) {
            setClient(null);
            setError(null);
          }
          return;
        }

        if (!userData?.id && !userData?._id) {
          throw new Error(normalizedData?.message || "Chat bootstrap user missing");
        }

        const resolvedStreamApiKey =
          normalizedData?.apiKey ||
          process.env.NEXT_PUBLIC_STREAM_API_KEY ||
          process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;

        if (!resolvedStreamApiKey) {
          throw new Error(normalizedData?.message || "Stream API key missing");
        }

        streamApiKeyRef.current = resolvedStreamApiKey;
        const chatClient = StreamChat.getInstance(resolvedStreamApiKey);

        // Map user object for Stream compatibility
        const streamUser = {
          id: userData.id || userData._id,
          name: userData.name || userData.email || String(userData.id || userData._id || ""),
          image: userData.image || userData.profilePicture,
          // Keep portal role metadata in custom fields. Do not override Stream system role from client.
          portal_role:
            userData.role ||
            userData.portalRole ||
            userData.portal_role ||
            userData.portalRoleLabel ||
            "Trainer",
        };

        if (chatClient.userID !== streamUser.id) {
          if (chatClient.userID) {
            await chatClient.disconnectUser();
          }
          await chatClient.connectUser(streamUser, token);
        }

        // Guard: if component unmounted during connectUser
        if (!mounted) return;

        setClient(chatClient);
        setLoading(false);

        // Defer channel cache warm-up so first paint is faster on refresh.
        prewarmTimer = window.setTimeout(async () => {
          if (!mounted) return;
          try {
            const memberChannels = await chatClient.queryChannels(
              { members: { $in: [streamUser.id] } },
              [{ last_message_at: -1 }],
              { limit: 30, watch: false, presence: false, state: true }
            );
            if (!mounted) return;
            const roomIds = toSocketRoomIds(memberChannels);
            if (roomIds.length) {
              joinRooms?.(roomIds);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent(SOCKET_JOIN_ROOMS_EVENT, { detail: { roomIds } })
                );
              }
            }
          } catch {
            // Non-fatal warm-up failure.
          }
        }, 0);

        // 🟢 REAL-TIME PRESENCE
        const handlePresenceChange = (event) => {
          if (event.user) {
            setUsers(prev => ({ ...prev, [event.user.id]: event.user }));
          }
        };

        chatClient.on('user.presence.changed', handlePresenceChange);
        chatClient.on('user.updated', handlePresenceChange);

        // Lazy full bootstrap after initial UI is interactive.
        fullBootstrapTimer = window.setTimeout(() => {
          API.get("/chat/full-bootstrap")
            .then(fullRes => {
            if (fullRes.data?.success) {
              const fullUser = fullRes.data?.currentUser || fullRes.data?.user;
              const normalizedFullUser = fullUser
                ? {
                    ...fullUser,
                    role: normalizeRole(
                      fullUser.role || fullUser.portalRole || fullUser.portal_role || fullUser.portalRoleLabel,
                      fullUser.email
                    ),
                  }
                : null;
              const normalizedFullData = normalizedFullUser
                ? { ...fullRes.data, currentUser: normalizedFullUser, user: normalizedFullUser }
                : fullRes.data;

              setBootstrap(prev => {
                const updated = { ...prev, ...normalizedFullData };
                localStorage.setItem('mbk_chat_bootstrap', JSON.stringify(updated));
                return updated;
              });
              if (normalizedFullData.users) {
                setUsers(prev => ({ ...prev, ...normalizedFullData.users }));
              }
            }
            })
            .catch(() => {
              // Non-fatal lazy bootstrap failure.
            });
        }, 300);

      } catch (err) {
        const statusCode = Number(err?.response?.status || err?.status || 0);
        if (statusCode === 401 && typeof window !== "undefined") {
          window.location.replace("/?login=true");
          return;
        }
        if (statusCode === 404) {
          if (mounted) {
            setBootstrap({
              enabled: false,
              message:
                err?.response?.data?.message ||
                "Chat is not available for your account.",
            });
            setClient(null);
            setError(null);
          }
          return;
        }
        console.error("Chat Init Error:", err);
        if (mounted) {
          setError(err?.response?.data?.message || err?.message || "Failed to initialize chat.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      initializedRef.current = false;
      if (prewarmTimer) {
        window.clearTimeout(prewarmTimer);
      }
      if (fullBootstrapTimer) {
        window.clearTimeout(fullBootstrapTimer);
      }
      
      // We DO NOT call chatClient.disconnectUser().
      // Because StreamChat is a singleton, disconnecting on unmount breaks
      // React 18 Strict Mode and re-navigation. Connection stays alive.
      
      const cleanupApiKey =
        streamApiKeyRef.current ||
        process.env.NEXT_PUBLIC_STREAM_API_KEY ||
        process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
      const chatClient = cleanupApiKey ? StreamChat.getInstance(cleanupApiKey) : null;
      if (chatClient) {
        chatClient.off('user.presence.changed');
        chatClient.off('user.updated');
      }
    };
  }, [joinRooms]);

  return { client, bootstrap, users, loading, error, isDark, toggleDarkMode };
};

// 🏛️ Compatibility Placeholders (Fixes White Screen Crashes)
export const useStreamChat = useChat; // Map to useChat
export const useUnreadCount = () => 0;
export const useChannelSearch = () => ({ query: '', setQuery: () => {}, results: [], searching: false });
export const useOnlineStatus = () => ({ isOnline: false, lastActive: null });
export const useTypingIndicator = () => [];
export const usePinnedAnnouncements = () => [];
export const useDarkMode = () => {
  const { isDark, toggleDarkMode } = useChat();
  return { isDark, toggle: toggleDarkMode };
};
export const useChatWorkspace = () => ({ channels: [], loading: false });

