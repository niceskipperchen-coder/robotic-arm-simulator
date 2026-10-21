/** Advance one revolute joint subject to a speed ceiling (degrees/second). */
export function stepJoint(current, target, speed, dt, wrap = false) {
  let delta = target - current;
  if (wrap) delta = ((delta + 540) % 360) - 180;
  const limit = Math.max(0, speed) * Math.max(0, dt);
  const next = current + Math.sign(delta) * Math.min(Math.abs(delta), limit);
  return wrap ? ((next + 540) % 360) - 180 : next;
}
