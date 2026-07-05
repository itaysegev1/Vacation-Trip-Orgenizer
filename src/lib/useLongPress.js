import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { TIMINGS } from './tripConfig';

/**
 * SwipeableRow publishes its long-press canceller here so that the instant a
 * horizontal drag begins (Framer's onDragStart, ~3px) the in-flight long-press
 * is cancelled — no pixel-threshold guessing. Null outside a SwipeableRow.
 */
export const SwipeCancelContext = createContext(null);

/**
 * Detect a long-press (default 500ms) on touch AND mouse via Pointer Events.
 * Cancels if the pointer moves beyond `moveTolerance` px (so vertical scrolling
 * never triggers it) and the moment an enclosing SwipeableRow starts dragging.
 *
 * Returns handlers to spread on the target element. `onClickCapture` swallows
 * the click that fires on release after a long-press.
 */
export function useLongPress(
  onLongPress,
  { delay = TIMINGS.longPressDelayMs, moveTolerance = TIMINGS.longPressMoveTolerancePx } = {}
) {
  const timer = useRef(null);
  const origin = useRef(null);
  const fired = useRef(false);
  const swipeCancel = useContext(SwipeCancelContext);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Register our canceller so a starting drag in the parent SwipeableRow kills it.
  useEffect(() => {
    if (!swipeCancel) return undefined;
    swipeCancel.current = cancel;
    return () => {
      if (swipeCancel.current === cancel) swipeCancel.current = null;
    };
  }, [cancel, swipeCancel]);

  // Always clear an armed timer on unmount (e.g. card filtered/deleted mid-press).
  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return; // primary button only
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      cancel();
      timer.current = setTimeout(() => {
        fired.current = true;
        timer.current = null;
        onLongPress({ x: origin.current.x, y: origin.current.y });
      }, delay);
    },
    [onLongPress, delay, cancel]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!timer.current || !origin.current) return;
      if (
        Math.abs(e.clientX - origin.current.x) > moveTolerance ||
        Math.abs(e.clientY - origin.current.y) > moveTolerance
      ) {
        cancel(); // moved → it's a scroll/swipe, not a long-press
      }
    },
    [cancel, moveTolerance]
  );

  const onClickCapture = useCallback((e) => {
    if (fired.current) {
      e.preventDefault();
      e.stopPropagation();
      fired.current = false;
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture,
  };
}
