import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface MarqueeTextProps {
  text?: string;
  items?: string[];
  speed?: number;
  direction?: 'left' | 'right';
  className?: string;
  separator?: string;
}

/**
 * MarqueeText - 动态滚动字体组件
 * 支持单条文本或数组滚动，使用 GSAP 实现流畅的无限循环动画
 */
export default function MarqueeText({
  text,
  items,
  speed = 30,
  direction = 'left',
  className = '',
  separator = '  ✦  ',
}: MarqueeTextProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const content = items ? items.join(separator) + separator : text || '';

  useEffect(() => {
    if (!trackRef.current || !containerRef.current) return;

    const track = trackRef.current;
    const trackWidth = track.scrollWidth / 2;

    // GSAP 无限滚动
    const tween = gsap.to(track, {
      x: direction === 'left' ? -trackWidth : trackWidth,
      duration: speed,
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((x: number) => {
          const mod = trackWidth;
          return direction === 'left'
            ? ((x % mod) - mod) % mod
            : ((x % mod) + mod) % mod;
        }),
      },
    });

    return () => {
      tween.kill();
    };
  }, [speed, direction, content]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap ${className}`}
    >
      <div ref={trackRef} className="inline-flex">
        {/* 复制多份以实现无缝循环 */}
        <span className="inline-flex-shrink-0">{content}</span>
        <span className="inline-flex-shrink-0">{content}</span>
        <span className="inline-flex-shrink-0">{content}</span>
        <span className="inline-flex-shrink-0">{content}</span>
      </div>
    </div>
  );
}
