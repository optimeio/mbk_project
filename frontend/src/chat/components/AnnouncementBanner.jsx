"use client";

import { useState, useEffect } from 'react';
import { usePinnedAnnouncements } from '../hooks/useChat';
import { formatRelativeTime } from '../utils/helpers';
import { Megaphone, X, ChevronLeft, ChevronRight, Pin } from 'lucide-react';

export default function AnnouncementBanner({ client }) {
  const announcements = usePinnedAnnouncements(client);
  const [idx,setIdx]     = useState(0);
  const [visible,setVisible] = useState(true);
  useEffect(()=>{
    if(!announcements.length) return;
    const t = setInterval(()=>setIdx(i=>(i+1)%announcements.length),8000);
    return ()=>clearInterval(t);
  },[announcements.length]);
  if(!visible||!announcements.length) return null;
  const cur = announcements[idx];
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 18px',background:'#eaf3ee',borderBottom:'1px solid rgba(45,122,82,0.18)',position:'relative',flexShrink:0 }}>
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,rgba(45,122,82,0.3),transparent)' }} />
      <div style={{ width:24,height:24,borderRadius:7,background:'rgba(45,122,82,0.15)',border:'1px solid rgba(45,122,82,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <Megaphone size={12} color="#2d7a52"/>
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:4,padding:'2px 6px',borderRadius:5,background:'rgba(45,122,82,0.1)',border:'1px solid rgba(45,122,82,0.2)',flexShrink:0 }}>
        <Pin size={8} color="#2d7a52"/>
        <span style={{ fontSize:9,fontWeight:700,color:'#2d7a52',textTransform:'uppercase',letterSpacing:'.07em' }}>Pinned</span>
      </div>
      <p style={{ flex:1,fontSize:11,color:'#2d5c3e',minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',margin:0 }}>{cur.text}</p>
      <span style={{ fontSize:10,color:'#5a8c6e',flexShrink:0 }}>{formatRelativeTime(cur.created_at)} · {cur.user?.name}</span>
      {announcements.length>1&&(
        <div style={{ display:'flex',alignItems:'center',gap:3,flexShrink:0 }}>
          <button onClick={()=>setIdx(i=>(i-1+announcements.length)%announcements.length)} style={{ width:18,height:18,borderRadius:4,border:'none',background:'none',cursor:'pointer',color:'#8ab89a',display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronLeft size={11}/></button>
          <span style={{ fontSize:9,color:'#8ab89a',fontWeight:500 }}>{idx+1}/{announcements.length}</span>
          <button onClick={()=>setIdx(i=>(i+1)%announcements.length)} style={{ width:18,height:18,borderRadius:4,border:'none',background:'none',cursor:'pointer',color:'#8ab89a',display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronRight size={11}/></button>
        </div>
      )}
      <button onClick={()=>setVisible(false)} style={{ width:18,height:18,borderRadius:4,border:'none',background:'none',cursor:'pointer',color:'#8ab89a',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><X size={11}/></button>
    </div>
  );
}
