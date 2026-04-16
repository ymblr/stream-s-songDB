import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { loadYouTubeAPI, getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon, RepeatIcon, Repeat1Icon, ChevronDownIcon, XIcon, MaximizeIcon, MicIcon, MusicIcon, VolumeIcon } from './Icons';

// Seekbar with drag support
function Seekbar({ song, ytPlayerRef, size = 'normal' }) {
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const barRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const update = () => {
      if (!dragging && ytPlayerRef.current && song) {
        try {
          const time = ytPlayerRef.current.getCurrentTime?.() ?? 0;
          const dur = song.endTime - song.startTime;
          setProgress(Math.max(0, Math.min(1, (time - song.startTime) / dur)));
        } catch {}
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [song, dragging]);

  const getRatio = (e) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (x - rect.left) / rect.width));
  };

  const commitSeek = useCallback((ratio) => {
    if (song && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(song.startTime + ratio * (song.endTime - song.startTime), true);
    }
  }, [song]);

  const onDown = (e) => { setDragging(true); const r = getRatio(e); setProgress(r); };
  const onMove = useCallback((e) => { if (dragging) setProgress(getRatio(e)); }, [dragging]);
  const onUp = useCallback((e) => { if (!dragging) return; setDragging(false); commitSeek(getRatio(e)); }, [dragging, commitSeek]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: true }); window.addEventListener('touchend', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp);
    };
  }, [dragging, onMove, onUp]);

  const h = size === 'large' ? 4 : 3;
  const active = dragging || hovering;
  const elapsed = song ? (song.endTime - song.startTime) * progress : 0;
  const total = song ? song.endTime - song.startTime : 0;

  return (
    <div>
      <div
        ref={barRef}
        onMouseDown={onDown} onTouchStart={onDown}
        onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        style={{ height: 20, display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ width: '100%', height: active ? h + 2 : h, background: 'var(--border2)', borderRadius: 4, position: 'relative', transition: 'height 0.1s' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--pink)', borderRadius: 4 }} />
          <div style={{
            position: 'absolute', top: '50%', left: `${progress * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: active ? 14 : 0, height: active ? 14 : 0,
            borderRadius: '50%', background: 'var(--pink)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            transition: 'width 0.1s, height 0.1s',
          }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: -2 }}>
        <span>{secondsToTimestamp(elapsed)}</span>
        <span>{secondsToTimestamp(total)}</span>
      </div>
    </div>
  );
}

// Volume slider
function VolumeSlider({ volume, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn-icon"
        onClick={() => setOpen(o => !o)}
        style={{ width: 28, height: 28, color: volume === 0 ? 'var(--text3)' : 'var(--text2)' }}
        title={`音量: ${volume}%`}
      >
        <VolumeIcon size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 38, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--card)', border: '1px solid var(--border2)',
          borderRadius: 10, padding: '12px 10px',
          boxShadow: 'var(--shadow-lg)', zIndex: 400,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>{volume}%</span>
          <input
            type="range" min={0} max={100} value={volume}
            onChange={e => onChange(Number(e.target.value))}
            style={{
              writingMode: 'vertical-lr', direction: 'rtl',
              width: 4, height: 80, cursor: 'pointer',
              accentColor: 'var(--pink)',
              WebkitAppearance: 'slider-vertical',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function MiniPlayer() {
  const {
    currentSong, currentPlaylist, currentIndex,
    isPlaying, playerMode, setPlayerMode,
    loopMode, setLoopMode, volume, changeVolume,
    togglePlay, playNext, playPrev, stopPlayer,
    onPlayerReady, onPlayerStateChange, loadSongIntoPlayer,
    ytPlayerRef,
  } = usePlayer();

  const playerDivRef = useRef(null);

  useEffect(() => {
    loadYouTubeAPI().then(() => {
      if (!playerDivRef.current) return;
      const player = new window.YT.Player(playerDivRef.current, {
        videoId: '',
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, disablekb: 1, origin: window.location.origin },
        events: {
          onReady: (e) => onPlayerReady(e.target),
          onStateChange: (e) => onPlayerStateChange(e.data),
        },
      });
    });
  }, []);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < currentPlaylist.length - 1;
  const loopOrder = ['none', 'song', 'playlist'];
  const cycleLoop = () => setLoopMode(loopOrder[(loopOrder.indexOf(loopMode) + 1) % loopOrder.length]);
  const LoopBtnIcon = loopMode === 'song' ? Repeat1Icon : RepeatIcon;

  const TypeBadge = ({ song }) => (
    <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
      {song.streamType === 'singing' ? <><MicIcon size={10} /> 歌</> : <><MusicIcon size={10} /> ウクレレ</>}
    </span>
  );

  const hiddenPlayer = (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}>
      <div ref={playerDivRef} />
    </div>
  );

  if (!currentSong) return hiddenPlayer;
  const thumbnail = getThumbnailUrl(currentSong.videoId, 'hq');

  // === FULL PLAYER ===
  if (playerMode === 'full') {
    return (
      <>
        {hiddenPlayer}
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 500, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 54, borderBottom: '1px solid var(--border)', gap: 10, flexShrink: 0 }}>
            <button className="btn-icon" onClick={() => setPlayerMode('mini')} title="ミニプレイヤーへ"><ChevronDownIcon size={20} /></button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>
              {currentPlaylist.length > 1 ? `${currentIndex + 1} / ${currentPlaylist.length}` : '再生中'}
            </span>
            <button className="btn-icon" onClick={stopPlayer}><XIcon size={16} /></button>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Main player */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 40px 32px', minWidth: 0 }}>
              {/* Artwork */}
              <div style={{ width: '100%', maxWidth: 340, aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', background: '#000', marginBottom: 24, flexShrink: 0 }}>
                <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {/* Info */}
              <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 340 }}>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.name}</p>
                <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 8 }}>{currentSong.artist}</p>
                <TypeBadge song={currentSong} />
              </div>

              {/* Seekbar */}
              <div style={{ width: '100%', maxWidth: 340, marginBottom: 12 }}>
                <Seekbar song={currentSong} ytPlayerRef={ytPlayerRef} size="large" />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={cycleLoop} className="btn-icon" style={{ color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)' }} title={loopMode === 'none' ? 'ループなし' : loopMode === 'song' ? '1曲リピート' : '全曲リピート'}>
                  <LoopBtnIcon size={18} />
                </button>
                <button onClick={playPrev} disabled={!hasPrev} className="btn-icon" style={{ width: 40, height: 40, opacity: hasPrev ? 1 : 0.3 }}>
                  <SkipPrevIcon size={20} />
                </button>
                <button onClick={togglePlay} style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-pink)', transition: 'all 0.15s' }}>
                  {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
                </button>
                <button onClick={playNext} disabled={!hasNext} className="btn-icon" style={{ width: 40, height: 40, opacity: hasNext ? 1 : 0.3 }}>
                  <SkipNextIcon size={20} />
                </button>
                <VolumeSlider volume={volume} onChange={changeVolume} />
              </div>

              {/* Keyboard shortcuts hint */}
              <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[['Space/K', '再生/停止'], ['←/→', '5秒移動'], ['J/L', '5秒移動'], ['N/P', '次/前の曲'], ['↑↓', '音量'], ['M', 'ミュート']].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace', color: 'var(--text2)' }}>{key}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Playlist sidebar */}
            {currentPlaylist.length > 1 && (
              <div style={{ width: 250, borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', padding: '14px 14px 10px', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  再生リスト
                </p>
                {currentPlaylist.map((song, i) => (
                  <div key={song.id || i} onClick={() => loadSongIntoPlayer(song, currentPlaylist, i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', background: i === currentIndex ? 'var(--pink-dim)' : 'transparent', borderLeft: `2px solid ${i === currentIndex ? 'var(--pink)' : 'transparent'}`, transition: 'all 0.15s' }}>
                    <img src={getThumbnailUrl(song.videoId, 'mq')} alt="" style={{ width: 38, height: 21, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: i === currentIndex ? 600 : 400, color: i === currentIndex ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.name}</p>
                      <p style={{ fontSize: 10, color: 'var(--text3)' }}>{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // === MINI PLAYER ===
  return (
    <>
      {hiddenPlayer}
      <div style={{ position: 'fixed', bottom: 20, right: 20, width: 320, background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', zIndex: 300, overflow: 'hidden', animation: 'slideUp 0.25s ease' }}>
        <div style={{ padding: '10px 14px 0' }}>
          <Seekbar song={currentSong} ytPlayerRef={ytPlayerRef} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 11px' }}>
          <img src={thumbnail} alt="" onClick={() => setPlayerMode('full')}
            style={{ width: 44, height: 25, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }} />
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setPlayerMode('full')}>
            <p style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.name}</p>
            <p style={{ fontSize: 10, color: 'var(--text3)' }}>{currentSong.artist}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {currentPlaylist.length > 1 && (
              <button className="btn-icon" onClick={playPrev} disabled={!hasPrev} style={{ width: 28, height: 28, opacity: hasPrev ? 1 : 0.3 }}><SkipPrevIcon size={13} /></button>
            )}
            <button onClick={togglePlay} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isPlaying ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
            </button>
            {currentPlaylist.length > 1 && (
              <button className="btn-icon" onClick={playNext} disabled={!hasNext} style={{ width: 28, height: 28, opacity: hasNext ? 1 : 0.3 }}><SkipNextIcon size={13} /></button>
            )}
            <VolumeSlider volume={volume} onChange={changeVolume} />
            <button className="btn-icon" onClick={() => setPlayerMode('full')} style={{ width: 28, height: 28, color: 'var(--text3)' }} title="拡大"><MaximizeIcon size={13} /></button>
            <button className="btn-icon" onClick={stopPlayer} style={{ width: 28, height: 28, color: 'var(--text3)' }}><XIcon size={13} /></button>
          </div>
        </div>
      </div>
    </>
  );
}
