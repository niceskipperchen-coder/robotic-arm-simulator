/** Simplified parallel-jaw attachment: alignment tolerance in millimetres. */
export function grasp(objects, tool) {
  const candidates=objects.filter(o=>Math.hypot(o.x-tool.x,o.y-tool.y)<=8 && Math.abs(o.z-tool.z)<=6);
  candidates.sort((a,b)=>Math.hypot(a.x-tool.x,a.y-tool.y,a.z-tool.z)-Math.hypot(b.x-tool.x,b.y-tool.y,b.z-tool.z));
  return candidates[0]?.id ?? null;
}
/** Gravity in mm/s², with an inelastic floor contact; no block/block contacts. */
export function updateObjects(objects, heldId, tool, dt) {
  return objects.map(o=>{
    if(o.id===heldId)return {...o,x:tool.x,y:tool.y,z:tool.z,vz:0};
    const vz=o.vz-9810*Math.max(0,dt),z=o.z+vz*Math.max(0,dt),floor=o.size/2;
    return {...o,z:Math.max(floor,z),vz:z<=floor?0:vz};
  });
}
