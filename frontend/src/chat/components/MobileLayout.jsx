"use client";

import { useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import '../styles/MobileChat.css';

export default function MobileLayout({
  activeNav,
  setActiveNav,
  activeChannel,
  setActiveChannel,
  showInfoPanel,
  setShowInfoPanel,
  filter,
  CHANNEL_SORT,
  setModal,
  handleLogout,
  bootstrap,
  tabItems = [],
  workflowHint = '',
  channelListVersion = 0,
}) {
  const openBroadcastChannel = () => {
    setModal('broadcast');
  };

  // 🧭 SIDE-EFFECT: Hide global MobileBottomNav when a chat is open
  useEffect(() => {
    if (activeChannel) {
      document.body.classList.add('hide-global-bottom-nav');
    } else {
      document.body.classList.remove('hide-global-bottom-nav');
    }
    return () => {
      document.body.classList.remove('hide-global-bottom-nav');
    };
  }, [activeChannel]);

  useEffect(() => {
    const handleTopbarBack = (event) => {
      if (!activeChannel) {
        return;
      }

      sessionStorage.setItem('mbk_chat_force_list', '1');
      setShowInfoPanel(false);
      setActiveChannel(null);
      if (event?.cancelable) {
        event.preventDefault();
      }
    };

    window.addEventListener('mbk:chat-topbar-back', handleTopbarBack);
    return () => {
      window.removeEventListener('mbk:chat-topbar-back', handleTopbarBack);
    };
  }, [activeChannel, setActiveChannel, setShowInfoPanel]);

  return (
    <div className="wa-root-container">
      {!activeChannel ? (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
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
              onNewChat={()=>setModal('dm')} 
              onNewGroup={()=>setModal('group')}
              onBroadcast={openBroadcastChannel} 
              onLogout={handleLogout}
              permissions={bootstrap?.permissions || {}}
              announcementChannelId={bootstrap?.announcementChannelId}
              isMobile={true}
            />
          </div>
        </div>
      ) : (
        <div style={{ height: '100%', width: '100%' }}>
          <ChatWindow 
            channel={activeChannel} 
            showInfoPanel={showInfoPanel}
            setShowInfoPanel={setShowInfoPanel}
            setActiveChannel={setActiveChannel}
            isMobile={true}
          />
        </div>
      )}
    </div>
  );
}
