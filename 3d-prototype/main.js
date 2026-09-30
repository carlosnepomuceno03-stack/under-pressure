const canvas=document.getElementById('renderCanvas');
const BUILD='RIG V18';
const buildEl=document.getElementById('buildTag');
if(buildEl)buildEl.textContent=BUILD;
const engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
const scene=new BABYLON.Scene(engine);
scene.clearColor=new BABYLON.Color4(0.035,0.045,0.075,1);

const light=new BABYLON.HemisphericLight('hemi',new BABYLON.Vector3(0,1,0),scene);
light.intensity=.72;
const sun=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-.45,-1,.35),scene);
sun.position=new BABYLON.Vector3(25,35,-20);
sun.intensity=.65;

const mat=(name,hex)=>{
  const m=new BABYLON.StandardMaterial(name,scene);
  m.diffuseColor=BABYLON.Color3.FromHexString(hex);
  m.specularColor=new BABYLON.Color3(.05,.05,.05);
  return m;
};
const asphalt=mat('asphalt','#34373f');
const dirt=mat('dirt','#8b4c32');
const concrete=mat('concrete','#77736f');
const wallMat=mat('wall','#9a8f82');
const roofMat=mat('roof','#6f3d32');
const accent=mat('accent','#14d7e8');
const playerMat=mat('player','#d7d4c7');

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
box('sidewalkL',3,.35,70,-24,.08,0,concrete,false);
box('sidewalkR',2.6,.35,70,-5.7,.08,0,concrete,false);

// buildings left street
for(let i=0;i<6;i++){
  const z=-28+i*11;
  const h=5+(i%2)*2.2;
  box('houseL'+i,10,h,8,-31,h/2,z,wallMat);
  box('roofL'+i,10.5,.45,8.5,-31,h+.22,z,roofMat);
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

// campao obstacles
for(const p of [[8,.6,-6],[13,.8,-10],[18,.55,-14],[4,.5,-18]]){
  box('camp'+Math.random(),2.5,p[1]*2,1.6,p[0],p[1],p[2],concrete);
}
// mural final
const mural=box('mural',18,8,.8,26,4,-27,wallMat);
mural.material=mat('muralMat','#b8b0a5');

// poles
for(const z of [-28,-14,0,14,28]){
  cyl('pole'+z,.45,8,-8,4,z,concrete);
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
const pack=limbBox('pack',.68,.72,.3,rigRoot,0,.82,.34,rigAccent);

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
  if(e.code==='Space'&&!keys.Space)spacePressedAt=performance.now();
  keys[e.code]=true;
});
window.addEventListener('keyup',e=>{
  keys[e.code]=false;
  if(e.code==='Space')spaceWasDown=false;
});

let vy=0;
let grounded=false;
let climbing=false;
let parkourCooldown=0;

function forwardFlat(){
  return new BABYLON.Vector3(-Math.sin(camYaw),0,Math.cos(camYaw)).normalize();
}
function rightFlat(){
  return new BABYLON.Vector3(Math.cos(camYaw),0,Math.sin(camYaw)).normalize();
}
function playerForward(){
  return new BABYLON.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y)).normalize();
}
function rayAhead(distance=1.25,height=.7){
  const origin=player.position.add(new BABYLON.Vector3(0,height,0));
  const ray=new BABYLON.Ray(origin,playerForward(),distance);
  return scene.pickWithRay(ray,m=>m!==player&&m!==head&&m!==pack&&m.checkCollisions);
}
function rayDown(distance=1.3){
  const ray=new BABYLON.Ray(player.position.add(new BABYLON.Vector3(0,.2,0)),BABYLON.Vector3.Down(),distance);
  return scene.pickWithRay(ray,m=>m!==player&&m.checkCollisions);
}
function wallProbe(height=.45,distance=1.1){
  const dirs=[
    playerForward(),
    forwardFlat(),
    new BABYLON.Vector3(-playerForward().z,0,playerForward().x),
    new BABYLON.Vector3(playerForward().z,0,-playerForward().x)
  ];
  let best=null;
  for(const dir of dirs){
    const ray=new BABYLON.Ray(player.position.add(new BABYLON.Vector3(0,height,0)),dir,distance);
    const hit=scene.pickWithRay(ray,m=>m!==player&&m!==head&&m!==pack&&m.checkCollisions&&m.metadata?.climbable===true);
    if(hit?.hit&&(!best||hit.distance<best.distance))best={...hit,dir};
  }
  return best;
}
function hasHeadClearance(dir){
  const origin=player.position.add(new BABYLON.Vector3(0,1.75,0));
  const ray=new BABYLON.Ray(origin,dir,.85);
  const hit=scene.pickWithRay(ray,m=>m!==player&&m!==head&&m!==pack&&m.checkCollisions);
  return !(hit&&hit.hit);
}

// Mantle landing is computed from the ACTUAL climbed mesh.
// This prevents the old bug where a downward ray could find some unrelated surface.
function getMantleLanding(mesh,dir){
  const bb=mesh.getBoundingInfo().boundingBox;
  const min=bb.minimumWorld, max=bb.maximumWorld;
  const margin=.58;

  // Move a little INTO the object, then clamp to its real top footprint.
  const probe=player.position.add(dir.normalize().scale(.72));
  const x=BABYLON.Scalar.Clamp(probe.x,min.x+margin,max.x-margin);
  const z=BABYLON.Scalar.Clamp(probe.z,min.z+margin,max.z-margin);

  // Reject objects too narrow to actually stand on.
  if((max.x-min.x)<margin*2 || (max.z-min.z)<margin*2) return null;

  return new BABYLON.Vector3(x,max.y+1.07,z);
}

