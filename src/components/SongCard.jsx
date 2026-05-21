import React, { useState } from 'react';
import { getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { PlayIcon, MicIcon, MusicIcon, EditIcon, PlusIcon } from './Icons';
import EditSongModal from './EditSongModal';
import PasswordModal from './PasswordModal';
import MarqueeText from './MarqueeText';

function getDuration(song) {
  const sec = (song.endTime || 0) - (song.startTime || 0);
  if (!sec || sec <= 0) return null;
  return secondsToTimestamp(sec);
}

export default function SongCard({ song, playlist = [], index = 0, compact = false, onUpdate }) {
  const { playSong, currentSong, addToQueue } = usePlayer();
  const { isAuthed } = useAuth();
  const isActive = currentSong?.id === song.id;
  const thumbnail = getThumbnailUrl(song.videoId, 'hq');
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [queued, setQueued] = useState(false);
  const duration = getDuration(song);

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
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px',
            background: isActive ? 'var(--pink-dim)' : 'var(--card)',
            borderRadius: 8,
            border: `1px solid ${isActive ? 'rgba(212,84,122,0.25)' : 'var(--border)'}`,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
          }}
          onClick={handlePlay}
        >
          <img src={thumbnail} alt="" style={{ width: 50, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <MarqueeText
              text={song.name}
              active={isActive}
              style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--pink)' : 'var(--text)' }}
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{song.artist}</p>
          </div>
          {duration && (
            <span style={{ fontSize: 10, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {duration}
            </span>
          )}
          <TypeBadge />
          {hovered && (
            <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
              <button onClick={handleQueueClick} className="btn-icon-sq" title="次に再生に追加"
                style={{ color: queued ? 'var(--pink)' : 'var(--text3)', width: 26, height: 26 }}>
                <PlusIcon size={12} />
              </button>
              <button onClick={handleEditClick} className="btn-icon-sq" title="編集" style={{ width: 26, height: 26 }}>
                <EditIcon size={12} />
              </button>
            </div>
          )}
          {isActive && <span className="now-playing-dot" />}
        </div>
        {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => setShowEdit(true)} />}
        {showEdit && <EditSongModal song={song} onClose={() => setShowEdit(false)} onSave={onUpdate} />}
      </>
    );
  }

  return (
    <>
      <div
        className="song-card-animate"
        style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          onClick={handlePlay}
          style={{
            background: 'var(--card)',
            border: `1px solid ${isActive ? 'var(--pink)' : hovered ? 'var(--border2)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.18s',
            boxShadow: isActive ? 'var(--glow-pink)' : hovered ? 'var(--shadow)' : 'none',
            transform: hovered && !isActive ? 'translateY(-3px)' : 'none',
            position: 'relative',
          }}
        >
          {/* サムネイル */}
          <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
            <img
              src={thumbnail} alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover',
                transition: 'filter 0.2s ease',
                filter: hovered ? 'brightness(0.7)' : 'brightness(1)',
              }}
            />

            {/* 再生ボタン（ホバー時） */}
            {hovered && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'rgba(212,84,122,0.92)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', boxShadow: '0 2px 14px rgba(212,84,122,0.5)',
                  animation: 'fadeInUp 0.13s ease',
                }}>
                  <PlayIcon size={14} />
                </div>
              </div>
            )}

            {/* 再生中バッジ */}
            {isActive && (
              <div style={{
                position: 'absolute', top: 7, right: 7,
                background: 'var(--pink)', borderRadius: 20,
                padding: '2px 8px', fontSize: 10, fontWeight: 700,
                color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span className="now-playing-dot" style={{ width: 5, height: 5 }} />
                再生中
              </div>
            )}

            {/* ホバーアクションボタン */}
            {hovered && (
              <div style={{ position: 'absolute', top: 7, left: 7, display: 'flex', gap: 4 }}>
                <button onClick={handleQueueClick} title={queued ? '追加しました' : '次に再生に追加'}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: queued ? 'rgba(212,84,122,0.92)' : 'rgba(0,0,0,0.62)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', transition: 'background 0.15s',
                  }}>
                  {queued ? '✓' : <PlusIcon size={11} />}
                </button>
                <button onClick={handleEditClick} title="編集"
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.62)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', transition: 'background 0.15s',
                  }}>
                  <EditIcon size={11} />
                </button>
              </div>
            )}

            {/* 再生時間（右下） */}
            {duration && (
              <div style={{
                position: 'absolute', bottom: 5, right: 6,
                background: 'rgba(0,0,0,0.72)', borderRadius: 4,
                padding: '1px 5px', fontSize: 10, fontWeight: 600,
                color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em',
              }}>
                {duration}
              </div>
            )}
          </div>

          {/* 情報エリア */}
          <div style={{ padding: '10px 12px 12px' }}>
            <MarqueeText
              text={song.name}
              active={isActive}
              style={{
                fontWeight: 600, fontSize: 13, marginBottom: 2,
                color: isActive ? 'var(--pink)' : 'var(--text)',
                letterSpacing: '-0.01em',
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{song.artist}</p>
            <TypeBadge />
          </div>
        </div>
      </div>

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => setShowEdit(true)} />}
      {showEdit && <EditSongModal song={song} onClose={() => setShowEdit(false)} onSave={onUpdate} />}
    </>
  );
}
