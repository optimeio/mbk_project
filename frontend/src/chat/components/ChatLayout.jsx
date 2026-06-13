"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { safeRouterReplace } from '@/utils/safeRouterNavigation';
import { Chat } from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';
import DeferredChatStyles from './DeferredChatStyles';
import { useStreamChat } from '../hooks/useChat';
import { getChannelFilter, CHANNEL_SORT } from '../services/streamClient';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import ChatSkeleton from './ChatSkeleton';
import { resolveUserRole, isSuperAdminRole, isSpocRole } from '../services/streamClient';

// Specialized Layouts
import { ChatProvider } from '../context/ChatContext';

const DesktopLayout = dynamic(() => import('./DesktopLayout'), {
  ssr: false,
  loading: () => null,
});
const MobileLayout = dynamic(() => import('./MobileLayout'), {
  ssr: false,
  loading: () => null,
});
const NewChatModal = dynamic(() => import('./NewChatModal'), {
  ssr: false,
  loading: () => null,
});

const G = '#2d7a52'; const GL = '#38a169';
const DIRECT_CUSTOM_TYPES = new Set(['direct', 'spoc-trainer']);
const GROUP_CUSTOM_TYPES = new Set(['group', 'trainer-group']);
const BROADCAST_CUSTOM_TYPES = new Set(['announcement', 'broadcast']);

const normalizeToken = (value = '') => String(value || '').trim().toLowerCase();

const isBroadcastChannel = (channel, announcementChannelId = null) => {
  const customType = normalizeToken(channel?.data?.customType);
  const matchesAnnouncementId =
    announcementChannelId && String(channel?.id || '') === String(announcementChannelId);

  return (
    matchesAnnouncementId ||
    channel?.type === 'admin-announcement-channel' ||
    channel?.data?.is_announcement === true ||
    BROADCAST_CUSTOM_TYPES.has(customType)
  );
};

const getMemberCount = (channel) => Object.keys(channel?.state?.members || {}).length;

const isGroupChannel = (channel, announcementChannelId = null) => {
  const customType = normalizeToken(channel?.data?.customType);
  return (
    channel?.type === 'trainer-group-channel' ||
    channel?.data?.is_group === true ||
    GROUP_CUSTOM_TYPES.has(customType) ||
    (!isBroadcastChannel(channel, announcementChannelId) && getMemberCount(channel) > 2)
  );
};

