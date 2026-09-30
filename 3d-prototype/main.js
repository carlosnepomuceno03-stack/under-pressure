const canvas=document.getElementById('renderCanvas');
const BUILD='VISUAL PASS V26';
const buildEl=document.getElementById('buildTag');
if(buildEl)buildEl.textContent=BUILD;
const engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
const scene=new BABYLON.Scene(engine);
scene.clearColor=new BABYLON.Color4(0.055,0.075,0.145,1);
scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity=.0048;
scene.fogColor=new BABYLON.Color3(.09,.10,.16);
scene.imageProcessingConfiguration.exposure=1.08;
scene.imageProcessingConfiguration.contrast=1.18;

const light=new BABYLON.HemisphericLight('hemi',new BABYLON.Vector3(0,1,0),scene);
light.intensity=.68;
light.diffuse=new BABYLON.Color3(.48,.57,.78);
light.groundColor=new BABYLON.Color3(.22,.12,.10);

const sun=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-.45,-1,.35),scene);
sun.position=new BABYLON.Vector3(25,35,-20);
sun.intensity=.72;
sun.diffuse=new BABYLON.Color3(1,.58,.34);

const mat=(name,hex)=>{
  const m=new BABYLON.StandardMaterial(name,scene);
  m.diffuseColor=BABYLON.Color3.FromHexString(hex);
  m.specularColor=new BABYLON.Color3(.05,.05,.05);
  return m;
};
const asphalt=mat('asphalt','#252936');
const dirt=mat('dirt','#8e472d');
const concrete=mat('concrete','#8d8982');
const wallMat=mat('wall','#81786f');
const roofMat=mat('roof','#63382f');
const accent=mat('accent','#14d7e8');
const playerMat=mat('player','#d7d4c7');

const wallLight=mat('wallLight','#9d9285');
const wallDark=mat('wallDark','#655f59');
const brickMat=mat('brick','#7d4436');
const metalMat=mat('metal','#4f555c');
const woodMat=mat('wood','#6d4934');
const plantMat=mat('plant','#304b2d');
const plantLight=mat('plantLight','#46633a');
const tireMat=mat('tire','#15171a');
const bluePaint=mat('bluePaint','#17667a');
const yellowPaint=mat('yellowPaint','#c78c2b');
const curbMat=mat('curb','#c1bdb4');

function emissiveMat(name,hex,intensity=1){
  const m=mat(name,hex);
  const c=BABYLON.Color3.FromHexString(hex);
  m.emissiveColor=c.scale(intensity);
  return m;
}
const warmGlow=emissiveMat('warmGlow','#ffb35a',.85);
const cyanGlow=emissiveMat('cyanGlow','#41e7ff',.75);

function box(name,w,h,d,x,y,z,material,climbable=true){
  const b=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
  b.position.set(x,y,z); b.material=material; b.checkCollisions=true;
  b.metadata={...(b.metadata||{}),climbable};
  return b;
}
function cyl(name,diam,h,x,y,z,material){
  const c=BABYLON.MeshBuilder.CreateCylinder(name,{diameter:diam,height:h},scene);
  c.position.set(x,y,z); c.material=material; c.checkCollisions=true; return c;
}

// ground / road / lot
box('ground',90,.4,70,0,-.2,0,dirt,false);
box('road',18,.24,70,-15,.02,0,asphalt,false);
box('sidewalkL',3,.35,70,-24,.08,0,curbMat,false);
box('sidewalkR',2.6,.35,70,-5.7,.08,0,curbMat,false);

// buildings left street
for(let i=0;i<6;i++){
  const z=-28+i*11;
  const h=5+(i%2)*2.2;
  const facade=[wallMat,wallLight,wallDark,brickMat][i%4];
  box('houseL'+i,10,h,8,-31,h/2,z,facade);
  box('roofL'+i,10.5,.45,8.5,-31,h+.22,z,i%2?roofMat:metalMat);
}
// parkour buildings right
box('shop1',9,4.5,8,8,2.25,18,wallMat,true);
box('awning1',4,.35,3,3.7,3.1,18,concrete);
box('roof1',9.5,.4,8.5,8,4.72,18,roofMat);

box('house2',10,6.5,9,18,3.25,8,wallMat,true);
box('roof2',10.5,.4,9.5,18,6.72,8,roofMat);

box('house3',11,8.2,9,30,4.1,-3,wallMat,true);
box('roof3',11.5,.4,9.5,30,8.42,-3,roofMat);

// parkour route pieces
box('lowWall',8,1.4,.7,1,.7,25,concrete,true);
box('vaultBox',1.4,1.0,1.4,4,.5,22,concrete,true);
box('ledge',5,.35,1.3,12,3.4,17,concrete,true);
box('bridgeRoof',5,.35,3,13,5.3,12,roofMat,true);
box('highLedge',4,.35,1.1,24,6.3,5,concrete,true);
box('landing',4,.4,4,26,8.5,1,roofMat,true);
for(const p of [[8,5.25,18],[18,7.25,8],[30,8.95,-3]]){
  const beacon=BABYLON.MeshBuilder.CreateSphere('roofBeacon'+p[0],{diameter:.18,segments:8},scene);
  beacon.position.set(p[0],p[1],p[2]);
  beacon.material=cyanGlow;
  beacon.checkCollisions=false;
}

