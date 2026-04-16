import React, { useState } from 'react';
import { getThumbnailUrl } from '../utils/youtube';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { PlayIcon, MicIcon, MusicIcon, EditIcon } from './Icons';
import EditSongModal from './EditSongModal';
import PasswordModal from './PasswordModal';

export default function SongCard({ song, playlist = [], index = 0, compact = false, onUpdate }) {
  const { playSong, currentSong } = usePlayer();
  const { isAuthed } = useAuth();
  const isActive = currentSong?.id === song.id;
  const thumbnail = getThumbnailUrl(song.videoId, 'hq');
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handlePlay = () => {
    playSong(song, playlist.length ? playlist : [song], playlist.length ? index : 0);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (isAuthed) setShowEdit(true);
    else setShowPassword(true);
  };

  const TypeBadge = () => (
    <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
      {song.streamType === 'singing' ? <><MicIcon size={10} /> 歌</> : <><MusicIcon size={10} /> ウクレレ</>}
    </span>
  );

  if (compact) {
    return (
      <>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: isActive ? 'var(--pink-dim)' : 'var(--card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${isActive ? 'rgba(232,96,138,0.25)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
          onClick={handlePlay}
        >
          <img src={thumbnail} alt="" style={{ width: 52, height: 29, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>{song.artist}</p>
          </div>
          <TypeBadge />
          {hovered && (
            <button onClick={handleEditClick} className="btn-icon" style={{ width: 28, height: 28, color: 'var(--text3)', flexShrink: 0 }} title="編集">
              <EditIcon size={13} />
            </button>
          )}
        </div>
        {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => setShowEdit(true)} />}
        {showEdit && <EditSongModal song={song} onClose={() => setShowEdit(false)} onSave={onUpdate} />}
      </>
    );
  }

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handlePlay}
        style={{ background: 'var(--card)', border: `1px solid ${isActive ? 'var(--pink)' : 'var(--border)'}`, borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: isActive ? 'var(--glow-pink)' : 'none', position: 'relative' }}
        onMouseOver={e => { if (!isActive) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isActive ? 'var(--glow-pink)' : 'var(--shadow)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isActive ? 'var(--glow-pink)' : 'none'; }}
      >
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <img src={thumbnail} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            {hovered && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(232,96,138,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <PlayIcon size={14} />
              </div>
            )}
          </div>
          {isActive && (
            <div style={{ position: 'absolute', top: 7, right: 7, background: 'var(--pink)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
              <PlayIcon size={8} /> 再生中
            </div>
          )}
          {/* Edit button on hover */}
          {hovered && (
            <button
              onClick={handleEditClick}
              style={{ position: 'absolute', top: 7, left: 7, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.15s' }}
              title="編集"
            >
              <EditIcon size={12} />
            </button>
          )}
        </div>
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, color: isActive ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{song.artist}</p>
          <TypeBadge />
        </div>
      </div>
      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => setShowEdit(true)} />}
      {showEdit && <EditSongModal song={song} onClose={() => setShowEdit(false)} onSave={onUpdate} />}
    </>
  );
}
