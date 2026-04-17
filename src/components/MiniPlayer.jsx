import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { loadYouTubeAPI, getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';
import {
  PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon,
  RepeatIcon, Repeat1Icon, XIcon, MaximizeIcon,
  MicIcon, MusicIcon, VolumeIcon, ChevronUpIcon, ChevronDownIcon,
  ShuffleIcon, PlusIcon, TrashIcon
} from './Icons';

// ── Seekbar ──────────────────────────────────────────────────────
function Seekbar({ song, ytRef }) {
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
  const onDown = (e) => { setDrag(true); setProg(getR(e)); };
  const onMove = useCallback((e) => { if (drag) setProg(getR(e)); }, [drag]);
  const onUp = useCallback((e) => { if (!drag) return; setDrag(false); commit(getR(e)); }, [drag, commit]);
  useEffect(() => {
    if (!drag) return;
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove); window.addEventListener('touchend', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp); };
  }, [drag, onMove, onUp]);

  const active = drag || hover;
  return (
    <div>
      <div ref={barRef} onMouseDown={onDown} onTouchStart={onDown}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: '100%', height: active ? 5 : 3, background: 'var(--border2)', borderRadius: 3, position: 'relative', transition: 'height 0.1s' }}>
          <div style={{ height: '100%', width: `${prog * 100}%`, background: 'var(--pink)', borderRadius: 3 }} />
          {active && <div style={{ position: 'absolute', top: '50%', left: `${prog * 100}%`, transform: 'translate(-50%,-50%)', width: 13, height: 13, borderRadius: '50%', background: 'var(--pink)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: -1 }}>
        <span>{secondsToTimestamp(song ? (song.endTime - song.startTime) * prog : 0)}</span>
        <span>{secondsToTimestamp(song ? song.endTime - song.startTime : 0)}</span>
      </div>
    </div>
  );
}

// ── Volume button: hover to show slider, click to mute ──────────
function VolumeBtn({ volume, onChange }) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef(null);

  const show = () => { clearTimeout(hideTimer.current); setVisible(true); };
  const scheduleHide = () => { hideTimer.current = setTimeout(() => setVisible(false), 500); };

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={show} onMouseLeave={scheduleHide}>
      <button
        className="btn-icon-sq"
        onClick={() => onChange(volume === 0 ? 80 : 0)}
        title={volume === 0 ? 'ミュート解除' : 'ミュート'}
      >
        <VolumeIcon size={14} muted={volume === 0} />
      </button>
      {/* Slider — rendered in fixed coords above mini player */}
      {visible && (
        <div
          onMouseEnter={show} onMouseLeave={scheduleHide}
          style={{
            position: 'fixed',
            // position is set inline per instance — see wrapper
            bottom: 95,
            right: 170, // approximate; MiniPlayer is bottom:16 right:16, width 308
            background: 'var(--card)',
            border: '1px solid var(--border2)',
            borderRadius: 12,
            padding: '12px 10px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{volume}%</span>
          <input
            type="range" min={0} max={100} value={volume}
            onChange={e => onChange(Number(e.target.value))}
            style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 4, height: 80, cursor: 'pointer', accentColor: 'var(--pink)', WebkitAppearance: 'slider-vertical' }}
          />
        </div>
      )}
    </div>
  );
}

