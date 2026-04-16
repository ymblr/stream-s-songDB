import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerMode, setPlayerMode] = useState('mini');
  const [loopMode, setLoopMode] = useState('none');
  const [volume, setVolumeState] = useState(() => parseInt(localStorage.getItem('uta_volume') || '80'));

  const ytPlayerRef = useRef(null);
  const isPlayerReadyRef = useRef(false);
  const endTimeRef = useRef(null);
  const endMonitorRef = useRef(null);
  const pendingSongRef = useRef(null);
  const currentSongRef = useRef(null);
  const currentPlaylistRef = useRef([]);
  const currentIndexRef = useRef(0);
  const loopModeRef = useRef('none');
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(80);

  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { currentPlaylistRef.current = currentPlaylist; }, [currentPlaylist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const clearEndMonitor = () => {
    if (endMonitorRef.current) { clearInterval(endMonitorRef.current); endMonitorRef.current = null; }
  };

  const startEndMonitor = useCallback(() => {
    clearEndMonitor();
    endMonitorRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !endTimeRef.current) return;
      try {
        if (player.getPlayerState?.() === 1) {
          const time = player.getCurrentTime?.();
          if (time != null && time >= endTimeRef.current) handleSongEndRef.current?.();
        }
      } catch {}
    }, 300);
  }, []);

  const handleSongEndRef = useRef(null);

  const loadSongIntoPlayer = useCallback((song, playlist = [], index = 0) => {
    setCurrentSong(song); setCurrentPlaylist(playlist); setCurrentIndex(index);
    currentSongRef.current = song; currentPlaylistRef.current = playlist; currentIndexRef.current = index;
    endTimeRef.current = song.endTime;

    const player = ytPlayerRef.current;
    if (player && isPlayerReadyRef.current) {
      clearEndMonitor();
      player.loadVideoById({ videoId: song.videoId, startSeconds: song.startTime, endSeconds: song.endTime + 5 });
      setIsPlaying(true);
      setTimeout(() => startEndMonitor(), 1200);
    } else {
      pendingSongRef.current = { song, playlist, index };
    }
  }, [startEndMonitor]);

  handleSongEndRef.current = () => {
    clearEndMonitor();
    const loop = loopModeRef.current;
    const playlist = currentPlaylistRef.current;
    const idx = currentIndexRef.current;
    const song = currentSongRef.current;

    if (loop === 'song' && song) {
      const player = ytPlayerRef.current;
      if (player) { player.seekTo(song.startTime, true); player.playVideo(); endTimeRef.current = song.endTime; setTimeout(() => startEndMonitor(), 500); }
    } else if (idx + 1 < playlist.length) {
      loadSongIntoPlayer(playlist[idx + 1], playlist, idx + 1);
    } else if (loop === 'playlist' && playlist.length > 0) {
      loadSongIntoPlayer(playlist[0], playlist, 0);
    } else {
      setIsPlaying(false);
    }
  };

  const playSong = useCallback((song, playlist = [], index = 0) => {
    setPlayerMode('mini');
    loadSongIntoPlayer(song, playlist.length ? playlist : [song], playlist.length ? index : 0);
  }, [loadSongIntoPlayer]);

  const togglePlay = useCallback(() => {
    const player = ytPlayerRef.current;
    if (!player) return;
    if (isPlayingRef.current) { player.pauseVideo(); setIsPlaying(false); clearEndMonitor(); }
    else { player.playVideo(); setIsPlaying(true); startEndMonitor(); }
  }, [startEndMonitor]);

  const playNext = useCallback(() => {
    const pl = currentPlaylistRef.current; const idx = currentIndexRef.current;
    if (idx + 1 < pl.length) loadSongIntoPlayer(pl[idx + 1], pl, idx + 1);
    else if (loopModeRef.current === 'playlist' && pl.length > 0) loadSongIntoPlayer(pl[0], pl, 0);
  }, [loadSongIntoPlayer]);

  const playPrev = useCallback(() => {
    const pl = currentPlaylistRef.current; const idx = currentIndexRef.current;
    if (idx > 0) loadSongIntoPlayer(pl[idx - 1], pl, idx - 1);
    else ytPlayerRef.current?.seekTo(currentSongRef.current?.startTime ?? 0, true);
  }, [loadSongIntoPlayer]);

  const stopPlayer = useCallback(() => {
    clearEndMonitor(); ytPlayerRef.current?.pauseVideo();
    setIsPlaying(false); setCurrentSong(null); setCurrentPlaylist([]); setCurrentIndex(0);
    currentSongRef.current = null; currentPlaylistRef.current = []; currentIndexRef.current = 0;
  }, []);

  const seekRelative = useCallback((seconds) => {
    const player = ytPlayerRef.current; const song = currentSongRef.current;
    if (!player || !song) return;
    try {
      const current = player.getCurrentTime?.() ?? song.startTime;
      player.seekTo(Math.max(song.startTime, Math.min(song.endTime - 1, current + seconds)), true);
    } catch {}
  }, []);

  const seekToRatio = useCallback((ratio) => {
    const song = currentSongRef.current; const player = ytPlayerRef.current;
    if (!song || !player) return;
    player.seekTo(song.startTime + ratio * (song.endTime - song.startTime), true);
  }, []);

  const changeVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(100, v));
    setVolumeState(clamped); volumeRef.current = clamped;
    localStorage.setItem('uta_volume', String(clamped));
    ytPlayerRef.current?.setVolume(clamped);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!currentSongRef.current) return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': case 'l': e.preventDefault(); seekRelative(e.shiftKey ? 30 : 5); break;
        case 'ArrowLeft': case 'j': e.preventDefault(); seekRelative(e.shiftKey ? -30 : -5); break;
        case 'ArrowUp': e.preventDefault(); changeVolume(volumeRef.current + 10); break;
        case 'ArrowDown': e.preventDefault(); changeVolume(volumeRef.current - 10); break;
        case 'n': e.preventDefault(); playNext(); break;
        case 'p': e.preventDefault(); playPrev(); break;
        case 'f': e.preventDefault(); setPlayerMode(m => m === 'full' ? 'mini' : 'full'); break;
        case 'm': e.preventDefault(); changeVolume(volumeRef.current === 0 ? 80 : 0); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, seekRelative, changeVolume, playNext, playPrev]);

  const onPlayerReady = useCallback((player) => {
    ytPlayerRef.current = player; isPlayerReadyRef.current = true;
    player.setVolume(volumeRef.current);
    if (pendingSongRef.current) {
      const { song, playlist, index } = pendingSongRef.current;
      pendingSongRef.current = null;
      endTimeRef.current = song.endTime;
      player.loadVideoById({ videoId: song.videoId, startSeconds: song.startTime, endSeconds: song.endTime + 5 });
      setIsPlaying(true);
      setTimeout(() => startEndMonitor(), 1200);
    }
  }, [startEndMonitor]);

  const onPlayerStateChange = useCallback((state) => {
    if (state === 1) { setIsPlaying(true); if (endTimeRef.current) startEndMonitor(); }
    else if (state === 2) { setIsPlaying(false); clearEndMonitor(); }
    else if (state === 0) { handleSongEndRef.current?.(); }
    else if (state === 5) {
      // Video cued - may happen after ad, seek to correct position
      const player = ytPlayerRef.current; const song = currentSongRef.current;
      if (player && song) { player.seekTo(song.startTime, true); player.playVideo(); }
    }
  }, [startEndMonitor]);

  return (
    <PlayerContext.Provider value={{
      currentSong, currentPlaylist, currentIndex,
      isPlaying, playerMode, setPlayerMode,
      loopMode, setLoopMode, volume, changeVolume,
      playSong, togglePlay, playNext, playPrev,
      stopPlayer, loadSongIntoPlayer,
      onPlayerReady, onPlayerStateChange,
      seekRelative, seekToRatio, ytPlayerRef,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
