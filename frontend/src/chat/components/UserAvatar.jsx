import { initials, getRoleMeta } from '../utils/helpers';
import { useSocket } from '@/context/SocketContext';

const SIZES = { 
  xs:{wh:24,text:9,dot:{w:7,b:-1,r:-1}}, 
  sm:{wh:32,text:10,dot:{w:8,b:-1,r:-1}}, 
  md:{wh:40,text:12,dot:{w:10,b:0,r:0}}, 
  lg:{wh:48,text:13,dot:{w:11,b:0,r:0}}, 
  xl:{wh:64,text:15,dot:{w:13,b:2,r:2}} 
};

export default function UserAvatar({ user, size='md', showStatus=false, isOnline: propOnline=false, className='' }) {
  const { isOnline: isSocketOnline } = useSocket();
  const s=SIZES[size]||SIZES.md;
  const meta=getRoleMeta(user?.role);
  const isOnline = propOnline || isSocketOnline(user?.id || user?._id);
  
  return (
    <div style={{ position:'relative',display:'inline-flex',flexShrink:0 }} className={className}>
      <div style={{ 
        width:s.wh,
        height:s.wh,
        borderRadius:Math.round(s.wh*.25),
        overflow:'hidden',
        flexShrink:0,
        position:'relative',
        background:`${meta.dot}18`,
        border:`1px solid ${meta.dot}30`,
        display:'flex',
        alignItems:'center',
        justifyContent:'center' 
      }}>
        <span style={{ 
          fontSize:s.text,
          fontWeight:700,
          color:meta.dot,
          letterSpacing:'.02em',
          fontFamily:'Sora,sans-serif' 
        }}>
          {initials(user?.name||'?')}
        </span>
      </div>
      {showStatus && (
        <span style={{ 
          position:'absolute',
          width:s.dot.w,
          height:s.dot.w,
          bottom:s.dot.b,
          right:s.dot.r,
          borderRadius:'50%',
          border:'2px solid #f2f7f4',
          background:isOnline?'#22c55e':'#c2d5dc',
          transition:'background .3s',
          boxShadow: isOnline ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none'
        }}/>
      )}
    </div>
  );
}