// campao obstacles
for(const p of [[8,.6,-6],[13,.8,-10],[18,.55,-14],[4,.5,-18]]){
  box('camp'+Math.random(),2.5,p[1]*2,1.6,p[0],p[1],p[2],concrete);
}
// mural final
const mural=box('mural',18,8,.8,26,4,-27,wallMat);
mural.material=mat('muralMat','#b8b0a5');

// urban props / street infrastructure
const poleZ=[-28,-14,0,14,28];
for(const z of poleZ){
  const pole=cyl('pole'+z,.34,8,-8,4,z,metalMat);
  pole.metadata={climbable:false};

  const arm=box('lampArm'+z,2.1,.12,.12,-8.8,7.15,z,metalMat,false);
  const bulb=BABYLON.MeshBuilder.CreateSphere('bulb'+z,{diameter:.28,segments:8},scene);
  bulb.position.set(-9.7,7.02,z);
  bulb.material=warmGlow;
  bulb.checkCollisions=false;

  const pl=new BABYLON.PointLight('streetLight'+z,new BABYLON.Vector3(-9.7,6.8,z),scene);
  pl.diffuse=new BABYLON.Color3(1,.55,.25);
  pl.intensity=.48;
  pl.range=13;
}

// overhead wiring
function wire(name,points){
  const line=BABYLON.MeshBuilder.CreateLines(name,{points},scene);
  line.color=new BABYLON.Color3(.06,.07,.09);
  line.isPickable=false;
  return line;
}
for(let i=0;i<poleZ.length-1;i++){
  const z1=poleZ[i],z2=poleZ[i+1];
  wire('wireA'+i,[
    new BABYLON.Vector3(-8,7.4,z1),
    new BABYLON.Vector3(-8,6.95,(z1+z2)/2),
    new BABYLON.Vector3(-8,7.4,z2)
  ]);
  wire('wireB'+i,[
    new BABYLON.Vector3(-7.75,7.15,z1),
    new BABYLON.Vector3(-7.75,6.78,(z1+z2)/2),
    new BABYLON.Vector3(-7.75,7.15,z2)
  ]);
}

function addWindow(name,x,y,z,w=1.15,h=.9,glow=warmGlow){
  const win=box(name,w,h,.08,x,y,z,glow,false);
  win.checkCollisions=false;
  return win;
}
function addDoor(name,x,y,z,w=1.15,h=2.15,material=metalMat){
  return box(name,w,h,.12,x,y,z,material,false);
}
function addTree(name,x,z,scale=1){
  const trunk=cyl(name+'Trunk',.52*scale,3.5*scale,x,1.75*scale,z,woodMat);
  trunk.metadata={climbable:false};
  for(let i=0;i<4;i++){
    const crown=BABYLON.MeshBuilder.CreateSphere(name+'Crown'+i,{diameter:(2.3+(i%2)*.5)*scale,segments:7},scene);
    crown.position.set(x+(i-1.5)*.48*scale,3.5*scale+(i%2)*.35*scale,z+((i%2)?-.45:.45)*scale);
    crown.material=i%2?plantMat:plantLight;
    crown.checkCollisions=false;
  }
}
function addCrate(name,x,z,y=.55){
  const c=box(name,1.15,1.1,1.15,x,y,z,woodMat,true);
  const band1=box(name+'Band1',1.18,.08,1.18,x,y+.26,z,metalMat,false);
  const band2=box(name+'Band2',1.18,.08,1.18,x,y-.26,z,metalMat,false);
  band1.checkCollisions=false; band2.checkCollisions=false;
}
function addTire(name,x,z){
  const t=BABYLON.MeshBuilder.CreateTorus(name,{diameter:1.0,thickness:.22,tessellation:14},scene);
  t.position.set(x,.28,z);
  t.rotation.x=Math.PI/2;
  t.material=tireMat;
  t.checkCollisions=false;
}
function addDumpster(name,x,z){
  box(name,1.9,1.25,1.15,x,.62,z,bluePaint,true);
  const lid=box(name+'Lid',2.0,.14,1.2,x,1.31,z,metalMat,false);
  lid.rotation.x=-.08;
}
function addWaterTank(name,x,y,z){
  const tank=BABYLON.MeshBuilder.CreateCylinder(name,{diameter:1.65,height:1.45,tessellation:16},scene);
  tank.position.set(x,y,z);
  tank.material=tireMat;
  tank.checkCollisions=false;
}
function addLadder(name,x,y,z,height=4){
  for(let i=0;i<2;i++) box(name+'Rail'+i,.11,height,.11,x+(i? .45:-.45),y,z,metalMat,false);
  const steps=Math.floor(height/.42);
  for(let i=0;i<steps;i++) box(name+'Step'+i,1.0,.08,.12,x,y-height/2+.3+i*.42,z,metalMat,false);
}

