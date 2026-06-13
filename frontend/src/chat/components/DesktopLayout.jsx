"use client";

import { MessageSquare } from 'lucide-react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import InfoPanel from './InfoPanel';
import AnnouncementBanner from './AnnouncementBanner';

export default function DesktopLayout({
  client,
  currentUser,
  activeNav,
  setActiveNav,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  activeChannel,
  setActiveChannel,
  showInfoPanel,
  setShowInfoPanel,
  filter,
  CHANNEL_SORT,
  setModal,
  handleLogout,
  users,
  bootstrap,
  isDark,
  toggleDarkMode,
  tabItems = [],
  workflowHint = '',
  channelListVersion = 0,
}) {
  const openBroadcastChannel = () => {
    setModal('broadcast');
  };

  return (
    <div style={{ display:'flex',height:'100%',width:'100%',flex:1,overflow:'hidden',background: isDark ? '#0a0a0a' : '#f2f7f4' }}>
      <aside style={{ width: 320, flexShrink: 0, height: '100%', borderRight: isDark ? '1px solid #222' : '1px solid rgba(45,122,82,0.12)', zIndex: 10, background: isDark ? '#0f0f0f' : '#fff', overflow: 'hidden' }}>
        <Sidebar
          key={`chat-sidebar-${channelListVersion}`}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          tabItems={tabItems}
          workflowHint={workflowHint}
          activeChannel={activeChannel}
          setActiveChannel={setActiveChannel}
          filter={filter}
          sort={CHANNEL_SORT}
          onNewChat={() => setModal('dm')}
          onNewGroup={() => setModal('group')}
          onBroadcast={openBroadcastChannel}
          onLogout={handleLogout}
          permissions={bootstrap?.permissions || {}}
          announcementChannelId={bootstrap?.announcementChannelId}
          isMobile={false}
        />
      </aside>

      <main style={{ flex:1,display:'flex',flexDirection:'row',overflow:'hidden',background: isDark ? '#0f0f0f' : '#fff', position: 'relative', height: '100%' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth: 0, minHeight: 0, height: '100%', position: 'relative' }}>
          <AnnouncementBanner client={client} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', position: 'relative' }}>
            {activeChannel ? (
              <ChatWindow 
                key={activeChannel.id}
                channel={activeChannel} 
                showInfoPanel={showInfoPanel}
                setShowInfoPanel={setShowInfoPanel}
                setActiveChannel={setActiveChannel}
                isMobile={false}
              />
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: isDark ? '#0a0a0a' : '#f2f7f4', 
                padding: 40, 
                textAlign: 'center'
              }}>
                <div style={{ width: 80, height: 80, borderRadius: 24, background: isDark ? '#151515' : '#fff', boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(45,122,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <MessageSquare size={36} color={isDark ? '#8ab89a' : '#2d7a52'} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#fff' : '#122c1e', marginBottom: 12 }}>Welcome to MBK Chat</h2>
                <p style={{ fontSize: 14, color: isDark ? '#aaa' : '#5a8c6e', maxWidth: 300, lineHeight: 1.6 }}>Select a conversation from the sidebar or start a new chat to begin.</p>
              </div>
            )}
          </div>
        </div>

        {showInfoPanel && activeChannel ? (
          <aside style={{ width: 340, height: '100%', overflow: 'hidden', borderLeft: isDark ? '1px solid #333' : '1px solid rgba(45,122,82,0.12)', background: isDark ? '#0f0f0f' : '#fff' }}>
            <InfoPanel 
              channel={activeChannel}
              groupCandidates={bootstrap?.groupCandidates || []}
              onClose={() => setShowInfoPanel(false)}
            />
          </aside>
        ) : null}
      </main>
    </div>
  );
}