const isDirectChannel = (channel, announcementChannelId = null) => {
  const customType = normalizeToken(channel?.data?.customType);
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

const matchesLane = (channel, nav, announcementChannelId = null) => {
  if (nav === 'groups') return isGroupChannel(channel, announcementChannelId);
  if (nav === 'broadcasts') return isBroadcastChannel(channel, announcementChannelId);
  return isDirectChannel(channel, announcementChannelId);
};

function LoadingScreen() {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f2f7f4',flexDirection:'column',gap:20 }}>
      <div style={{ width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${G},${GL})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(45,122,82,0.3)' }}>
        <MessageSquare size={24} color="white" />
      </div>
      <div style={{ textAlign:'center' }}>
        <Loader2 size={18} color={G} style={{ animation:'spin .8s linear infinite',margin:'0 auto 8px' }} />
        <p style={{ fontSize:13,color:'#5a8c6e',fontFamily:'Sora,sans-serif' }}>Connecting to MBK Chat…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrorScreen({ title = 'Connection Failed', error }) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f2f7f4' }}>
      <div style={{ textAlign:'center',maxWidth:420,padding:32,background:'#fff',border:'1px solid rgba(224,82,82,0.2)',borderRadius:16,boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ width:52,height:52,borderRadius:14,background:'rgba(224,82,82,0.08)',border:'1px solid rgba(224,82,82,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
          <AlertCircle size={24} color="#e05252" />
        </div>
        <p style={{ fontSize:14,fontWeight:600,color:'#122c1e',marginBottom:6 }}>{title}</p>
        <p style={{ fontSize:12,color:'#5a8c6e' }}>{error}</p>
      </div>
    </div>
  );
}

export default function ChatLayout({ currentUser: propUser }) {
  const router = useRouter();
  const { client, loading, error, bootstrap, users, isDark, toggleDarkMode } = useStreamChat(propUser);
  const [activeChannel, setActiveChannelState] = useState(null);
  const activeChannelRef = useRef(null);
  const sessionRestoredRef = useRef(false);
  const laneSyncInFlightRef = useRef(false);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  const setActiveChannel = useCallback((nextChannel) => {
    setActiveChannelState((previousChannel) => {
      const resolvedChannel =
        typeof nextChannel === 'function' ? nextChannel(previousChannel) : nextChannel;

      if (typeof window !== 'undefined' && resolvedChannel) {
        sessionStorage.removeItem('mbk_chat_force_list');
      }

      return resolvedChannel || null;
    });
  }, []);
  const [modal,setModal] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [channelListVersion, setChannelListVersion] = useState(0);

  // 🌍 NAV & RESPONSIVE STATE
  const [activeNav, setActiveNav] = useState('chats');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isMobileRef = useRef(false);

  useEffect(() => {
    setActiveNav(localStorage.getItem('mbk_last_nav') || 'chats');
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  const baseCurrentUser = bootstrap?.currentUser || bootstrap?.user || propUser;
  const currentUser = baseCurrentUser
    ? { ...baseCurrentUser, role: resolveUserRole(baseCurrentUser) }
    : null;
  const currentUserId = currentUser?.id || currentUser?._id;
  const roleToken = currentUser?.role || '';

  const roleTabWorkflow = useMemo(() => {
    const sharedTabs = [
      { id: 'chats', label: 'Chats' },
      { id: 'groups', label: 'Groups' },
      { id: 'broadcasts', label: 'Broadcasts' },
    ];

    if (isSuperAdminRole(roleToken)) {
      return {
        defaultNav: 'chats',
        tabs: sharedTabs,
        helperText: 'Admin workflow: broadcast announcements, manage groups, then direct chats.',
      };
    }

    if (isSpocRole(roleToken)) {
      return {
        defaultNav: 'chats',
        tabs: sharedTabs,
        helperText: 'SPOC workflow: trainer groups first, direct support chats, read admin broadcasts.',
      };
    }

    return {
      defaultNav: 'chats',
      tabs: sharedTabs,
      helperText: 'Trainer workflow: direct chats, group coordination, and read-only broadcasts.',
    };
  }, [roleToken]);

  // 💾 STATE PERSISTENCE
  useEffect(() => { localStorage.setItem('mbk_last_nav', activeNav); }, [activeNav]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('mbk_chat_nav_change', { detail: activeNav }));
  }, [activeNav]);
  useEffect(() => {
    if (activeChannel?.id) {
       localStorage.setItem('mbk_last_channel_id', activeChannel.id);
       localStorage.setItem('mbk_last_channel_type', activeChannel.type || 'messaging');
    }
  }, [activeChannel]);

  // Keep navigation workflow role-aware to avoid cross-role tab mismatches.
  useEffect(() => {
    if (!roleToken) return;

    const roleKey = String(roleToken);
    const prevRoleKey = localStorage.getItem('mbk_last_nav_role');
    if (prevRoleKey !== roleKey) {
      setActiveNav(roleTabWorkflow.defaultNav);
      localStorage.setItem('mbk_last_nav', roleTabWorkflow.defaultNav);
    }
    localStorage.setItem('mbk_last_nav_role', roleKey);
  }, [roleToken, roleTabWorkflow.defaultNav]);

  // 📱 RESPONSIVE DETECTION
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleChannelChanged = () => {
      setShowInfoPanel(false);
      setActiveChannel(null);
      setChannelListVersion((version) => version + 1);
    };

    window.addEventListener('mbk:chat-channel-changed', handleChannelChanged);
    return () => window.removeEventListener('mbk:chat-channel-changed', handleChannelChanged);
  }, [setActiveChannel]);

  // 📱 KEYBOARD-SAFE MOBILE LAYOUT: Adjust height dynamically using Visual Viewport API
  useEffect(() => {
    if (!isMobile || !window.visualViewport) return;
    
    const handleViewportResize = () => {
      const height = window.visualViewport.height;
      document.documentElement.style.setProperty('--chat-viewport-height', `${height}px`);
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
    handleViewportResize(); // Initial call
    
    return () => window.visualViewport.removeEventListener('resize', handleViewportResize);
  }, [isMobile]);
  
  const filter = useMemo(() => {
    return getChannelFilter(currentUser?.role, currentUserId, bootstrap?.announcementChannelId);
  }, [currentUser?.role, currentUserId, bootstrap?.announcementChannelId]);

  const handleLogout = useCallback(()=>{ 
    localStorage.removeItem('mbk_last_channel_id');
    localStorage.removeItem('mbk_last_nav');
    safeRouterReplace(router, '/');
  },[router]);

  // 🧩 SESSION RECOVERY (runs once per mount)
  useEffect(() => {
    if (!client || !bootstrap || activeChannelRef.current || !currentUserId || sessionRestoredRef.current) {
      return;
    }
    if (typeof window !== 'undefined' && isMobile && sessionStorage.getItem('mbk_chat_force_list') === '1') {
      return;
    }

    sessionRestoredRef.current = true;
    let alive = true;

    const restoreSession = async () => {
      const lastId = localStorage.getItem('mbk_last_channel_id');
      const lastType = localStorage.getItem('mbk_last_channel_type') || 'messaging';
      try {
        if (lastId) {
          const verified = await client.queryChannels(
            { cid: `${lastType}:${lastId}`, members: { $in: [currentUserId] } },
            [],
            { limit: 1 },
          );
          if (!alive || verified.length === 0) return;
          setActiveChannel(verified[0]);
        } else if (!isMobile) {
          const channels = await client.queryChannels(
            { type: 'messaging', members: { $in: [currentUserId] } },
            CHANNEL_SORT,
            { limit: 1 },
          );
          if (!alive || channels.length === 0) return;
          setActiveChannel(channels[0]);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err?.message);
      }
    };

    void restoreSession();
    return () => {
      alive = false;
    };
  }, [client, bootstrap, currentUserId, isMobile, setActiveChannel]);

  // Keep active conversation aligned with selected lane (Chats / Groups / Broadcasts).
  useEffect(() => {
    if (!client || !currentUserId) return;
    if (typeof window !== 'undefined' && isMobileRef.current && sessionStorage.getItem('mbk_chat_force_list') === '1') {
      return;
    }

    const announcementChannelId = bootstrap?.announcementChannelId || null;
    if (
      activeChannelRef.current
      && matchesLane(activeChannelRef.current, activeNav, announcementChannelId)
    ) {
      return;
    }

    let alive = true;
    laneSyncInFlightRef.current = true;

    const syncLaneChannel = async () => {
      try {
        const channels = await client.queryChannels(
          { members: { $in: [currentUserId] } },
          CHANNEL_SORT,
          { limit: 50, watch: false, presence: false, state: true },
        );
        if (!alive) return;

        const laneChannels = channels.filter((channel) =>
          matchesLane(channel, activeNav, announcementChannelId),
        );

        const nextChannel = laneChannels[0] || null;
        const currentChannel = activeChannelRef.current;
        if (
          currentChannel?.cid === nextChannel?.cid
          || (!currentChannel && !nextChannel)
        ) {
          return;
        }

        setActiveChannel(nextChannel);
      } catch (error) {
        console.warn('Lane sync failed:', error?.message || error);
      } finally {
        if (alive) {
          laneSyncInFlightRef.current = false;
        }
      }
    };

    void syncLaneChannel();
    return () => {
      alive = false;
      laneSyncInFlightRef.current = false;
    };
  }, [client, currentUserId, activeNav, bootstrap?.announcementChannelId, setActiveChannel]);

  if (loading) return <ChatSkeleton />;
  if (error)   return <ErrorScreen error={error}/>;
  if (bootstrap?.enabled === false) {
    return (
      <ErrorScreen
        title="Chat Unavailable"
        error={bootstrap?.message || "Internal chat is temporarily unavailable right now."}
      />
    );
  }
  if (!client || !bootstrap || !currentUserId) return <ChatSkeleton />;

  const commonProps = {
    activeNav, setActiveNav,
    activeChannel, setActiveChannel, showInfoPanel, setShowInfoPanel,
    filter, CHANNEL_SORT, setModal, handleLogout,
    bootstrap, isSidebarCollapsed, setIsSidebarCollapsed,
    tabItems: roleTabWorkflow.tabs,
    workflowHint: roleTabWorkflow.helperText,
    channelListVersion,
  };


  return (
    <>
      <DeferredChatStyles />
      <Chat client={client} theme={isDark ? "str-chat__theme-dark" : "str-chat__theme-light"}>
        <ChatProvider client={client} currentUser={currentUser} users={users} isDark={isDark}>
          <div className="chat-app" style={{ 
            height: isMobile ? 'var(--chat-viewport-height, 100dvh)' : '100%',
            background: isDark ? '#0a0a0a' : '#fff' 
          }}>
            {isMobile ? (
              <MobileLayout {...commonProps} />
            ) : (
              <DesktopLayout {...commonProps} />
            )}
          </div>

          <NewChatModal 
            isOpen={modal !== null} 
            onClose={() => setModal(null)} 
            mode={modal || 'dm'}
            contacts={bootstrap?.directContacts || []}
            groupCandidates={bootstrap?.groupCandidates || []}
            onChannelCreated={(channelId) => {
              if (channelId) {
                const channel = client.channel('messaging', channelId);
                channel.watch().then(() => setActiveChannel(channel));
              }
            }}
          />
        </ChatProvider>
      </Chat>
    </>
  );
}
