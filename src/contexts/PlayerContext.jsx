import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  doc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { extractVideoId } from '../utils/youtube';
import { createYouTubeClipRecovery } from '../utils/youtubeRecovery';
import {
  applyPlayerVolume,
  clampVolume,
  clampSongVolume,
  getEffectiveVolume,
  getInitialVolume,
  DEFAULT_VOLUME,
} from '../utils/volume';

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
  const [volume, setVolumeState] = useState(getInitialVolume);
  const [history, setHistory] = useState([]);
  const [queue, setQueue] = useState([]);
  // 関連曲自動再生中フラグ（UIで「自動再生中」を示すために使用可能）
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [playerError, setPlayerError] = useState('');

  const ytRef = useRef(null);
  const readyRef = useRef(false);
  const endRef = useRef(null);
  const monRef = useRef(null);
  const adRef = useRef(null);
  const pendRef = useRef(null);
  const wakeLockRef = useRef(null);
  const silentAudioRef = useRef(null);
  const playbackRef = useRef({ ready: false, generation: 0 });
  const generationRef = useRef(0);
  const endingRef = useRef(false);
  const playbackRequestedRef = useRef(false);
  const visibilityTimerRef = useRef(null);
  const recoveryRef = useRef(null);
  if (!recoveryRef.current) recoveryRef.current = createYouTubeClipRecovery();

  // stable refs
  const songRef = useRef(null);
  const plRef = useRef([]);
  const idxRef = useRef(0);
  const loopRef = useRef('none');
  const shuffleRef = useRef(false);
  const isPlayRef = useRef(false);
  const volRef = useRef(volume);
  const queueRef = useRef([]);
  const shuffleHistRef = useRef([]);

  useEffect(() => {
    songRef.current = currentSong;
  }, [currentSong]);
  useEffect(() => {
    plRef.current = currentPlaylist;
  }, [currentPlaylist]);
  useEffect(() => {
    idxRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    loopRef.current = loopMode;
  }, [loopMode]);
  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);
  useEffect(() => {
    isPlayRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    volRef.current = volume;
  }, [volume]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // ── Silent audio (Android バックグラウンド保持) ────────────────
  const initSilentAudio = useCallback(() => {
    if (silentAudioRef.current) return;
    const audio = document.createElement('audio');
    audio.loop = true;
    audio.volume = 0.001;
    audio.src =
      'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAAYZAoGNXAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    silentAudioRef.current = audio;
  }, []);

  const playSilentAudio = useCallback(() => {
    initSilentAudio();
    const audio = silentAudioRef.current;
    if (audio && audio.paused) audio.play().catch(() => {});
  }, [initSilentAudio]);

  // ── Wake Lock ──────────────────────────────────────────────────
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  useEffect(() => {
    if (isPlaying) requestWakeLock();
    else releaseWakeLock();
  }, [isPlaying]);

  // Recover using the player's native ended state, even when its clock reset to 0.
  useEffect(() => {
    const onVisible = () => {
      clearTimeout(visibilityTimerRef.current);
      if (
        document.visibilityState !== 'visible' ||
        !playbackRequestedRef.current
      )
        return;
      const generation = generationRef.current;
      visibilityTimerRef.current = setTimeout(() => {
        if (
          document.visibilityState !== 'visible' ||
          !playbackRequestedRef.current ||
          generation !== generationRef.current
        )
          return;
        const player = ytRef.current,
          song = songRef.current;
        if (!player || !song || !readyRef.current || recoveryRef.current.active)
          return;
        try {
          const state = player.getPlayerState?.();
          const time = player.getCurrentTime?.() ?? 0;
          const matches =
            extractVideoId(player.getVideoUrl?.() || '') === song.videoId;
          if (!matches) return;
          if (matches && state === 0 && playbackRef.current.started) {
            handleEndRef.current?.(true);
            return;
          }
          if (matches && playbackRef.current.ready && time >= song.endTime) {
            handleEndRef.current?.();
            return;
          }
          if (state !== 1) {
            if (time < song.startTime) player.seekTo(song.startTime, true);
            player.playVideo();
          }
          startMon();
          requestWakeLock();
        } catch {}
      }, 600);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
      clearTimeout(visibilityTimerRef.current);
    };
  }, []);

  // ── Media Session ─────────────────────────────────────────────
  const updateMediaSession = useCallback((song, playing) => {
    if (!('mediaSession' in navigator)) return;
    if (!song) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name || '不明な楽曲',
      artist: song.artist || "Stream's Song DB",
      album: song.streamType === 'singing' ? '歌枠' : '弾き語り',
      artwork: [
        {
          src:
            song.streamThumbnail ||
            `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg`,
          sizes: '480x360',
          type: 'image/jpeg',
        },
      ],
    });
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, []);

  const registerMediaSessionHandlers = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => {
      playbackRequestedRef.current = true;
      recoveryRef.current.setPaused(false);
      ytRef.current?.playVideo();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      playbackRequestedRef.current = false;
      recoveryRef.current.setPaused(true);
      ytRef.current?.pauseVideo();
      if (recoveryRef.current.active) setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const pl = plRef.current;
      const idx = idxRef.current;
      if (idx > 0) loadSong(pl[idx - 1], pl, idx - 1);
      else ytRef.current?.seekTo(songRef.current?.startTime ?? 0, true);
    });
    navigator.mediaSession.setActionHandler('seekforward', (d) => {
      const s = d.seekOffset ?? 10;
      const player = ytRef.current;
      const song = songRef.current;
      if (player && song)
        player.seekTo(
          Math.min(
            (player.getCurrentTime?.() ?? song.startTime) + s,
            song.endTime - 1
          ),
          true
        );
    });
    navigator.mediaSession.setActionHandler('seekbackward', (d) => {
      const s = d.seekOffset ?? 10;
      const player = ytRef.current;
      const song = songRef.current;
      if (player && song)
        player.seekTo(
          Math.max(
            (player.getCurrentTime?.() ?? song.startTime) - s,
            song.startTime
          ),
          true
        );
    });
  }, []);

  useEffect(() => {
    registerMediaSessionHandlers();
  }, []);

  // ── End monitor ────────────────────────────────────────────────
  const clearMon = () => {
    if (monRef.current) {
      clearInterval(monRef.current);
      monRef.current = null;
    }
  };

  const clearLoadTimer = () => {
    clearTimeout(adRef.current);
    adRef.current = null;
  };

  const startMon = useCallback(() => {
    clearMon();
    monRef.current = setInterval(() => {
      const p = ytRef.current;
      const song = songRef.current;
      if (!p || !song || !endRef.current || endingRef.current) return;
      if (recoveryRef.current.active) return;
      try {
        const state = p.getPlayerState?.();
        const videoId = extractVideoId(p.getVideoUrl?.() || '');
        if (videoId !== song.videoId) return;
        if (
          state === 0 &&
          playbackRequestedRef.current &&
          playbackRef.current.started
        ) {
          handleEndRef.current?.(true);
          return;
        }
        if (state === 1) {
          const t = p.getCurrentTime?.();
          if (!Number.isFinite(t)) return;
          // Ignore old-video/ad clocks until this clip's content is observed.
          if (t >= song.startTime - 0.5 && t < song.endTime) {
            playbackRef.current.ready = true;
            if (adRef.current) {
              clearLoadTimer();
              applyPlayerVolume(p, volRef.current, songRef.current);
            }
          }
          if (playbackRef.current.ready && t >= endRef.current)
            handleEndRef.current?.();
        }
      } catch {}
    }, 300);
  }, []);

  const handleEndRef = useRef(null);

  // ── Ad mitigation ─────────────────────────────────────────────
  const adMitigation = useCallback((player, song) => {
    clearLoadTimer();
    recoveryRef.current.reset(song);
    const generation = generationRef.current;
    endRef.current = song.endTime;
    player.mute();
    player.loadVideoById({
      videoId: song.videoId,
      startSeconds: song.startTime,
      endSeconds: song.endTime,
    });
    adRef.current = setTimeout(() => {
      adRef.current = null;
      if (generation !== generationRef.current || ytRef.current !== player)
        return;
      try {
        applyPlayerVolume(player, volRef.current, songRef.current);
      } catch {}
    }, 1500);
  }, []);

  // ── History & playCount ────────────────────────────────────────
  const trackHistory = useCallback((song) => {
    setHistory((prev) =>
      [
        { song, playedAt: Date.now() },
        ...prev.filter((h) => h.song.id !== song.id),
      ].slice(0, MAX_HISTORY)
    );
    if (song.id)
      updateDoc(doc(db, 'songs', song.id), { playCount: increment(1) }).catch(
        () => {}
      );
  }, []);

  // ── 関連曲を Firestore から取得 ────────────────────────────────
  // 優先順位: 1) 同アーティスト → 2) 同ストリームタイプ → 3) なし
  const findRelatedSong = useCallback(async (song) => {
    try {
      // 1. 同アーティストの曲
      const artistSnap = await getDocs(
        query(
          collection(db, 'songs'),
          where('artist', '==', song.artist),
          limit(20)
        )
      );
      const artistSongs = artistSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.id !== song.id);
      if (artistSongs.length > 0) {
        // 再生数上位3曲からランダム（偏りをやや持たせる）
        const sorted = artistSongs.sort(
          (a, b) => (b.playCount || 0) - (a.playCount || 0)
        );
        return sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
      }

      // 2. 同ストリームタイプの曲（人気順）
      const typeSnap = await getDocs(
        query(
          collection(db, 'songs'),
          where('streamType', '==', song.streamType),
          limit(30)
        )
      );
      const typeSongs = typeSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.id !== song.id);
      if (typeSongs.length > 0) {
        const sorted = typeSongs.sort(
          (a, b) => (b.playCount || 0) - (a.playCount || 0)
        );
        return sorted[Math.floor(Math.random() * Math.min(8, sorted.length))];
      }
    } catch (e) {
      console.error('findRelatedSong error:', e);
    }
    return null;
  }, []);

  // ── Load song ──────────────────────────────────────────────────
  const loadSong = useCallback(
    (song, playlist = [], index = 0, skipHistory = false, autoPlay = false) => {
      playbackRequestedRef.current = true;
      generationRef.current++;
      endingRef.current = false;
      playbackRef.current = { ready: false, generation: generationRef.current };
      setPlayerError('');
      setIsAutoPlay(autoPlay);
      clearMon();
      clearLoadTimer();
      recoveryRef.current.reset(song);
      setCurrentSong(song);
      setCurrentPlaylist(playlist);
      setCurrentIndex(index);
      songRef.current = song;
      plRef.current = playlist;
      idxRef.current = index;
      if (!skipHistory) trackHistory(song);
      updateMediaSession(song, true);
      playSilentAudio();

      const player = ytRef.current;
      if (player && readyRef.current) {
        clearMon();
        adMitigation(player, song);
        setIsPlaying(true);
        startMon();
      } else {
        pendRef.current = { song, playlist, index };
      }
    },
    [adMitigation, startMon, trackHistory, updateMediaSession, playSilentAudio]
  );

  // ── Shuffle next ──────────────────────────────────────────────
  const getNextIndex = useCallback(() => {
    const pl = plRef.current;
    const idx = idxRef.current;
    if (pl.length <= 1) return -1;
    if (shuffleRef.current) {
      const visited = shuffleHistRef.current;
      const avail = pl
        .map((_, i) => i)
        .filter((i) => i !== idx && !visited.includes(i));
      if (!avail.length) {
        shuffleHistRef.current = [idx];
        const all = pl.map((_, i) => i).filter((i) => i !== idx);
        return all[Math.floor(Math.random() * all.length)];
      }
      const next = avail[Math.floor(Math.random() * avail.length)];
      shuffleHistRef.current = [...visited, idx].slice(-pl.length);
      return next;
    }
    return idx + 1 < pl.length ? idx + 1 : -1;
  }, []);

  // ── handleEnd ────────────────────────────────────────────────
  handleEndRef.current = (nativeEnded = false) => {
    if (
      !songRef.current ||
      !playbackRequestedRef.current ||
      endingRef.current ||
      (!playbackRef.current.ready &&
        !(nativeEnded && playbackRef.current.started))
    )
      return;
    endingRef.current = true;
    clearMon();
    clearLoadTimer();
    const loop = loopRef.current;
    const pl = plRef.current;
    const idx = idxRef.current;
    const song = songRef.current;

    // 1. 1曲ループ
    if (loop === 'song' && song) {
      const p = ytRef.current;
      if (p) loadSong(song, pl, idx, true);
      return;
    }

    // 2. キューから次
    if (pl.length <= 1 && queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      queueRef.current = rest;
      setQueue(rest);
      loadSong(next, [next], 0);
      return;
    }

    // 3. プレイリストの次曲
    const nextIdx = getNextIndex();
    if (nextIdx !== -1) {
      loadSong(pl[nextIdx], pl, nextIdx);
      return;
    }

    // 4. プレイリストループ
    if (loop === 'playlist' && pl.length > 0) {
      shuffleHistRef.current = [];
      loadSong(pl[0], pl, 0);
      return;
    }

    // 5. 単曲再生が終わった → 関連曲を自動再生
    if (pl.length <= 1 && song && loop === 'none') {
      setIsAutoPlay(true);
      const generation = generationRef.current;
      findRelatedSong(song)
        .then((related) => {
          if (generation !== generationRef.current) return;
          if (related) {
            loadSong(related, [related], 0, false, true);
          } else {
            setIsAutoPlay(false);
            playbackRequestedRef.current = false;
            // 関連曲が見つからない場合のみ停止
            setIsPlaying(false);
            ytRef.current?.pauseVideo();
            updateMediaSession(songRef.current, false);
            releaseWakeLock();
            if ('mediaSession' in navigator)
              navigator.mediaSession.playbackState = 'none';
          }
        })
        .catch(() => {
          if (generation !== generationRef.current) return;
          playbackRequestedRef.current = false;
          setIsAutoPlay(false);
          setIsPlaying(false);
          ytRef.current?.pauseVideo();
          updateMediaSession(songRef.current, false);
          releaseWakeLock();
        });
      return;
    }

    // 6. 完全停止
    playbackRequestedRef.current = false;
    setIsPlaying(false);
    ytRef.current?.pauseVideo();
    updateMediaSession(songRef.current, false);
    releaseWakeLock();
    if ('mediaSession' in navigator)
      navigator.mediaSession.playbackState = 'none';
  };

  const playSong = useCallback(
    (song, playlist = [], index = 0) => {
      shuffleHistRef.current = [];
      setIsAutoPlay(false);
      loadSong(
        song,
        playlist.length ? playlist : [song],
        playlist.length ? index : 0
      );
    },
    [loadSong]
  );

  const togglePlay = useCallback(() => {
    const p = ytRef.current;
    if (!p) return;
    if (isPlayRef.current) {
      playbackRequestedRef.current = false;
      recoveryRef.current.setPaused(true);
      p.pauseVideo();
      setIsPlaying(false);
      clearMon();
      updateMediaSession(songRef.current, false);
    } else {
      playbackRequestedRef.current = true;
      recoveryRef.current.setPaused(false);
      p.playVideo();
      setIsPlaying(true);
      startMon();
      updateMediaSession(songRef.current, true);
    }
  }, [startMon, updateMediaSession]);

  const playNext = useCallback(() => {
    const pl = plRef.current;
    if (pl.length <= 1 && queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      queueRef.current = rest;
      setQueue(rest);
      setIsAutoPlay(false);
      loadSong(next, [next], 0);
      return;
    }
    const n = getNextIndex();
    if (n !== -1) loadSong(pl[n], pl, n);
    else if (loopRef.current === 'playlist' && pl.length > 0) {
      shuffleHistRef.current = [];
      loadSong(pl[0], pl, 0);
    }
  }, [loadSong, getNextIndex]);

  const playPrev = useCallback(() => {
    const pl = plRef.current;
    const idx = idxRef.current;
    if (idx > 0) loadSong(pl[idx - 1], pl, idx - 1);
    else ytRef.current?.seekTo(songRef.current?.startTime ?? 0, true);
  }, [loadSong]);

  const stopPlayer = useCallback(() => {
    playbackRequestedRef.current = false;
    generationRef.current++;
    endingRef.current = true;
    playbackRef.current = { ready: false, generation: generationRef.current };
    pendRef.current = null;
    endRef.current = null;
    queueRef.current = [];
    clearMon();
    clearLoadTimer();
    recoveryRef.current.cancel();
    ytRef.current?.pauseVideo();
    silentAudioRef.current?.pause();
    setPlayerError('');
    setIsPlaying(false);
    setCurrentSong(null);
    setCurrentPlaylist([]);
    setCurrentIndex(0);
    setShowPlayer(false);
    setQueue([]);
    setIsAutoPlay(false);
    songRef.current = null;
    plRef.current = [];
    idxRef.current = 0;
    shuffleHistRef.current = [];
    updateMediaSession(null, false);
    releaseWakeLock();
    if ('mediaSession' in navigator)
      navigator.mediaSession.playbackState = 'none';
  }, [updateMediaSession, releaseWakeLock]);

  const seekRelative = useCallback((s) => {
    const p = ytRef.current;
    const song = songRef.current;
    if (!p || !song) return;
    try {
      const t = p.getCurrentTime?.() ?? song.startTime;
      p.seekTo(
        Math.max(song.startTime, Math.min(song.endTime - 1, t + s)),
        true
      );
    } catch {}
  }, []);

  const changeVolume = useCallback((v) => {
    const c = clampVolume(v, DEFAULT_VOLUME);
    setVolumeState(c);
    volRef.current = c;
    try {
      localStorage.setItem('uta_volume', String(c));
    } catch {}
    const p = ytRef.current;
    if (p) {
      if (recoveryRef.current.active) p.setVolume(0);
      else applyPlayerVolume(p, c, songRef.current);
    }
  }, []);

  const updateSongVolume = useCallback((id, value) => {
    const volumePercent = clampSongVolume(value);
    const update = (song) =>
      song.id === id ? { ...song, volumePercent } : song;
    plRef.current = plRef.current.map(update);
    queueRef.current = queueRef.current.map(update);
    setCurrentPlaylist(plRef.current);
    setQueue(queueRef.current);
    setHistory((prev) =>
      prev.map((entry) => ({ ...entry, song: update(entry.song) }))
    );
    if (pendRef.current) {
      pendRef.current = {
        ...pendRef.current,
        song: update(pendRef.current.song),
        playlist: pendRef.current.playlist.map(update),
      };
    }
    if (songRef.current?.id === id) {
      songRef.current = update(songRef.current);
      setCurrentSong(songRef.current);
      if (ytRef.current && readyRef.current) {
        if (recoveryRef.current.active) ytRef.current.setVolume(0);
        else applyPlayerVolume(ytRef.current, volRef.current, songRef.current);
      }
    }
  }, []);

  const pauseForPreview = useCallback(() => {
    playbackRequestedRef.current = false;
    recoveryRef.current.setPaused(true);
    // Invalidate a related-song request that might otherwise restart playback.
    generationRef.current++;
    clearMon();
    clearLoadTimer();
    isPlayRef.current = false;
    setIsPlaying(false);
    if (pendRef.current) pendRef.current = { ...pendRef.current, paused: true };
    ytRef.current?.pauseVideo();
    if (ytRef.current && readyRef.current && !recoveryRef.current.active)
      applyPlayerVolume(ytRef.current, volRef.current, songRef.current);
    silentAudioRef.current?.pause();
    updateMediaSession(songRef.current, false);
  }, [updateMediaSession]);

  const addToQueue = useCallback(
    (song) => setQueue((prev) => [...prev, song]),
    []
  );
  const removeFromQueue = useCallback(
    (i) => setQueue((prev) => prev.filter((_, j) => j !== i)),
    []
  );
  const clearQueue = useCallback(() => setQueue([]), []);

  // ── キーボードショートカット ────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      const target = document.activeElement;
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        target?.closest(
          'input, textarea, select, button, [contenteditable="true"], [role="dialog"]'
        )
      )
        return;
      if (!songRef.current) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          seekRelative(e.shiftKey ? 30 : 5);
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          seekRelative(e.shiftKey ? -30 : -5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(volRef.current + 10);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(volRef.current - 10);
          break;
        case 'n':
          e.preventDefault();
          playNext();
          break;
        case 'p':
          e.preventDefault();
          playPrev();
          break;
        case 'm':
          e.preventDefault();
          changeVolume(volRef.current === 0 ? DEFAULT_VOLUME : 0);
          break;
        case 's':
          e.preventDefault();
          setShuffle((x) => !x);
          break;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [togglePlay, seekRelative, changeVolume, playNext, playPrev]);

  const onPlayerReady = useCallback(
    (player) => {
      ytRef.current = player;
      readyRef.current = true;
      player.setVolume(getEffectiveVolume(volRef.current, songRef.current));
      if (pendRef.current) {
        const { song, playlist, index, paused } = pendRef.current;
        pendRef.current = null;
        if (paused) {
          endRef.current = song.endTime;
          player.cueVideoById({
            videoId: song.videoId,
            startSeconds: song.startTime,
            endSeconds: song.endTime,
          });
        } else adMitigation(player, song);
        setCurrentPlaylist(playlist);
        setCurrentIndex(index);
        plRef.current = playlist;
        idxRef.current = index;
        setIsPlaying(!paused);
        if (!paused) startMon();
        updateMediaSession(song, !paused);
        if (!paused) playSilentAudio();
      }
    },
    [adMitigation, startMon, updateMediaSession, playSilentAudio]
  );

  const onPlayerStateChange = useCallback(
    (state) => {
      if (!songRef.current) return;
      if (recoveryRef.current.active) {
        recoveryRef.current.onStateChange(state);
        return;
      }
      if (state === 1) {
        const player = ytRef.current,
          song = songRef.current;
        if (extractVideoId(player?.getVideoUrl?.() || '') === song.videoId) {
          // No dependency on a background timer having ticked before native ENDED.
          playbackRef.current.started = true;
          const time = player.getCurrentTime?.();
          if (time >= song.startTime - 0.5 && time < song.endTime)
            playbackRef.current.ready = true;
        }
        setIsPlaying(true);
        if (endRef.current) startMon();
        updateMediaSession(songRef.current, true);
      } else if (state === 2) {
        setIsPlaying(false);
        clearMon();
        updateMediaSession(songRef.current, false);
      } else if (state === 0) {
        if (
          extractVideoId(ytRef.current?.getVideoUrl?.() || '') ===
          songRef.current.videoId
        )
          handleEndRef.current?.(true);
      }
    },
    [startMon, updateMediaSession]
  );

  const onPlayerError = useCallback(
    (code) => {
      const player = ytRef.current;
      clearLoadTimer();
      if (
        player &&
        playbackRequestedRef.current &&
        recoveryRef.current.retry(code, player, {
          onRecovered: () => {
            playbackRef.current.ready = true;
            playbackRef.current.started = true;
            applyPlayerVolume(player, volRef.current, songRef.current);
            setIsPlaying(true);
            startMon();
            updateMediaSession(songRef.current, true);
          },
          onFailed: () => onPlayerError(),
        })
      ) {
        playbackRef.current.ready = false;
        playbackRef.current.started = false;
        return;
      }
      recoveryRef.current.cancel();
      playbackRequestedRef.current = false;
      player?.pauseVideo();
      clearMon();
      clearLoadTimer();
      setIsPlaying(false);
      playbackRef.current.ready = false;
      setPlayerError(
        '動画を再生できません。YouTubeでの公開状態や接続を確認してください。'
      );
    },
    [startMon, updateMediaSession]
  );

  const onPlayerDestroy = useCallback((player) => {
    if (ytRef.current !== player) return;
    clearMon();
    clearLoadTimer();
    recoveryRef.current.cancel();
    ytRef.current = null;
    readyRef.current = false;
  }, []);

  useEffect(
    () => () => {
      clearMon();
      clearLoadTimer();
      recoveryRef.current.cancel();
      silentAudioRef.current?.pause();
      releaseWakeLock();
    },
    [releaseWakeLock]
  );

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        currentPlaylist,
        currentIndex,
        isPlaying,
        showPlayer,
        setShowPlayer,
        loopMode,
        setLoopMode,
        shuffle,
        setShuffle,
        volume,
        changeVolume,
        updateSongVolume,
        pauseForPreview,
        history,
        queue,
        addToQueue,
        removeFromQueue,
        clearQueue,
        playSong,
        togglePlay,
        playNext,
        playPrev,
        stopPlayer,
        loadSong,
        onPlayerReady,
        onPlayerStateChange,
        onPlayerError,
        onPlayerDestroy,
        seekRelative,
        ytRef,
        isAutoPlay,
        playbackRef,
        playerError,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
