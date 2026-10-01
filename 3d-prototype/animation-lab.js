(async()=>{
'use strict';
const B=BABYLON,canvas=document.querySelector('#game'),engine=new B.Engine(canvas,true),scene=new B.Scene(engine);
scene.clearColor=B.Color4.FromHexString('#111829ff');scene.collisionsEnabled=true;
const status=document.querySelector('#status'),preview=document.querySelector('#preview'),keys=new Set();
const report=s=>{status.textContent=s;console.info('[UP Animation Lab]',s);};
const hemi=new B.HemisphericLight('ambient',new B.Vector3(0,1,0),scene);hemi.intensity=.85;
const sun=new B.DirectionalLight('sun',new B.Vector3(-.3,-1,.6),scene);sun.intensity=1.1;
const mat=(id,hex)=>{const m=new B.StandardMaterial(id,scene);m.diffuseColor=B.Color3.FromHexString(hex);return m};
const groundMat=mat('floor','#27353b'),cyan=mat('cyan','#14cedc'),yellow=mat('yellow','#f3bf38'),wall=mat('wall','#54606b');
const box=(name,w,h,d,x,y,z,material,solid=true)=>{
 const m=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=material;m.checkCollisions=solid;return m};
box('FLOOR',38,.5,38,0,-.25,0,groundMat);
for(let i=-9;i<=9;i++){const m=box('grid',.03,.009,38,i*2,.012,0,wall,false);m.visibility=.22;
const n=box('gridz',38,.009,.03,0,.013,i*2,wall,false);n.visibility=.22;}
for(const [n,x,z,w,h,d] of [['LOW WALL',-5,-1,3,.75,.75],['VAULT',3,-4,2,1.15,1],['CLIMB',8,1,4,2.3,1],['STEP',-4,6,3,.32,3]])
 box(n,w,h,d,x,h/2,z,n==='CLIMB'?yellow:wall);
box('combat_platform',7,.15,7,5,.075,9,groundMat);
const dummy=box('COMBAT TARGET',.9,1.8,.65,5,.98,9,cyan);
const sign=(name,text,x,y,z)=>{
 const plane=B.MeshBuilder.CreatePlane(name,{width:3,height:.7},scene);plane.position.set(x,y,z);
 const tx=new B.DynamicTexture(name+'T',{width:512,height:128},scene);const c=tx.getContext();c.fillStyle='#14202a';c.fillRect(0,0,512,128);c.font='bold 44px Arial';c.fillStyle='#68f8fc';c.textAlign='center';c.fillText(text,256,81);tx.update();const m=new B.StandardMaterial(name+'M',scene);m.diffuseTexture=tx;m.emissiveColor=new B.Color3(.6,.6,.6);m.backFaceCulling=false;plane.material=m;
};sign('sign1','COLISÕES',-5,2.2,-1);sign('sign2','PARKOUR',7,3,1);sign('sign3','COMBATE',5,3.3,9);
const collider=B.MeshBuilder.CreateBox('COLLIDER',{width:.68,height:2.12,depth:.68},scene);collider.isVisible=false;collider.checkCollisions=true;collider.ellipsoid=new B.Vector3(.36,1.04,.36);collider.ellipsoidOffset=new B.Vector3(0,0,0);collider.position.set(0,1.09,5);
let yaw=0,cameraOrbit=0,vertical=0,grounded=true,mode='idle',actionUntil=0;
const camera=new B.ArcRotateCamera('cam',Math.PI/2,1.25,7,collider.position,scene);camera.lowerRadiusLimit=4;camera.upperRadiusLimit=12;camera.wheelDeltaPercentage=.02;camera.attachControl(canvas,true);
camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
document.querySelector('#reset').onclick=()=>{collider.position.set(0,1.09,5);vertical=0;cameraOrbit=0};
document.querySelector('#camera').onclick=()=>{camera.alpha+=Math.PI/2};
// GLB's baked animations face the opposite direction from the old procedural rig.
let modelFacingOffset=0;
document.querySelector('#facing').onclick=()=>{modelFacingOffset=(modelFacingOffset+Math.PI)%(Math.PI*2);root.rotation.y=modelFacingOffset;};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
let container;
try{container=await B.SceneLoader.ImportMeshAsync('','./3d-prototype/assets/characters/player/','under_pressure_personagem_16_animacoes.glb',scene)}
catch(err){report('GLB não encontrado. Envie o arquivo do personagem com 16 animações ao GitHub. '+err.message);return}
const meshes=container.meshes.filter(m=>m.getTotalVertices?.()>0),root=container.meshes.find(m=>m.name==='__root__')||container.meshes[0],groups=container.animationGroups;
for(const g of groups)g.stop();
for(const m of meshes){m.isPickable=false;m.checkCollisions=false}
root.parent=null;root.rotationQuaternion=null;root.rotation.set(0,Math.PI,0);root.scaling.setAll(1);root.position.set(0,0,0);
root.computeWorldMatrix(true);
let min=new B.Vector3(Infinity,Infinity,Infinity),max=new B.Vector3(-Infinity,-Infinity,-Infinity);
for(const m of meshes){m.computeWorldMatrix(true);const bb=m.getBoundingInfo().boundingBox;min=B.Vector3.Minimize(min,bb.minimumWorld);max=B.Vector3.Maximize(max,bb.maximumWorld)}
const scale=2.08/(max.y-min.y);root.scaling.setAll(scale);root.computeWorldMatrix(true);
min=new B.Vector3(Infinity,Infinity,Infinity);
for(const m of meshes){m.computeWorldMatrix(true);min=B.Vector3.Minimize(min,m.getBoundingInfo().boundingBox.minimumWorld)}
const footOffset=-1.04-min.y;root.position.y=footOffset;
root.parent=collider;
root.rotation.y=modelFacingOffset;
const get=(name)=>groups.find(g=>g.name.toLowerCase()===name.toLowerCase());
const clip={idle:get('Idle_Loop'),walk:get('Walk_Loop'),jog:get('Jog_Fwd_Loop'),sprint:get('Sprint_Loop'),crouch:get('Crouch_Idle_Loop'),crouchWalk:get('Crouch_Fwd_Loop'),jumpStart:get('Jump_Start'),jumpLoop:get('Jump_Loop'),jumpLand:get('Jump_Land'),roll:get('Roll'),jab:get('Punch_Jab'),cross:get('Punch_Cross'),climb:get('ClimbUp_1m')};
groups.forEach(g=>{const o=document.createElement('option');o.value=g.name;o.textContent=g.name;preview.append(o)});
let active=null,locked=false,lastAction='',selected='';
let rolling=false,rollDirection=new B.Vector3(0,0,1),rollElapsed=0,rollDuration=.65;
let previousQ=false;
const skeletonFeet=container.transformNodes.filter(n=>/^(leftfoot|rightfoot|mixamorig.*foot)$/i.test(n.name||''));
const selectedFeet=skeletonFeet.length>=2?skeletonFeet.slice(0,2):
 (container.skeletons||[]).flatMap(sk=>sk.bones).filter(b=>/^(leftfoot|rightfoot|mixamorig.*foot)$/i.test(b.name||'')).map(b=>b.getTransformNode?.()).filter(Boolean).slice(0,2);
const localFootHeights=()=>{
 root.computeWorldMatrix(true);
 const inverse=collider.getWorldMatrix().clone().invert();
 return selectedFeet.map(n=>{n.computeWorldMatrix(true);return B.Vector3.TransformCoordinates(n.getAbsolutePosition(),inverse)});
};
// The exported Idle_Loop lifts both legs. Build a planted neutral pose by
// averaging two opposite walking phases on the SAME rig.
function createPlantedIdle(){
 if(!clip.walk)return clip.idle;
 const g=new B.AnimationGroup('Idle_Planted',scene);
 const walk=clip.walk;
 for(const track of walk.targetedAnimations){
   const src=track.animation,keys=src.getKeys();
   if(!keys.length)continue;
   const a=keys[Math.min(keys.length-1,Math.floor(keys.length*.05))].value;
   const b=keys[Math.min(keys.length-1,Math.floor(keys.length*.55))].value;
   if(a==null||b==null)continue;
   let v;
   if(src.dataType===B.Animation.ANIMATIONTYPE_QUATERNION)v=B.Quaternion.Slerp(a,b,.5).normalize();
   else if(src.dataType===B.Animation.ANIMATIONTYPE_VECTOR3)v=B.Vector3.Lerp(a,b,.5);
   else if(src.dataType===B.Animation.ANIMATIONTYPE_FLOAT)v=(a+b)/2;
   else continue;
   const anim=new B.Animation('neutral_'+src.name,src.targetProperty,30,src.dataType,B.Animation.ANIMATIONLOOPMODE_CYCLE);
   anim.setKeys([{frame:0,value:v},{frame:30,value:v.clone?.()??v}]);
   g.addTargetedAnimation(anim,track.target);
 }
 return g.targetedAnimations.length?g:clip.idle;
}
const plantedIdle=createPlantedIdle();
function idlePose(){play(plantedIdle||clip.walk,true,1);}
function visualSoleY(){
 // Deformed mesh, not the ankle joint: accounts for the size of the shoes
 // and the changing full-body pose during the roll.
 let lowest=Infinity;
 for(const m of meshes){
   try{m.refreshBoundingInfo(true)}catch(e){console.warn('[Lab] bounds refresh skipped',m.name,e);continue;}
   m.computeWorldMatrix(true);
   const y=m.getBoundingInfo()?.boundingBox?.minimumWorld?.y;
   if(Number.isFinite(y))lowest=Math.min(lowest,y);
 }
 return lowest;
}
const play=(g,loop=true,speed=1)=>{
 if(!g)return;
 if(active===g){if(!g.isPlaying){g.stop();g.start(loop,speed,g.from,g.to,false)}return;}
 for(const a of [...groups,plantedIdle])a?.stop();
 active=g;g.start(loop,speed,g.from,g.to,false);mode=g.name;
};
preview.onchange=()=>{selected=preview.value;active=null; if(selected)play(get(selected),true)};
const forward=()=>new B.Vector3(Math.sin(yaw),0,Math.cos(yaw));
const tryAction=(key,g,duration,turn=0)=>{
 if(!keys.has(key)||locked||selected||!g)return;
 locked=true;actionUntil=performance.now()+duration;
 root.rotation.y=modelFacingOffset+turn;
 play(g,false);
};
let jumpUsed=false,prevGrounded=true;
scene.onBeforeRenderObservable.add(()=>{
 const dt=Math.min(engine.getDeltaTime()/1000,.035),now=performance.now();
 if(selected){root.position.y=B.Scalar.Lerp(root.position.y,footOffset,.18);return;}
 let x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
 // Use the REAL camera forward vector, projected onto the ground.
 // W always moves AWAY from the camera; S comes toward it, A/D strafe camera-relative.
 const cameraForward=camera.getForwardRay().direction.clone();
 cameraForward.y=0;
 cameraForward.normalize();
 const cameraRight=new B.Vector3(cameraForward.z,0,-cameraForward.x);
 const move=cameraRight.scale(x).add(cameraForward.scale(z));
 const moving=move.lengthSquared()>.001;
 const speed=keys.has('KeyC')?1.4:keys.has('ShiftLeft')?5.5:2.6;
 if(moving){
   move.normalize();
   yaw=Math.atan2(move.x,move.z);
 }
 // Ground check: ray hits ONLY the solid world, never the imported visual mesh.
 const ray=new B.Ray(collider.position.add(new B.Vector3(0,.1,0)),B.Vector3.Down(),1.24);
 const hit=scene.pickWithRay(ray,m=>m.checkCollisions&&m!==collider);
 const floorY=hit?.hit?hit.pickedPoint.y:0;
 grounded=!!hit?.hit&&collider.position.y-1.06<=floorY+.12&&vertical<=.1;
 if(grounded&&vertical<0){vertical=-.15;jumpUsed=false}
 if(keys.has('Space')&&grounded&&!jumpUsed){vertical=6.5;jumpUsed=true;grounded=false;play(clip.jumpStart||clip.jumpLoop,false)}
 vertical-=18*dt;
 // Roll uses the same collision system as walking. Keep direction
 // captured at button press and advance independently of held WASD keys.
 if(rolling){
   rollElapsed+=dt;
   const t=Math.min(1,rollElapsed/rollDuration);
   const rollSpeed=7.5-(4.5*t);
   collider.moveWithCollisions(rollDirection.scale(rollSpeed*dt).add(new B.Vector3(0,vertical*dt,0)));
   if(t>=1){rolling=false;locked=false;root.rotation.y=modelFacingOffset;}
 }else{
   collider.moveWithCollisions(new B.Vector3(locked?0:move.x*speed*dt,vertical*dt,locked?0:move.z*speed*dt));
 }
 if(!locked&&moving)collider.rotation.y=yaw;
 const qHeld=keys.has('KeyQ');
 if(qHeld&&!previousQ&&grounded&&!locked&&clip.roll){
   rollDirection=(move.lengthSquared()>.1?move.clone():forward()).normalize();
   yaw=Math.atan2(rollDirection.x,rollDirection.z);collider.rotation.y=yaw;
   rolling=true;rollElapsed=0;locked=true;actionUntil=now+rollDuration*1000;
   play(clip.roll,false);
 }
 previousQ=qHeld;
 if(keys.has('KeyJ')&&grounded&&!locked){locked=true;actionUntil=now+430;play(clip.jab||clip.cross,false)}
 // Heavy and kick deliberately remain unbound until their distinct clips are exported.
 if(now>=actionUntil&&locked&&!rolling){locked=false;root.rotation.y=modelFacingOffset}
 if(!locked){
  if(!grounded){if(active!==clip.jumpStart||!active?.isPlaying)play(clip.jumpLoop||clip.idle,true)}
  else if(!prevGrounded){play(clip.jumpLand||clip.idle,false);locked=true;actionUntil=now+160}
  else if(keys.has('KeyC'))play(moving?clip.crouchWalk||clip.crouch:clip.crouch,true);
  else if(moving)play(keys.has('ShiftLeft')?clip.sprint||clip.jog:clip.walk,true);
  else idlePose();
 }
 prevGrounded=grounded;
 // Sample the lowest SKINNED MESH vertex bounds, not ankle joints.
 // Apply to planted idle and roll; keep collider physics untouched.
 const standingIdle=active===plantedIdle&&!moving&&grounded&&!locked;
 const groundVisual=(standingIdle||rolling)&&grounded;
 let soleY=null;
 if(groundVisual){
   const soleWorld=visualSoleY();
   if(Number.isFinite(soleWorld)){
     soleY=soleWorld;
     const floorWorld=collider.position.y-1.04;
     const correction=B.Scalar.Clamp(floorWorld+.025-soleWorld,-.55,1.35);
     root.position.y+=correction*Math.min(1,dt*20);
   }
 }else{
   root.position.y=B.Scalar.Lerp(root.position.y,footOffset,Math.min(1,dt*9));
 }
 const desired=collider.position.add(new B.Vector3(0,.65,0));camera.target=B.Vector3.Lerp(camera.target,desired,Math.min(1,dt*8));
 report('Animação: '+(active?.name||'nenhuma')+'\nPosição: '+collider.position.y.toFixed(2)+' m | No chão: '+grounded+'\nMovimento: '+(moving?'sim':'não')+' | Clipes: '+groups.length+'\nSola Y: '+(soleY===null?'--':soleY.toFixed(2))+' | Ajuste: '+(root.position.y-footOffset).toFixed(2)+'\nK: golpe forte — aguardando animação própria\nChute — aguardando exportação');
});
idlePose();
report('Modelo carregado: '+groups.length+' animações. Verifique Idle em prévia.');
engine.runRenderLoop(()=>{try{scene.render()}catch(err){console.error('[Animation Lab] Render error',err);report('ERRO DE EXECUÇÃO: '+err.message)}});window.addEventListener('resize',()=>engine.resize());
})();