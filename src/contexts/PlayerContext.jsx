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
  const [loopMode, setLoopMode] = useState('none'); // none | song | playlist
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolumeState] = useState(() => parseInt(localStorage.getItem('uta_volume') || '80'));
  const [history, setHistory] = useState([]); // [{song, playedAt}]
  const [queue, setQueue] = useState([]); // manual queue for single-song mode

  const ytRef = useRef(null);
  const readyRef = useRef(false);
  const endRef = useRef(null);
  const monRef = useRef(null);
  const pendRef = useRef(null);
  const adRef = useRef(null);
  const songRef = useRef(null);
  const plRef = useRef([]);
  const idxRef = useRef(0);
  const loopRef = useRef('none');
  const shuffleRef = useRef(false);
  const isPlayRef = useRef(false);
  const volRef = useRef(80);
  const queueRef = useRef([]);
  // Track visited indices for shuffle (avoid repeats)
  const shuffleHistRef = useRef([]);

  useEffect(() => { songRef.current = currentSong; }, [currentSong]);
  useEffect(() => { plRef.current = currentPlaylist; }, [currentPlaylist]);
  useEffect(() => { idxRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopRef.current = loopMode; }, [loopMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { isPlayRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volRef.current = volume; }, [volume]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

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

  const trackHistory = useCallback((song) => {
    setHistory(prev => {
      const next = [{ song, playedAt: Date.now() }, ...prev.filter(h => h.song.id !== song.id)].slice(0, MAX_HISTORY);
      return next;
    });
    // Increment playCount in Firestore
    if (song.id) {
      updateDoc(doc(db, 'songs', song.id), { playCount: increment(1) }).catch(() => {});
    }
  }, []);

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

  const handleEndRef = useRef(null);

  const loadSong = useCallback((song, playlist = [], index = 0, skipHistory = false) => {
    setCurrentSong(song); setCurrentPlaylist(playlist); setCurrentIndex(index);
    songRef.current = song; plRef.current = playlist; idxRef.current = index;
    if (!skipHistory) trackHistory(song);

    const player = ytRef.current;
    if (player && readyRef.current) {
      clearMon();
      adMitigation(player, song);
      setIsPlaying(true);
      setTimeout(() => startMon(), 2200);
    } else {
      pendRef.current = { song, playlist, index };
    }
  }, [adMitigation, startMon, trackHistory]);

  const getNextIndex = useCallback(() => {
    const pl = plRef.current;
    const idx = idxRef.current;
    if (pl.length <= 1) return -1;
    if (shuffleRef.current) {
      // Pick random unvisited index
      const visited = shuffleHistRef.current;
      const available = pl.map((_, i) => i).filter(i => i !== idx && !visited.includes(i));
      if (available.length === 0) {
        shuffleHistRef.current = [idx]; // reset, allow replay
        const all = pl.map((_, i) => i).filter(i => i !== idx);
        return all[Math.floor(Math.random() * all.length)];
      }
      const next = available[Math.floor(Math.random() * available.length)];
      shuffleHistRef.current = [...visited, idx].slice(-pl.length);
      return next;
    }
    return idx + 1 < pl.length ? idx + 1 : -1;
  }, []);

  handleEndRef.current = () => {
    clearMon();
    const loop = loopRef.current;
    const pl = plRef.current;
    const idx = idxRef.current;
    const song = songRef.current;

    if (loop === 'song' && song) {
      const player = ytRef.current;
      if (player) { player.seekTo(song.startTime, true); player.playVideo(); endRef.current = song.endTime; setTimeout(() => startMon(), 400); }
      return;
    }

    // Check queue first (for single-song play)
    if (pl.length <= 1 && queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      setQueue(rest);
      loadSong(next, [next], 0);
      return;
    }

    const nextIdx = getNextIndex();
    if (nextIdx !== -1) {
      loadSong(pl[nextIdx], pl, nextIdx);
    } else if (loop === 'playlist' && pl.length > 0) {
      shuffleHistRef.current = [];
      loadSong(pl[0], pl, 0);
    } else {
      // End of playlist — stop completely
      setIsPlaying(false);
      ytRef.current?.pauseVideo();
    }
  };

  const playSong = useCallback((song, playlist = [], index = 0) => {
    shuffleHistRef.current = [];
    loadSong(song, playlist.length ? playlist : [song], playlist.length ? index : 0);
  }, [loadSong]);

  const togglePlay = useCallback(() => {
    const p = ytRef.current;
    if (!p) return;
    if (isPlayRef.current) { p.pauseVideo(); setIsPlaying(false); clearMon(); }
    else { p.playVideo(); setIsPlaying(true); startMon(); }
  }, [startMon]);

  const playNext = useCallback(() => {
    const pl = plRef.current; const idx = idxRef.current;
    // Check queue for single-song
    if (pl.length <= 1 && queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      setQueue(rest);
      loadSong(next, [next], 0);
      return;
    }
    const nextIdx = getNextIndex();
    if (nextIdx !== -1) loadSong(pl[nextIdx], pl, nextIdx);
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
  }, []);

  const seekRelative = useCallback((s) => {
    const p = ytRef.current; const song = songRef.current;
    if (!p || !song) return;
    try { const t = p.getCurrentTime?.() ?? song.startTime; p.seekTo(Math.max(song.startTime, Math.min(song.endTime - 1, t + s)), true); } catch {}
  }, []);

  const changeVolume = useCallback((v) => {
    const c = Math.max(0, Math.min(100, v));
    setVolumeState(c); volRef.current = c;
    localStorage.setItem('uta_volume', String(c));
    const p = ytRef.current;
    if (p) { if (c === 0) p.mute(); else { p.unMute(); p.setVolume(c); } }
  }, []);

  const addToQueue = useCallback((song) => {
    setQueue(prev => [...prev, song]);
  }, []);

  const removeFromQueue = useCallback((idx) => {
    setQueue(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

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
      const { song, playlist, index } = pendRef.current;
      pendRef.current = null;
      adMitigation(player, song);
      setCurrentPlaylist(playlist); setCurrentIndex(index);
      plRef.current = playlist; idxRef.current = index;
      setIsPlaying(true);
      setTimeout(() => startMon(), 2200);
    }
  }, [adMitigation, startMon]);

  const onPlayerStateChange = useCallback((state) => {
    if (state === 1) { setIsPlaying(true); if (endRef.current) startMon(); }
    else if (state === 2) { setIsPlaying(false); clearMon(); }
    else if (state === 0) { handleEndRef.current?.(); }
  }, [startMon]);

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