// storefront / windows / doors
addDoor('doorL1',-25.92,1.15,18,.95,2.2,metalMat);
addWindow('windowL1',-25.91,2.3,13,1.45,1.0,warmGlow);
addWindow('windowL2',-25.91,2.2,-8,1.35,.95,warmGlow);
addDoor('shopDoor',3.55,1.2,18,1.0,2.3,bluePaint);
addWindow('shopGlow',3.54,2.75,18,2.2,.72,cyanGlow);

// campao details
addTree('treeA',9,-2,1.18);
addTree('treeB',21,-18,.78);
addDumpster('dumpster',3,-8);
addCrate('crateA',7,-13);
addCrate('crateB',15,-18);
addTire('tireA',11,-6);
addTire('tireB',19,-12);
addTire('tireC',6,-20);

// rooftop props
addWaterTank('tank1',30,9.45,-2);
addWaterTank('tank2',18,7.72,8);
addLadder('ladder1',13.9,2.25,18,4.3);
addLadder('ladder2',24.8,4.8,4.5,4.8);

// route accents without arrows/text
for(const p of [[3,.12,22],[7,.12,15],[12,.12,8],[17,.12,1]]){
  const marker=box('routeStone'+p[0],1.0,.18,.75,p[0],p[1],p[2],yellowPaint,false);
  marker.checkCollisions=false;
}

// mural lighting + actual graffiti texture
const muralTex=new BABYLON.DynamicTexture('muralTex',{width:1024,height:512},scene,false);
const ctx=muralTex.getContext();
ctx.fillStyle='#b7afa5'; ctx.fillRect(0,0,1024,512);
ctx.fillStyle='#5d544c';
for(let i=0;i<80;i++){
  const x=(i*137)%1024, y=(i*79)%512;
  ctx.globalAlpha=.08+(i%4)*.025;
  ctx.fillRect(x,y,18+(i%5)*11,4+(i%3)*5);
}
ctx.globalAlpha=1;
ctx.font='900 120px Arial';
ctx.textAlign='center';
ctx.lineWidth=12;
ctx.strokeStyle='#17151b';
ctx.fillStyle='#f2e9dc';
ctx.strokeText('UNDER',512,205); ctx.fillText('UNDER',512,205);
ctx.strokeStyle='#17151b'; ctx.fillStyle='#35d7df';
ctx.strokeText('PRESSURE',512,335); ctx.fillText('PRESSURE',512,335);
ctx.font='900 76px Arial';
ctx.strokeStyle='#17151b'; ctx.fillStyle='#e74b6f';
ctx.strokeText('TDG',512,435); ctx.fillText('TDG',512,435);
muralTex.update();

const muralGameMat=new BABYLON.StandardMaterial('muralGameMat',scene);
muralTex.vScale=-1;
muralTex.vOffset=1;
muralGameMat.diffuseTexture=muralTex;
muralGameMat.specularColor=new BABYLON.Color3(.05,.05,.05);
mural.material=muralGameMat;

for(const x of [20,32]){
  const glow=BABYLON.MeshBuilder.CreateSphere('muralLamp'+x,{diameter:.22,segments:8},scene);
  glow.position.set(x,7.25,-26.45);
  glow.material=warmGlow;
  glow.checkCollisions=false;
  const pl=new BABYLON.PointLight('muralLight'+x,new BABYLON.Vector3(x,7,-25.8),scene);
  pl.diffuse=new BABYLON.Color3(1,.57,.3);
  pl.intensity=.7;
  pl.range=12;
}

// simple layered dusk horizon
const horizonMat=emissiveMat('horizonMat','#a85855',.45);
const horizon=box('horizon',120,14,1,0,6,-50,horizonMat,false);
horizon.checkCollisions=false;
const horizonTopMat=emissiveMat('horizonTop','#3f456f',.32);
const horizonTop=box('horizonTop',120,18,1,0,20,-51,horizonTopMat,false);
horizonTop.checkCollisions=false;

// distant skyline silhouettes
for(let i=0;i<18;i++){
  const w=3+(i%4), h=3+(i%5)*1.2, d=4+(i%3);
  const b=box('skyline'+i,w,h,d,-42+i*5.4,h/2-1,-43,wallDark,false);
  b.checkCollisions=false;
}

// road paint and small facade details
for(let z=-30;z<=30;z+=8){
  const mark=box('lane'+z,.22,.03,3,-15,.16,z,curbMat,false);
  mark.checkCollisions=false;
}

for(const z of [-22,-4,14,28]){
  const curb=box('curbAccent'+z,2.8,.08,.45,-5.7,.30,z,curbMat,false);
  curb.checkCollisions=false;
}

// simple gates / shutters / awnings to break up flat boxes
for(const [x,z,w,material] of [
  [-25.88,-20,2.6,metalMat],
  [-25.88,2,2.2,bluePaint],
  [-25.88,24,2.8,metalMat],
  [3.52,18,2.6,bluePaint]
]){
  const gate=box('gate'+x+z,w,2.3,.10,x,1.16,z,material,false);
  gate.checkCollisions=false;
}
for(const [x,y,z,w] of [
  [-25.7,3.25,-8,2.4],
  [-25.7,3.15,13,2.4],
  [3.35,3.45,18,3.1]
]){
  const aw=box('awningDetail'+x+z,w,.16,1.1,x,y,z,roofMat,false);
  aw.rotation.z=.03;
  aw.checkCollisions=false;
}

