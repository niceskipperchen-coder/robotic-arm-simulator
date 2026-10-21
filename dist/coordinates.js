/** Planar +Y points away from the viewer, while Three.js +Y is elevation. */
export function worldPoint(x, y, height = 110) {
  return {x, y: height, z: -y};
}
