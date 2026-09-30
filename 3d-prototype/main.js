const canvas=document.getElementById('renderCanvas');
const BUILD='PARKOUR V15';
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

// player capsule
const player=BABYLON.MeshBuilder.CreateCapsule('player',{height:2.1,radius:.42},scene);
player.position=new BABYLON.Vector3(-16,1.2,27);
player.material=playerMat;
player.checkCollisions=true;
player.ellipsoid=new BABYLON.Vector3(.42,1.0,.42);

const head=BABYLON.MeshBuilder.CreateSphere('head',{diameter:.7},scene);
head.parent=player;head.position.y=.75;head.material=playerMat;
const pack=box('pack',.7,.85,.32,0,0,0,accent);pack.parent=player;pack.position.set(0,.15,.46);pack.checkCollisions=false;

// camera — simple deterministic third-person orbit.
// No pointer lock, no click, no auto-recentering, no hidden inversion.
const camera=new BABYLON.FreeCamera('cam',new BABYLON.Vector3(0,3,-8),scene);
camera.minZ=.1;

let camYaw=0;
let camPitch=.16;
let camDistance=7.2;
let lastMouseX=null;
let lastMouseY=null;

const CAM_X=.0042;
const CAM_Y=.0034;

document.addEventListener('mousemove',e=>{
  if(lastMouseX===null){
    lastMouseX=e.clientX;
    lastMouseY=e.clientY;
    return;
  }

  const dx=e.clientX-lastMouseX;
  const dy=e.clientY-lastMouseY;
  lastMouseX=e.clientX;
  lastMouseY=e.clientY;

  if(Math.abs(dx)>140||Math.abs(dy)>140)return;

  // Natural PC controls:
  // mouse right -> look right
  // mouse up    -> look up
  camYaw-=dx*CAM_X;
  camPitch=BABYLON.Scalar.Clamp(camPitch+dy*CAM_Y,-.38,.48);
});

window.addEventListener('blur',()=>{lastMouseX=null;lastMouseY=null});
document.addEventListener('mouseleave',()=>{lastMouseX=null;lastMouseY=null});

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
  const canGrab=wallHit&&wallHit.hit&&wallHit.pickedMesh?.metadata?.climbable!==false;
  climbing=!!(canGrab&&heldMs>120&&parkourCooldown<=0);

  if(climbing){
    const mesh=wallHit.pickedMesh;
    const top=mesh.getBoundingInfo().boundingBox.maximumWorld.y;
    const feet=player.position.y-1.05;
    const obstacle=top-feet;
    const dir=wallHit.dir.normalize();

    // Low obstacle: mantle only if there is a real top/landing surface.
    if(obstacle>0&&obstacle<1.35){
      const landing=getMantleLanding(mesh,dir);
      if(landing){
        player.position.copyFrom(landing);
        vy=.15;
        climbing=false;
        parkourCooldown=.28;
        keys.Space=false;
        spaceWasDown=false;
      }else{
        // No support above: do not drop/teleport into empty space.
        vy=0;
      }
    }else{
      // Taller surface: continuously climb while Space is held.
      vy=0;
      player.moveWithCollisions(new BABYLON.Vector3(0,3.6*dt,0));
      player.moveWithCollisions(dir.scale(.5*dt));

      // Mantle only after confirming there is a surface to stand on.
      if(player.position.y+1.0>=top&&hasHeadClearance(dir)){
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

  if(player.position.y<-5)player.position.set(-16,1.2,27);
});

scene.collisionsEnabled=true;
engine.runRenderLoop(()=>scene.render());
window.addEventListener('resize',()=>engine.resize());