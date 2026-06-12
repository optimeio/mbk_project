"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Search, Users, MessageCircle, Check, Loader2, Megaphone } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { getOrCreatePrivateChannel, resolveUserRole, canDirectMessageWith } from '../services/streamClient';
import { getRoleMeta } from '../utils/helpers';

import { useChat } from '../context/ChatContext';

const T = { bg:'#f2f7f4',card:'#ffffff',cardHov:'#eaf3ee',border:'rgba(45,122,82,0.16)',borderHov:'rgba(45,122,82,0.3)',green:'#2d7a52',greenL:'#38a169',text:'#122c1e',muted:'#5a8c6e',dim:'#8ab89a' };

function UserPill({ user, onRemove }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 8px',borderRadius:8,background:'rgba(45,122,82,0.08)',border:`1px solid ${T.border}` }}>
      <UserAvatar user={user} size="xs"/>
      <span style={{ fontSize:11,color:T.green,fontWeight:500 }}>{user.name}</span>
      {onRemove&&<button onClick={onRemove} style={{ background:'none',border:'none',cursor:'pointer',color:T.dim,display:'flex',alignItems:'center',padding:0,marginLeft:2 }}><X size={10}/></button>}
    </div>
  );
}

export default function NewChatModal({ isOpen, onClose, mode='dm', onChannelCreated, contacts=[], groupCandidates=[], channelId=null, existingMemberIds=[] }) {
  const { client, currentUser } = useChat();
  const [search,setSearch]=useState(''); const [selected,setSelected]=useState([]); const [groupName,setGroupName]=useState(''); const [creating,setCreating]=useState(false); const [error,setError]=useState(''); const searchRef=useRef(null);
  
  const currentRole = currentUser?.role;
  const currentUserId = currentUser?.id || currentUser?._id;
  const rawList = (mode === 'group' || mode === 'add-member') ? groupCandidates : contacts;
  
  // Role-based workflow for 3 core roles: Trainer, SPOC Admin, Super Admin
  const available = rawList
    .map((c) => ({
      id: c.portalUserId || c.id || c._id,
      name: c.name,
      email: c.email,
      role: resolveUserRole({
        role: c.role,
        roleLabel: c.roleLabel,
        portalRole: c.portalRole,
        portalRoleLabel: c.portalRoleLabel,
        email: c.email,
      }),
    }))
    .filter(u => {
      if (!u.id || u.id === currentUserId) return false;
      if (mode === 'dm') {
        return canDirectMessageWith(currentRole, u.role);
      }
      return true;
    });

  const filtered = available.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.role?.toLowerCase().includes(search.toLowerCase())
  );
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setSearch('');
    setSelected([]);
    setGroupName('');
    setError('');

    const focusTimeout = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(focusTimeout);
    };
  }, [isOpen]);
  const toggle=user=>{ if(mode==='dm') setSelected([user]); else setSelected(p=>p.some(u=>u.id===user.id)?p.filter(u=>u.id!==user.id):[...p,user]); };
  const handleCreate=async()=>{
    if(mode !== 'broadcast' && !selected.length) return; 
    setError(''); setCreating(true);
    try { 
      let result;
      const { chatService } = await import('@/services/chatService');
      
      if(mode==='dm') {
        result = await getOrCreatePrivateChannel(currentUserId,selected[0].id);
      } else if (mode==='group') { 
        if(!groupName.trim()){setError('Please enter a group name');setCreating(false);return;} 
        result = await chatService.createGroupChannel({ 
          name: groupName, 
          portalUserIds: selected.map(u=>u.id),
          description: `Group created by ${currentUser.name}`
        }); 
      } else if (mode === 'add-member') {
        if (!channelId) throw new Error('Channel ID missing');
        result = await chatService.addGroupMembers(channelId, selected.map(u => u.id));
      } else if (mode==='broadcast') {
        if(!groupName.trim()){setError('Please enter a broadcast name');setCreating(false);return;}
        result = await chatService.sendAnnouncement({
          name: groupName.trim(),
          description: `Broadcast created by ${currentUser?.name || 'Super Admin'}`,
        });
      }
      
      if (onChannelCreated) onChannelCreated(result?.channelId || result?.channel?.id);
      onClose(); 
    } catch(err){ 
      setError(err.message||'Failed'); 
    } finally{ 
      setCreating(false); 
    }
  };
  if(!isOpen) return null;
  return (
    <div style={{ position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={onClose} style={{ position:'absolute',inset:0,background:'rgba(18,44,30,0.3)',backdropFilter:'blur(4px)' }}/>
      <div style={{ position:'relative',width:'100%',maxWidth:420,background:T.card,border:`1px solid ${T.border}`,borderRadius:18,boxShadow:'0 12px 40px rgba(45,122,82,0.15)',overflow:'hidden' }}>
        <div style={{ height:3,background:`linear-gradient(90deg,${T.green},${T.greenL})` }}/>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px 14px',borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:30,height:30,borderRadius:9,background:'rgba(45,122,82,0.1)',border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center' }}>
              {mode==='dm'
                ? <MessageCircle size={15} color={T.green}/>
                : mode==='group'||mode==='add-member'
                  ? <Users size={15} color={T.green}/>
                  : <Megaphone size={15} color={T.green}/>}
            </div>
            <h3 style={{ fontSize:13,fontWeight:700,color:T.text,margin:0 }}>{mode==='dm'?'New Message':mode==='group'?'New Group':mode==='add-member'?'Add Members':'New Broadcast Message'}</h3>
          </div>
          <button onClick={onClose} style={{ width:26,height:26,borderRadius:7,border:`1px solid ${T.border}`,background:'none',cursor:'pointer',color:T.dim,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.color=T.text;e.currentTarget.style.borderColor=T.borderHov;}}
            onMouseLeave={e=>{e.currentTarget.style.color=T.dim;e.currentTarget.style.borderColor=T.border;}}><X size={13}/></button>
        </div>
        <div style={{ padding:'14px 18px',display:'flex',flexDirection:'column',gap:10 }}>
          {mode!=='dm'&&(
            <input id="new-channel-name" name="name" type="text" value={groupName} onChange={e=>setGroupName(e.target.value)} 
              placeholder={mode==='group'?"Group name (e.g. Batch A — React)":"Broadcast name (e.g. Placement Updates)"}
              style={{ width:'100%',padding:'9px 12px',fontSize:12,background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,color:T.text,outline:'none',fontFamily:'Sora,sans-serif',boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=T.borderHov} onBlur={e=>e.target.style.borderColor=T.border}/>
          )}
          {mode==='group' && (
            <p style={{ margin:0, fontSize:11, color:T.muted }}>
              SPOC and Admin are added by default.
            </p>
          )}
          {selected.length>0&&<div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>{selected.map(u=><UserPill key={u.id} user={u} onRemove={()=>toggle(u)}/>)}</div>}
          {mode!=='broadcast' && (
            <div style={{ position:'relative' }}>
              <Search size={12} color={T.dim} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)' }}/>
              <input id="search-users-input" name="searchUsers" ref={searchRef} type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people…"
              style={{ width:'100%',padding:'9px 12px 9px 30px',fontSize:12,background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,color:T.text,outline:'none',fontFamily:'Sora,sans-serif',boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=T.borderHov} onBlur={e=>e.target.style.borderColor=T.border}/>
            </div>
          )}
          {mode!=='broadcast' && (
            <div style={{ maxHeight:200,overflowY:'auto',display:'flex',flexDirection:'column',gap:2 }}>
              {filtered.length===0?(<p style={{ textAlign:'center',fontSize:12,color:T.dim,padding:'20px 0' }}>{available.length===0?'No users you can message':'No users found'}</p>)
              :filtered.map(user=>{ 
                const isSel=selected.some(u=>u.id===user.id); 
                const isAlreadyMember = existingMemberIds.includes(user.id);
                const meta=getRoleMeta(user.role); 
                return (
                <button key={user.id} onClick={isAlreadyMember ? null : ()=>toggle(user)}
                  disabled={isAlreadyMember}
                  style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:isSel?'rgba(45,122,82,0.08)':'transparent',border:`1px solid ${isSel?T.borderHov:'transparent'}`,cursor:isAlreadyMember?'default':'pointer',opacity:isAlreadyMember?0.6:1,textAlign:'left',width:'100%',transition:'all .12s' }}
                  onMouseEnter={e=>{if(!isSel && !isAlreadyMember){e.currentTarget.style.background='rgba(45,122,82,0.05)';e.currentTarget.style.borderColor=T.border;}}}
                  onMouseLeave={e=>{if(!isSel && !isAlreadyMember){e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}}>
                  <UserAvatar user={user} size="sm" showStatus isOnline={false}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:12,fontWeight:500,color:T.text,margin:0 }}>{user.name}</p>
                    <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
                      <p style={{ fontSize:10,fontWeight:500,color:T.green,margin:0 }}>{meta.label}</p>
                      {isAlreadyMember && (
                        <span style={{ fontSize:9, fontWeight:700, background:'rgba(45,122,82,0.1)', color:T.green, padding:'1px 4px', borderRadius:4, textTransform:'uppercase' }}>Already Member</span>
                      )}
                    </div>
                  </div>
                  {isSel&&<div style={{ width:18,height:18,borderRadius:'50%',background:`linear-gradient(135deg,${T.green},${T.greenL})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><Check size={10} color="white"/></div>}
                  {isAlreadyMember && <Check size={14} color={T.green} style={{ opacity: 0.5 }} />}
                </button>
              );})}
            </div>
          )}
          {error&&<p style={{ fontSize:11,color:'#e05252',padding:'0 4px' }}>{error}</p>}
          <button onClick={handleCreate} disabled={(mode!=='broadcast'&&!selected.length)||creating}
            style={{ width:'100%',padding:'11px 0',borderRadius:10,border:'none',fontSize:13,fontWeight:700,cursor:(mode==='broadcast'||selected.length)&&!creating?'pointer':'not-allowed',color:'white',background:(mode==='broadcast'||selected.length)&&!creating?`linear-gradient(135deg,${T.green},${T.greenL})`:'rgba(234,243,238,0.8)',boxShadow:(mode==='broadcast'||selected.length)&&!creating?'0 4px 14px rgba(45,122,82,0.25)':'none',display:'flex',alignItems:'center',justifyContent:'center',gap:7,transition:'all .15s' }}
            onMouseEnter={e=>{if((mode==='broadcast'||selected.length)&&!creating)e.currentTarget.style.opacity='.9';}}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            {creating?<><Loader2 size={14} style={{ animation:'spin .7s linear infinite' }}/>Creating…</>:mode==='dm'?'Start Conversation':mode==='group'?'Create Group':mode==='add-member'?'Add Members':'Create Broadcast'}
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
