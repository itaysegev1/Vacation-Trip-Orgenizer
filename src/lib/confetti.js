import confetti from 'canvas-confetti';
import { prefersReducedMotion } from './motionVariants';
import { EFFECTS, FEATURES } from './tripConfig';

const COLORS = EFFECTS.confettiColors;

/** Subtle, on-brand confetti burst from the lower-center of the screen. */
export function fireConfetti() {
  if (!FEATURES.confetti || prefersReducedMotion) return;
  confetti({
    particleCount: 60,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.72 },
    colors: COLORS,
    scalar: 0.9,
    ticks: 160,
    gravity: 1.1,
    disableForReducedMotion: true,
  });
}

/** Bigger celebration (e.g. a fully-planned day) — two side bursts. */
export function celebrate() {
  if (!FEATURES.confetti || prefersReducedMotion) return;
  const base = { colors: COLORS, scalar: 0.95, ticks: 200, disableForReducedMotion: true };
  confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } });
  confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } });
}
