import test from "node:test";
import assert from "node:assert/strict";
import { createLongPressGesture } from "./longPressGesture.js";

function setup() {
  let timer, opened = 0;
  const gesture = createLongPressGesture({ onLongPress: () => opened++, schedule: (callback, delay) => { assert.equal(delay, 520); timer = callback; return 1; }, clear: () => { timer = null; } });
  const event = { button: 0, clientX: 10, clientY: 10 };
  return { gesture, event, fire: () => timer?.(), opened: () => opened };
}
test("short tap does not open actions; completed hold opens once and suppresses click", () => {
  const s = setup();
  s.gesture.start(s.event); s.gesture.end(); s.fire();
  assert.equal(s.opened(), 0); assert.equal(s.gesture.consumeClick(), false);
  s.gesture.start(s.event); s.fire(); s.gesture.end();
  assert.equal(s.opened(), 1); assert.equal(s.gesture.consumeClick(), true);
  assert.equal(s.gesture.consumeClick(), false);
});
test("scroll, pointer cancellation and unmount cancel pending long press", () => {
  for (const action of ['move', 'cancel', 'dispose']) {
    const s = setup(); s.gesture.start(s.event);
    if (action === 'move') s.gesture.move({ clientX: 10, clientY: 18 }); else s.gesture[action]();
    s.fire(); assert.equal(s.opened(), 0);
  }
});
test("right click and secondary touches never start a hold", () => {
  const s = setup();
  s.gesture.start({ ...s.event, button: 2 }); s.fire();
  s.gesture.start({ ...s.event, isPrimary: false }); s.fire();
  assert.equal(s.opened(), 0);
});