scene.onBeforeRenderObservable.add(()=>{
  const dt=Math.min(.033,engine.getDeltaTime()/1000);
  parkourCooldown=Math.max(0,parkourCooldown-dt);

  updateCamera(dt);

  const f=forwardFlat(),r=rightFlat();
  let move=BABYLON.Vector3.Zero();
  if(keys.KeyW||keys.ArrowUp)move.addInPlace(f);
  if(keys.KeyS||keys.ArrowDown)move.subtractInPlace(f);
  if(keys.KeyD||keys.ArrowRight)move.addInPlace(r);
  if(keys.KeyA||keys.ArrowLeft)move.subtractInPlace(r);

  const speed=(keys.ShiftLeft||keys.ShiftRight)?7.2:4.6;
  if(move.lengthSquared()>.001){
    move.normalize();
    const yaw=Math.atan2(move.x,move.z);
    player.rotation.y=BABYLON.Scalar.Lerp(player.rotation.y,yaw,.18);
    player.moveWithCollisions(move.scale(speed*dt));
  }

  const down=rayDown(1.35);
  grounded=!!(down&&down.hit);
  if(grounded&&vy<0)vy=-.5;

  // SPACE = contextual traversal, inspired by modern off-board skate movement:
  // tap = jump, hold toward almost any solid surface = grab / climb / mantle.
  const spaceHeld=!!keys.Space;
  const heldMs=spaceHeld?(performance.now()-spacePressedAt):0;
  const wallHit=spaceHeld?wallProbe(.5,1.18):null;
  let canGrab=false;
  let climbData=null;

  if(wallHit&&wallHit.hit&&wallHit.pickedMesh?.metadata?.climbable===true){
    const mesh=wallHit.pickedMesh;
    const top=mesh.getBoundingInfo().boundingBox.maximumWorld.y;
    const feet=player.position.y-1.05;
    const obstacle=top-feet;

    // Critical anti-snap rule:
    // the player must actually be BELOW the ledge.
    // If already standing on/above the object, climbing is disabled.
    if(obstacle>.28 && player.position.y < top+.72){
      canGrab=true;
      climbData={mesh,top,feet,obstacle,dir:wallHit.dir.normalize()};
    }
  }

  climbing=!!(canGrab&&heldMs>120&&parkourCooldown<=0);

  if(climbing){
    const {mesh,top,feet,obstacle,dir}=climbData;

    // Low obstacle: only mantle if clearly approaching from below.
    // No snapping when the player is already at top height / near an edge.
    if(obstacle>.28&&obstacle<1.35){
      const landing=getMantleLanding(mesh,dir);
      if(landing && landing.y > player.position.y+.12){
        player.position.copyFrom(landing);
        vy=.08;
        climbing=false;
        parkourCooldown=.42;
        keys.Space=false;
        spaceWasDown=false;
      }else{
        climbing=false;
        vy=Math.min(vy,0);
      }
    }else{
      // Taller surface: continuously climb while Space is held.
      vy=0;
      player.moveWithCollisions(new BABYLON.Vector3(0,3.6*dt,0));
      player.moveWithCollisions(dir.scale(.5*dt));

      // Mantle only after confirming there is a surface to stand on.
      if(player.position.y+1.0>=top&&player.position.y<top+.72&&hasHeadClearance(dir)){
        const landing=getMantleLanding(mesh,dir);
        if(landing){
          player.position.copyFrom(landing);
          climbing=false;
          parkourCooldown=.35;
          keys.Space=false;
          spaceWasDown=false;
          vy=.12;
        }else{
          // Hold at the lip instead of popping over.
          player.position.y=Math.min(player.position.y,top-.98);
          vy=0;
        }
      }
    }
  }else{
    // Jump fires once per press. Holding Space near a surface converts it into climbing.
    if(spaceHeld&&!spaceWasDown&&grounded){
      vy=7.4;
      spaceWasDown=true;
    }
    vy-=18*dt;
    player.moveWithCollisions(new BABYLON.Vector3(0,vy*dt,0));
  }

  const moved=player.position.subtract(lastPlayerPos);
  const horizontalSpeed=Math.sqrt(moved.x*moved.x+moved.z*moved.z)/Math.max(dt,.001);
  const moveAmount=BABYLON.Scalar.Clamp(horizontalSpeed/4.6,0,1.5);
  const isRunning=(keys.ShiftLeft||keys.ShiftRight)&&moveAmount>.1;
  const isJumping=!grounded&&!climbing;
  animateRig(dt,moveAmount,isRunning,isJumping,climbing);
  lastPlayerPos.copyFrom(player.position);

    if(player.position.y<-5)player.position.set(-16,1.2,27);
});

scene.collisionsEnabled=true;
engine.runRenderLoop(()=>scene.render());
window.addEventListener('resize',()=>engine.resize());