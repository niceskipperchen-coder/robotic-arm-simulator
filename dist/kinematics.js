const rad=Math.PI/180;
export function forward(shoulder,elbow,l1,l2){
 const a=shoulder*rad,b=(shoulder+elbow)*rad;
 return {jointX:l1*Math.cos(a),jointY:l1*Math.sin(a),x:l1*Math.cos(a)+l2*Math.cos(b),y:l1*Math.sin(a)+l2*Math.sin(b)};
}
export function inverse(x,y,l1,l2,sign=1){
 if(![x,y,l1,l2].every(Number.isFinite)||l1<=0||l2<=0)return null;
 const c=(x*x+y*y-l1*l1-l2*l2)/(2*l1*l2);
 if(c>1+1e-10||c< -1-1e-10)return null;
 const b=(sign<0?-1:1)*Math.acos(Math.max(-1,Math.min(1,c)));
 const a=Math.atan2(y,x)-Math.atan2(l2*Math.sin(b),l1+l2*Math.cos(b));
 return {shoulder:((a/rad+540)%360)-180,elbow:b/rad};
}
