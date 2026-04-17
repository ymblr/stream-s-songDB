import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false); // modal style
  const [loopMode, setLoopMode] = useState('none');
  const [volume, setVolumeState] = useState(() => parseInt(localStorage.getItem('uta_volume') || '80'));

  const ytPlayerRef = useRef(null);
  const isReadyRef = useRef(false);
  const endTimeRef = useRef(null);
  const monitorRef = useRef(null);
  const pendingRef = useRef(null);
  const songRef = useRef(null);
  const playlistRef = useRef([]);
  const indexRef = useRef(0);
  const loopRef = useRef('none');
  const isPlayingRef = useRef(false);
  const volRef = useRef(80);
  const adWatchdogRef = useRef(null);

  useEffect(() => { songRef.current = currentSong; }, [currentSong]);
  useEffect(() => { playlistRef.current = currentPlaylist; }, [currentPlaylist]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopRef.current = loopMode; }, [loopMode]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volRef.current = volume; }, [volume]);

  const clearMonitor = () => {
    if (monitorRef.current) { clearInterval(monitorRef.current); monitorRef.current = null; }
    if (adWatchdogRef.current) { clearTimeout(adWatchdogRef.current); adWatchdogRef.current = null; }
  };

  const startMonitor = useCallback(() => {
    clearMonitor();
    monitorRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !endTimeRef.current) return;
      try {
        if (player.getPlayerState?.() === 1) {
          const t = player.getCurrentTime?.();
          if (t != null && t >= endTimeRef.current) handleEndRef.current?.();
        }
      } catch {}
    }, 300);
  }, []);

  // Ad mitigation: mute -> load -> seek to startTime -> unmute
  // This minimizes ad exposure even if it can't fully skip
  const loadWithAdMitigation = useCallback((player, song) => {
    const savedVol = volRef.current;

    // Step 1: Mute before loading (silences any pre-roll ad)
    player.mute();

    // Step 2: Load video
    player.loadVideoById({
      videoId: song.videoId,
      startSeconds: song.startTime,
    });

    // Step 3: Watchdog - after 1.5s, seek to startTime and unmute
    // If an ad played, video duration will be short; we can detect and seek
    adWatchdogRef.current = setTimeout(() => {
      try {
        const duration = player.getDuration?.() || 0;
        const currentTime = player.getCurrentTime?.() || 0;

        // If video duration matches song roughly (not a short ad), we're good
        // Always seek to startTime to be safe
        if (currentTime < song.startTime || currentTime > song.endTime) {
          player.seekTo(song.startTime, true);
        }

        // Unmute and restore volume
        player.unMute();
        player.setVolume(savedVol);
      } catch {}
    }, 1500);

    // Step 4: Also try to unmute after seeking completes
    setTimeout(() => {
      try {
        player.unMute();
        player.setVolume(savedVol);
      } catch {}
    }, 3000);

    endTimeRef.current = song.endTime;
    setIsPlaying(true);
    setTimeout(() => startMonitor(), 2000);
  }, [startMonitor]);

  const handleEndRef = useRef(null);

  const loadSong = useCallback((song, playlist = [], index = 0) => {
    setCurrentSong(song);
    setCurrentPlaylist(playlist);
    setCurrentIndex(index);
    songRef.current = song;
    playlistRef.current = playlist;
    indexRef.current = index;

    const player = ytPlayerRef.current;
    if (player && isReadyRef.current) {
      clearMonitor();
      loadWithAdMitigation(player, song);
    } else {
      pendingRef.current = { song, playlist, index };
    }
  }, [loadWithAdMitigation]);

  handleEndRef.current = () => {
    clearMonitor();
    const loop = loopRef.current;
    const pl = playlistRef.current;
    const idx = indexRef.current;
    const song = songRef.current;

    if (loop === 'song' && song) {
      const player = ytPlayerRef.current;
      if (player) { player.seekTo(song.startTime, true); player.playVideo(); endTimeRef.current = song.endTime; setTimeout(() => startMonitor(), 400); }
    } else if (idx + 1 < pl.length) {
      loadSong(pl[idx + 1], pl, idx + 1);
    } else if (loop === 'playlist' && pl.length > 0) {
      loadSong(pl[0], pl, 0);
    } else {
      setIsPlaying(false);
    }
  };

  const playSong = useCallback((song, playlist = [], index = 0) => {
    setShowPlayer(false); // keep mini player
    loadSong(song, playlist.length ? playlist : [song], playlist.length ? index : 0);
  }, [loadSong]);

  const togglePlay = useCallback(() => {
    const player = ytPlayerRef.current;
    if (!player) return;
    if (isPlayingRef.current) { player.pauseVideo(); setIsPlaying(false); clearMonitor(); }
    else { player.playVideo(); setIsPlaying(true); startMonitor(); }
  }, [startMonitor]);

  const playNext = useCallback(() => {
    const pl = playlistRef.current; const idx = indexRef.current;
    if (idx + 1 < pl.length) loadSong(pl[idx + 1], pl, idx + 1);
    else if (loopRef.current === 'playlist' && pl.length > 0) loadSong(pl[0], pl, 0);
  }, [loadSong]);

  const playPrev = useCallback(() => {
    const pl = playlistRef.current; const idx = indexRef.current;
    if (idx > 0) loadSong(pl[idx - 1], pl, idx - 1);
    else ytPlayerRef.current?.seekTo(songRef.current?.startTime ?? 0, true);
  }, [loadSong]);

  const stopPlayer = useCallback(() => {
    clearMonitor();
    ytPlayerRef.current?.pauseVideo();
    setIsPlaying(false); setCurrentSong(null); setCurrentPlaylist([]); setCurrentIndex(0);
    setShowPlayer(false);
    songRef.current = null; playlistRef.current = []; indexRef.current = 0;
  }, []);

  const seekRelative = useCallback((s) => {
    const player = ytPlayerRef.current; const song = songRef.current;
    if (!player || !song) return;
    try {
      const t = player.getCurrentTime?.() ?? song.startTime;
      player.seekTo(Math.max(song.startTime, Math.min(song.endTime - 1, t + s)), true);
    } catch {}
  }, []);

  const changeVolume = useCallback((v) => {
    const c = Math.max(0, Math.min(100, v));
    setVolumeState(c); volRef.current = c;
    localStorage.setItem('uta_volume', String(c));
    const player = ytPlayerRef.current;
    if (player) { if (c === 0) player.mute(); else { player.unMute(); player.setVolume(c); } }
  }, []);

  useEffect(() => {
    const handler = (e) => {
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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, seekRelative, changeVolume, playNext, playPrev]);

  const onPlayerReady = useCallback((player) => {
    ytPlayerRef.current = player;
    isReadyRef.current = true;
    player.setVolume(volRef.current);
    if (pendingRef.current) {
      const { song, playlist, index } = pendingRef.current;
      pendingRef.current = null;
      loadWithAdMitigation(player, song);
      setCurrentPlaylist(playlist);
      setCurrentIndex(index);
      playlistRef.current = playlist;
      indexRef.current = index;
    }
  }, [loadWithAdMitigation]);

  const onPlayerStateChange = useCallback((state) => {
    if (state === 1) { setIsPlaying(true); if (endTimeRef.current) startMonitor(); }
    else if (state === 2) { setIsPlaying(false); clearMonitor(); }
    else if (state === 0) { handleEndRef.current?.(); }
  }, [startMonitor]);

  return (
    <PlayerContext.Provider value={{
      currentSong, currentPlaylist, currentIndex,
      isPlaying, showPlayer, setShowPlayer,
      loopMode, setLoopMode, volume, changeVolume,
      playSong, togglePlay, playNext, playPrev,
      stopPlayer, loadSong,
      onPlayerReady, onPlayerStateChange,
      seekRelative, ytPlayerRef,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() { return useContext(PlayerContext); }
