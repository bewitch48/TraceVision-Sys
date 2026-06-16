import { useEffect, useRef } from 'react';

/**
 * GrainBackground - 颗粒感动态背景
 * 使用 Canvas 2D 绘制电影级颗粒噪点 + 缓慢流动光效
 */
export default function GrainBackground() {
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

    // 创建颗粒噪点
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    const grainCtx = grainCanvas.getContext('2d')!;

    const drawGrain = () => {
      const imgData = grainCtx.createImageData(256, 256);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;     // R
        data[i + 1] = v; // G
        data[i + 2] = v; // B
        data[i + 3] = 8; // A - 非常淡
      }
      grainCtx.putImageData(imgData, 0, 0);
    };

    // 浮动粒子
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      radius: number; opacity: number; color: string;
    }> = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1 + Math.random() * 2,
        opacity: 0.03 + Math.random() * 0.06,
        color: Math.random() > 0.5 ? '#2563EB' : '#3B82F6',
      });
    }

    let time = 0;

    const draw = () => {
      time += 0.005;

      // 底色 - 深蓝渐变
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0B1220');
      grad.addColorStop(0.5, '#0F172A');
      grad.addColorStop(1, '#131C31');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 缓慢流动的光晕
      const glowGrad = ctx.createRadialGradient(
        w * (0.3 + Math.sin(time) * 0.2), h * (0.4 + Math.cos(time * 0.7) * 0.2), 0,
        w * (0.3 + Math.sin(time) * 0.2), h * (0.4 + Math.cos(time * 0.7) * 0.2), w * 0.5
      );
      glowGrad.addColorStop(0, 'rgba(37, 99, 235, 0.08)');
      glowGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.03)');
      glowGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // 第二光晕
      const glow2 = ctx.createRadialGradient(
        w * (0.7 + Math.cos(time * 0.8) * 0.15), h * (0.6 + Math.sin(time * 0.5) * 0.15), 0,
        w * (0.7 + Math.cos(time * 0.8) * 0.15), h * (0.6 + Math.sin(time * 0.5) * 0.15), w * 0.4
      );
      glow2.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
      glow2.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, w, h);

      // 网格线
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.03)';
      ctx.lineWidth = 1;
      const gridOff = (time * 10) % 60;
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = gridOff; y < h; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // 颗粒噪点
      drawGrain();
      ctx.drawImage(grainCanvas, 0, 0, w, h);

      // 浮动粒子
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // 连接线
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.02)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
