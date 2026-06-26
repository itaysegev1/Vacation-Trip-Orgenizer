import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

const COLORS = ['#F4A6B8', '#FCD3DE', '#FFE4EC', '#EC8FA6', '#F8C7D4'];

/**
 * Ambient falling-sakura background drawn on a single canvas.
 * Low count + transform-only motion → cheap on phones. Renders nothing
 * under prefers-reduced-motion.
 */
export default function PetalField({ count = 14 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let w = 0;
    let h = 0;
    const petals = [];

    const rand = (a, b) => a + Math.random() * (b - a);

    const make = (fromTop = false) => ({
      x: rand(0, w || window.innerWidth),
      y: fromTop ? rand(-40, -10) : rand(-(h || window.innerHeight), h || window.innerHeight),
      size: rand(7, 15),
      speed: rand(0.25, 0.75),
      sway: rand(0.4, 1.3),
      swayPhase: rand(0, Math.PI * 2),
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.012, 0.012),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: rand(0.22, 0.55),
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Re-spread petals into the new width so they don't bunch/clip after
      // rotation or the mobile URL-bar collapse changing the viewport.
      for (const p of petals) p.x = rand(0, w);
    };

    const drawPetal = (p) => {
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -s / 2);
      ctx.bezierCurveTo(s / 2, -s / 2, s / 2, s / 2, 0, s / 2);
      ctx.bezierCurveTo(-s / 2, s / 2, -s / 2, -s / 2, 0, -s / 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of petals) {
        p.y += p.speed;
        p.swayPhase += 0.01;
        p.x += Math.sin(p.swayPhase) * p.sway * 0.5;
        p.rot += p.rotSpeed;
        if (p.y > h + 20) Object.assign(p, make(true));
        drawPetal(p);
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    for (let i = 0; i < count; i++) petals.push(make());
    tick();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count, reduced]);

  if (reduced) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0 }}
    />
  );
}
