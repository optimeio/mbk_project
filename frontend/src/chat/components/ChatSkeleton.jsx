import React from 'react';

const T = {
  bg: '#eaf3ee',
  border: 'rgba(45,122,82,0.14)',
  green: '#2d7a52',
  textMuted: '#5a8c6e',
};

const SkeletonItem = ({ width = '100%', height = 16, borderRadius = 4, className = '', style = {} }) => (
  <div 
    className={`skeleton-pulse ${className}`}
    style={{
      width,
      height,
      borderRadius,
      ...style
    }} 
  />
);

export const SidebarSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 0' }}>
    {/* Sidebar Header Skeleton */}
    <div style={{ padding: '0 16px 16px', borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <SkeletonItem width={34} height={34} borderRadius={10} />
        <div style={{ flex: 1 }}>
          <SkeletonItem width="80px" height={14} style={{ marginBottom: 4 }} />
          <SkeletonItem width="50px" height={8} />
        </div>
      </div>
      <SkeletonItem width="100%" height={38} borderRadius={14} />
    </div>

    {/* Channel List Items */}
    <div style={{ flex: 1, padding: '0 8px' }}>
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 4 }}>
          <SkeletonItem width={40} height={40} borderRadius={12} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <SkeletonItem width="45%" height={12} />
              <SkeletonItem width="25px" height={10} />
            </div>
            <SkeletonItem width="85%" height={10} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const WindowSkeleton = () => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
    {/* Header Skeleton */}
    <div style={{ padding: '10px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, height: 61 }}>
      <SkeletonItem width={36} height={36} borderRadius={10} />
      <div style={{ flex: 1 }}>
        <SkeletonItem width="120px" height={13} style={{ marginBottom: 5 }} />
        <SkeletonItem width="80px" height={9} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonItem width={30} height={30} borderRadius={8} />
        <SkeletonItem width={30} height={30} borderRadius={8} />
        <SkeletonItem width={30} height={30} borderRadius={8} />
      </div>
    </div>
    
    {/* Message List Skeleton - Ghost Bubbles */}
    <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24, background: '#f2f7f4' }}>
      
      {/* Received Message */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, alignSelf: 'flex-start', minWidth: '180px' }}>
        <SkeletonItem width={28} height={28} borderRadius={14} style={{ flexShrink: 0 }} />
        <SkeletonItem width="180px" height={36} borderRadius="16px 16px 16px 0" />
      </div>

      {/* Sent Message */}
      <div style={{ alignSelf: 'flex-end', minWidth: '150px' }}>
        <SkeletonItem width="150px" height={42} borderRadius="16px 16px 0 16px" />
      </div>

      {/* Received Message Grouped */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'flex-start', minWidth: '220px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
           <div style={{ width: 28, flexShrink: 0 }} /> {/* Spacer */}
           <SkeletonItem width="220px" height={54} borderRadius="16px 16px 16px 4px" />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
           <SkeletonItem width={28} height={28} borderRadius={14} style={{ flexShrink: 0 }} />
           <SkeletonItem width="140px" height={36} borderRadius="4px 16px 16px 16px" />
        </div>
      </div>

      {/* Sent Message */}
      <div style={{ alignSelf: 'flex-end', minWidth: '120px' }}>
        <SkeletonItem width="120px" height={36} borderRadius="16px 16px 0 16px" />
      </div>
    </div>

    {/* Input Skeleton */}
    <div style={{ padding: '16px 20px', borderTop: `1px solid ${T.border}`, background: '#fff' }}>
      <SkeletonItem width="100%" height={48} borderRadius={14} />
    </div>
  </div>
);

export const InfoPanelSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: `1px solid ${T.border}`, background: '#fff' }}>
    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 61 }}>
      <SkeletonItem width="110px" height={16} style={{ marginBottom: 0 }} />
      <SkeletonItem width={30} height={30} borderRadius={8} />
    </div>
    
    <div style={{ flex: 1, padding: '24px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <SkeletonItem width={80} height={80} borderRadius={24} style={{ marginBottom: 16 }} />
        <SkeletonItem width="140px" height={18} style={{ marginBottom: 8 }} />
        <SkeletonItem width="90px" height={12} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <SkeletonItem width="100%" height={56} borderRadius={12} />
        <SkeletonItem width="100%" height={56} borderRadius={12} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ padding: '16px 0', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <SkeletonItem width="100px" height={14} />
          <SkeletonItem width="24px" height={14} borderRadius={10} />
        </div>
        <div style={{ padding: '16px 0', borderTop: `1px solid ${T.border}` }}>
          <SkeletonItem width="130px" height={14} />
        </div>
        <div style={{ padding: '16px 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <SkeletonItem width="90px" height={14} />
        </div>
      </div>
    </div>
  </div>
);

export default function ChatSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#f2f7f4', overflow: 'hidden' }} className="animate-chat-fade">
      <div style={{ width: 320, borderRight: `1px solid ${T.border}`, background: '#fff', flexShrink: 0 }}>
        <SidebarSkeleton />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minWidth: 0 }}>
        <div style={{ flex: 1 }}>
          <WindowSkeleton />
        </div>
        <div style={{ width: 320, flexShrink: 0, display: 'none' }} className="skeleton-info-panel-wrapper">
          {/* We hide this on very small screens via CSS if needed, but for now we render it to match the standard 3-column layout */}
          <InfoPanelSkeleton />
        </div>
      </div>
      <style>{`
        @media (min-width: 1024px) {
          .skeleton-info-panel-wrapper { display: block !important; }
        }
      `}</style>
    </div>
  );
}
