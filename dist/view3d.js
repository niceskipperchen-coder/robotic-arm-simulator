import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {worldPoint} from './coordinates.js';

export function createRobotView(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#202934');
  scene.fog = new THREE.Fog('#202934', 1300, 2400);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 3000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .1;
  controls.minDistance = 180;
  controls.maxDistance = 1600;
  controls.maxPolarAngle = Math.PI / 2 - .015;
  controls.target.set(65,95,-20);
  scene.add(new THREE.HemisphereLight(0xddeeff, 0x41434a, 2.6));
  const sun = new THREE.DirectionalLight(0xfff1df, 4);
  sun.position.set(200,650,300);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-550,right:550,top:550,bottom:-550,near:1,far:1500});
  sun.shadow.normalBias = 1;
  sun.shadow.bias = -.0002;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9ac8ff,2);
  rim.position.set(-400,250,-300);scene.add(rim);
  const materials = {
    orange:new THREE.MeshStandardMaterial({color:0xe89332,metalness:.45,roughness:.32}),
    silver:new THREE.MeshStandardMaterial({color:0xaab8c4,metalness:.72,roughness:.3}),
    black:new THREE.MeshStandardMaterial({color:0x202a32,metalness:.5,roughness:.38}),
    bolt:new THREE.MeshStandardMaterial({color:0xd4dce0,metalness:.8,roughness:.25})
  };
  function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,w,h,d,x,y,z,material){return mesh(new THREE.BoxGeometry(w,h,d),material,parent,x,y,z);}
  function cylinder(parent,r,h,x,y,z,material,r2=r){return mesh(new THREE.CylinderGeometry(r,r2,h,48),material,parent,x,y,z);}
  const floor = mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshStandardMaterial({color:0x283440,metalness:.12,roughness:.85}),scene);
  floor.rotation.x = -Math.PI/2;floor.receiveShadow=true;floor.castShadow=false;
  const grid = new THREE.GridHelper(1200,24,0x65798a,0x40505f);grid.position.y=.4;grid.material.transparent=true;grid.material.opacity=.5;scene.add(grid);
  const robot = new THREE.Group();scene.add(robot);
  box(robot,94,10,94,0,5,0,materials.black);
  for(const x of [-36,36])for(const z of [-36,36])cylinder(robot,4,3,x,11,z,materials.bolt);
  cylinder(robot,31,117,0,69,0,materials.orange,38);
  cylinder(robot,32,10,0,132,0,materials.black);
  const shoulder = new THREE.Group();shoulder.position.y=140;robot.add(shoulder);
  const elbow = new THREE.Group();shoulder.add(elbow);
  const link1 = new THREE.Group();shoulder.add(link1);
  const link2 = new THREE.Group();elbow.add(link2);
  const gripper=new THREE.Group();elbow.add(gripper);
  const rod=cylinder(elbow,5,1,0,0,0,materials.silver);
  box(gripper,34,12,38,0,25,0,materials.black);
  const jaws=[];
  for(const side of [-1,1]){const jaw=new THREE.Group();gripper.add(jaw);box(jaw,22,27,5,0,8,0,materials.silver);box(jaw,18,16,3,0,1,-side*3,materials.black);jaws.push({jaw,side});}
  function label(text,color='#d7e4ed'){
    const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');g.font='500 24px monospace';g.textAlign='center';g.fillStyle=color;g.fillText(text,128,39);
    const texture=new THREE.CanvasTexture(c);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.scale.set(105,26,1);return sprite;
  }
  function makeLink(parent,length,width){
    const half=width/2,r=8,s=new THREE.Shape();s.moveTo(0,-half+r);s.quadraticCurveTo(0,-half,r,-half);s.lineTo(length-r,-half);s.quadraticCurveTo(length,-half,length,-half+r);s.lineTo(length,half-r);s.quadraticCurveTo(length,half,length-r,half);s.lineTo(r,half);s.quadraticCurveTo(0,half,0,half-r);s.closePath();
    const geometry=new THREE.ExtrudeGeometry(s,{depth:20,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:2,bevelThickness:2});
    const body=mesh(geometry,materials.orange,parent);body.rotation.x=-Math.PI/2;
    box(parent,length-40,3,width-12,length/2,23,0,materials.black);
    box(parent,length-55,1,4,length/2,25,0,materials.silver);
    for(const x of [14,length-14])for(const z of [-width/2+8,width/2-8])cylinder(parent,2.3,2,x,24,z,materials.bolt);
  }
  let previousLengths='';
  function clear(group){for(const child of [...group.children]){child.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});group.remove(child);}}
  function geometry(l1,l2){
    const key=l1+':'+l2;if(key===previousLengths)return;previousLengths=key;clear(link1);clear(link2);
    makeLink(link1,l1,40);cylinder(link1,27,25,0,12,0,materials.black);cylinder(link1,19,4,0,27,0,materials.silver);
    cylinder(link1,25,45,l1,20,0,materials.black);cylinder(link1,19,3,l1,44,0,materials.silver);
    elbow.position.set(l1,30,0);makeLink(link2,l2,31);
    cylinder(link2,21,28,0,13,0,materials.black);cylinder(link2,15,4,0,29,0,materials.silver);
    cylinder(link2,15,33,l2,3,0,materials.silver);cylinder(link2,10,9,l2,26,0,materials.black);
    const a=label('L1  '+l1+' mm'),b=label('L2  '+l2+' mm');a.position.set(l1/2,48,0);b.position.set(l2/2,48,0);link1.add(a);link2.add(b);
  }
  const axes=new THREE.Group();axes.position.set(-85,2,80);scene.add(axes);
  for(const [end,color,name] of [[new THREE.Vector3(60,0,0),0xc8776c,'X'],[new THREE.Vector3(0,0,-60),0x87b3ca,'Y'],[new THREE.Vector3(0,60,0),0x91af83,'Z']]){axes.add(new THREE.ArrowHelper(end.clone().normalize(),new THREE.Vector3(),60,color,9,4));const t=label(name);t.scale.set(23,7,1);t.position.copy(end.clone().multiplyScalar(1.15));axes.add(t);}
  const envelope=new THREE.Group();scene.add(envelope);
  let envelopeKey='';
  function reach(l1,l2){const key=l1+':'+l2;if(key===envelopeKey)return;envelopeKey=key;clear(envelope);
    for(const radius of [l1+l2,Math.abs(l1-l2)]){if(!radius)continue;const pts=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,1,Math.sin(a)*radius));}const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:0x6d93ab,dashSize:6,gapSize:5,transparent:true,opacity:.5}));ring.computeLineDistances();envelope.add(ring);}
  }
  const targetMaterial=new THREE.MeshBasicMaterial({color:0xe6bd70,transparent:true,opacity:.9,depthTest:false});
  const targetMesh=new THREE.Group();const torus=mesh(new THREE.TorusGeometry(9,.7,8,48),targetMaterial,targetMesh);torus.rotation.x=Math.PI/2;
  box(targetMesh,28,.6,.8,0,0,0,targetMaterial);box(targetMesh,.8,.6,28,0,0,0,targetMaterial);scene.add(targetMesh);targetMesh.visible=false;
  let trailEnd=null,trailCount=-1;
  const trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xe5bd79,transparent:true,opacity:.75}));scene.add(trail);
  const toolDot=mesh(new THREE.SphereGeometry(2.5,12,12),new THREE.MeshBasicMaterial({color:0xf1dbaa}),scene);
  const tcpLabel=label('TCP');tcpLabel.scale.set(40,10,1);scene.add(tcpLabel);
  const objectMeshes=new Map();
  const padMaterial=new THREE.MeshStandardMaterial({color:0x446558,roughness:.8,transparent:true,opacity:.7});
  const pad=box(scene,80,1,80,135,.6,120,padMaterial);
  const padLabel=label('PLACE');padLabel.scale.set(65,16,1);scene.add(padLabel);
  function updateBlocks(objects,heldId){
    for(const object of objects){
      let entry=objectMeshes.get(object.id);
      if(!entry){const material=new THREE.MeshStandardMaterial({color:object.color,metalness:.15,roughness:.45});const block=box(scene,object.size,object.size,object.size,0,0,0,material);block.userData.objectId=object.id;const text=label(object.id);text.scale.set(25,10,1);scene.add(text);entry={block,text};objectMeshes.set(object.id,entry);}
      const p=worldPoint(object.x,object.y,object.z);entry.block.position.set(p.x,p.y,p.z);entry.text.position.set(p.x,p.y+24,p.z);
      entry.block.material.emissive.set(object.id===heldId?0x374d24:0x000000);
    }
  }
  const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  function pick(clientX,clientY){
    const rect=canvas.getBoundingClientRect(),pointer=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects([...objectMeshes.values()].map(entry=>entry.block),false)[0];
    if(hit){const p=hit.object.position;return {x:p.x,y:-p.z,objectId:hit.object.userData.objectId};}
    const point=raycaster.ray.intersectPlane(plane,new THREE.Vector3());return point?{x:point.x,y:-point.z}:null;
  }
  let fitDistance=1;
  function resize(){const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;const nextFit=width<500?1.45:1;camera.position.sub(controls.target).multiplyScalar(nextFit/fitDistance).add(controls.target);fitDistance=nextFit;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();controls.update();}
  function setView(name){const target=new THREE.Vector3(65,95,-20);controls.target.copy(target);camera.up.set(0,1,0);
    if(name==='top'){camera.position.set(65,820,-19.9);}else if(name==='side'){camera.position.set(65,145,830);}else camera.position.set(540,430,560);
    camera.position.sub(controls.target).multiplyScalar(fitDistance).add(controls.target);controls.update();
  }
  setView('home');resize();
  return {resize,pick,setView,update(state,target,points,options){
    geometry(state.l1,state.l2);reach(state.l1,state.l2);
    gripper.position.set(state.l2,state.height-170,0);
    const rodLength=205-(state.height+31);rod.position.set(state.l2,(205+state.height+31)/2-170,0);rod.scale.y=Math.max(1,rodLength);
    const gap=options.closed?(options.heldId?12:3):23;
    for(const {jaw,side} of jaws)jaw.position.z=side*(gap+2.5);
    updateBlocks(options.objects,options.heldId);
    const radius=(state.l1+state.l2+Math.abs(state.l1-state.l2))/2;pad.position.set(radius*.75,.6,radius*.66);padLabel.position.set(radius*.75,3,radius*.66+50);
    shoulder.rotation.y=state.shoulder*Math.PI/180;elbow.rotation.y=state.elbow*Math.PI/180;
    const a=state.shoulder*Math.PI/180,b=(state.shoulder+state.elbow)*Math.PI/180;
    const endpoint=worldPoint(state.l1*Math.cos(a)+state.l2*Math.cos(b),state.l1*Math.sin(a)+state.l2*Math.sin(b),state.height);
    toolDot.position.set(endpoint.x,endpoint.y,endpoint.z);tcpLabel.position.set(endpoint.x+17,endpoint.y+45,endpoint.z);
    targetMesh.visible=!!target;if(target){const p=worldPoint(target.x,target.y,state.height);targetMesh.position.set(p.x,p.y,p.z);targetMaterial.color.set(target.valid?0xe6bd70:0xee8877);}
    envelope.visible=options.envelope;
    trail.visible=options.trail;
    if(points.length!==trailCount || points.at(-1)!==trailEnd){
      const pts=points.map(p=>{const q=worldPoint(p.x,p.y,p.height??100);return new THREE.Vector3(q.x,q.y,q.z);});
      trail.geometry.dispose();trail.geometry=new THREE.BufferGeometry().setFromPoints(pts.length>1?pts:[new THREE.Vector3(),new THREE.Vector3()]);
      trailCount=points.length;trailEnd=points.at(-1);
    }
    controls.update();renderer.render(scene,camera);
  }};
}
