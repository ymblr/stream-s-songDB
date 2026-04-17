import React, { useState } from 'react';
import { getThumbnailUrl } from '../utils/youtube';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { PlayIcon, MicIcon, MusicIcon, EditIcon, PlusIcon } from './Icons';
import EditSongModal from './EditSongModal';
import PasswordModal from './PasswordModal';

export default function SongCard({ song, playlist = [], index = 0, compact = false, onUpdate }) {
  const { playSong, currentSong, addToQueue } = usePlayer();
  const { isAuthed } = useAuth();
  const isActive = currentSong?.id === song.id;
  const thumbnail = getThumbnailUrl(song.videoId, 'hq');
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [queued, setQueued] = useState(false);

  const handlePlay = (e) => {
    e.stopPropagation();
    playSong(song, playlist.length ? playlist : [song], playlist.length ? index : 0);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (isAuthed) setShowEdit(true);
    else setShowPassword(true);
  };

  const handleQueueClick = (e) => {
    e.stopPropagation();
    addToQueue(song);
    setQueued(true);
    setTimeout(() => setQueued(false), 1800);
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
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isActive ? 'var(--pink-dim)' : 'var(--card)', borderRadius: 8, border: `1px solid ${isActive ? 'rgba(212,84,122,0.25)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.14s', position: 'relative' }}
          onClick={handlePlay}
        >
          <img src={thumbnail} alt="" style={{ width: 50, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>{song.artist}</p>
          </div>
          <TypeBadge />
          {hovered && (
            <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
              <button onClick={handleQueueClick} className="btn-icon-sq" title="次に再生に追加" style={{ color: queued ? 'var(--pink)' : 'var(--text3)', width: 26, height: 26 }}>
                <PlusIcon size={12} />
              </button>
              <button onClick={handleEditClick} className="btn-icon-sq" title="編集" style={{ width: 26, height: 26 }}>
                <EditIcon size={12} />
              </button>
            </div>
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
        style={{ background: 'var(--card)', border: `1px solid ${isActive ? 'var(--pink)' : 'var(--border)'}`, borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s ease', boxShadow: isActive ? 'var(--glow-pink)' : 'none', position: 'relative' }}
        onMouseOver={e => { if (!isActive) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isActive ? 'var(--glow-pink)' : 'var(--shadow)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isActive ? 'var(--glow-pink)' : 'none'; }}
        onClick={handlePlay}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <img src={thumbnail} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* Play overlay */}
          <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s' }}>
            {hovered && (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(212,84,122,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <PlayIcon size={13} />
              </div>
            )}
          </div>
          {isActive && (
            <div style={{ position: 'absolute', top: 7, right: 7, background: 'var(--pink)', borderRadius: 20, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 3 }}>
              <PlayIcon size={8} /> 再生中
            </div>
          )}
          {/* Hover action buttons */}
          {hovered && (
            <div style={{ position: 'absolute', top: 7, left: 7, display: 'flex', gap: 4 }}>
              <button
                onClick={handleQueueClick}
                title={queued ? '追加しました' : '次に再生に追加'}
                style={{ width: 26, height: 26, borderRadius: '50%', background: queued ? 'rgba(212,84,122,0.9)' : 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.15s' }}
              >
                {queued ? '✓' : <PlusIcon size={11} />}
              </button>
              <button
                onClick={handleEditClick}
                title="編集"
                style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.15s' }}
              >
                <EditIcon size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, color: isActive ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{song.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{song.artist}</p>
          <TypeBadge />
        </div>
      </div>
      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => setShowEdit(true)} />}
      {showEdit && <EditSongModal song={song} onClose={() => setShowEdit(false)} onSave={onUpdate} />}
    </>
  );
}
