export function createLongPressGesture({ onLongPress, onPressChange = () => {}, delay = 520, tolerance = 7, schedule = setTimeout, clear = clearTimeout }) {
  let timer, start, suppressClick = false;
  const cancel = () => { if (timer != null) clear(timer); timer = null; start = null; onPressChange(false); };
  return {
    start(event) {
      cancel();
      if (event.button !== 0 || event.isPrimary === false) return;
      suppressClick = false;
      start = { x: event.clientX, y: event.clientY };
      const target = event.currentTarget;
      onPressChange(true);
      timer = schedule(() => { timer = null; suppressClick = true; onPressChange(false); onLongPress(target); }, delay);
    },
    move(event) {
      if (start && (Math.abs(event.clientX - start.x) > tolerance || Math.abs(event.clientY - start.y) > tolerance)) {
        suppressClick = true;
        cancel();
      }
    },
    end: cancel,
    cancel() { suppressClick = true; cancel(); },
    consumeClick() { const result = suppressClick; suppressClick = false; return result; },
    dispose: cancel,
  };
}
