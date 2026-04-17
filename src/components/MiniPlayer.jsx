import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { loadYouTubeAPI, getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon, RepeatIcon, Repeat1Icon, XIcon, MaximizeIcon, MicIcon, MusicIcon, VolumeIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';

// Seekbar
function Seekbar({ song, ytPlayerRef }) {
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const barRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      if (!dragging && ytPlayerRef.current && song) {
        try {
          const t = ytPlayerRef.current.getCurrentTime?.() ?? 0;
          setProgress(Math.max(0, Math.min(1, (t - song.startTime) / (song.endTime - song.startTime))));
        } catch {}
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [song, dragging]);

  const getR = (e) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (x - rect.left) / rect.width));
  };

  const commit = useCallback((r) => {
    if (song && ytPlayerRef.current) ytPlayerRef.current.seekTo(song.startTime + r * (song.endTime - song.startTime), true);
  }, [song]);

  const onDown = (e) => { setDragging(true); setProgress(getR(e)); };
  const onMove = useCallback((e) => { if (dragging) setProgress(getR(e)); }, [dragging]);
  const onUp = useCallback((e) => { if (!dragging) return; setDragging(false); commit(getR(e)); }, [dragging, commit]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove); window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp);
    };
  }, [dragging, onMove, onUp]);

  const active = dragging || hover;
  return (
    <div>
      <div ref={barRef} onMouseDown={onDown} onTouchStart={onDown}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: '100%', height: active ? 5 : 3, background: 'var(--border2)', borderRadius: 3, position: 'relative', transition: 'height 0.1s' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--pink)', borderRadius: 3 }} />
          {active && <div style={{ position: 'absolute', top: '50%', left: `${progress * 100}%`, transform: 'translate(-50%,-50%)', width: 13, height: 13, borderRadius: '50%', background: 'var(--pink)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: -1 }}>
        <span>{secondsToTimestamp(song ? (song.endTime - song.startTime) * progress : 0)}</span>
        <span>{secondsToTimestamp(song ? song.endTime - song.startTime : 0)}</span>
      </div>
    </div>
  );
}

// Volume popover - closes on outside click
function VolumeBtn({ volume, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn-icon-sq" onClick={() => setOpen(o => !o)} title={`音量 ${volume}%`} style={{ width: 28, height: 28 }}>
        <VolumeIcon size={14} muted={volume === 0} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--card)', border: '1px solid var(--border2)',
          borderRadius: 12, padding: '12px 10px',
          boxShadow: 'var(--shadow-lg)', zIndex: 500,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          pointerEvents: 'all',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{volume}%</span>
          <input
            type="range" min={0} max={100} value={volume}
            onChange={e => onChange(Number(e.target.value))}
            style={{
              writingMode: 'vertical-lr', direction: 'rtl',
              width: 4, height: 80,
              cursor: 'pointer', accentColor: 'var(--pink)',
              WebkitAppearance: 'slider-vertical',
            }}
          />
        </div>
      )}
    </div>
  );
}

