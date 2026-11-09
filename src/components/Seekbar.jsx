import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { secondsToTimestamp } from '../utils/youtube';

export default function Seekbar({ song, ytRef, size = 'normal' }) {
  const { playbackRef } = usePlayer();
  const [position, setPosition] = useState(0);
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);
  const lastSeek = useRef(0);
  const duration =
    Math.max(0, Number(song?.endTime) - Number(song?.startTime)) || 0;
  useEffect(() => {
    setPosition(0);
    setReady(false);
    dragging.current = false;
    const update = () => {
      const available = Boolean(playbackRef.current.ready && duration > 0);
      setReady(available);
      if (!available) {
        setPosition(0);
        return;
      }
      if (dragging.current || Date.now() - lastSeek.current < 600) return;
      try {
        const elapsed =
          ytRef.current?.getCurrentTime?.() - Number(song.startTime);
        setPosition(
          Number.isFinite(elapsed)
            ? Math.max(0, Math.min(duration, elapsed))
            : 0
        );
      } catch {
        setPosition(0);
      }
    };
    update();
    const timer = setInterval(update, 150);
    return () => clearInterval(timer);
  }, [song, duration, ytRef, playbackRef]);
  const seek = (value) => {
    const seconds = Number(value);
    setPosition(seconds);
    lastSeek.current = Date.now();
    ytRef.current?.seekTo(
      Number(song.startTime) + Math.min(seconds, Math.max(0, duration - 0.1)),
      true
    );
  };
  return (
    <div className={`seekbar seekbar-${size}`}>
      <input
        type="range"
        aria-label="再生位置"
        aria-valuetext={`${secondsToTimestamp(position)} / ${secondsToTimestamp(duration)}`}
        min="0"
        max={duration || 1}
        step="0.1"
        value={position}
        disabled={!ready}
        style={{
          '--progress': `${duration ? (position / duration) * 100 : 0}%`,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          seek(e.currentTarget.value);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onChange={(e) => seek(e.target.value)}
      />
      <div className="seekbar-times">
        <span>{secondsToTimestamp(position)}</span>
        <span>{!ready ? '再生準備中' : ''}</span>
        <span>{secondsToTimestamp(duration)}</span>
      </div>
    </div>
  );
}
