import "../components/reactions/ReactionMotion.css";
const running = new WeakMap();

export function popReactionCapsule(element) {
  if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  running.get(element)?.cancel();
  const animation = element.animate([
    { transform: "scale(1)", offset: 0 },
    { transform: "scale(1.12)", offset: .4 },
    { transform: "scale(1)", offset: 1 },
  ], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1.4)" });
  running.set(element, animation);
  animation.onfinish = () => { if (running.get(element) === animation) running.delete(element); };
}
