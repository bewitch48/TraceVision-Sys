import { useEffect, useRef } from 'react';

/**
 * GrainLightBackground - 白色系动态颗粒感背景
 * 流动噪点场 + 光尘粒子 + 有机波浪网格 + 柔和光晕
 * 适合浅色科技学术风界面
 */
export default function LightBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    /* ── 噪声生成器（简化 Perlin） ── */
    const perm: number[] = [];
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

    function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a: number, b: number, t: number) { return a + t * (b - a); }
    function grad(hash: number, x: number, y: number) {
      const h = hash & 3;
      const u = h < 2 ? x : -x;
      const v = h < 2 ? y : (h === 2 ? y : -y);
      return h & 1 ? -u + v : u + v;
    }
    function noise(x: number, y: number) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = fade(xf);
      const v = fade(yf);
      const aa = perm[perm[X] + Y];
      const ab = perm[perm[X] + Y + 1];
      const ba = perm[perm[X + 1] + Y];
      const bb = perm[perm[X + 1] + Y + 1];
      return lerp(
        lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
        lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
        v
      );
    }

    /* ── 光尘粒子 ── */
    const dustParticles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; pulse: number; pulseSpeed: number;
    }> = [];
    for (let i = 0; i < 40; i++) {
      dustParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.15 - 0.05,
        size: 1.5 + Math.random() * 3,
        opacity: 0.04 + Math.random() * 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      });
    }

    /* ── 飘浮光斑 ── */
    const blobs: Array<{
      x: number; y: number; vx: number; vy: number;
      radius: number; opacity: number;
    }> = [];
    for (let i = 0; i < 5; i++) {
      blobs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 100 + Math.random() * 200,
        opacity: 0.012 + Math.random() * 0.015,
      });
    }

    let time = 0;
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 120;
    grainCanvas.height = 120;
    const gCtx = grainCanvas.getContext('2d')!;

    /* ── 主循环 ── */
    const draw = () => {
      time += 0.003;
      ctx.clearRect(0, 0, w, h);

      // 纯白底色
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, w, h);

      // ── 有机波浪网格 ──
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.03)';
      ctx.lineWidth = 0.6;
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath();
        for (let y = 0; y < h; y += 4) {
          const nx = x + noise(y * 0.008 + time, x * 0.005) * 30;
          if (y === 0) ctx.moveTo(nx, y);
          else ctx.lineTo(nx, y);
        }
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 60) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 4) {
          const ny = y + noise(x * 0.008 + time, y * 0.005 + 100) * 30;
          if (x === 0) ctx.moveTo(x, ny);
          else ctx.lineTo(x, ny);
        }
        ctx.stroke();
      }

      // ── 飘浮光斑 ──
      blobs.forEach((blob) => {
        blob.x += blob.vx;
        blob.y += blob.vy;
        if (blob.x < -blob.radius) blob.x = w + blob.radius;
        if (blob.x > w + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = h + blob.radius;
        if (blob.y > h + blob.radius) blob.y = -blob.radius;

        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius
        );
        gradient.addColorStop(0, `rgba(37, 99, 235, ${blob.opacity})`);
        gradient.addColorStop(0.5, `rgba(59, 130, 246, ${blob.opacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── 光尘粒子 ──
      dustParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size * 2
        );
        gradient.addColorStop(0, `rgba(37, 99, 235, ${currentOpacity})`);
        gradient.addColorStop(0.4, `rgba(59, 130, 246, ${currentOpacity * 0.3})`);
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── 粒子连线（附近粒子） ──
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.025)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < dustParticles.length; i++) {
        for (let j = i + 1; j < dustParticles.length; j++) {
          const dx = dustParticles[i].x - dustParticles[j].x;
          const dy = dustParticles[i].y - dustParticles[j].y;
          const dist = dx * dx + dy * dy;
          if (dist < 18000) {
            ctx.beginPath();
            ctx.moveTo(dustParticles[i].x, dustParticles[i].y);
            ctx.lineTo(dustParticles[j].x, dustParticles[j].y);
            ctx.stroke();
          }
        }
      }

      // ── 动态噪点颗粒纹理 ──
      const grainSize = 120;
      const imageData = gCtx.createImageData(grainSize, grainSize);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 15;
        data[i] = 37 + v;
        data[i + 1] = 99 + v;
        data[i + 2] = 235 + v * 0.5;
        data[i + 3] = 4;
      }
      gCtx.putImageData(imageData, 0, 0);
      ctx.globalAlpha = 0.4 + Math.sin(time * 2) * 0.15;
      ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat')!;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}
