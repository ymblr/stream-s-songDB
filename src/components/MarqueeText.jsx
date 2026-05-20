import React, { useRef, useState, useEffect } from 'react';

/**
 * MarqueeText — 電光掲示板風スクロールテキスト
 *
 * テキストがコンテナをはみ出すとき、delay ms 後に横スクロールを開始する。
 * CSS カスタムプロパティ --marquee-dist で移動量を注入し、
 * index.css の @keyframes marquee-scroll で動かす。
 *
 * Props:
 *   text     string   表示するテキスト
 *   style    object   コンテナへの追加スタイル（幅・フォントなど）
 *   className string  コンテナへの追加クラス
 *   delay    number   スクロール開始までの待機時間 ms (default: 1800)
 *   speed    number   スクロール速度 px/s (default: 38)
 *   pauseEnd number   終端での停止時間 s (default: 1.2)
 */
export default function MarqueeText({
  text,
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
  const [active, setActive] = useState(false);

  useEffect(() => {
    // テキストが変わったらアニメをリセット
    setActive(false);
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
        timerRef.current = setTimeout(() => setActive(true), delay);
      }
    };

    // DOM 更新後に計測
    requestAnimationFrame(measure);

    roRef.current?.disconnect();
    roRef.current = new ResizeObserver(measure);
    if (containerRef.current) roRef.current.observe(containerRef.current);

    return () => {
      clearTimeout(timerRef.current);
      roRef.current?.disconnect();
    };
  }, [text, delay]);

  // アニメ時間: 溢れ量 ÷ 速度 = スクロール秒数 + 前後の停止分
  const scrollSec = overflow > 0 ? overflow / speed : 0;
  // 全体の尺: 開始停止(10%) + スクロール(60%) + 終端停止(20%) + 復帰(10%)
  // scrollSec が 60% に相当するので全体 = scrollSec / 0.6
  const totalDuration = Math.max(4, scrollSec / 0.6);

  const shouldAnimate = active && overflow > 0;

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
          // CSS カスタムプロパティで移動量を渡す
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