// extra warm/cool lights for depth
for(const [x,y,z,cold] of [
  [-26,2.5,-8,false],
  [-26,2.4,13,false],
  [3.4,2.6,18,true],
  [18,5.8,8,false],
  [30,7.4,-3,true]
]){
  const pl=new BABYLON.PointLight('detailLight'+x+z,new BABYLON.Vector3(x,y,z),scene);
  pl.diffuse=cold?new BABYLON.Color3(.25,.85,1):new BABYLON.Color3(1,.5,.22);
  pl.intensity=.32;
  pl.range=8;
}

// player collider + simple humanoid visual rig
// The capsule remains only for collision; the visible character is built from separate limbs.
const player=BABYLON.MeshBuilder.CreateCapsule('playerCollider',{height:2.1,radius:.42},scene);
player.position=new BABYLON.Vector3(-16,1.2,27);
player.isVisible=false;
player.checkCollisions=true;
player.ellipsoid=new BABYLON.Vector3(.42,1.0,.42);

const rigRoot=new BABYLON.TransformNode('rigRoot',scene);
rigRoot.parent=player;
rigRoot.position.set(0,-.05,0);

const rigMat=mat('rig','#d7d4c7');
const rigDark=mat('rigDark','#22262c');
const rigAccent=mat('rigAccent','#14d7e8');

function limbBox(name,w,h,d,parent,x,y,z,material=rigMat){
  const m=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
  m.parent=parent;
  m.position.set(x,y,z);
  m.material=material;
  m.checkCollisions=false;
  return m;
}
function joint(name,parent,x,y,z){
  const n=new BABYLON.TransformNode(name,scene);
  n.parent=parent;
  n.position.set(x,y,z);
  return n;
}

// pelvis + torso
const pelvis=limbBox('pelvis',.72,.34,.42,rigRoot,0,.08,0,rigDark);
const torso=limbBox('torso',.86,.92,.46,rigRoot,0,.72,0,rigDark);
const chest=limbBox('chest',.98,.28,.5,rigRoot,0,1.12,0,rigAccent);

// neck + head
const neck=limbBox('neck',.24,.18,.24,rigRoot,0,1.36,0,rigMat);
const head=BABYLON.MeshBuilder.CreateSphere('head',{diameter:.62,segments:10},scene);
head.parent=rigRoot;
head.position.set(0,1.68,0);
head.material=rigMat;
head.checkCollisions=false;

// backpack
const pack=limbBox('pack',.68,.72,.3,rigRoot,0,.82,-.34,rigAccent);

// simple face markers so we can always tell which way the character is looking
const faceMat=mat('face','#101215');
const nose=limbBox('nose',.13,.14,.15,rigRoot,0,1.67,.34,rigMat);
const eyeL=limbBox('eyeL',.07,.06,.035,rigRoot,-.12,1.75,.31,faceMat);
const eyeR=limbBox('eyeR',.07,.06,.035,rigRoot,.12,1.75,.31,faceMat);

// arm hierarchy: shoulder pivot -> upper arm -> elbow pivot -> forearm
const lShoulder=joint('lShoulder',rigRoot,-.56,1.16,0);
const rShoulder=joint('rShoulder',rigRoot,.56,1.16,0);
const lUpperArm=limbBox('lUpperArm',.22,.62,.22,lShoulder,0,-.31,0,rigMat);
const rUpperArm=limbBox('rUpperArm',.22,.62,.22,rShoulder,0,-.31,0,rigMat);
const lElbow=joint('lElbow',lShoulder,0,-.62,0);
const rElbow=joint('rElbow',rShoulder,0,-.62,0);
const lForearm=limbBox('lForearm',.2,.58,.2,lElbow,0,-.29,0,rigMat);
const rForearm=limbBox('rForearm',.2,.58,.2,rElbow,0,-.29,0,rigMat);

// leg hierarchy: hips slightly narrower, knees bend backward naturally, feet forward
const lHip=joint('lHip',rigRoot,-.19,.04,0);
const rHip=joint('rHip',rigRoot,.19,.04,0);
const lThigh=limbBox('lThigh',.24,.68,.25,lHip,0,-.34,0,rigDark);
const rThigh=limbBox('rThigh',.24,.68,.25,rHip,0,-.34,0,rigDark);
const lKnee=joint('lKnee',lHip,0,-.68,0);
const rKnee=joint('rKnee',rHip,0,-.68,0);
const lShin=limbBox('lShin',.22,.66,.22,lKnee,0,-.33,0,rigMat);
const rShin=limbBox('rShin',.22,.66,.22,rKnee,0,-.33,0,rigMat);
const lAnkle=joint('lAnkle',lKnee,0,-.66,0);
const rAnkle=joint('rAnkle',rKnee,0,-.66,0);
const lFoot=limbBox('lFoot',.24,.14,.42,lAnkle,0,-.05,.15,rigDark);
const rFoot=limbBox('rFoot',.24,.14,.42,rAnkle,0,-.05,.15,rigDark);