// ── Full player modal ─────────────────────────────────────────────
function FullPlayerModal({ onClose }) {
  const {
    currentSong, currentPlaylist, currentIndex,
    isPlaying, loopMode, setLoopMode, shuffle, setShuffle,
    volume, changeVolume,
    togglePlay, playNext, playPrev, loadSong,
    queue, addToQueue, removeFromQueue, clearQueue,
    ytRef,
  } = usePlayer();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < currentPlaylist.length - 1 || queue.length > 0;
  const loopOrder = ['none', 'song', 'playlist'];
  const cycleLoop = () => setLoopMode(loopOrder[(loopOrder.indexOf(loopMode) + 1) % loopOrder.length]);
  const LoopBtn = loopMode === 'song' ? Repeat1Icon : RepeatIcon;
  const isSingle = currentPlaylist.length <= 1;

  if (!currentSong) return null;
  const thumbnail = getThumbnailUrl(currentSong.videoId, 'hq');

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '94vw', maxWidth: 800, padding: 0, overflow: 'hidden', display: 'flex', maxHeight: '88vh' }}>

        {/* Left: controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Scrollable inner */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                {currentPlaylist.length > 1 ? `${currentIndex + 1} / ${currentPlaylist.length}` : '再生中'}
              </p>
              <button className="btn-icon" onClick={onClose}><XIcon size={16} /></button>
            </div>

            {/* Artwork */}
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 18, boxShadow: 'var(--shadow-lg)', flexShrink: 0 }}>
              <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Info */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontFamily: 'var(--font-logo)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSong.name}</p>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.artist}</p>
              <span className={currentSong.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
                {currentSong.streamType === 'singing' ? <><MicIcon size={10} /> 歌枠</> : <><MusicIcon size={10} /> ウクレレ枠</>}
              </span>
            </div>

            {/* Seekbar */}
            <div style={{ marginBottom: 16 }}>
              <Seekbar song={currentSong} ytRef={ytRef} />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShuffle(s => !s)} className="btn-icon-sq" style={{ color: shuffle ? 'var(--pink)' : 'var(--text3)' }} title="シャッフル">
                <ShuffleIcon size={15} />
              </button>
              <button onClick={cycleLoop} className="btn-icon-sq" style={{ color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)' }} title={loopMode === 'none' ? 'ループなし' : loopMode === 'song' ? '1曲' : '全曲'}>
                <LoopBtn size={15} />
              </button>
              <button onClick={playPrev} disabled={!hasPrev} className="btn-icon" style={{ opacity: hasPrev ? 1 : 0.3 }}><SkipPrevIcon size={18} /></button>
              <button onClick={togglePlay} style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-pink)', flexShrink: 0 }}>
                {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
              </button>
              <button onClick={playNext} disabled={!hasNext} className="btn-icon" style={{ opacity: hasNext ? 1 : 0.3 }}><SkipNextIcon size={18} /></button>
              <VolumeBtn volume={volume} onChange={changeVolume} />
            </div>

            {/* Keyboard shortcuts */}
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[['Space','再生/停止'],['←→','5秒'],['↑↓','音量'],['N/P','次/前'],['S','シャッフル'],['M','ミュート']].map(([k,d]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <code style={{ background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 4, padding: '1px 5px', fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace' }}>{k}</code>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: playlist or queue */}
        <div style={{ width: 220, borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, background: 'var(--bg2)' }}>
          {isSingle ? (
            /* Queue panel for single-song play */
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 8px', position: 'sticky', top: 0, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text3)', textTransform: 'uppercase' }}>次に再生</p>
                {queue.length > 0 && <button onClick={clearQueue} className="btn-icon-sq" title="キューをクリア" style={{ width: 24, height: 24 }}><TrashIcon size={12} /></button>}
              </div>
              {queue.length === 0 ? (
                <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text3)' }}>
                  <p style={{ fontSize: 12 }}>キューが空です</p>
                  <p style={{ fontSize: 11, marginTop: 4, whiteSpace: 'normal' }}>楽曲カードの＋ボタンで追加</p>
                </div>
              ) : queue.map((s, i) => (
                <div key={s.id + i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--card)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.artist}</p>
                  </div>
                  <button onClick={() => removeFromQueue(i)} className="btn-icon-sq" style={{ width: 22, height: 22, flexShrink: 0 }}><XIcon size={11} /></button>
                </div>
              ))}
            </>
          ) : (
            /* Playlist panel */
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text3)', padding: '14px 14px 8px', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                再生リスト
              </p>
              {currentPlaylist.map((s, i) => (
                <div key={s.id || i}
                  onClick={() => loadSong(s, currentPlaylist, i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: i === currentIndex ? 'var(--pink-dim)' : 'transparent', borderLeft: `2px solid ${i === currentIndex ? 'var(--pink)' : 'transparent'}`, transition: 'all 0.12s' }}
                  onMouseEnter={e => { if (i !== currentIndex) e.currentTarget.style.background = 'var(--card2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = i === currentIndex ? 'var(--pink-dim)' : 'transparent'; }}>
                  <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 38, height: 22, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: i === currentIndex ? 600 : 400, color: i === currentIndex ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.artist}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main MiniPlayer ───────────────────────────────────────────────
export default function MiniPlayer() {
  const {
    currentSong, currentPlaylist, currentIndex,
    isPlaying, showPlayer, setShowPlayer,
    loopMode, setLoopMode, shuffle, setShuffle,
    volume, changeVolume,
    togglePlay, playNext, playPrev, stopPlayer,
    onPlayerReady, onPlayerStateChange, loadSong,
    ytRef,
  } = usePlayer();

  const playerDivRef = useRef(null);
  const [listOpen, setListOpen] = useState(false);

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
      {showPlayer && <FullPlayerModal onClose={() => setShowPlayer(false)} />}

      {/* Scrollable playlist — above mini player, same z-index level but higher */}
      {currentPlaylist.length > 1 && listOpen && (
        <div style={{
          position: 'fixed', bottom: 140, right: 16,
          width: 300, maxHeight: 240,
          background: 'var(--card)', border: '1px solid var(--border2)',
          borderRadius: 12, overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)', zIndex: 301,
          animation: 'slideUp 0.18s ease',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '10px 12px 6px', position: 'sticky', top: 0, background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
            再生リスト ({currentPlaylist.length}曲)
          </p>
          {currentPlaylist.map((s, i) => (
            <div key={s.id || i}
              onClick={() => { loadSong(s, currentPlaylist, i); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', background: i === currentIndex ? 'var(--pink-dim)' : 'transparent', borderLeft: `2px solid ${i === currentIndex ? 'var(--pink)' : 'transparent'}`, transition: 'all 0.12s' }}
              onMouseEnter={e => { if (i !== currentIndex) e.currentTarget.style.background = 'var(--card2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = i === currentIndex ? 'var(--pink-dim)' : 'transparent'; }}>
              <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: i === currentIndex ? 600 : 400, color: i === currentIndex ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.artist}</p>
              </div>
              {i === currentIndex && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pink)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Mini Player Card ── */}
      <div style={{
        position: 'fixed', bottom: 16, right: 16,
        width: 316,
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 300,
        overflow: 'hidden',
      }}>
        {/* Seekbar at top */}
        <div style={{ padding: '10px 14px 0' }}>
          <Seekbar song={currentSong} ytRef={ytRef} />
        </div>

        {/* Row 1: thumbnail + song name + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px 2px' }}>
          <img
            src={thumbnail} alt=""
            onClick={() => setShowPlayer(true)}
            style={{ width: 44, height: 25, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }}
          />
          <p
            onClick={() => setShowPlayer(true)}
            style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            {currentSong.name}
          </p>
          <button className="btn-icon-sq" onClick={stopPlayer} title="閉じる"><XIcon size={13} /></button>
        </div>

        {/* Row 2: artist */}
        <p style={{ fontSize: 11, color: 'var(--text3)', padding: '0 12px 8px 65px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentSong.artist}
        </p>

        {/* Row 3: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 10px 10px', justifyContent: 'space-between' }}>
          {/* Left controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <button onClick={() => setShuffle(s => !s)} className="btn-icon-sq" style={{ color: shuffle ? 'var(--pink)' : 'var(--text3)' }} title="シャッフル">
              <ShuffleIcon size={13} />
            </button>
            <button onClick={cycleLoop} className="btn-icon-sq" style={{ color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)' }} title="ループ">
              <LoopBtn size={13} />
            </button>
          </div>
          {/* Center controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button className="btn-icon-sq" onClick={playPrev} disabled={!hasPrev} style={{ opacity: hasPrev ? 1 : 0.3 }}><SkipPrevIcon size={14} /></button>
            <button onClick={togglePlay} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--glow-pink)' }}>
              {isPlaying ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
            </button>
            <button className="btn-icon-sq" onClick={playNext} disabled={!hasNext} style={{ opacity: hasNext ? 1 : 0.3 }}><SkipNextIcon size={14} /></button>
          </div>
          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
