import React, { useRef, useState, useEffect } from 'react';

/**
 * MarqueeText — 電光掲示板スクロール
 * active=false → overflow:hidden + ellipsis（静止）
 * active=true  → はみ出し検知 → delay 後にスクロール開始
 */
export default function MarqueeText({ text, active = true, style, className, delay = 1800, speed = 38 }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const timerRef = useRef(null);
  const roRef = useRef(null);
  const [overflow, setOverflow] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(false);
    clearTimeout(timerRef.current);
    if (!active) return;

    const measure = () => {
      if (!containerRef.current || !textRef.current) return;
      const ov = Math.max(0, textRef.current.scrollWidth - containerRef.current.clientWidth);
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

    return () => { clearTimeout(timerRef.current); roRef.current?.disconnect(); };
  }, [text, active, delay]);

  // active=false → シンプルな ellipsis
  if (!active) {
    return (
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', ...style }} className={className}>
        {text}
      </div>
    );
  }

  const totalDuration = overflow > 0 ? Math.max(4, (overflow / speed) / 0.6) : 4;
  const shouldAnimate = animating && overflow > 0;

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', ...style }} className={className}>
      <span
        ref={textRef}
        style={{
          display: 'inline-block', whiteSpace: 'nowrap',
          '--marquee-dist': `-${overflow}px`,
          animation: shouldAnimate ? `marquee-scroll ${totalDuration.toFixed(2)}s linear infinite` : 'none',
          willChange: shouldAnimate ? 'transform' : 'auto',
        }}
      >
        {text}
      </span>
    </div>
  );
}