let animClock=0;
let lastPlayerPos=player.position.clone();

function dampAngle(current,target,dt,speed=12){
  return BABYLON.Scalar.Lerp(current,target,1-Math.exp(-speed*dt));
}

function animateRig(dt,moveAmount,isRunning,isJumping,isClimbing){
  animClock+=dt;

  const moving=moveAmount>.05;
  const cycle=Math.sin(animClock*(isRunning?10.2:6.8));
  const opp=Math.sin(animClock*(isRunning?10.2:6.8)+Math.PI);

  let armL=0,armR=0,legL=0,legR=0;
  let elbowL=-.08,elbowR=-.08;
  let kneeL=0,kneeR=0;
  let ankleL=0,ankleR=0;
  let torsoLean=0;

  if(isClimbing){
    const c=Math.sin(animClock*6.5);
    armL=-1.55+c*.28;
    armR=-1.55-c*.28;
    elbowL=-.65;
    elbowR=-.65;

    legL=.38-c*.32;
    legR=.38+c*.32;
    kneeL=.95+Math.max(0,c)*.28;
    kneeR=.95+Math.max(0,-c)*.28;
    ankleL=-.18;
    ankleR=-.18;
    torsoLean=.10;
  }else if(isJumping){
    armL=-.38;
    armR=-.38;
    elbowL=-.25;
    elbowR=-.25;

    legL=.18;
    legR=.18;
    kneeL=.72;
    kneeR=.72;
    ankleL=-.12;
    ankleR=-.12;
    torsoLean=.06;
  }else if(moving){
    const amp=isRunning?.78:.5;

    // Human gait: hips swing less than arms, knees bend on the recovery leg.
    armL=opp*(isRunning?.78:.5);
    armR=cycle*(isRunning?.78:.5);

    legL=cycle*amp;
    legR=opp*amp;

    kneeL=Math.max(0,-cycle)*(isRunning?.95:.6);
    kneeR=Math.max(0,-opp)*(isRunning?.95:.6);

    elbowL=-.18-Math.max(0,-opp)*.22;
    elbowR=-.18-Math.max(0,-cycle)*.22;

    ankleL=-legL*.18;
    ankleR=-legR*.18;
    torsoLean=isRunning?.13:.05;
  }

  lShoulder.rotation.x=dampAngle(lShoulder.rotation.x,armL,dt);
  rShoulder.rotation.x=dampAngle(rShoulder.rotation.x,armR,dt);
  lElbow.rotation.x=dampAngle(lElbow.rotation.x,elbowL,dt);
  rElbow.rotation.x=dampAngle(rElbow.rotation.x,elbowR,dt);

  lHip.rotation.x=dampAngle(lHip.rotation.x,legL,dt);
  rHip.rotation.x=dampAngle(rHip.rotation.x,legR,dt);

  // Positive X bends the knee naturally backward for this rig.
  lKnee.rotation.x=dampAngle(lKnee.rotation.x,kneeL,dt);
  rKnee.rotation.x=dampAngle(rKnee.rotation.x,kneeR,dt);

  lAnkle.rotation.x=dampAngle(lAnkle.rotation.x,ankleL,dt);
  rAnkle.rotation.x=dampAngle(rAnkle.rotation.x,ankleR,dt);

  torso.rotation.x=dampAngle(torso.rotation.x,torsoLean,dt);
  chest.rotation.x=dampAngle(chest.rotation.x,torsoLean*.55,dt);

  const bounce=(moving&&!isJumping&&!isClimbing)?Math.abs(cycle)*.025:0;
  rigRoot.position.y=dampAngle(rigRoot.position.y,-.05+bounce,dt,16);
}

// camera — simple deterministic third-person orbit.
// No pointer lock, no click, no auto-recentering, no hidden inversion.
const camera=new BABYLON.FreeCamera('cam',new BABYLON.Vector3(0,3,-8),scene);
camera.minZ=.1;

let camYaw=0;
let camPitch=.16;
let camDistance=7.2;
let pointerLocked=false;

function lockMouse(){
  if(document.pointerLockElement!==canvas) canvas.requestPointerLock?.();
}
canvas.addEventListener('click',lockMouse);
document.addEventListener('pointerlockchange',()=>{
  pointerLocked=document.pointerLockElement===canvas;
  document.body.classList.toggle('mouse-locked',pointerLocked);
});

const CAM_X=.0036;
const CAM_Y=.0028;

document.addEventListener('mousemove',e=>{
  if(!pointerLocked)return;

  // Pointer-lock gives infinite mouse movement without screen-edge glitches.
  // Natural third-person direction.
  camYaw-=e.movementX*CAM_X;
  camPitch=BABYLON.Scalar.Clamp(camPitch+e.movementY*CAM_Y,-.38,.48);
});

canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  camDistance=BABYLON.Scalar.Clamp(camDistance+Math.sign(e.deltaY)*.45,5.2,9.5);
},{passive:false});

function updateCamera(dt){
  const target=player.position.add(new BABYLON.Vector3(0,.9,0));
  const cp=Math.cos(camPitch);

  const desired=new BABYLON.Vector3(
    target.x+Math.sin(camYaw)*cp*camDistance,
    target.y+1.25+Math.sin(camPitch)*camDistance,
    target.z-Math.cos(camYaw)*cp*camDistance
  );

  const smooth=1-Math.pow(.00035,dt);
  camera.position=BABYLON.Vector3.Lerp(camera.position,desired,smooth);
  camera.setTarget(target);
}

// input
const keys={};
let spacePressedAt=0;
let spaceWasDown=false;
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!keys.Space){
    spacePressedAt=performance.now();
    jumpBufferTimer=.13;
  }
  keys[e.code]=true;
});
window.addEventListener('keyup',e=>{
  keys[e.code]=false;
  if(e.code==='Space')spaceWasDown=false;
});

let vy=0;
let grounded=false;
let wasGrounded=false;
let airTime=0;
let landTimer=0;
let coyoteTimer=0;
let jumpBufferTimer=0;
let jumpConsumed=false;
let lastVerticalSpeed=0;

let moveVelocity=BABYLON.Vector3.Zero();
let parkourState='normal'; // normal | climb | hang | mantle | vault
let parkourCooldown=0;
let activeObstacle=null;
let stateTimer=0;
let stateDuration=0;
let stateStart=null;
let stateEnd=null;

function forwardFlat(){
  return new BABYLON.Vector3(-Math.sin(camYaw),0,Math.cos(camYaw)).normalize();
}
function rightFlat(){
  return new BABYLON.Vector3(Math.cos(camYaw),0,Math.sin(camYaw)).normalize();
}
function playerForward(){
  return new BABYLON.Vector3(
    -Math.sin(player.rotation.y),
    0,
    -Math.cos(player.rotation.y)
  ).normalize();
}
function rayDown(distance=1.35){
  const ray=new BABYLON.Ray(
    player.position.add(new BABYLON.Vector3(0,.18,0)),
    BABYLON.Vector3.Down(),
    distance
  );
  return scene.pickWithRay(ray,m=>m!==player&&m.checkCollisions);
}
function probeWall(distance=1.35){
  const dir=playerForward();
  const heights=[.28,.72,1.18];
  let best=null;

  for(const height of heights){
    const ray=new BABYLON.Ray(
      player.position.add(new BABYLON.Vector3(0,height,0)),
      dir,
      distance
    );
    const hit=scene.pickWithRay(ray,m=>
      m!==player&&m!==head&&m!==pack&&m!==nose&&m!==eyeL&&m!==eyeR&&
      m.checkCollisions&&m.metadata?.climbable===true
    );
    if(hit?.hit&&(!best||hit.distance<best.distance)){
      best={...hit,dir,height};
    }
  }
  return best;
}
function obstacleData(hit){
  const mesh=hit.pickedMesh;
  const bb=mesh.getBoundingInfo().boundingBox;
  const top=bb.maximumWorld.y;
  const feet=player.position.y-1.05;
  return {
    mesh,top,feet,height:top-feet,dir:hit.dir.normalize(),bb,
    contact:hit.pickedPoint?hit.pickedPoint.clone():null
  };
}
function mantleTarget(data,inside=.78){
  const {mesh,dir,bb}=data;
  const min=bb.minimumWorld,max=bb.maximumWorld;
  const margin=.46;

  if((max.x-min.x)<margin*2||(max.z-min.z)<margin*2)return null;

  const probe=player.position.add(dir.scale(inside));
  const x=BABYLON.Scalar.Clamp(probe.x,min.x+margin,max.x-margin);
  const z=BABYLON.Scalar.Clamp(probe.z,min.z+margin,max.z-margin);
  return new BABYLON.Vector3(x,max.y+1.06,z);
}
function beginVault(data){
  const end=mantleTarget(data,.9);
  if(!end)return false;
  parkourState='vault';
  activeObstacle=data;
  stateTimer=0;
  stateDuration=.34;
  stateStart=player.position.clone();
  stateEnd=end;
  vy=0;
  return true;
}
function beginClimb(data){
  parkourState='climb';
  activeObstacle=data;
  stateTimer=0;
  vy=0;
  moveVelocity.set(0,0,0);

  // Face the wall exactly so the visual rig and climbing direction agree.
  player.rotation.y=Math.atan2(-data.dir.x,-data.dir.z);

  // Pin the collider just outside the wall instead of allowing it to drift through.
  if(data.contact){
    const standOff=.47;
    const anchor=data.contact.subtract(data.dir.scale(standOff));
    player.position.x=anchor.x;
    player.position.z=anchor.z;
    activeObstacle.wallAnchor=new BABYLON.Vector3(anchor.x,0,anchor.z);
  }
  return true;
}
function beginHang(){
  if(!activeObstacle)return;
  parkourState='hang';
  stateTimer=0;
  vy=0;

  // Crucial: stop BELOW the lip. Never place the collider on top yet.
  const top=activeObstacle.top;
  player.position.y=Math.min(player.position.y,top-.78);
}
function beginMantle(){
  const end=mantleTarget(activeObstacle,.82);
  if(!end){
    parkourState='hang';
    return false;
  }

  parkourState='mantle';
  stateTimer=0;
  stateDuration=.48;
  stateStart=player.position.clone();
  stateEnd=end;
  vy=0;
  return true;
}
function finishParkour(){
  parkourState='normal';
  activeObstacle=null;
  stateTimer=0;
  stateStart=null;
  stateEnd=null;
  parkourCooldown=.32;
  vy=-.15;
}
function smooth01(t){
  t=BABYLON.Scalar.Clamp(t,0,1);
  return t*t*(3-2*t);
}
function updateManualParkour(dt,spaceHeld){
  if(parkourState==='vault'){
    stateTimer+=dt;
    const t=BABYLON.Scalar.Clamp(stateTimer/stateDuration,0,1);
    const u=smooth01(t);
    const p=BABYLON.Vector3.Lerp(stateStart,stateEnd,u);
    p.y+=Math.sin(Math.PI*t)*.28;
    player.position.copyFrom(p);
    if(t>=1)finishParkour();
    return true;
  }

  if(parkourState==='climb'){
    stateTimer+=dt;
    if(!spaceHeld){
      parkourState='normal';
      activeObstacle=null;
      vy=-1.2;
      return false;
    }

    // climb vertically while hugging the SAME wall contact point
    if(activeObstacle.wallAnchor){
      const follow=1-Math.exp(-18*dt);
      player.position.x=BABYLON.Scalar.Lerp(player.position.x,activeObstacle.wallAnchor.x,follow);
      player.position.z=BABYLON.Scalar.Lerp(player.position.z,activeObstacle.wallAnchor.z,follow);
    }
    player.position.y+=2.7*dt;

    // Reach the lip -> hang clearly below it first.
    if(player.position.y+1.02>=activeObstacle.top){
      beginHang();
    }
    return true;
  }

  if(parkourState==='hang'){
    stateTimer+=dt;
    vy=0;

    // visually/physically remain under the ledge and fixed to the same wall
    player.position.y=activeObstacle.top-.82;
    if(activeObstacle.wallAnchor){
      player.position.x=activeObstacle.wallAnchor.x;
      player.position.z=activeObstacle.wallAnchor.z;
    }

    if(!spaceHeld){
      parkourState='normal';
      activeObstacle=null;
      vy=-1.5;
      return false;
    }

    // short readable hang beat before pulling up
    if(stateTimer>.13)beginMantle();
    return true;
  }

  if(parkourState==='mantle'){
    stateTimer+=dt;
    const t=BABYLON.Scalar.Clamp(stateTimer/stateDuration,0,1);
    const u=smooth01(t);

    // 3-stage mantle: rise chest, move over lip, settle feet.
    const p=BABYLON.Vector3.Lerp(stateStart,stateEnd,u);
    p.y+=Math.sin(Math.PI*t)*.20;
    player.position.copyFrom(p);

    if(t>=1)finishParkour();
    return true;
  }

  return false;
}

