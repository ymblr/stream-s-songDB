import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { loadYouTubeAPI, getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';

export default function MiniPlayer() {
  const {
    currentSong, currentPlaylist, currentIndex,
    isPlaying, playerMode, setPlayerMode,
    loopMode, setLoopMode,
    togglePlay, playNext, playPrev, stopPlayer,
    onPlayerReady, onPlayerStateChange,
    loadSongIntoPlayer,
  } = usePlayer();

  const playerDivRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  // YouTube IFrame API初期化
  useEffect(() => {
    loadYouTubeAPI().then(() => {
      if (!playerDivRef.current) return;
      const player = new window.YT.Player(playerDivRef.current, {
        videoId: '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
            ytPlayerRef.current = player;
            onPlayerReady(player);
          },
          onStateChange: (e) => onPlayerStateChange(e.data),
        },
      });
    });
  }, []);

  // プログレスバー更新
  useEffect(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (isPlaying && currentSong) {
      progressIntervalRef.current = setInterval(() => {
        const player = ytPlayerRef.current;
        if (!player?.getCurrentTime) return;
        const current = player.getCurrentTime();
        const duration = currentSong.endTime - currentSong.startTime;
        const elapsed = current - currentSong.startTime;
        setProgress(Math.max(0, Math.min(1, elapsed / duration)));
      }, 250);
    }
    return () => clearInterval(progressIntervalRef.current);
  }, [isPlaying, currentSong]);

  if (!currentSong) {
    return (
      <div style={{ position: 'fixed', bottom: -1, left: -1, width: 1, height: 1, overflow: 'hidden' }}>
        <div ref={playerDivRef} />
      </div>
    );
  }

  const thumbnail = getThumbnailUrl(currentSong.videoId, 'hq');
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < currentPlaylist.length - 1;
  const loopIcons = { none: '↻', song: '🔂', playlist: '🔁' };
  const loopOrder = ['none', 'song', 'playlist'];
  const cycleLoop = () => {
    const next = loopOrder[(loopOrder.indexOf(loopMode) + 1) % loopOrder.length];
    setLoopMode(next);
  };

  if (playerMode === 'full') {
    return (
      <>
        {/* Hidden player div */}
        <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1 }}>
          <div ref={playerDivRef} />
        </div>

        {/* Full player overlay */}
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,9,18,0.97)',
          backdropFilter: 'blur(20px)',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', gap: 12 }}>
            <button
              className="btn-icon"
              onClick={() => setPlayerMode('mini')}
              style={{ fontSize: 20, color: 'var(--text2)' }}
              title="ミニプレイヤーへ"
            >
              ⌄
            </button>
            <span style={{ fontSize: 13, color: 'var(--text3)', flex: 1, textAlign: 'center' }}>
              {currentPlaylist.length > 1 ? `${currentIndex + 1} / ${currentPlaylist.length}` : '再生中'}
            </span>
            <button className="btn-icon" onClick={stopPlayer} style={{ color: 'var(--text3)', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px 40px', minWidth: 0 }}>
              {/* Album art */}
              <div style={{
                width: '100%', maxWidth: 480,
                aspectRatio: '16/9',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                background: '#000',
                marginBottom: 32,
                position: 'relative',
              }}>
                <img
                  src={thumbnail}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.5))',
                }} />
              </div>

              {/* Song info */}
              <div style={{ textAlign: 'center', marginBottom: 24, width: '100%', maxWidth: 480 }}>
                <p style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {currentSong.name}
                </p>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>{currentSong.artist}</p>
                <span className={currentSong.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'} style={{ marginTop: 8, display: 'inline-block' }}>
                  {currentSong.streamType === 'singing' ? '歌枠' : 'ウクレレ枠'}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', maxWidth: 480, marginBottom: 8 }}>
                <div
                  style={{
                    height: 4, background: 'var(--card2)', borderRadius: 2,
                    cursor: 'pointer', position: 'relative',
                  }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    const target = currentSong.startTime + ratio * (currentSong.endTime - currentSong.startTime);
                    ytPlayerRef.current?.seekTo(target, true);
                  }}
                >
                  <div style={{
                    height: '100%', width: `${progress * 100}%`,
                    background: 'var(--pink)', borderRadius: 2,
                    transition: 'width 0.25s linear',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text3)' }}>
                  <span>{secondsToTimestamp((currentSong.endTime - currentSong.startTime) * progress)}</span>
                  <span>{secondsToTimestamp(currentSong.endTime - currentSong.startTime)}</span>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                <button
                  className="btn-icon"
                  onClick={cycleLoop}
                  style={{
                    fontSize: 18,
                    color: loopMode !== 'none' ? 'var(--pink)' : 'var(--text3)',
                  }}
                  title={`ループ: ${loopMode}`}
                >
                  {loopIcons[loopMode]}
                </button>

                <button
                  className="btn-icon"
                  onClick={playPrev}
                  disabled={!hasPrev}
                  style={{ fontSize: 22, opacity: hasPrev ? 1 : 0.3 }}
                >⏮</button>

                <button
                  onClick={togglePlay}
                  style={{
                    width: 56, height: 56,
                    borderRadius: '50%',
                    background: 'var(--pink)',
                    color: '#0f0e17',
                    fontSize: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--glow-pink)',
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                <button
                  className="btn-icon"
                  onClick={playNext}
                  disabled={!hasNext}
                  style={{ fontSize: 22, opacity: hasNext ? 1 : 0.3 }}
                >⏭</button>

                <div style={{ width: 36 }} />
              </div>
            </div>

            {/* Playlist sidebar */}
            {currentPlaylist.length > 1 && (
              <div style={{
                width: 280,
                borderLeft: '1px solid var(--border)',
                overflowY: 'auto',
                padding: '16px 0',
                flexShrink: 0,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', padding: '0 16px', marginBottom: 12, textTransform: 'uppercase' }}>
                  再生リスト
                </p>
                {currentPlaylist.map((song, i) => (
                  <div
                    key={song.id || i}
                    onClick={() => loadSongIntoPlayer(song, currentPlaylist, i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: i === currentIndex ? 'var(--pink-dim)' : 'transparent',
                      borderLeft: i === currentIndex ? '2px solid var(--pink)' : '2px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <img src={getThumbnailUrl(song.videoId, 'mq')} alt="" style={{ width: 40, height: 22, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: i === currentIndex ? 600 : 400,
                        color: i === currentIndex ? 'var(--pink)' : 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{song.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text3)' }}>{song.artist}</p>
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

  // Mini player
  return (
    <>
      <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1 }}>
        <div ref={playerDivRef} />
      </div>

      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 320,
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        zIndex: 300,
        overflow: 'hidden',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Progress bar at top */}
        <div style={{ height: 2, background: 'var(--card2)' }}>
          <div style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'var(--pink)',
            transition: 'width 0.25s linear',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
          {/* Thumbnail */}
          <img
            src={thumbnail}
            alt=""
            style={{ width: 48, height: 27, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }}
            onClick={() => setPlayerMode('full')}
          />

          {/* Song info */}
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setPlayerMode('full')}>
            <p style={{
              fontSize: 13, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{currentSong.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>{currentSong.artist}</p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {currentPlaylist.length > 1 && (
              <button className="btn-icon" onClick={playPrev} disabled={!hasPrev}
                style={{ width: 28, height: 28, fontSize: 14, opacity: hasPrev ? 1 : 0.3 }}>⏮</button>
            )}
            <button
              onClick={togglePlay}
              style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: 'var(--pink)',
                color: '#0f0e17',
                fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            {currentPlaylist.length > 1 && (
              <button className="btn-icon" onClick={playNext} disabled={!hasNext}
                style={{ width: 28, height: 28, fontSize: 14, opacity: hasNext ? 1 : 0.3 }}>⏭</button>
            )}
            <button
              className="btn-icon"
              onClick={() => setPlayerMode('full')}
              style={{ width: 28, height: 28, fontSize: 14, color: 'var(--text3)' }}
              title="拡大"
            >⤢</button>
            <button
              className="btn-icon"
              onClick={stopPlayer}
              style={{ width: 28, height: 28, fontSize: 14, color: 'var(--text3)' }}
              title="閉じる"
            >✕</button>
          </div>
        </div>
      </div>
    </>
  );
}
