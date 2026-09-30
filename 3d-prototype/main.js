const canvas=document.getElementById('renderCanvas');
const BUILD='PARKOUR CORE V19';
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
let wasGrounded=false;
let airTime=0;
let landTimer=0;

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
  return new BABYLON.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y)).normalize();
}
function rayDown(distance=1.35){
  const ray=new BABYLON.Ray(
    player.position.add(new BABYLON.Vector3(0,.18,0)),
    BABYLON.Vector3.Down(),
    distance
  );
  return scene.pickWithRay(ray,m=>m!==player&&m.checkCollisions);
}
function probeWall(distance=1.05,height=.45){
  const dir=playerForward();
  const ray=new BABYLON.Ray(
    player.position.add(new BABYLON.Vector3(0,height,0)),
    dir,
    distance
  );
  const hit=scene.pickWithRay(ray,m=>
    m!==player&&m!==head&&m!==pack&&m.checkCollisions&&m.metadata?.climbable===true
  );
  if(!hit?.hit)return null;
  return {...hit,dir};
}
function obstacleData(hit){
  const mesh=hit.pickedMesh;
  const bb=mesh.getBoundingInfo().boundingBox;
  const top=bb.maximumWorld.y;
  const feet=player.position.y-1.05;
  return {mesh,top,feet,height:top-feet,dir:hit.dir.normalize(),bb};
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

  // keep the collider just outside the wall instead of pushing through it
  const back=data.dir.scale(-.08);
  player.position.addInPlace(back);
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

    // climb vertically while hugging the same wall
    player.position.y+=3.05*dt;

    // Reach the lip -> transition to a real hanging state, not a snap.
    if(player.position.y+1.0>=activeObstacle.top-.03){
      beginHang();
    }
    return true;
  }

  if(parkourState==='hang'){
    stateTimer+=dt;
    vy=0;

    // visually/physically remain under the ledge
    player.position.y=activeObstacle.top-.78;

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

  const down=rayDown(1.34);
  grounded=!!(down&&down.hit);

  if(grounded){
    if(!wasGrounded&&airTime>.18)landTimer=.16;
    airTime=0;
  }else{
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
  if(parkourState==='normal'&&spaceHeld&&heldMs>110&&parkourCooldown<=0){
    const hit=probeWall(1.08,.48);
    if(hit){
      const data=obstacleData(hit);

      // Must genuinely be below the top. This blocks the old edge re-snap bug.
      if(data.height>.42&&player.position.y<data.top+.30){
        if(data.height<1.38)beginVault(data);
        else if(data.height<6.2)beginClimb(data);
      }
    }
  }

  const manualParkour=updateManualParkour(dt,spaceHeld);

  if(!manualParkour){
    // Horizontal motion remains collision-based.
    if(moveVelocity.lengthSquared()>.0001){
      player.moveWithCollisions(moveVelocity.scale(dt));
    }

    // Jump only on initial press.
    if(spaceHeld&&!spaceWasDown&&grounded){
      vy=7.5;
      spaceWasDown=true;
    }

    if(!grounded||vy>0){
      vy-=18.5*dt;
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
  const isJumping=!grounded&&parkourState==='normal';
  const isClimbing=['climb','hang','mantle'].includes(parkourState);

  animateRig(dt,moveAmount,running&&moveAmount>.1,isJumping,isClimbing);

  // Extra readability for landing and mantle.
  if(landTimer>0){
    const k=landTimer/.16;
    torso.rotation.x+=.18*k;
    lKnee.rotation.x+=.22*k;
    rKnee.rotation.x+=.22*k;
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