scene.onBeforeRenderObservable.add(()=>{
  const dt=Math.min(.033,engine.getDeltaTime()/1000);
  parkourCooldown=Math.max(0,parkourCooldown-dt);
  landTimer=Math.max(0,landTimer-dt);

  updateCamera(dt);

  // Small camera feedback for speed/landing without changing controls.
  const sprintingNow=!!(keys.ShiftLeft||keys.ShiftRight);
  const targetFov=sprintingNow&&parkourState==='normal'?.91:.84;
  camera.fov=BABYLON.Scalar.Lerp(camera.fov,targetFov,1-Math.exp(-6*dt));

  const down=rayDown(1.34);
  grounded=!!(down&&down.hit);

  jumpBufferTimer=Math.max(0,jumpBufferTimer-dt);

  if(grounded){
    coyoteTimer=.12;
    jumpConsumed=false;

    if(!wasGrounded&&airTime>.18){
      landTimer=airTime>.62?.28:.17;
    }
    airTime=0;
  }else{
    coyoteTimer=Math.max(0,coyoteTimer-dt);
    airTime+=dt;
  }
  wasGrounded=grounded;

  const f=forwardFlat(),r=rightFlat();
  let wish=BABYLON.Vector3.Zero();
  if(keys.KeyW||keys.ArrowUp)wish.addInPlace(f);
  if(keys.KeyS||keys.ArrowDown)wish.subtractInPlace(f);
  if(keys.KeyD||keys.ArrowRight)wish.addInPlace(r);
  if(keys.KeyA||keys.ArrowLeft)wish.subtractInPlace(r);

  const running=!!(keys.ShiftLeft||keys.ShiftRight);
  const maxSpeed=running?7.2:4.7;
  const accel=grounded?18:7;
  const friction=grounded?15:2.2;

  if(wish.lengthSquared()>.001){
    wish.normalize();
    const desired=wish.scale(maxSpeed);
    moveVelocity=BABYLON.Vector3.Lerp(
      moveVelocity,
      desired,
      1-Math.exp(-accel*dt)
    );

    const yaw=Math.atan2(wish.x,wish.z);
    let dyaw=((yaw-player.rotation.y+Math.PI)%(Math.PI*2)+Math.PI)%(Math.PI*2)-Math.PI;
    player.rotation.y+=dyaw*(1-Math.exp(-12*dt));
  }else{
    moveVelocity=BABYLON.Vector3.Lerp(
      moveVelocity,
      BABYLON.Vector3.Zero(),
      1-Math.exp(-friction*dt)
    );
  }

  const spaceHeld=!!keys.Space;
  const heldMs=spaceHeld?(performance.now()-spacePressedAt):0;

  // Enter contextual parkour only from normal movement.
  const forwardIntent=!!(keys.KeyW||keys.ArrowUp);
  if(parkourState==='normal'&&spaceHeld&&forwardIntent&&heldMs>90&&parkourCooldown<=0){
    const hit=probeWall(1.35);
    if(hit){
      const data=obstacleData(hit);

      // Must genuinely be below the top. This blocks the old edge re-snap bug.
      if(data.height>.42&&player.position.y<data.top+.30){
        if(data.height<1.38)beginVault(data);
        else if(data.height<7.5)beginClimb(data);
      }
    }
  }

  const manualParkour=updateManualParkour(dt,spaceHeld);

  if(!manualParkour){
    // Horizontal motion remains collision-based.
    if(moveVelocity.lengthSquared()>.0001){
      player.moveWithCollisions(moveVelocity.scale(dt));
    }

    // Responsive jump:
    // - short input buffer before landing
    // - coyote time after leaving an edge
    // - release Space early for a shorter jump
    if(jumpBufferTimer>0&&coyoteTimer>0&&!jumpConsumed){
      vy=7.65;
      jumpConsumed=true;
      jumpBufferTimer=0;
      coyoteTimer=0;
      spaceWasDown=true;
    }

    if(!spaceHeld&&vy>2.1){
      vy-=24*dt;
    }

    lastVerticalSpeed=vy;

    if(!grounded||vy>0){
      const gravity=vy>0?17.2:20.5;
      vy-=gravity*dt;
      player.moveWithCollisions(new BABYLON.Vector3(0,vy*dt,0));
    }else{
      vy=-.35;
    }
  }else{
    // No normal velocity fighting the hand-authored parkour path.
    moveVelocity.scaleInPlace(.45);
  }

  if(!spaceHeld)spaceWasDown=false;

  const moved=player.position.subtract(lastPlayerPos);
  const horizontalSpeed=Math.sqrt(moved.x*moved.x+moved.z*moved.z)/Math.max(dt,.001);
  const moveAmount=BABYLON.Scalar.Clamp(horizontalSpeed/4.7,0,1.5);

  if(grounded&&moveAmount>.08&&parkourState==='normal'){
    const bob=Math.sin(animClock*(running?10.2:6.8))*(running?.018:.010);
    camera.position.y+=bob;
  }
  const isJumping=!grounded&&parkourState==='normal';
  const isClimbing=['climb','hang','mantle'].includes(parkourState);

  // Rig stays aligned with collider; no independent visual yaw.
  rigRoot.rotation.y=Math.PI;

  animateRig(dt,moveAmount,running&&moveAmount>.1,isJumping,isClimbing);

  // Extra readability for landing and mantle.
  if(landTimer>0){
    const duration=airTime>.62?.28:.17;
    const k=BABYLON.Scalar.Clamp(landTimer/Math.max(.01,duration),0,1);
    torso.rotation.x+=.22*k;
    lKnee.rotation.x+=.32*k;
    rKnee.rotation.x+=.32*k;
    lHip.rotation.x+=.08*k;
    rHip.rotation.x+=.08*k;
    rigRoot.position.y-=.055*k;
  }
  if(parkourState==='hang'){
    lShoulder.rotation.x=-2.15;
    rShoulder.rotation.x=-2.15;
    lElbow.rotation.x=-.55;
    rElbow.rotation.x=-.55;
    lKnee.rotation.x=.65;
    rKnee.rotation.x=.35;
  }else if(parkourState==='mantle'){
    const t=BABYLON.Scalar.Clamp(stateTimer/stateDuration,0,1);
    lShoulder.rotation.x=-1.55+(t*.95);
    rShoulder.rotation.x=-1.45+(t*.9);
    lKnee.rotation.x=.85*(1-t);
    rKnee.rotation.x=.55*(1-t);
    torso.rotation.x=.22*(1-t);
  }

  lastPlayerPos.copyFrom(player.position);

  if(player.position.y<-5){
    player.position.set(-16,1.2,27);
    moveVelocity.set(0,0,0);
    parkourState='normal';
    activeObstacle=null;
    vy=0;
  }
});

scene.collisionsEnabled=true;
engine.runRenderLoop(()=>scene.render());
window.addEventListener('resize',()=>engine.resize());