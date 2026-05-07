import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { loadYouTubeAPI, getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';
import {
  PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon,
  RepeatIcon, Repeat1Icon, XIcon, MaximizeIcon,
  MicIcon, MusicIcon, VolumeIcon, ChevronUpIcon, ChevronDownIcon,
  ShuffleIcon, TrashIcon,
} from './Icons';

// ── Seekbar ──────────────────────────────────────────────────────
function Seekbar({ song, ytRef, size = 'normal' }) {
  const [prog, setProg] = useState(0);
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState(false);
  const barRef = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    const tick = () => {
      if (!drag && ytRef.current && song) {
        try {
          const t = ytRef.current.getCurrentTime?.() ?? 0;
          setProg(Math.max(0, Math.min(1, (t - song.startTime) / (song.endTime - song.startTime))));
        } catch {}
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [song, drag]);

  const getR = (e) => {
    if (!barRef.current) return 0;
    const r = barRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (x - r.left) / r.width));
  };
  const commit = useCallback((r) => {
    if (song && ytRef.current) ytRef.current.seekTo(song.startTime + r * (song.endTime - song.startTime), true);
  }, [song]);
  const onDown = (e) => { e.stopPropagation(); setDrag(true); setProg(getR(e)); };
  const onMove = useCallback((e) => { if (drag) setProg(getR(e)); }, [drag]);
  const onUp = useCallback((e) => { if (!drag) return; setDrag(false); commit(getR(e)); }, [drag, commit]);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false }); window.addEventListener('touchend', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp); };
  }, [drag, onMove, onUp]);

  const active = drag || hover;
  const h = size === 'large' ? (active ? 6 : 4) : (active ? 5 : 3);
  return (
    <div>
      <div ref={barRef} onMouseDown={onDown} onTouchStart={onDown}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ height: size === 'large' ? 24 : 20, display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', touchAction: 'none' }}>
        <div style={{ width: '100%', height: h, background: 'var(--border2)', borderRadius: 4, position: 'relative', transition: 'height 0.1s' }}>
          <div style={{ height: '100%', width: `${prog * 100}%`, background: 'var(--pink)', borderRadius: 4 }} />
          {active && <div style={{ position: 'absolute', top: '50%', left: `${prog * 100}%`, transform: 'translate(-50%,-50%)', width: 13, height: 13, borderRadius: '50%', background: 'var(--pink)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: -2 }}>
        <span>{secondsToTimestamp(song ? (song.endTime - song.startTime) * prog : 0)}</span>
        <span>{secondsToTimestamp(song ? song.endTime - song.startTime : 0)}</span>
      </div>
    </div>
  );
}

// ── Volume — z-index 600 (highest), position:fixed via ref coords ─
function VolumeBtn({ volume, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const hideTimer = useRef(null);
  const [pos, setPos] = useState({ bottom: 200, right: 30 });

  const calcPos = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({
      bottom: window.innerHeight - r.top + 10,
      right: window.innerWidth - r.right + r.width / 2 - 20,
    });
  };

  const show = () => { clearTimeout(hideTimer.current); calcPos(); setOpen(true); };
  const hide = () => { hideTimer.current = setTimeout(() => setOpen(false), 600); };

  const isTouchDevice = () => window.matchMedia('(pointer:coarse)').matches;

  return (
    <>
      <button
        ref={btnRef}
        className="btn-icon-sq"
        onClick={() => {
          if (isTouchDevice()) { calcPos(); setOpen(o => !o); }
          else onChange(volume === 0 ? 80 : 0);
        }}
        onMouseEnter={() => { if (!isTouchDevice()) show(); }}
        onMouseLeave={hide}
        title={`音量 ${volume}%`}
      >
        <VolumeIcon size={14} muted={volume === 0} />
      </button>

      {open && (
        <div
          onMouseEnter={show} onMouseLeave={hide}
          style={{
            position: 'fixed',
            bottom: pos.bottom,
            right: pos.right,
            background: 'var(--card)',
            border: '1px solid var(--border2)',
            borderRadius: 12,
            padding: '12px 10px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 600, /* highest — above playlist(302) and player(300) */
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <button
            onClick={() => onChange(volume === 0 ? 80 : 0)}
            style={{ fontSize: 11, fontWeight: 600, color: volume === 0 ? 'var(--pink)' : 'var(--text2)', marginBottom: 2 }}
          >
            {volume === 0 ? '🔇 ミュート中' : `${volume}%`}
          </button>
          <input
            type="range" min={0} max={100} value={volume}
            onChange={e => onChange(Number(e.target.value))}
            style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 4, height: 80, cursor: 'pointer', accentColor: 'var(--pink)', WebkitAppearance: 'slider-vertical' }}
          />
        </div>
      )}
    </>
  );
}

// ── Full player modal ─────────────────────────────────────────────
function FullPlayerModal({ onClose }) {
  const { currentSong, currentPlaylist, currentIndex, isPlaying, loopMode, setLoopMode, shuffle, setShuffle, volume, changeVolume, togglePlay, playNext, playPrev, loadSong, queue, removeFromQueue, clearQueue, ytRef } = usePlayer();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < currentPlaylist.length - 1 || queue.length > 0;
  const loopOrder = ['none', 'song', 'playlist'];
  const cycleLoop = () => setLoopMode(loopOrder[(loopOrder.indexOf(loopMode) + 1) % loopOrder.length]);
  const LoopBtn = loopMode === 'song' ? Repeat1Icon : RepeatIcon;
  const isSingle = currentPlaylist.length <= 1;
  if (!currentSong) return null;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '94vw', maxWidth: 800, padding: 0, overflow: 'hidden', display: 'flex', maxHeight: '90vh' }}>
        {/* Left: player controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                {currentPlaylist.length > 1 ? `${currentIndex + 1} / ${currentPlaylist.length}` : '再生中'}
              </p>
              <button className="btn-icon" onClick={onClose}><XIcon size={16} /></button>
            </div>
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 14, boxShadow: 'var(--shadow-lg)' }}>
              <img src={getThumbnailUrl(currentSong.videoId, 'hq')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-logo)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSong.name}</p>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 8 }}>{currentSong.artist}</p>
            <span className={currentSong.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'} style={{ marginBottom: 14, display: 'inline-flex' }}>
              {currentSong.streamType === 'singing' ? <><MicIcon size={10} />歌枠</> : <><MusicIcon size={10} />ウクレレ枠</>}
            </span>
            <div style={{ marginBottom: 14 }}><Seekbar song={currentSong} ytRef={ytRef} size="large" /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShuffle(s => !s)} className="btn-icon-sq" style={{ color: shuffle ? 'var(--pink)' : 'var(--text3)' }}><ShuffleIcon size={15} /></button>
              <button onClick={cycleLoop} className="btn-icon-sq" style={{ color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)' }}><LoopBtn size={15} /></button>
              <button onClick={playPrev} disabled={!hasPrev} className="btn-icon" style={{ opacity: hasPrev ? 1 : 0.3 }}><SkipPrevIcon size={18} /></button>
              <button onClick={togglePlay} style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-pink)', flexShrink: 0 }}>
                {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
              </button>
              <button onClick={playNext} disabled={!hasNext} className="btn-icon" style={{ opacity: hasNext ? 1 : 0.3 }}><SkipNextIcon size={18} /></button>
              <VolumeBtn volume={volume} onChange={changeVolume} />
            </div>
          </div>
        </div>
        {/* Right: playlist/queue */}
        <div style={{ width: 200, borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, background: 'var(--bg2)' }}
          className="full-player-sidebar">
          {isSingle ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 8px', position: 'sticky', top: 0, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>次に再生</p>
                {queue.length > 0 && <button onClick={clearQueue} className="btn-icon-sq" style={{ width: 22, height: 22 }}><TrashIcon size={11} /></button>}
              </div>
              {queue.length === 0
                ? <p style={{ padding: '20px 14px', fontSize: 12, color: 'var(--text3)', textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.6 }}>楽曲カードの＋ボタンで追加</p>
                : queue.map((s, i) => (
                  <div key={s.id + i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--card)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                      <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.artist}</p>
                    </div>
                    <button onClick={() => removeFromQueue(i)} className="btn-icon-sq" style={{ width: 20, height: 20, flexShrink: 0 }}><XIcon size={10} /></button>
                  </div>
                ))
              }
            </>
          ) : (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', padding: '12px 12px 8px', textTransform: 'uppercase', letterSpacing: '0.07em', position: 'sticky', top: 0, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>再生リスト</p>
              {currentPlaylist.map((s, i) => (
                <div key={s.id || i} onClick={() => loadSong(s, currentPlaylist, i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', cursor: 'pointer', background: i === currentIndex ? 'var(--pink-dim)' : 'transparent', borderLeft: `2px solid ${i === currentIndex ? 'var(--pink)' : 'transparent'}`, transition: 'all 0.12s' }}
                  onMouseEnter={e => { if (i !== currentIndex) e.currentTarget.style.background = 'var(--card2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = i === currentIndex ? 'var(--pink-dim)' : 'transparent'; }}>
                  <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: i === currentIndex ? 600 : 400, color: i === currentIndex ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.artist}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        <style>{`.full-player-sidebar { display: none; } @media(min-width:600px){.full-player-sidebar{display:block!important;}}`}</style>
      </div>
    </div>
  );
}

// ── Mini player constants ─────────────────────────────────────────
// Actual rendered height of mini player card (measured):
//   seekbar area: 32px
//   row1 (thumb+title): 40px
//   row2 (artist): 22px
//   row3 (controls): 44px
//   padding top+bottom: 20px
// Total ≈ 158px  → use 165 for safety
const MINI_H = 165;
const MINI_BOTTOM_DESKTOP = 16;
const MINI_BOTTOM_MOBILE = 70; // above bottom nav (60px) + gap
const MINI_RIGHT = 14;
const MINI_W_DESKTOP = 316;
const PLAYLIST_GAP = 8;

export default function MiniPlayer() {
  const { currentSong, currentPlaylist, currentIndex, isPlaying, showPlayer, setShowPlayer, loopMode, setLoopMode, shuffle, setShuffle, volume, changeVolume, togglePlay, playNext, playPrev, stopPlayer, onPlayerReady, onPlayerStateChange, loadSong, ytRef } = usePlayer();

  const playerDivRef = useRef(null);
  const [listOpen, setListOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    loadYouTubeAPI().then(() => {
      if (!playerDivRef.current) return;
      new window.YT.Player(playerDivRef.current, {
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

  const bottom = isMobile ? MINI_BOTTOM_MOBILE : MINI_BOTTOM_DESKTOP;
  // Playlist panel sits ABOVE mini player
  const playlistBottom = bottom + MINI_H + PLAYLIST_GAP;
  const miniWidth = isMobile ? 'calc(100vw - 28px)' : `${MINI_W_DESKTOP}px`;

  const hiddenPlayer = (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}>
      <div ref={playerDivRef} />
    </div>
  );

  if (!currentSong) return hiddenPlayer;
  const thumb = getThumbnailUrl(currentSong.videoId, 'hq');

  return (
    <>
      {hiddenPlayer}
      {showPlayer && <FullPlayerModal onClose={() => setShowPlayer(false)} />}

      {/* ── Playlist panel — z-index 302, ABOVE player(300), BELOW volume(600) ── */}
      {currentPlaylist.length > 1 && listOpen && (
        <div style={{
          position: 'fixed',
          bottom: playlistBottom,
          right: MINI_RIGHT,
          width: miniWidth,
          maxHeight: 220,
          background: 'var(--card)',
          border: '1px solid var(--border2)',
          borderRadius: 12,
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 302,
          animation: 'slideUp 0.18s ease',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '10px 12px 6px', position: 'sticky', top: 0, background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
            再生リスト ({currentPlaylist.length}曲)
          </p>
          {currentPlaylist.map((s, i) => (
            <div key={s.id || i} onClick={() => loadSong(s, currentPlaylist, i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: i === currentIndex ? 'var(--pink-dim)' : 'transparent', borderLeft: `2px solid ${i === currentIndex ? 'var(--pink)' : 'transparent'}`, transition: 'all 0.12s', minHeight: 40 }}
              onMouseEnter={e => { if (i !== currentIndex) e.currentTarget.style.background = 'var(--card2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = i === currentIndex ? 'var(--pink-dim)' : 'transparent'; }}>
              <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: i === currentIndex ? 600 : 400, color: i === currentIndex ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.artist}</p>
              </div>
              {i === currentIndex && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pink)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Mini Player Card — z-index 300 ── */}
      <div style={{
        position: 'fixed',
        bottom,
        right: MINI_RIGHT,
        width: miniWidth,
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 300,
        overflow: 'hidden',
      }}>
        {/* Seekbar */}
        <div style={{ padding: '10px 13px 0' }}>
          <Seekbar song={currentSong} ytRef={ytRef} />
        </div>

        {/* Row 1: thumbnail + title (bold) + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 1px' }}>
          <img src={thumb} alt="" onClick={() => setShowPlayer(true)}
            style={{ width: 44, height: 25, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }} />
          <p onClick={() => setShowPlayer(true)}
            style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            {currentSong.name}
          </p>
          <button className="btn-icon-sq" onClick={stopPlayer} title="閉じる"><XIcon size={13} /></button>
        </div>

        {/* Row 2: artist (small) */}
        <p style={{ fontSize: 11, color: 'var(--text3)', padding: '1px 12px 0 64px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
          {currentSong.artist}
        </p>

        {/* Row 3: controls */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '5px 9px 9px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={() => setShuffle(s => !s)} className="btn-icon-sq" style={{ color: shuffle ? 'var(--pink)' : 'var(--text3)' }} title="シャッフル"><ShuffleIcon size={13} /></button>
            <button onClick={cycleLoop} className="btn-icon-sq" style={{ color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)' }} title="ループ"><LoopBtn size={13} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button className="btn-icon-sq" onClick={playPrev} disabled={!hasPrev} style={{ opacity: hasPrev ? 1 : 0.3 }}><SkipPrevIcon size={14} /></button>
            <button onClick={togglePlay} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--glow-pink)' }}>
              {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </button>
            <button className="btn-icon-sq" onClick={playNext} disabled={!hasNext} style={{ opacity: hasNext ? 1 : 0.3 }}><SkipNextIcon size={14} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <VolumeBtn volume={volume} onChange={changeVolume} />
            {currentPlaylist.length > 1 && (
              <button className="btn-icon-sq" onClick={() => setListOpen(o => !o)} style={{ color: listOpen ? 'var(--pink)' : 'var(--text3)' }} title="再生リスト">
                {listOpen ? <ChevronDownIcon size={13} /> : <ChevronUpIcon size={13} />}
              </button>
            )}
            <button className="btn-icon-sq" onClick={() => setShowPlayer(true)} title="拡大"><MaximizeIcon size={13} /></button>
          </div>
        </div>
      </div>
    </>
  );
}
