import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerMode, setPlayerMode] = useState('mini'); // 'mini' | 'full'
  const [loopMode, setLoopMode] = useState('none'); // 'none' | 'song' | 'playlist'
  const [volume, setVolume] = useState(100);

  const ytPlayerRef = useRef(null);
  const endTimeRef = useRef(null);
  const endMonitorRef = useRef(null);
  const pendingSongRef = useRef(null);
  const currentSongRef = useRef(null);
  const currentPlaylistRef = useRef([]);
  const currentIndexRef = useRef(0);
  const loopModeRef = useRef('none');

  // Keep refs in sync
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { currentPlaylistRef.current = currentPlaylist; }, [currentPlaylist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);

  const clearEndMonitor = () => {
    if (endMonitorRef.current) {
      clearInterval(endMonitorRef.current);
      endMonitorRef.current = null;
    }
  };

  const handleSongEnd = useCallback(() => {
    clearEndMonitor();
    const loop = loopModeRef.current;
    const playlist = currentPlaylistRef.current;
    const idx = currentIndexRef.current;
    const song = currentSongRef.current;

    if (loop === 'song' && song) {
      // Replay same song
      ytPlayerRef.current?.seekTo(song.startTime, true);
      ytPlayerRef.current?.playVideo();
      endTimeRef.current = song.endTime;
      startEndMonitor();
    } else if (playlist.length > 1) {
      const nextIdx = idx + 1;
      if (nextIdx < playlist.length) {
        loadSongIntoPlayer(playlist[nextIdx], playlist, nextIdx);
      } else if (loop === 'playlist') {
        loadSongIntoPlayer(playlist[0], playlist, 0);
      } else {
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  }, []);

  const startEndMonitor = () => {
    clearEndMonitor();
    endMonitorRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !endTimeRef.current) return;
      try {
        const state = player.getPlayerState?.();
        if (state === 1) { // playing
          const time = player.getCurrentTime?.();
          if (time != null && time >= endTimeRef.current) {
            handleSongEnd();
          }
        }
      } catch (e) { /* ignore */ }
    }, 500);
  };

  const loadSongIntoPlayer = useCallback((song, playlist = [], index = 0) => {
    setCurrentSong(song);
    setCurrentPlaylist(playlist);
    setCurrentIndex(index);
    currentSongRef.current = song;
    currentPlaylistRef.current = playlist;
    currentIndexRef.current = index;
    endTimeRef.current = song.endTime;

    const player = ytPlayerRef.current;
    if (player && isPlayerReady) {
      player.loadVideoById({
        videoId: song.videoId,
        startSeconds: song.startTime,
      });
      setIsPlaying(true);
      startEndMonitor();
    } else {
      pendingSongRef.current = song;
    }
  }, [isPlayerReady, handleSongEnd]);

  const playSong = useCallback((song, playlist = [], index = 0) => {
    setPlayerMode('mini');
    loadSongIntoPlayer(song, playlist, index);
  }, [loadSongIntoPlayer]);

  const togglePlay = useCallback(() => {
    const player = ytPlayerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
      clearEndMonitor();
    } else {
      player.playVideo();
      setIsPlaying(true);
      startEndMonitor();
    }
  }, [isPlaying]);

  const playNext = useCallback(() => {
    const playlist = currentPlaylistRef.current;
    const idx = currentIndexRef.current;
    if (idx + 1 < playlist.length) {
      loadSongIntoPlayer(playlist[idx + 1], playlist, idx + 1);
    }
  }, [loadSongIntoPlayer]);

  const playPrev = useCallback(() => {
    const playlist = currentPlaylistRef.current;
    const idx = currentIndexRef.current;
    if (idx - 1 >= 0) {
      loadSongIntoPlayer(playlist[idx - 1], playlist, idx - 1);
    } else {
      // Seek to start
      ytPlayerRef.current?.seekTo(currentSongRef.current?.startTime ?? 0, true);
    }
  }, [loadSongIntoPlayer]);

  const seek = useCallback((seconds) => {
    ytPlayerRef.current?.seekTo(seconds, true);
  }, []);

  const changeVolume = useCallback((v) => {
    setVolume(v);
    ytPlayerRef.current?.setVolume(v);
  }, []);

  const stopPlayer = useCallback(() => {
    clearEndMonitor();
    ytPlayerRef.current?.pauseVideo();
    setIsPlaying(false);
    setCurrentSong(null);
    setCurrentPlaylist([]);
    setCurrentIndex(0);
  }, []);

  const onPlayerReady = useCallback((player) => {
    ytPlayerRef.current = player;
    setIsPlayerReady(true);
    if (pendingSongRef.current) {
      const song = pendingSongRef.current;
      pendingSongRef.current = null;
      player.loadVideoById({
        videoId: song.videoId,
        startSeconds: song.startTime,
      });
      setIsPlaying(true);
      startEndMonitor();
    }
  }, []);

  const onPlayerStateChange = useCallback((state) => {
    if (state === 1) { // YT.PlayerState.PLAYING
      setIsPlaying(true);
      startEndMonitor();
    } else if (state === 2) { // PAUSED
      setIsPlaying(false);
    } else if (state === 0) { // ENDED
      handleSongEnd();
    }
  }, [handleSongEnd]);

  return (
    <PlayerContext.Provider value={{
      currentSong,
      currentPlaylist,
      currentIndex,
      isPlaying,
      isPlayerReady,
      playerMode,
      setPlayerMode,
      loopMode,
      setLoopMode,
      volume,
      playSong,
      togglePlay,
      playNext,
      playPrev,
      seek,
      changeVolume,
      stopPlayer,
      loadSongIntoPlayer,
      onPlayerReady,
      onPlayerStateChange,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