// Modal full player
function FullPlayerModal({ onClose }) {
  const {
    currentSong, currentPlaylist, currentIndex,
    isPlaying, loopMode, setLoopMode, volume, changeVolume,
    togglePlay, playNext, playPrev, stopPlayer, loadSong,
    ytPlayerRef,
  } = usePlayer();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < currentPlaylist.length - 1;
  const loopOrder = ['none', 'song', 'playlist'];
  const cycleLoop = () => setLoopMode(loopOrder[(loopOrder.indexOf(loopMode) + 1) % loopOrder.length]);
  const LoopBtn = loopMode === 'song' ? Repeat1Icon : RepeatIcon;

  if (!currentSong) return null;
  const thumbnail = getThumbnailUrl(currentSong.videoId, 'hq');

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '92vw', maxWidth: 780, padding: 0, overflow: 'hidden', display: 'flex' }}>

        {/* Left: player controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 28px 24px', minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {currentPlaylist.length > 1 ? `${currentIndex + 1} / ${currentPlaylist.length}` : '再生中'}
            </p>
            <button className="btn-icon" onClick={onClose}><XIcon size={16} /></button>
          </div>

          {/* Artwork */}
          <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 20, boxShadow: 'var(--shadow-lg)', flexShrink: 0 }}>
            <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Song info */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontFamily: 'var(--font-logo)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.name}</p>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 6 }}>{currentSong.artist}</p>
            <span className={currentSong.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
              {currentSong.streamType === 'singing' ? <><MicIcon size={10} /> 歌枠</> : <><MusicIcon size={10} /> ウクレレ枠</>}
            </span>
          </div>

          {/* Seekbar */}
          <div style={{ marginBottom: 14 }}>
            <Seekbar song={currentSong} ytPlayerRef={ytPlayerRef} />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <button onClick={cycleLoop} className="btn-icon-sq" style={{ color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)' }} title={loopMode === 'none' ? 'ループなし' : loopMode === 'song' ? '1曲' : '全曲'}>
              <LoopBtn size={16} />
            </button>
            <button onClick={playPrev} disabled={!hasPrev} className="btn-icon" style={{ opacity: hasPrev ? 1 : 0.3 }}><SkipPrevIcon size={18} /></button>
            <button onClick={togglePlay} style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-pink)', transition: 'all 0.15s' }}>
              {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
            </button>
            <button onClick={playNext} disabled={!hasNext} className="btn-icon" style={{ opacity: hasNext ? 1 : 0.3 }}><SkipNextIcon size={18} /></button>
            <VolumeBtn volume={volume} onChange={changeVolume} />
          </div>

          {/* Keyboard hints */}
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['Space', '再生/停止'], ['←/→', '5秒'], ['↑↓', '音量'], ['N/P', '次/前'], ['M', 'ミュート']].map(([k, d]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <code style={{ background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 4, padding: '1px 5px', fontSize: 10, color: 'var(--text2)' }}>{k}</code>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: playlist */}
        {currentPlaylist.length > 1 && (
          <div style={{ width: 220, borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, background: 'var(--bg2)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', padding: '16px 14px 10px', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
              再生リスト
            </p>
            {currentPlaylist.map((s, i) => (
              <div key={s.id || i} onClick={() => loadSong(s, currentPlaylist, i)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: i === currentIndex ? 'var(--pink-dim)' : 'transparent', borderLeft: `2px solid ${i === currentIndex ? 'var(--pink)' : 'transparent'}`, transition: 'all 0.12s' }}>
                <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 38, height: 22, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: i === currentIndex ? 600 : 400, color: i === currentIndex ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                  <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MiniPlayer() {
  const {
    currentSong, currentPlaylist, currentIndex,
    isPlaying, showPlayer, setShowPlayer,
    loopMode, setLoopMode, volume, changeVolume,
    togglePlay, playNext, playPrev, stopPlayer,
    onPlayerReady, onPlayerStateChange, loadSong,
    ytPlayerRef,
  } = usePlayer();

  const playerDivRef = useRef(null);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  useEffect(() => {
    loadYouTubeAPI().then(() => {
      if (!playerDivRef.current) return;
      const player = new window.YT.Player(playerDivRef.current, {
        videoId: '',
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, disablekb: 1, origin: window.location.origin },
        events: {
          onReady: e => onPlayerReady(e.target),
          onStateChange: e => onPlayerStateChange(e.data),
        },
      });
    });
  }, []);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < currentPlaylist.length - 1;
  const loopOrder = ['none', 'song', 'playlist'];
  const cycleLoop = () => setLoopMode(loopOrder[(loopOrder.indexOf(loopMode) + 1) % loopOrder.length]);
  const LoopBtn = loopMode === 'song' ? Repeat1Icon : RepeatIcon;

  const hiddenPlayer = (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}>
      <div ref={playerDivRef} />
    </div>
  );

  if (!currentSong) return hiddenPlayer;
  const thumbnail = getThumbnailUrl(currentSong.videoId, 'hq');

  return (
    <>
      {hiddenPlayer}

      {/* Full player modal */}
      {showPlayer && <FullPlayerModal onClose={() => setShowPlayer(false)} />}

      {/* Scrollable mini playlist above mini player */}
      {currentPlaylist.length > 1 && playlistOpen && (
        <div style={{
          position: 'fixed', bottom: 82, right: 20,
          width: 300, maxHeight: 220,
          background: 'var(--card)', border: '1px solid var(--border2)',
          borderRadius: 12, overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)', zIndex: 299,
          animation: 'slideUp 0.18s ease',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 12px 6px', position: 'sticky', top: 0, background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
            再生リスト ({currentPlaylist.length}曲)
          </p>
          {currentPlaylist.map((s, i) => (
            <div key={s.id || i} onClick={() => loadSong(s, currentPlaylist, i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', background: i === currentIndex ? 'var(--pink-dim)' : 'transparent', borderLeft: `2px solid ${i === currentIndex ? 'var(--pink)' : 'transparent'}`, transition: 'all 0.12s' }}>
              <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: i === currentIndex ? 600 : 400, color: i === currentIndex ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.artist}</p>
              </div>
              {i === currentIndex && isPlaying && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pink)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}

      {/* Mini player */}
      <div style={{
        position: 'fixed', bottom: 16, right: 16,
        width: 308,
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 300,
        overflow: 'visible',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Inner rounded container */}
        <div style={{ borderRadius: 14, overflow: 'hidden' }}>
          {/* Seekbar */}
          <div style={{ padding: '10px 14px 0' }}>
            <Seekbar song={currentSong} ytPlayerRef={ytPlayerRef} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 11px' }}>
            {/* Thumbnail */}
            <img src={thumbnail} alt="" onClick={() => setShowPlayer(true)}
              style={{ width: 44, height: 25, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }} />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setShowPlayer(true)}>
              <p style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{currentSong.name}</p>
              <p style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.3 }}>{currentSong.artist}</p>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              {currentPlaylist.length > 1 && (
                <button className="btn-icon-sq" onClick={playPrev} disabled={!hasPrev} style={{ opacity: hasPrev ? 1 : 0.3 }}><SkipPrevIcon size={13} /></button>
              )}
              <button onClick={togglePlay} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isPlaying ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
              </button>
              {currentPlaylist.length > 1 && (
                <button className="btn-icon-sq" onClick={playNext} disabled={!hasNext} style={{ opacity: hasNext ? 1 : 0.3 }}><SkipNextIcon size={13} /></button>
              )}
              <VolumeBtn volume={volume} onChange={changeVolume} />
              {currentPlaylist.length > 1 && (
                <button className="btn-icon-sq" onClick={() => setPlaylistOpen(o => !o)} title="再生リスト" style={{ color: playlistOpen ? 'var(--pink)' : 'var(--text3)' }}>
                  {playlistOpen ? <ChevronDownIcon size={13} /> : <ChevronUpIcon size={13} />}
                </button>
              )}
              <button className="btn-icon-sq" onClick={() => setShowPlayer(true)} title="拡大"><MaximizeIcon size={13} /></button>
              <button className="btn-icon-sq" onClick={stopPlayer} style={{ color: 'var(--text3)' }}><XIcon size={13} /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
