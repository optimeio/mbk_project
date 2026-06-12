"use client";

import { MessageCircle, Users, Megaphone, LogOut } from 'lucide-react';

const T = {
  active: '#00a884',
  inactive: '#8696a0',
  bg: '#ffffff',
  bgDark: '#121b22',
  textDark: '#e9edef',
  mutedDark: '#8696a0'
};

const ICON_BY_TAB = {
  chats: MessageCircle,
  groups: Users,
  broadcasts: Megaphone,
};

export default function MobileBottomNav({ activeNav, setActiveNav, isDark, onExit, tabItems = [] }) {
  const laneTabs = Array.isArray(tabItems) && tabItems.length
    ? tabItems
    : [
        { id: 'chats', label: 'Chats' },
        { id: 'groups', label: 'Groups' },
        { id: 'broadcasts', label: 'Broadcasts' },
      ];

  const tabs = [
    ...laneTabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      icon: ICON_BY_TAB[tab.id] || MessageCircle,
    })),
    { id: 'exit', label: 'Exit', icon: LogOut, isAction: true },
  ];

  const K = isDark ? { bg: T.bgDark, text: T.textDark, muted: T.mutedDark } : { bg: T.bg, text: '#111b21', muted: T.inactive };

  return (
    <nav className="wa-bottom-nav" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: K.bg,
      borderTop: `1px solid ${isDark ? '#222e35' : '#f0f2f5'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxSizing: 'content-box'
    }}>
      {tabs.map(tab => {
        const isActive = activeNav === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => tab.isAction ? onExit?.() : setActiveNav(tab.id)}
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              outline: 'none'
            }}
          >
            <div style={{
              width: 56,
              height: 32,
              borderRadius: 16,
              background: isActive ? (isDark ? '#103629' : '#d9fdd3') : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease',
              marginBottom: 2
            }}>
              <Icon 
                size={20} 
                strokeWidth={isActive ? 2.5 : 2}
                color={isActive ? T.active : K.muted} 
              />
            </div>
            <span style={{
              fontSize: 12,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? (isDark ? T.textDark : '#111b21') : K.muted,
              transition: 'color 0.2s ease'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
