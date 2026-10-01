(async()=>{
"use strict";
const B=BABYLON,canvas=document.querySelector("#game"),ui=document.querySelector("#status"),preview=document.querySelector("#preview");
const engine=new B.Engine(canvas,true,{adaptToDeviceRatio:true}),scene=new B.Scene(engine);scene.clearColor=B.Color4.FromHexString("#101926ff");
scene.collisionsEnabled=true;
const hemi=new B.HemisphericLight("ambient",new B.Vector3(0,1,0),scene);hemi.intensity=.9;
const sun=new B.DirectionalLight("key",new B.Vector3(-.5,-1,.25),scene);sun.intensity=.95;
function material(name,hex){const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(hex);return m}
const floorMat=material("floor","#364c55"),obstacleMat=material("obstacle","#778899"),gold=material("parkour","#ecc243"),cyan=material("combat","#15c2cc");
function box(name,x,y,z,w,h,d,mat,solid=true){
 const m=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=mat;m.checkCollisions=solid;return m;
}
const ground=box("GROUND",0,-.25,0,40,.5,40,floorMat);
for(let i=-10;i<=10;i++){const a=box("lineX",i*2,.004,0,.025,.008,40,obstacleMat,false);a.visibility=.25;
const b=box("lineZ",0,.005,i*2,40,.008,.025,obstacleMat,false);b.visibility=.25}
box("LOW WALL",-5,.45,0,3,.9,1,obstacleMat);
box("VAULT",3,.65,-4,3,1.3,1,obstacleMat);
box("CLIMB",8,1.4,0,4,2.8,1,gold);
box("STEP",-4,.2,7,3,.4,3,obstacleMat);
box("COMBAT TARGET",5,.92,8,1,1.85,.8,cyan);
const collider=B.MeshBuilder.CreateBox("PLAYER_COLLIDER",{width:.65,height:2.08,depth:.65},scene);
collider.position=new B.Vector3(0,1.055,5);collider.isVisible=false;collider.checkCollisions=true;
collider.ellipsoid=new B.Vector3(.32,1.02,.32);collider.ellipsoidOffset=B.Vector3.Zero();
const camera=new B.ArcRotateCamera("camera",Math.PI/2,1.24,7,collider.position,scene);
camera.lowerRadiusLimit=3;camera.upperRadiusLimit=12;camera.wheelDeltaPercentage=.018;camera.attachControl(canvas,true);
camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
const keys=new Set(),edge=new Set();
addEventListener("keydown",e=>{if(["Space","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault();if(!keys.has(e.code))edge.add(e.code);keys.add(e.code)});
addEventListener("keyup",e=>keys.delete(e.code));
addEventListener("blur",()=>{keys.clear();edge.clear()});
canvas.addEventListener("pointerdown",e=>{
 if(e.button===0)edge.add("MouseLeft");
 if(e.button===2)edge.add("MouseRight");
});
canvas.addEventListener("contextmenu",e=>e.preventDefault());
let model;
try{model=await B.SceneLoader.ImportMeshAsync("","./3d-prototype/assets/characters/player/","under_pressure_personagem_16_animacoes.glb",scene)}
catch(e){ui.textContent="Não foi possível carregar o modelo: "+e.message;return}
const meshes=model.meshes.filter(m=>m.getTotalVertices?.()>0);
const root=model.meshes.find(m=>m.name==="__root__")||model.meshes[0];
const groups=model.animationGroups;groups.forEach(g=>g.stop());
for(const m of meshes){m.checkCollisions=false;m.isPickable=false}
root.parent=null;root.rotationQuaternion=null;root.rotation.set(0,0,0);root.scaling.setAll(1);root.position.set(0,0,0);
function bounds(){
 let low=Infinity,high=-Infinity;
 for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;low=Math.min(low,b.minimumWorld.y);high=Math.max(high,b.maximumWorld.y)}
 return {low,high}
}
const initial=bounds(),scale=2.08/(initial.high-initial.low);root.scaling.setAll(scale);
const fitted=bounds(),restY=-1.02-fitted.low;root.position.y=restY;root.parent=collider;
let facing=0,yaw=0,vertical=0,velocity=B.Vector3.Zero(),grounded=true,lastGrounded=true;
const GROUPS=new Map(groups.map(g=>[g.name.toLowerCase(),g]));
const get=n=>GROUPS.get(n.toLowerCase())||null;
const C={idle:get("Idle_Loop"),walk:get("Walk_Loop"),jog:get("Jog_Fwd_Loop"),run:get("Sprint_Loop"),crouch:get("Crouch_Idle_Loop"),crouchMove:get("Crouch_Fwd_Loop"),jumpStart:get("Jump_Start"),jumpLoop:get("Jump_Loop"),jumpLand:get("Jump_Land"),roll:get("Roll"),jab:get("Punch_Jab"),cross:get("Punch_Cross"),slideStart:get("Slide_Start"),slideLoop:get("Slide_Loop"),slideExit:get("Slide_Exit"),climb:get("ClimbUp_1m")};
// A one-frame planted pose is a temporary stopgap, not a claim that the
// source Idle is correct. Remove root/pelvis translations to avoid floating.
function planted(){
 const source=C.walk;if(!source)return C.idle;
 const g=new B.AnimationGroup("NEUTRAL_TEMP",scene);
 for(const {target,animation:a} of source.targetedAnimations){
  if(!a.getKeys().length)continue;
  const key=a.getKeys(),p0=key[Math.floor((key.length-1)*.05)].value,p1=key[Math.floor((key.length-1)*.55)].value;
  let value;
  if(a.dataType===B.Animation.ANIMATIONTYPE_QUATERNION)value=B.Quaternion.Slerp(p0,p1,.5).normalize();
  else if(a.dataType===B.Animation.ANIMATIONTYPE_VECTOR3){value=B.Vector3.Lerp(p0,p1,.5);
    // Preserve the rig's calibrated hip height; only the outer collider owns
    // world movement (the GLB was baked from an in-place retarget).
  }
  else if(a.dataType===B.Animation.ANIMATIONTYPE_FLOAT)value=(p0+p1)/2;
  else continue;
  const copy=new B.Animation("neutral_"+a.name,a.targetProperty,30,a.dataType);
  copy.setKeys([{frame:0,value},{frame:30,value:value.clone?.()??value}]);
  g.addTargetedAnimation(copy,target);
 }
 return g.targetedAnimations.length?g:C.idle;
}
C.neutral=planted();
// Upper-body attack: no hips, legs or imported root tracks. Base locomotion
// continues underneath with its original speed and pose.
function upperClip(src,label){
 if(!src)return null;
 const g=new B.AnimationGroup(label,scene);
 for(const t of src.targetedAnimations){
  const name=(t.target?.name||"").toLowerCase();
  if(/^(spine|chest|neck|head|leftshoulder|rightshoulder|leftarm|rightarm|leftforearm|rightforearm|lefthand|righthand)/.test(name)){
   g.addTargetedAnimation(t.animation.clone(),t.target);
  }
 }
 return g.targetedAnimations.length?g:null;
}
C.upperJab=upperClip(C.jab,"UPPER_JAB");C.upperCross=upperClip(C.cross,"UPPER_CROSS");

// Disjoint animation sets avoid two full-strength groups fighting for the
// same bone. Lower body stays at weight 1 while attacking and can keep walking.
const locomotionPairs=new Map();
function isUpperBone(name){
 return /^(spine|chest|neck|head|leftshoulder|rightshoulder|leftarm|rightarm|leftforearm|rightforearm|lefthand|righthand)/i.test(name||"");
}
function ensureSplit(group){
 if(!group)return null;
 if(locomotionPairs.has(group))return locomotionPairs.get(group);
 const low=new B.AnimationGroup("LOW_"+group.name,scene),up=new B.AnimationGroup("UP_"+group.name,scene);
 for(const t of group.targetedAnimations){
   (isUpperBone(t.target?.name)?up:low).addTargetedAnimation(t.animation.clone(),t.target);
 }
 const pair={low:low.targetedAnimations.length?low:null,up:up.targetedAnimations.length?up:null};
 locomotionPairs.set(group,pair);
 return pair;
}
for(const g of [C.neutral,C.idle,C.walk,C.jog,C.run,C.crouch,C.crouchMove,C.jumpStart,C.jumpLoop,C.jumpLand,C.slideStart,C.slideLoop,C.slideExit,C.climb])
 ensureSplit(g);
let base=null,baseWeight=1,previousBase=null,blendUntil=0;
let overlay=null,overlayStart=0,overlayDuration=0,combo=0,queuedPunch=null;
let roll=false,rollTimer=0,rollDir=B.Vector3.Zero(),jumpTime=0,landTimer=0;
let actionState="",actionTimer=0,actionDuration=0,actionClip=null,actionStart=null,actionEnd=null,actionDir=B.Vector3.Zero();
let lastSpace=-Infinity,jumpPhase="none",jumpLandedUntil=0;
let rootCalibration=0,groundDiagnostic=0;
let punchHeld=false;
function startGroup(g,loop=true,speed=1,weight=1){
 if(!g)return;
 g.start(loop,speed,g.from,g.to,false);
 g.setWeightForAllAnimatables(weight);
}
let attackBlend=0;
function stopBase(g){const p=locomotionPairs.get(g);p?.low?.stop();p?.up?.stop()}
function setBaseWeights(g,weight){
 const p=locomotionPairs.get(g);if(!p)return;
 p.low?.setWeightForAllAnimatables(Math.max(0,weight));
 p.up?.setWeightForAllAnimatables(Math.max(0,weight*(1-attackBlend)));
}
function baseTo(next,now){
 if(!next||base===next)return;
 if(previousBase&&previousBase!==base)stopBase(previousBase);
 previousBase=base;base=next;blendUntil=now+220;
 const p=ensureSplit(base);
 if(p?.low)startGroup(p.low,true,1,.001);
 if(p?.up)startGroup(p.up,true,1,.001);
}
function updateBlend(now){
 const t=B.Scalar.Clamp(1-(blendUntil-now)/220,0,1);
 if(base)setBaseWeights(base,t);
 if(previousBase){setBaseWeights(previousBase,1-t);
   if(t>=1){stopBase(previousBase);previousBase=null}
 }
}
function hit(now){
 if(!grounded||roll||actionState||overlay||!C.upperJab)return;
 overlay=queuedPunch||((combo++%2===0)?C.upperJab:(C.upperCross||C.upperJab));queuedPunch=null;
 overlayStart=now;overlayDuration=overlay===C.upperCross?480:410;
 startGroup(overlay,false,1,.001);
}
function updateHit(now){
 if(!overlay)return;
 const t=(now-overlayStart)/overlayDuration;
 if(t>=1){overlay.stop();overlay=null;attackBlend=0;return}
 const w=Math.max(0,Math.min(1,t/.17,(1-t)/.25));
 attackBlend=.72*Math.max(0,w);
 overlay.setWeightForAllAnimatables(attackBlend);
 // Keep legs running at full weight, only fade base upper skeleton.
 if(base||previousBase)updateBlend(now);
}
function getShoeY(){
 // Deforming mesh bounds can be expensive and include hands in rolls;
 // for idle use the lower of the two actual foot bones, then apply shoe offset.
 const feet=model.transformNodes.filter(n=>/^(leftfoot|rightfoot)$/i.test(n.name||""));
 if(feet.length<2)return null;
 let lowest=Infinity;
 for(const f of feet){f.computeWorldMatrix(true);lowest=Math.min(lowest,f.getAbsolutePosition().y)}
 return lowest;
}
let soleCorrection=0,groundSample=0;
function actualModelBottom(){
 let min=Infinity;
 for(const mesh of meshes){
   // Babylon refreshes the skinned bounding box from current bone matrices.
   mesh.refreshBoundingInfo(true);
   mesh.computeWorldMatrix(true);
   const y=mesh.getBoundingInfo()?.boundingBox?.minimumWorld?.y;
   if(Number.isFinite(y))min=Math.min(min,y);
 }
 return Number.isFinite(min)?min:null;
}
const footNodes=model.transformNodes.filter(n=>/^(leftfoot|rightfoot)$/i.test(n.name||""));
const toeNodes=model.transformNodes.filter(n=>/^(lefttoebase|righttoebase|lefttoe|righttoe)$/i.test(n.name||""));
function groundVisual(dt,still){
 if(!grounded){soleCorrection=B.Scalar.Lerp(soleCorrection,0,Math.min(1,dt*9));root.position.y=restY+soleCorrection;return}
 // All animations, including the roll, are grounded against the real
 // skinned visual geometry. Never move the physics capsule to fit an animation.
 const bottom=actualModelBottom();
 groundDiagnostic=bottom??0;
 if(bottom!==null){
   const floor=collider.position.y-1.02;
   const error=B.Scalar.Clamp(floor+.018-bottom,-.24,.24);
   soleCorrection=B.Scalar.Clamp(soleCorrection+error*Math.min(1,dt*(roll||actionState?19:14)),-1.65,.55);
 }
 root.position.y=restY+soleCorrection;
}
const ALL=[...groups,C.neutral,C.upperJab,C.upperCross].filter(Boolean);
for(const g of groups){const op=document.createElement("option");op.value=g.name;op.textContent=g.name;preview.append(op)}

function horizontalFacing(){return new B.Vector3(Math.sin(collider.rotation.y),0,Math.cos(collider.rotation.y))}
function obstacleAhead(){
 const origin=collider.position.add(new B.Vector3(0,.05,0)),dir=horizontalFacing();
 const ray=new B.Ray(origin,dir,1.55);
 const hit=scene.pickWithRay(ray,m=>m.checkCollisions&&m!==collider&&m!==ground&&m.name!=="COMBAT TARGET");
 if(!hit?.hit)return null;
 const bbox=hit.pickedMesh.getBoundingInfo().boundingBox;
 const top=bbox.maximumWorld.y,feet=collider.position.y-1.02;
 return {top,height:top-feet,mesh:hit.pickedMesh,dir,point:hit.pickedPoint};
}
function beginAction(type,clip,duration,dir,end=null){
 if(!clip||roll||actionState)return false;
 actionState=type;actionClip=clip;actionTimer=0;actionDuration=duration;
 actionDir=dir.clone();actionStart=collider.position.clone();actionEnd=end;
 if(overlay){overlay.stop();overlay=null;attackBlend=0}
 stopBase(base);stopBase(previousBase);base=null;previousBase=null;
 startGroup(clip,false,1,1);
 return true;
}
function finishAction(){
 actionClip?.stop();actionClip=null;
 actionState="";actionEnd=null;base=null;previousBase=null;
}
function actionStep(dt){
 actionTimer+=dt;const t=B.Scalar.Clamp(actionTimer/actionDuration,0,1);
 if(actionState==="climb"&&actionEnd){
   const eased=t*t*(3-2*t),next=B.Vector3.Lerp(actionStart,actionEnd,eased);
   // collision checks on displacement, separate from the rig's authored root motion
   collider.moveWithCollisions(next.subtract(collider.position));
 }else if(actionState==="slide"){
   collider.moveWithCollisions(actionDir.scale((6.9-2.8*t)*dt).add(new B.Vector3(0,vertical*dt,0)));
   if(t>.27&&t<.73&&C.slideLoop&&actionClip!==C.slideLoop){
     actionClip.stop();actionClip=C.slideLoop;startGroup(actionClip,true,1);
   }
   if(t>.77&&C.slideExit&&actionClip!==C.slideExit){
     actionClip.stop();actionClip=C.slideExit;startGroup(actionClip,false,1);
   }
 }
 if(t>=1)finishAction();
}
let selected="",previewClip=null;
preview.onchange=()=>{selected=preview.value;if(previewClip){previewClip.stop();previewClip=null}
 for(const g of ALL)g.stop();
 if(actionClip){actionClip.stop();actionClip=null};actionState="";roll=false;
 for(const p of locomotionPairs.values()){p.low?.stop();p.up?.stop()};
 base=null;previousBase=null;overlay=null;
 if(selected){previewClip=get(selected);if(previewClip)startGroup(previewClip,true)}
};
document.querySelector("#reset").onclick=()=>{collider.position.set(0,1.055,5);velocity.set(0,0,0);vertical=0;roll=false;finishAction();edge.clear()};
document.querySelector("#camera").onclick=()=>camera.alpha+=Math.PI/2;
document.querySelector("#facing").onclick=()=>{facing=(facing+Math.PI)%(2*Math.PI);root.rotation.y=facing};
const vmove=B.Vector3.Zero();
let prevX=0;
scene.onBeforeRenderObservable.add(()=>{
 const dt=Math.min(.035,engine.getDeltaTime()/1000),now=performance.now();
 if(selected){edge.clear();return}
 // Camera-relative movement; orientation established in V3, don't flip it again.
 const forward=camera.getForwardRay().direction.clone();forward.y=0;forward.normalize();
 const right=new B.Vector3(forward.z,0,-forward.x);
 let x=Number(keys.has("KeyD"))-Number(keys.has("KeyA")),z=Number(keys.has("KeyW"))-Number(keys.has("KeyS"));
 const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);
 if(pad){x+=(Math.abs(pad.axes[0])>.18?pad.axes[0]:0);z-=(Math.abs(pad.axes[1])>.18?pad.axes[1]:0)}
 // Controller: A jump, B dodge, X jab, Y cross, LB crouch, RB sprint.
 const down=i=>!!pad?.buttons?.[i]?.pressed;
 if(pad){
  for(const [index,key] of [[0,"Space"],[1,"KeyQ"],[2,"KeyJ"],[3,"KeyK"],[4,"ControlLeft"]]){
   const tag="Pad"+index;
   if(down(index)&&!keys.has(tag)){edge.add(key);keys.add(tag)}
   if(!down(index))keys.delete(tag);
  }
 }
 const wish=right.scale(x).add(forward.scale(z));const moving=wish.lengthSquared()>.001;
 if(moving)wish.normalize();
 const speed=(keys.has("ControlLeft")||keys.has("ControlRight")||keys.has("KeyC")||down(4))?1.45:((keys.has("ShiftLeft")||keys.has("ShiftRight")||down(5))?5.2:2.8);
 const targetVelocity=moving?wish.scale(speed):B.Vector3.Zero();
 velocity=B.Vector3.Lerp(velocity,targetVelocity,1-Math.exp(-(moving?13:17)*dt));
 if(moving&&!roll&&!actionState){yaw=Math.atan2(wish.x,wish.z);const diff=Math.atan2(Math.sin(yaw-collider.rotation.y),Math.cos(yaw-collider.rotation.y));collider.rotation.y+=diff*Math.min(1,dt*13)}
 // Floor detection uses a downward RAY and collision response, not animation data.
 const ray=new B.Ray(collider.position.add(new B.Vector3(0,.10,0)),B.Vector3.Down(),1.25);
 const hitFloor=scene.pickWithRay(ray,m=>m.checkCollisions&&m!==collider);
 const foot=collider.position.y-1.02;
 grounded=!!hitFloor?.hit&&foot<=hitFloor.pickedPoint.y+.13&&vertical<=.1;
 if(grounded&&vertical<0)vertical=-.3;

 // CONTEXTUAL PARKOUR: Space near low ledge vaults; E near tall wall climbs.
 if(edge.has("KeyE")&&grounded&&!roll&&!actionState){
   const obstacle=obstacleAhead();
   if(obstacle&&obstacle.height>.65&&obstacle.height<3.4&&C.climb){
     const finish=collider.position.add(obstacle.dir.scale(1.9));
     finish.y=obstacle.top+1.04;
     beginAction("climb",C.climb,.92,obstacle.dir,finish);
   }
 }
 if(edge.has("Space")&&grounded&&!roll&&!actionState){
   const obstacle=obstacleAhead();
   if(obstacle&&obstacle.height>.35&&obstacle.height<1.45&&C.climb){
     const finish=collider.position.add(obstacle.dir.scale(1.8));
     finish.y=obstacle.top+1.04;
     beginAction("climb",C.climb,.72,obstacle.dir,finish);
   }else{vertical=6.35;grounded=false;jumpTime=now;landTimer=0;jumpPhase="start"}
 }
 if(edge.has("KeyQ")&&grounded&&!roll&&!actionState&&C.roll){
   roll=true;rollTimer=0;rollDir=moving?wish.clone():horizontalFacing();
   collider.rotation.y=Math.atan2(rollDir.x,rollDir.z);
   if(overlay){overlay.stop();overlay=null;attackBlend=0}
   for(const g of [base,previousBase])stopBase(g);base=null;previousBase=null;
   startGroup(C.roll,false,1,1);
 }
 if((edge.has("ControlLeft")||edge.has("ControlRight")||edge.has("KeyC"))&&
    grounded&&!actionState&&!roll&&velocity.length()>3.6&&C.slideStart){
    beginAction("slide",C.slideStart,.86,moving?wish:horizontalFacing());
 }
 if(edge.has("MouseLeft")||edge.has("KeyJ")){
   queuedPunch=C.upperJab;hit(now);
 }
 if(edge.has("MouseRight")||edge.has("KeyK")){
   queuedPunch=C.upperCross||C.upperJab;hit(now);
 }
 edge.clear();
 vertical-=18.7*dt;
 if(actionState){actionStep(dt)}
 else if(roll){
  rollTimer+=dt;const t=Math.min(1,rollTimer/.65),v=7.4-4.2*t;
  collider.moveWithCollisions(rollDir.scale(v*dt).add(new B.Vector3(0,vertical*dt,0)));
  if(t>=1){roll=false;C.roll.stop();base=null}
 }else collider.moveWithCollisions(velocity.scale(dt).add(new B.Vector3(0,vertical*dt,0)));
 if(!roll&&!actionState){
   let next;
   if(!grounded){next=now-jumpTime<260?C.jumpStart:(C.jumpLoop||C.neutral)}
   else if(!lastGrounded&&C.jumpLand){jumpLandedUntil=now+180;next=C.jumpLand}
   else if(now<jumpLandedUntil&&C.jumpLand)next=C.jumpLand
   else if(keys.has("ControlLeft")||keys.has("ControlRight")||keys.has("KeyC"))next=(velocity.length()> .24?C.crouchMove:C.crouch)||C.neutral;
   else if(velocity.length()>4.2)next=C.run||C.jog||C.walk;
   else if(velocity.length()>2.9)next=C.jog||C.walk;
   else if(velocity.length()>.22)next=C.walk;
   else next=C.neutral||C.idle;
   baseTo(next,now);updateBlend(now);
 }
 updateHit(now);
 groundVisual(dt,!moving&&grounded&&!roll);
 camera.target=B.Vector3.Lerp(camera.target,collider.position.add(new B.Vector3(0,.6,0)),Math.min(1,dt*9));
 ui.textContent="ANIMATION LAB V13 | "+(base?.name||(roll?"Roll":"--"))+
 "\\nChão: "+grounded+" | Altura: "+collider.position.y.toFixed(2)+" | Pés: "+footNodes.length+
 "\\nDeslocamento: "+velocity.length().toFixed(1)+" m/s | Ataque: "+(overlay?.name||"não")+
 "\\nQ rolar | E escalar | Espaço pular/vault | Ctrl deslizar/agachar"+
 "\\nClique esquerdo/J jab | direito/K direto | Chute: arquivo pendente";
});
baseTo(C.neutral||C.idle,performance.now());
engine.runRenderLoop(()=>{try{scene.render()}catch(e){ui.textContent="ERRO: "+e.message;console.error(e)}});
addEventListener("resize",()=>engine.resize());
})();