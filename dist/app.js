import {forward,inverse} from './kinematics.js';
import {stepJoint} from './motion.js';
import {grasp,updateObjects} from './manipulation.js';
import {createRobotView} from './view3d.js';
const $=id=>document.getElementById(id),canvas=$('scene');
let view;
try {view=createRobotView(canvas);} catch(error) {
  const message=document.createElement('p');message.className='webgl-error';message.textContent='The 3D workspace needs WebGL. Enable hardware acceleration in your browser and reload.';canvas.after(message);console.error('3D renderer initialization failed:',error);
}
const initial={shoulder:45,elbow:-70,l1:180,l2:140,height:100};
const initialObjects=()=>[
  {id:'A',x:180,y:80,z:12,vz:0,size:24,color:0x6ca8d9},
  {id:'B',x:100,y:190,z:12,vz:0,size:24,color:0xde8b74},
  {id:'C',x:240,y:-30,z:12,vz:0,size:24,color:0x8fbd8b}
];
let state={...initial},goal={shoulder:45,elbow:-70},goalHeight=100;
let mode='joint',sign=-1,demo=false,phase=0,target=null,points=[],last=0;
let objects=initialObjects(),heldId=null,closed=false,sequence=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const tool=()=>({...forward(state.shoulder,state.elbow,state.l1,state.l2),z:state.height});
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function setMode(next){mode=next;for(const name of ['joint','target']){$(name+'Mode').classList.toggle('active',name===mode);$(name+'Mode').setAttribute('aria-pressed',String(name===mode));$(name+'Controls').hidden=name!==mode;}}
function stopDemo(){demo=false;sequence=null;$('demo').textContent='Run circle';$('pickDemo').textContent='Run pick-and-place';}
function moveTo(x,y,announce=true){
 const angles=inverse(x,y,state.l1,state.l2,sign);target={x,y,valid:!!angles};
 if(!angles){if(announce)status('Target is outside the XY reach envelope.',true);return false;}
 goal=angles;$('targetX').value=Math.round(x);$('targetY').value=Math.round(y);
 if(announce)status('Moving to target');return true;
}
function openGripper(){closed=false;heldId=null;}
function closeGripper(){closed=true;if(!heldId)heldId=grasp(objects,tool());return heldId;}
function resize(){view?.resize();}
function draw(){
 const p=tool();
 view?.update(state,target,points,{trail:$('trail').checked,envelope:$('envelope').checked,objects,heldId,closed});
 $('readX').innerHTML=p.x.toFixed(1)+' <small>mm</small>';$('readY').innerHTML=p.y.toFixed(1)+' <small>mm</small>';
 $('readHeight').innerHTML=state.height.toFixed(1)+' <small>mm</small>';
 $('readError').innerHTML=target?.valid?Math.hypot(target.x-p.x,target.y-p.y,goalHeight-state.height).toFixed(2)+' <small>mm</small>':'— <small>mm</small>';
 $('readConfig').textContent=Math.abs(state.elbow)<.05?'Straight / singular':Math.abs(Math.abs(state.elbow)-180)<.05?'Folded / singular':state.elbow>=0?'Elbow positive':'Elbow negative';
 for(const id of ['shoulder','elbow']){$(id).value=mode==='joint'?goal[id]:state[id];$(id+'Val').textContent=state[id].toFixed(1)+'°';}
 $('height').value=goalHeight;$('heightVal').textContent=state.height.toFixed(1)+' mm';
 $('gripState').textContent=heldId?'Closed · holding block '+heldId:closed?'Closed · empty':'Open · no object';
 $('openGrip').setAttribute('aria-pressed',String(!closed));$('closeGrip').setAttribute('aria-pressed',String(closed));
 return p;
}
function startPickPlace(){
 const object=objects.find(o=>o.id===$('objectSelect').value);
 const reach=state.l1+state.l2,inner=Math.abs(state.l1-state.l2),radius=(reach+inner)/2;
 const destination={x:radius*.75,y:-radius*.66};
 if(heldId){status('Release the held object before starting the sequence.',true);return;}
 if(!inverse(object.x,object.y,state.l1,state.l2,sign)||!inverse(destination.x,destination.y,state.l1,state.l2,sign)){status('Selected block is unreachable. Restore the default link lengths or select another block.',true);return;}
 stopDemo();setMode('target');
 sequence={index:0,started:false,elapsed:0,steps:[
  {label:'Open jaws',action:'open'},
  {label:'Raise to clearance',z:100},
  {label:'Move above block '+object.id,x:object.x,y:object.y},
  {label:'Lower to grasp height',z:object.z},
  {label:'Grip block '+object.id,action:'close'},
  {label:'Lift block',z:100},
  {label:'Move above placement pad',x:destination.x,y:destination.y},
  {label:'Lower to floor',z:12},
  {label:'Release block',action:'open'},
  {label:'Retract tool',z:100}
 ]};
 $('pickDemo').textContent='Stop pick-and-place';
}
function advanceSequence(dt){
 if(!sequence)return;
 const step=sequence.steps[sequence.index];
 if(!step){stopDemo();status('Pick-and-place complete');return;}
 if(!sequence.started){
  sequence.started=true;sequence.elapsed=0;
  status((sequence.index+1)+'/10 · '+step.label);
  if(step.x!==undefined)moveTo(step.x,step.y,false);
  if(step.z!==undefined)goalHeight=Math.max(12,Math.min(100,step.z));
  if(step.action==='open')openGripper();
  if(step.action==='close'&&!closeGripper()){stopDemo();status('Grasp missed. Align the tool and try again.',true);return;}
 }
 sequence.elapsed+=dt;
 const p=tool(),aligned=!target?.valid||Math.hypot(p.x-target.x,p.y-target.y)<1;
 if(aligned&&Math.abs(state.height-goalHeight)<.2&&sequence.elapsed>.5){sequence.index++;sequence.started=false;}
}
function animate(now){
 const dt=Math.min((now-last)/1000,.05)||0;last=now;
 advanceSequence(dt);
 if(demo){phase+=dt*.65;const outer=state.l1+state.l2,inner=Math.abs(state.l1-state.l2),r=(outer-inner)*.22,center=(outer+inner)/2;moveTo(center+Math.cos(phase)*r,Math.sin(phase)*r,false);}
 let moving=false;
 for(const id of ['shoulder','elbow']){const previous=state[id];state[id]=reduced?goal[id]:stepJoint(state[id],goal[id],Number($('speed').value),dt,id==='shoulder');if(Math.abs(state[id]-previous)>1e-8)moving=true;}
 const previousHeight=state.height;state.height=reduced?goalHeight:stepJoint(state.height,goalHeight,60,dt);if(Math.abs(previousHeight-state.height)>1e-8)moving=true;
 objects=updateObjects(objects,heldId,tool(),dt);
 const p=draw();
 if(Math.abs(state.height-goalHeight)<.05&&$('status').textContent==='Vertical axis moving')status('Vertical axis at target');
 if(!demo&&!sequence&&target?.valid&&Math.hypot(target.x-p.x,target.y-p.y,goalHeight-state.height)<.05&&$('status').textContent==='Moving to target')status('Target reached');
 if(moving&&$('trail').checked){const prev=points.at(-1);if(!prev||Math.hypot(prev.x-p.x,prev.y-p.y,(prev.height??100)-state.height)>.8){points.push({x:p.x,y:p.y,height:state.height});if(points.length>1200)points.shift();}}
 requestAnimationFrame(animate);
}
for(const id of ['shoulder','elbow'])$(id).addEventListener('input',e=>{stopDemo();target=null;goal[id]=Number(e.target.value);if(id==='elbow')sign=goal.elbow<0?-1:1;status('Joint command updated');});
$('height').oninput=e=>{stopDemo();goalHeight=Number(e.target.value);status('Vertical axis moving');};
$('openGrip').onclick=()=>{stopDemo();const wasHeld=heldId;openGripper();status(wasHeld?'Released block '+wasHeld:'Gripper open');};
$('closeGrip').onclick=()=>{stopDemo();const id=closeGripper();status(id?'Holding block '+id:'No block in grasp range. Align XY and lower to block height.',!id);};
$('alignObject').onclick=()=>{stopDemo();setMode('target');const o=objects.find(o=>o.id===$('objectSelect').value);goalHeight=100;moveTo(o.x,o.y);};
$('pickDemo').onclick=()=>{if(sequence){stopDemo();goal={shoulder:state.shoulder,elbow:state.elbow};goalHeight=state.height;status('Sequence stopped · gripper state preserved');}else startPickPlace();};
$('jointMode').onclick=()=>{setMode('joint');stopDemo();goal={shoulder:state.shoulder,elbow:state.elbow};target=null;status('Joint control · FK');};
$('targetMode').onclick=()=>{setMode('target');stopDemo();status('Cartesian control · IK');};
$('targetForm').onsubmit=e=>{e.preventDefault();stopDemo();moveTo(Number($('targetX').value),Number($('targetY').value));};
let pointerStart=null,activePointers=new Set();
canvas.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);if(activePointers.size===1&&e.button===0)pointerStart={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false};else pointerStart=null;});
canvas.addEventListener('pointermove',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5){pointerStart.moved=true;$('viewLabel').textContent='ORBIT';}});
canvas.addEventListener('pointerup',e=>{const start=pointerStart;activePointers.delete(e.pointerId);pointerStart=null;if(!start||start.moved||start.id!==e.pointerId||!view)return;const point=view.pick(e.clientX,e.clientY);if(point){setMode('target');stopDemo();if(point.objectId)$('objectSelect').value=point.objectId;moveTo(point.x,point.y);}});
canvas.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);pointerStart=null;});
for(const [id,name] of [['viewHome','home'],['viewTop','top'],['viewSide','side']])$(id).onclick=()=>{view?.setView(name);$('viewLabel').textContent=name==='home'?'PERSPECTIVE':name.toUpperCase();};
$('flip').onclick=()=>{stopDemo();sign*=-1;const p=tool();moveTo(target?.valid?target.x:p.x,target?.valid?target.y:p.y);};
for(const id of ['l1','l2'])$(id).addEventListener('change',()=>{if(!$(id).checkValidity()){$(id).value=state[id];status('Link length must be between 80 and 220 mm.',true);return;}stopDemo();openGripper();state[id]=Number($(id).value);target=null;points=[];resize();status('Geometry updated · held object released');});
$('demo').onclick=()=>{if(demo){stopDemo();goal={shoulder:state.shoulder,elbow:state.elbow};status('Paused');}else{stopDemo();setMode('target');demo=true;phase=0;points=[];$('demo').textContent='Pause';status('Running circle · IK tracking');}};
$('clear').onclick=()=>{points=[];status('Trail cleared');};$('trail').onchange=()=>{points=[];};
$('reset').onclick=()=>{stopDemo();state={...initial};goal={shoulder:45,elbow:-70};goalHeight=100;sign=-1;target=null;points=[];objects=initialObjects();heldId=null;closed=false;for(const id of ['l1','l2'])$(id).value=initial[id];$('objectSelect').value='A';$('trail').checked=true;$('envelope').checked=true;setMode('joint');resize();$('speed').value=60;$('speedVal').textContent='60°/s';status('Idle · blocks reset');};
$('speed').oninput=()=>{$('speedVal').textContent=$('speed').value+'°/s';};
new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(animate);
