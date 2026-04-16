import React from 'react';
import { getThumbnailUrl } from '../utils/youtube';
import { usePlayer } from '../contexts/PlayerContext';

export default function SongCard({ song, playlist = [], index = 0, compact = false }) {
  const { playSong, currentSong } = usePlayer();
  const isActive = currentSong?.id === song.id;
  const thumbnail = getThumbnailUrl(song.videoId, 'hq');

  if (compact) {
    return (
      <div
        onClick={() => playSong(song, playlist.length ? playlist : [song], index)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px',
          background: isActive ? 'var(--pink-dim)' : 'var(--card)',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${isActive ? 'rgba(255,167,197,0.3)' : 'var(--border)'}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => !isActive && (e.currentTarget.style.borderColor = 'var(--border2)')}
        onMouseLeave={e => !isActive && (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={thumbnail} alt="" style={{ width: 56, height: 32, objectFit: 'cover', borderRadius: 4 }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: isActive ? 'rgba(255,167,197,0.3)' : 'rgba(0,0,0,0)',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
            transition: 'background 0.2s',
          }}>
            {isActive && '▶'}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 600,
            color: isActive ? 'var(--pink)' : 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{song.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>{song.artist}</p>
        </div>
        <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
          {song.streamType === 'singing' ? '歌' : '🪕'}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={() => playSong(song, playlist.length ? playlist : [song], index)}
      style={{
        background: isActive ? 'var(--card)' : 'var(--card)',
        border: `1px solid ${isActive ? 'rgba(255,167,197,0.4)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? 'var(--glow-pink)' : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isActive ? 'var(--glow-pink)' : 'none'; }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
        <img
          src={thumbnail}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={e => (e.currentTarget.style.opacity = 0)}
        >
          <div style={{
            width: 40, height: 40,
            borderRadius: '50%',
            background: 'rgba(255,167,197,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#0f0e17', fontWeight: 700,
          }}>▶</div>
        </div>
        {isActive && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'var(--pink)', borderRadius: 20,
            padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#0f0e17',
          }}>▶ 再生中</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <p style={{
          fontWeight: 600, fontSize: 14,
          marginBottom: 2,
          color: isActive ? 'var(--pink)' : 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{song.name}</p>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>{song.artist}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
            {song.streamType === 'singing' ? '歌枠' : 'ウクレレ枠'}
          </span>
        </div>
      </div>
    </div>
  );
}
