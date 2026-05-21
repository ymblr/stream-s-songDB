import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { loadYouTubeAPI, getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';
import {
  PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon,
  RepeatIcon, Repeat1Icon, XIcon, MaximizeIcon,
  MicIcon, MusicIcon, VolumeIcon, ChevronUpIcon, ChevronDownIcon,
  ShuffleIcon, TrashIcon,
} from './Icons';
import MarqueeText from './MarqueeText';

function getDuration(song) {
  if (!song) return null;
  const sec = (song.endTime || 0) - (song.startTime || 0);
  return sec > 0 ? secondsToTimestamp(sec) : null;
}

// ── Seekbar ── シンプル版（広告検知なし・v8相当）──────────────
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
          const dur = song.endTime - song.startTime;
          if (dur > 0) setProg(Math.max(0, Math.min(1, (t - song.startTime) / dur)));
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
    if (song && ytRef.current)
      ytRef.current.seekTo(song.startTime + r * (song.endTime - song.startTime), true);
  }, [song]);
  const onDown = (e) => { e.stopPropagation(); setDrag(true); setProg(getR(e)); };
  const onMove = useCallback((e) => { if (drag) setProg(getR(e)); }, [drag]);
  const onUp   = useCallback((e) => { if (!drag) return; setDrag(false); commit(getR(e)); }, [drag, commit]);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [drag, onMove, onUp]);

  const active = drag || hover;
  const h = size === 'large' ? (active ? 6 : 4) : (active ? 5 : 3);
  const elapsed = song ? secondsToTimestamp(Math.max(0, (song.endTime - song.startTime) * prog)) : '0:00';
  const total   = song ? secondsToTimestamp(song.endTime - song.startTime) : '0:00';

  return (
    <div>
      <div ref={barRef}
        onMouseDown={onDown} onTouchStart={onDown}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ height: size === 'large' ? 24 : 20, display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', touchAction: 'none' }}
      >
        <div style={{ width: '100%', height: h, background: 'var(--border2)', borderRadius: 4, position: 'relative', transition: 'height 0.1s' }}>
          <div style={{ height: '100%', width: `${prog * 100}%`, background: 'var(--pink)', borderRadius: 4, transition: drag ? 'none' : 'width 0.08s linear' }} />
          {active && (
            <div style={{ position: 'absolute', top: '50%', left: `${prog * 100}%`, transform: 'translate(-50%,-50%)', width: 13, height: 13, borderRadius: '50%', background: 'var(--pink)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: -2 }}>
        <span>{elapsed}</span><span>{total}</span>
      </div>
    </div>
  );
}

// ── インライン音量スライダー（常時表示）──────────────────────
// ポップアップではなくミニプレイヤー内に埋め込む形
function VolumeSlider({ volume, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <button
        className="btn-icon-sq"
        onClick={() => onChange(volume === 0 ? 80 : 0)}
        title={volume === 0 ? 'ミュート解除' : 'ミュート'}
      >
        <VolumeIcon size={13} muted={volume === 0} />
      </button>
      <input
        type="range" min={0} max={100} value={volume}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: 52, height: 3, cursor: 'pointer',
          accentColor: 'var(--pink)',
          background: `linear-gradient(to right, var(--pink) ${volume}%, var(--border2) ${volume}%)`,
          borderRadius: 2, outline: 'none', border: 'none',
          WebkitAppearance: 'none', appearance: 'none',
        }}
      />
    </div>
  );
}

// ── Full Player Modal ─────────────────────────────────────────
function FullPlayerModal({ onClose }) {
  const {
    currentSong, currentPlaylist, currentIndex,
    isPlaying, loopMode, setLoopMode, shuffle, setShuffle,
    volume, changeVolume, togglePlay, playNext, playPrev,
    loadSong, queue, removeFromQueue, clearQueue, ytRef,
  } = usePlayer();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < currentPlaylist.length - 1 || queue.length > 0;
  const loopOrder = ['none', 'song', 'playlist'];
  const cycleLoop = () => setLoopMode(loopOrder[(loopOrder.indexOf(loopMode) + 1) % loopOrder.length]);
  const LoopBtn = loopMode === 'song' ? Repeat1Icon : RepeatIcon;
  const isSingle = currentPlaylist.length <= 1;
  const duration = getDuration(currentSong);
  if (!currentSong) return null;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '94vw', maxWidth: 800, padding: 0, overflow: 'hidden', display: 'flex', maxHeight: '90vh' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                {currentPlaylist.length > 1 ? `${currentIndex + 1} / ${currentPlaylist.length}` : '再生中'}
              </p>
              <button className="btn-icon" onClick={onClose}><XIcon size={16} /></button>
            </div>
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}>
              <img src={getThumbnailUrl(currentSong.videoId, 'hq')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <MarqueeText text={currentSong.name} active={true}
              style={{ fontFamily: 'var(--font-logo)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}
            />
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 4 }}>{currentSong.artist}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span className={currentSong.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'} style={{ display: 'inline-flex' }}>
                {currentSong.streamType === 'singing' ? <><MicIcon size={10} />歌枠</> : <><MusicIcon size={10} />ウクレレ枠</>}
              </span>
              {duration && <span style={{ fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{duration}</span>}
            </div>
            <div style={{ marginBottom: 14 }}><Seekbar song={currentSong} ytRef={ytRef} size="large" /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShuffle(s => !s)} className="btn-icon-sq" style={{ color: shuffle ? 'var(--pink)' : 'var(--text3)' }}><ShuffleIcon size={15} /></button>
              <button onClick={cycleLoop} className="btn-icon-sq" style={{ color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)' }}><LoopBtn size={15} /></button>
              <button onClick={playPrev} disabled={!hasPrev} className="btn-icon" style={{ opacity: hasPrev ? 1 : 0.3 }}><SkipPrevIcon size={18} /></button>
              <button onClick={togglePlay}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-pink)', flexShrink: 0, transition: 'transform 0.12s ease' }}>
                {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
              </button>
              <button onClick={playNext} disabled={!hasNext} className="btn-icon" style={{ opacity: hasNext ? 1 : 0.3 }}><SkipNextIcon size={18} /></button>
              <VolumeSlider volume={volume} onChange={changeVolume} />
            </div>
          </div>
        </div>
        {/* 右: プレイリスト / キュー */}
        <div style={{ width: 200, borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, background: 'var(--bg2)' }} className="full-player-sidebar">
          {isSingle ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 8px', position: 'sticky', top: 0, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>次に再生</p>
                {queue.length > 0 && <button onClick={clearQueue} className="btn-icon-sq" style={{ width: 22, height: 22 }}><TrashIcon size={11} /></button>}
              </div>
              {queue.length === 0
                ? <p style={{ padding: '20px 14px', fontSize: 12, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6 }}>＋ボタンでキューに追加</p>
                : queue.map((s, i) => {
                    const d = getDuration(s);
                    return (
                      <div key={s.id + i}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--card)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <MarqueeText text={s.name} active={false} style={{ fontSize: 11 }} />
                          <p style={{ fontSize: 10, color: 'var(--text3)' }}>{d ? `${s.artist} · ${d}` : s.artist}</p>
                        </div>
                        <button onClick={() => removeFromQueue(i)} className="btn-icon-sq" style={{ width: 20, height: 20, flexShrink: 0 }}><XIcon size={10} /></button>
                      </div>
                    );
                  })
              }
            </>
          ) : (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', padding: '12px 12px 8px', textTransform: 'uppercase', letterSpacing: '0.07em', position: 'sticky', top: 0, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                再生リスト
              </p>
              {currentPlaylist.map((s, i) => {
                const d = getDuration(s);
                const isActive = i === currentIndex;
                return (
                  <div key={s.id || i} onClick={() => loadSong(s, currentPlaylist, i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', cursor: 'pointer', background: isActive ? 'var(--pink-dim)' : 'transparent', borderLeft: `2px solid ${isActive ? 'var(--pink)' : 'transparent'}`, transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--card2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'var(--pink-dim)' : 'transparent'; }}>
                    <img src={getThumbnailUrl(s.videoId, 'mq')} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <MarqueeText text={s.name} active={isActive}
                        style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--pink)' : 'var(--text)' }}
                      />
                      <p style={{ fontSize: 10, color: 'var(--text3)' }}>{d ? `${s.artist} · ${d}` : s.artist}</p>
                    </div>
                    {isActive && <span className="now-playing-dot" style={{ width: 6, height: 6 }} />}
                  </div>
                );
              })}
            </>
          )}
        </div>
        <style>{`.full-player-sidebar{display:none;}@media(min-width:600px){.full-player-sidebar{display:block!important;}}`}</style>
      </div>
    </div>
  );
}

// ── Mini Player ────────────────────────────────────────────────
const MINI_BOTTOM_DESKTOP = 16;
const MINI_BOTTOM_MOBILE  = 70;
const MINI_RIGHT          = 14;
const MINI_W_DESKTOP      = 316;

export default function MiniPlayer() {
  const {
    currentSong, currentPlaylist, currentIndex,
    isPlaying, showPlayer, setShowPlayer,
    loopMode, setLoopMode, shuffle, setShuffle,
    volume, changeVolume,
    togglePlay, playNext, playPrev, stopPlayer,
    onPlayerReady, onPlayerStateChange,
    loadSong, ytRef, isAutoPlay,
  } = usePlayer();

  const playerDivRef = useRef(null);
  const [listOpen, setListOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { setListOpen(false); }, [currentSong?.id]);

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
  const bottom      = isMobile ? MINI_BOTTOM_MOBILE : MINI_BOTTOM_DESKTOP;
  const miniWidth   = isMobile ? 'calc(100vw - 28px)' : `${MINI_W_DESKTOP}px`;
  const duration    = getDuration(currentSong);
  const hasPlaylist = currentPlaylist.length > 1;

  const hiddenPlayer = (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}>
      <div ref={playerDivRef} />
    </div>
  );

  if (!currentSong) return hiddenPlayer;

  return (
    <>
      {hiddenPlayer}
      {showPlayer && <FullPlayerModal onClose={() => setShowPlayer(false)} />}

      {/*
        ミニプレイヤーカード
        ・position: fixed + bottom で下に固定
        ・プレイリストは「同じカードの上部」として展開 → カードが上方向に伸びる
        ・overflow: hidden でカードの角丸を維持
      */}
      <div style={{
        position: 'fixed',
        bottom,
        right: MINI_RIGHT,
        width: miniWidth,
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        zIndex: 300,
        overflow: 'hidden',
      }}>

        {/* ── プレイリスト（カード上部に展開、アニメ付き）── */}
        {hasPlaylist && listOpen && (
          <div style={{
            borderBottom: '1px solid var(--border)',
            maxHeight: 224,
            overflowY: 'auto',
            animation: 'miniListExpand 0.22s ease',
          }}>
            {/* ヘッダー */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px 6px',
              position: 'sticky', top: 0, zIndex: 1,
              background: 'var(--card)',
              borderBottom: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                再生リスト · {currentIndex + 1}/{currentPlaylist.length}曲
              </p>
              <button className="btn-icon-sq" style={{ width: 20, height: 20 }} onClick={() => setListOpen(false)}>
                <ChevronDownIcon size={11} />
              </button>
            </div>

            {/* 曲一覧 */}
            {currentPlaylist.map((s, i) => {
              const d = getDuration(s);
              const isActive = i === currentIndex;
              return (
                <div key={s.id || i}
                  onClick={() => loadSong(s, currentPlaylist, i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', cursor: 'pointer', minHeight: 42,
                    background: isActive ? 'var(--pink-dim)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? 'var(--pink)' : 'transparent'}`,
                    transition: 'background 0.1s',
                    animation: `listItemIn 0.18s ${Math.min(i * 0.025, 0.3)}s ease both`,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--card2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'var(--pink-dim)' : 'transparent'; }}
                >
                  <div style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>
                    {isActive
                      ? <span className="now-playing-dot" />
                      : <span style={{ fontSize: 10, color: 'var(--text3)' }}>{i + 1}</span>
                    }
                  </div>
                  <img src={getThumbnailUrl(s.videoId, 'mq')} alt=""
                    style={{ width: 40, height: 22, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* 再生中の曲だけスクロール、それ以外は ellipsis */}
                    <MarqueeText text={s.name} active={isActive}
                      style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--pink)' : 'var(--text)' }}
                    />
                    <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                      {s.artist}{d ? ` · ${d}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Seekbar ── */}
        <div style={{ padding: '10px 13px 0' }}>
          <Seekbar song={currentSong} ytRef={ytRef} />
        </div>

        {/* ── Row1: サムネ + 曲名 + 閉じる ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 1px' }}>
          <img src={getThumbnailUrl(currentSong.videoId, 'hq')} alt=""
            onClick={() => setShowPlayer(true)}
            style={{ width: 44, height: 25, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }}
          />
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setShowPlayer(true)}>
            <MarqueeText text={currentSong.name} active={true} delay={2000}
              style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3, color: 'var(--text)' }}
            />
          </div>
          <button className="btn-icon-sq" onClick={stopPlayer} title="閉じる"><XIcon size={13} /></button>
        </div>

        {/* ── Row2: アーティスト + 時間 + AUTO ── */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '1px 12px 0 64px', gap: 6 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
            {currentSong.artist}
          </p>
          {duration && (
            <span style={{ fontSize: 10, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {duration}
            </span>
          )}
          {isAutoPlay && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--pink)', background: 'var(--pink-dim)', borderRadius: 10, padding: '1px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              AUTO
            </span>
          )}
        </div>

        {/* ── Row3: コントロール ── */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '5px 9px 9px', justifyContent: 'space-between' }}>
          {/* 左: シャッフル・ループ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={() => setShuffle(s => !s)} className="btn-icon-sq"
              style={{ color: shuffle ? 'var(--pink)' : 'var(--text3)' }} title="シャッフル">
              <ShuffleIcon size={13} />
            </button>
            <button onClick={cycleLoop} className="btn-icon-sq"
              style={{ color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)' }} title="ループ">
              <LoopBtn size={13} />
            </button>
          </div>

          {/* 中: 前・再生/停止・次 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button className="btn-icon-sq" onClick={playPrev} disabled={!hasPrev} style={{ opacity: hasPrev ? 1 : 0.3 }}>
              <SkipPrevIcon size={14} />
            </button>
            <button onClick={togglePlay}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.88)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--glow-pink)', transition: 'transform 0.12s ease' }}>
              {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </button>
            <button className="btn-icon-sq" onClick={playNext} disabled={!hasNext} style={{ opacity: hasNext ? 1 : 0.3 }}>
              <SkipNextIcon size={14} />
            </button>
          </div>

          {/* 右: 常時表示の音量スライダー・リスト・拡大 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <VolumeSlider volume={volume} onChange={changeVolume} />
            {hasPlaylist && (
              <button className="btn-icon-sq"
                onClick={() => setListOpen(o => !o)}
                style={{ color: listOpen ? 'var(--pink)' : 'var(--text3)' }}
                title="再生リスト">
                <ChevronUpIcon size={13} />
              </button>
            )}
            <button className="btn-icon-sq" onClick={() => setShowPlayer(true)} title="拡大">
              <MaximizeIcon size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
