import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

const PlayerContext = createContext(null);
const MAX_HISTORY = 30;

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loopMode, setLoopMode] = useState('none');
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolumeState] = useState(() => parseInt(localStorage.getItem('uta_volume') || '80'));
  const [history, setHistory] = useState([]);
  const [queue, setQueue] = useState([]);

  const ytRef = useRef(null);
  const readyRef = useRef(false);
  const endRef = useRef(null);
  const monRef = useRef(null);
  const adRef = useRef(null);
  const pendRef = useRef(null);
  const wakeLockRef = useRef(null);
  const silentAudioRef = useRef(null);

  // stable refs
  const songRef = useRef(null);
  const plRef = useRef([]);
  const idxRef = useRef(0);
  const loopRef = useRef('none');
  const shuffleRef = useRef(false);
  const isPlayRef = useRef(false);
  const volRef = useRef(80);
  const queueRef = useRef([]);
  const shuffleHistRef = useRef([]);

  useEffect(() => { songRef.current = currentSong; }, [currentSong]);
  useEffect(() => { plRef.current = currentPlaylist; }, [currentPlaylist]);
  useEffect(() => { idxRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopRef.current = loopMode; }, [loopMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { isPlayRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volRef.current = volume; }, [volume]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  // ── Silent audio element (keeps audio session alive on Android) ──
  const initSilentAudio = useCallback(() => {
    if (silentAudioRef.current) return;
    const audio = document.createElement('audio');
    audio.loop = true;
    audio.volume = 0.001;
    // 1-second silent MP3 as data URI
    audio.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAAYZAoGNXAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    silentAudioRef.current = audio;
  }, []);

  const playSilentAudio = useCallback(() => {
    initSilentAudio();
    const audio = silentAudioRef.current;
    if (audio && audio.paused) {
      audio.play().catch(() => {}); // may fail without user gesture
    }
  }, [initSilentAudio]);

  // ── Wake Lock ──────────────────────────────────────────────────
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // Wake lock follows play state
  useEffect(() => {
    if (isPlaying) requestWakeLock();
    else releaseWakeLock();
  }, [isPlaying]);

  // ── Page Visibility — recover after PC sleep ───────────────────
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;

      // Re-acquire wake lock if it was released during sleep
      if (isPlayRef.current) await requestWakeLock();

      const player = ytRef.current;
      const song = songRef.current;
      if (!player || !song) return;

      // Give the player a moment to settle after wake
      setTimeout(() => {
        try {
          const state = player.getPlayerState?.();
          const t = player.getCurrentTime?.() ?? 0;

          if (isPlayRef.current) {
            if (state !== 1 /* not playing */) {
              if (t >= song.endTime) {
                // Overslept the end — advance
                handleEndRef.current?.();
              } else if (t >= song.startTime) {
                // Just paused by browser — resume
                player.playVideo();
              } else {
                // Somehow behind startTime — seek and play
                player.seekTo(song.startTime, true);
                player.playVideo();
              }
            }
            // Re-arm end monitor
            startMon();
          }
        } catch {}
      }, 600);
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── Media Session API ─────────────────────────────────────────
  const updateMediaSession = useCallback((song, playing) => {
    if (!('mediaSession' in navigator) || !song) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name || '不明な楽曲',
      artist: song.artist || 'Stream\'s Song DB',
      album: song.streamType === 'singing' ? '歌枠' : 'ウクレレ枠',
      artwork: [{
        src: song.streamThumbnail || `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg`,
        sizes: '480x360', type: 'image/jpeg',
      }],
    });
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, []);

  const registerMediaSessionHandlers = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => {
      ytRef.current?.playVideo();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      ytRef.current?.pauseVideo();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const pl = plRef.current; const idx = idxRef.current;
      if (idx + 1 < pl.length) loadSong(pl[idx + 1], pl, idx + 1);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const pl = plRef.current; const idx = idxRef.current;
      if (idx > 0) loadSong(pl[idx - 1], pl, idx - 1);
      else ytRef.current?.seekTo(songRef.current?.startTime ?? 0, true);
    });
    navigator.mediaSession.setActionHandler('seekforward', (d) => {
      const s = d.seekOffset ?? 10;
      const player = ytRef.current; const song = songRef.current;
      if (player && song) {
        const t = player.getCurrentTime?.() ?? song.startTime;
        player.seekTo(Math.min(t + s, song.endTime - 1), true);
      }
    });
    navigator.mediaSession.setActionHandler('seekbackward', (d) => {
      const s = d.seekOffset ?? 10;
      const player = ytRef.current; const song = songRef.current;
      if (player && song) {
        const t = player.getCurrentTime?.() ?? song.startTime;
        player.seekTo(Math.max(t - s, song.startTime), true);
      }
    });
  }, []);

  useEffect(() => { registerMediaSessionHandlers(); }, []);

  // ── End monitor ────────────────────────────────────────────────
  const clearMon = () => {
    if (monRef.current) { clearInterval(monRef.current); monRef.current = null; }
    if (adRef.current) { clearTimeout(adRef.current); adRef.current = null; }
  };

  const startMon = useCallback(() => {
    clearMon();
    monRef.current = setInterval(() => {
      const p = ytRef.current;
      if (!p || !endRef.current) return;
      try {
        if (p.getPlayerState?.() === 1) {
          const t = p.getCurrentTime?.();
          if (t != null && t >= endRef.current) handleEndRef.current?.();
        }
      } catch {}
    }, 300);
  }, []);

  const handleEndRef = useRef(null);

  // ── Ad mitigation ─────────────────────────────────────────────
  const adMitigation = useCallback((player, song) => {
    const vol = volRef.current;
    player.mute();
    player.loadVideoById({ videoId: song.videoId, startSeconds: song.startTime });
    endRef.current = song.endTime;

    adRef.current = setTimeout(() => {
      try {
        const t = player.getCurrentTime?.() || 0;
        if (t < song.startTime || t > song.endTime) player.seekTo(song.startTime, true);
        player.unMute(); player.setVolume(vol);
      } catch {}
    }, 1500);
    setTimeout(() => { try { player.unMute(); player.setVolume(vol); } catch {} }, 3200);
  }, []);

  // ── Track history & playCount ──────────────────────────────────
  const trackHistory = useCallback((song) => {
    setHistory(prev =>
      [{ song, playedAt: Date.now() }, ...prev.filter(h => h.song.id !== song.id)].slice(0, MAX_HISTORY)
    );
    if (song.id) updateDoc(doc(db, 'songs', song.id), { playCount: increment(1) }).catch(() => {});
  }, []);

  // ── Load song ──────────────────────────────────────────────────
  const loadSong = useCallback((song, playlist = [], index = 0, skipHistory = false) => {
    setCurrentSong(song); setCurrentPlaylist(playlist); setCurrentIndex(index);
    songRef.current = song; plRef.current = playlist; idxRef.current = index;
    if (!skipHistory) trackHistory(song);
    updateMediaSession(song, true);
    playSilentAudio();

    const player = ytRef.current;
    if (player && readyRef.current) {
      clearMon();
      adMitigation(player, song);
      setIsPlaying(true);
      setTimeout(() => startMon(), 2200);
    } else {
      pendRef.current = { song, playlist, index };
    }
  }, [adMitigation, startMon, trackHistory, updateMediaSession, playSilentAudio]);

  // ── Shuffle next ──────────────────────────────────────────────
  const getNextIndex = useCallback(() => {
    const pl = plRef.current; const idx = idxRef.current;
    if (pl.length <= 1) return -1;
    if (shuffleRef.current) {
      const visited = shuffleHistRef.current;
      const avail = pl.map((_, i) => i).filter(i => i !== idx && !visited.includes(i));
      if (!avail.length) { shuffleHistRef.current = [idx]; const all = pl.map((_, i) => i).filter(i => i !== idx); return all[Math.floor(Math.random() * all.length)]; }
      const next = avail[Math.floor(Math.random() * avail.length)];
      shuffleHistRef.current = [...visited, idx].slice(-pl.length);
      return next;
    }
    return idx + 1 < pl.length ? idx + 1 : -1;
  }, []);

  handleEndRef.current = () => {
    clearMon();
    const loop = loopRef.current; const pl = plRef.current;
    const idx = idxRef.current; const song = songRef.current;

    if (loop === 'song' && song) {
      const p = ytRef.current;
      if (p) { p.seekTo(song.startTime, true); p.playVideo(); endRef.current = song.endTime; setTimeout(() => startMon(), 400); }
      return;
    }
    if (pl.length <= 1 && queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      setQueue(rest);
      loadSong(next, [next], 0);
      return;
    }
    const nextIdx = getNextIndex();
    if (nextIdx !== -1) { loadSong(pl[nextIdx], pl, nextIdx); return; }
    if (loop === 'playlist' && pl.length > 0) { shuffleHistRef.current = []; loadSong(pl[0], pl, 0); return; }
    // End of everything — truly stop
    setIsPlaying(false);
    ytRef.current?.pauseVideo();
    updateMediaSession(songRef.current, false);
    releaseWakeLock();
  };

  const playSong = useCallback((song, playlist = [], index = 0) => {
    shuffleHistRef.current = [];
    loadSong(song, playlist.length ? playlist : [song], playlist.length ? index : 0);
  }, [loadSong]);

  const togglePlay = useCallback(() => {
    const p = ytRef.current;
    if (!p) return;
    if (isPlayRef.current) {
      p.pauseVideo(); setIsPlaying(false); clearMon();
      updateMediaSession(songRef.current, false);
    } else {
      p.playVideo(); setIsPlaying(true); startMon();
      updateMediaSession(songRef.current, true);
    }
  }, [startMon, updateMediaSession]);

  const playNext = useCallback(() => {
    const pl = plRef.current; const idx = idxRef.current;
    if (pl.length <= 1 && queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current; setQueue(rest); loadSong(next, [next], 0); return;
    }
    const n = getNextIndex();
    if (n !== -1) loadSong(pl[n], pl, n);
    else if (loopRef.current === 'playlist' && pl.length > 0) { shuffleHistRef.current = []; loadSong(pl[0], pl, 0); }
  }, [loadSong, getNextIndex]);

  const playPrev = useCallback(() => {
    const pl = plRef.current; const idx = idxRef.current;
    if (idx > 0) loadSong(pl[idx - 1], pl, idx - 1);
    else ytRef.current?.seekTo(songRef.current?.startTime ?? 0, true);
  }, [loadSong]);

  const stopPlayer = useCallback(() => {
    clearMon(); ytRef.current?.pauseVideo();
    setIsPlaying(false); setCurrentSong(null); setCurrentPlaylist([]); setCurrentIndex(0);
    setShowPlayer(false); setQueue([]);
    songRef.current = null; plRef.current = []; idxRef.current = 0; shuffleHistRef.current = [];
    updateMediaSession(null, false); releaseWakeLock();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  }, [updateMediaSession, releaseWakeLock]);

  const seekRelative = useCallback((s) => {
    const p = ytRef.current; const song = songRef.current;
    if (!p || !song) return;
    try { const t = p.getCurrentTime?.() ?? song.startTime; p.seekTo(Math.max(song.startTime, Math.min(song.endTime - 1, t + s)), true); } catch {}
  }, []);

  const changeVolume = useCallback((v) => {
    const c = Math.max(0, Math.min(100, v)); setVolumeState(c); volRef.current = c;
    localStorage.setItem('uta_volume', String(c));
    const p = ytRef.current;
    if (p) { if (c === 0) p.mute(); else { p.unMute(); p.setVolume(c); } }
  }, []);

  const addToQueue = useCallback((song) => setQueue(prev => [...prev, song]), []);
  const removeFromQueue = useCallback((i) => setQueue(prev => prev.filter((_, j) => j !== i)), []);
  const clearQueue = useCallback(() => setQueue([]), []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!songRef.current) return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': case 'l': e.preventDefault(); seekRelative(e.shiftKey ? 30 : 5); break;
        case 'ArrowLeft': case 'j': e.preventDefault(); seekRelative(e.shiftKey ? -30 : -5); break;
        case 'ArrowUp': e.preventDefault(); changeVolume(volRef.current + 10); break;
        case 'ArrowDown': e.preventDefault(); changeVolume(volRef.current - 10); break;
        case 'n': e.preventDefault(); playNext(); break;
        case 'p': e.preventDefault(); playPrev(); break;
        case 'm': e.preventDefault(); changeVolume(volRef.current === 0 ? 80 : 0); break;
        case 's': e.preventDefault(); setShuffle(x => !x); break;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [togglePlay, seekRelative, changeVolume, playNext, playPrev]);

  const onPlayerReady = useCallback((player) => {
    ytRef.current = player; readyRef.current = true;
    player.setVolume(volRef.current);
    if (pendRef.current) {
      const { song, playlist, index } = pendRef.current; pendRef.current = null;
      adMitigation(player, song);
      setCurrentPlaylist(playlist); setCurrentIndex(index);
      plRef.current = playlist; idxRef.current = index;
      setIsPlaying(true); setTimeout(() => startMon(), 2200);
      updateMediaSession(song, true); playSilentAudio();
    }
  }, [adMitigation, startMon, updateMediaSession, playSilentAudio]);

  const onPlayerStateChange = useCallback((state) => {
    if (state === 1) {
      setIsPlaying(true); if (endRef.current) startMon();
      updateMediaSession(songRef.current, true);
    } else if (state === 2) {
      setIsPlaying(false); clearMon();
      updateMediaSession(songRef.current, false);
    } else if (state === 0) {
      handleEndRef.current?.();
    }
  }, [startMon, updateMediaSession]);

  return (
    <PlayerContext.Provider value={{
      currentSong, currentPlaylist, currentIndex,
      isPlaying, showPlayer, setShowPlayer,
      loopMode, setLoopMode, shuffle, setShuffle,
      volume, changeVolume,
      history, queue, addToQueue, removeFromQueue, clearQueue,
      playSong, togglePlay, playNext, playPrev,
      stopPlayer, loadSong,
      onPlayerReady, onPlayerStateChange,
      seekRelative, ytRef,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() { return useContext(PlayerContext); }
