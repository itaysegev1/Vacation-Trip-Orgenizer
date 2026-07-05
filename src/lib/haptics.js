// Lightweight haptic feedback via the Vibration API.
// Works on Android/Chrome; a graceful no-op on iOS Safari (no web vibration)
// and anywhere the API is missing. Gated by settings.haptics.enabled.
import config from '../config/tripConfig';

const PATTERNS = {
  light: 15,
  medium: 30,
  heavy: 50,
  success: [15, 40, 20],
  warning: [30, 60],
};

export function triggerHaptic(type = 'light') {
  if (!config.settings.haptics.enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[type] ?? PATTERNS.light);
  } catch {
    /* ignore */
  }
}
