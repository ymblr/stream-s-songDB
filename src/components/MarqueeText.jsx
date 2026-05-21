import React, { useRef, useState, useEffect } from 'react';

/**
 * MarqueeText — 電光掲示板風スクロールテキスト
 *
 * Props:
 *   text     string   表示するテキスト
 *   active   boolean  true のときだけスクロール (default: true)
 *                     false のとき: overflow hidden + text-overflow: ellipsis で切り捨て
 *   style    object   コンテナへの追加スタイル
 *   className string
 *   delay    number   スクロール開始までの待機時間 ms (default: 1800)
 *   speed    number   スクロール速度 px/s (default: 38)
 */
export default function MarqueeText({
  text,
  active = true,
  style,
  className,
  delay = 1800,
  speed = 38,
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const timerRef = useRef(null);
  const roRef = useRef(null);

  const [overflow, setOverflow] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // active=false のときはアニメしない（ellipsis 表示）
    if (!active) {
      setAnimating(false);
      clearTimeout(timerRef.current);
      return;
    }

    setAnimating(false);
    clearTimeout(timerRef.current);

    const measure = () => {
      if (!containerRef.current || !textRef.current) return;
      const ov = Math.max(
        0,
        textRef.current.scrollWidth - containerRef.current.clientWidth
      );
      setOverflow(ov);
      if (ov > 0) {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setAnimating(true), delay);
      }
    };

    requestAnimationFrame(measure);

    roRef.current?.disconnect();
    roRef.current = new ResizeObserver(measure);
    if (containerRef.current) roRef.current.observe(containerRef.current);

    return () => {
      clearTimeout(timerRef.current);
      roRef.current?.disconnect();
    };
  }, [text, active, delay]);

  const scrollSec = overflow > 0 ? overflow / speed : 0;
  const totalDuration = Math.max(4, scrollSec / 0.6);

  // active=false → ellipsis スタイル
  if (!active) {
    return (
      <div
        style={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          ...style,
        }}
        className={className}
      >
        {text}
      </div>
    );
  }

  const shouldAnimate = animating && overflow > 0;

  return (
    <div
      ref={containerRef}
      style={{ overflow: 'hidden', ...style }}
      className={className}
    >
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          '--marquee-dist': `-${overflow}px`,
          animation: shouldAnimate
            ? `marquee-scroll ${totalDuration.toFixed(2)}s linear infinite`
            : 'none',
          willChange: shouldAnimate ? 'transform' : 'auto',
        }}
      >
        {text}
      </span>
    </div>
  );
}
