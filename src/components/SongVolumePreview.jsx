import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import {
  loadYouTubeAPI,
  extractVideoId,
  secondsToTimestamp,
} from '../utils/youtube';
import {
  applyPlayerVolume,
  clampSongVolume,
  getEffectiveVolume,
} from '../utils/volume';
import { PlayIcon, PauseIcon } from './Icons';

export default function SongVolumePreview({
  videoId,
  startTime,
  endTime,
  volumePercent,
  onChange,
  disabled = false,
}) {
  const mainPlayer = usePlayer();
  const masterVolume = mainPlayer?.volume ?? 80;
  const effectiveVolume = getEffectiveVolume(masterVolume, { volumePercent });
  const atLimit = effectiveVolume === 100;
  const [activated, setActivated] = useState(false);
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const playIntentRef = useRef(false);
  const observedContentRef = useRef(false);
  const valid = Boolean(
    videoId &&
    Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    endTime > startTime
  );
  const configRef = useRef(null);
  configRef.current = {
    videoId,
    startTime,
    endTime,
    valid,
    disabled,
    masterVolume,
    volumePercent,
  };

  // Changing a clip never starts a different section without an explicit play.
  useEffect(() => {
    playIntentRef.current = false;
    observedContentRef.current = false;
    setElapsed(0);
    setError('');
    const player = playerRef.current;
    if (player && readyRef.current) {
      player.pauseVideo();
      if (valid)
        player.cueVideoById({
          videoId,
          startSeconds: startTime,
          endSeconds: endTime,
        });
    }
    setStatus('idle');
  }, [videoId, startTime, endTime, valid]);

  useEffect(() => {
    if (!activated || !videoId) return;
    let cancelled = false;
    let player;
    const host = hostRef.current;
    readyRef.current = false;
    loadYouTubeAPI()
      .then(() => {
        if (cancelled || !host) return;
        const mount = document.createElement('div');
        host.appendChild(mount);
        const syncVolume = (target) => {
          const config = configRef.current;
          applyPlayerVolume(target, config.masterVolume, config);
        };
        player = new window.YT.Player(mount, {
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              readyRef.current = true;
              syncVolume(event.target);
              const config = configRef.current;
              if (!config.valid || config.disabled) {
                setStatus('idle');
                return;
              }
              const clip = {
                videoId: config.videoId,
                startSeconds: config.startTime,
                endSeconds: config.endTime,
              };
              if (playIntentRef.current) event.target.loadVideoById(clip);
              else {
                event.target.cueVideoById(clip);
                setStatus('idle');
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const config = configRef.current;
              if (event.data === 1) {
                if (!config.valid || config.disabled) {
                  playerRef.current?.pauseVideo();
                  return;
                }
                mainPlayer?.pauseForPreview?.();
                syncVolume(playerRef.current);
                setStatus('playing');
                setError('');
              } else if (event.data === 2) setStatus('paused');
              else if (event.data === 0) {
                setStatus('ended');
                setElapsed(config.endTime - config.startTime);
              }
            },
            onError: () => {
              if (!cancelled) {
                playIntentRef.current = false;
                setStatus('error');
                setError(
                  'プレビューを再生できません。URLと動画の公開状態を確認してください。'
                );
              }
            },
            onAutoplayBlocked: () => {
              if (!cancelled) {
                setStatus('paused');
                setError('動画内の再生ボタンを押して試聴を開始してください。');
              }
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) {
          setActivated(false);
          setStatus('error');
          setError(
            'YouTubeに接続できませんでした。もう一度再生を押してください。'
          );
        }
      });
    const timer = setInterval(() => {
      const config = configRef.current;
      const current = playerRef.current;
      if (!readyRef.current || !current || !config.valid || config.disabled)
        return;
      try {
        if (
          current.getPlayerState() !== 1 ||
          extractVideoId(current.getVideoUrl()) !== config.videoId
        )
          return;
        const time = current.getCurrentTime();
        if (time >= config.startTime - 0.5 && time < config.endTime)
          observedContentRef.current = true;
        if (!observedContentRef.current) return;
        setElapsed(
          Math.max(
            0,
            Math.min(config.endTime - config.startTime, time - config.startTime)
          )
        );
        if (time >= config.endTime) {
          playIntentRef.current = false;
          current.pauseVideo();
          setStatus('ended');
        }
      } catch {}
    }, 200);
    return () => {
      cancelled = true;
      clearInterval(timer);
      readyRef.current = false;
      playerRef.current = null;
      player?.destroy();
      host?.replaceChildren();
    };
  }, [activated, videoId, mainPlayer?.pauseForPreview]);

  useEffect(() => {
    if (playerRef.current && readyRef.current)
      applyPlayerVolume(playerRef.current, masterVolume, { volumePercent });
  }, [masterVolume, volumePercent]);

  useEffect(() => {
    if (!disabled) return;
    playIntentRef.current = false;
    if (readyRef.current) playerRef.current?.pauseVideo();
  }, [disabled]);

  const play = (restart = false) => {
    if (!valid || disabled) return;
    const player = playerRef.current;
    if (!restart && status === 'playing') {
      playIntentRef.current = false;
      player?.pauseVideo();
      return;
    }
    mainPlayer?.pauseForPreview?.();
    setError('');
    playIntentRef.current = true;
    if (!activated) {
      setStatus('loading');
      setActivated(true);
      return;
    }
    if (!readyRef.current) {
      setStatus('loading');
      return;
    }
    applyPlayerVolume(player, masterVolume, { volumePercent });
    if (
      !restart &&
      status === 'paused' &&
      player.getCurrentTime() >= startTime &&
      player.getCurrentTime() < endTime
    )
      player.playVideo();
    else {
      observedContentRef.current = false;
      setElapsed(0);
      setStatus('loading');
      player.loadVideoById({
        videoId,
        startSeconds: startTime,
        endSeconds: endTime,
      });
    }
  };

  return (
    <section className="editor-section volume-preview">
      <div className="section-heading">
        <span className="section-number">03</span>
        <h3>音量とプレビュー</h3>
        <span>この楽曲だけに適用</span>
      </div>
      <div className="song-volume-heading">
        <label htmlFor="song-volume">楽曲の音量</label>
        <output htmlFor="song-volume">{volumePercent}%</output>
        <button
          type="button"
          className="text-link"
          disabled={disabled || volumePercent === 100}
          onClick={() => onChange(100)}
        >
          元に戻す
        </button>
      </div>
      <input
        id="song-volume"
        className="song-volume-slider"
        type="range"
        min="0"
        max="200"
        step="1"
        value={volumePercent}
        disabled={disabled}
        aria-valuetext={`音量補正${volumePercent}%、再生出力${effectiveVolume}%`}
        onChange={(event) =>
          onChange(clampSongVolume(Number(event.target.value)))
        }
      />
      <div className="song-volume-scale">
        <span>0% · ミュート</span>
        <span>100% · 補正なし</span>
        <span>200%</span>
      </div>
      <p className="field-hint">
        プレイヤーの音量（{masterVolume}
        %）を基準に、小さくも大きくも調整できます。保存すると通常再生にも反映されます。
      </p>
      <p className="preview-output">
        再生出力 <strong>{effectiveVolume}%</strong>
        {atLimit && <span>YouTubeの上限</span>}
      </p>
      <p className="field-hint">
        YouTubeの出力上限は100%です。
        {atLimit
          ? '現在は上限に達しているため、補正を上げてもこれ以上大きくなりません。'
          : '元の動画の最大音量を超える増幅はできません。'}
      </p>
      {masterVolume === 0 && (
        <p className="field-hint">
          現在プレイヤーがミュート中です。試聴するにはプレイヤー側の音量を上げてください。
        </p>
      )}
      {activated && videoId && (
        <div ref={hostRef} className="volume-preview-video" />
      )}
      <div className="volume-preview-controls">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => play()}
          disabled={disabled || !valid || status === 'loading'}
        >
          {status === 'playing' ? (
            <PauseIcon size={15} />
          ) : (
            <PlayIcon size={15} />
          )}
          {status === 'playing'
            ? '一時停止'
            : status === 'loading'
              ? '準備中…'
              : status === 'paused'
                ? '試聴を再開'
                : 'プレビューを再生'}
        </button>
        {activated && (
          <button
            type="button"
            className="text-link"
            disabled={disabled || !valid || status === 'loading'}
            onClick={() => play(true)}
          >
            先頭から
          </button>
        )}
        <span className="preview-time">
          {secondsToTimestamp(elapsed)} /{' '}
          {secondsToTimestamp(valid ? endTime - startTime : 0)}
        </span>
      </div>
      {!valid && (
        <p className="field-hint">
          有効な配信URL・開始時刻・終了時刻を入力すると試聴できます。
        </p>
      )}
      <p className="field-hint">
        試聴中は通常再生を一時停止します。編集画面を閉じると試聴も停止します。
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
