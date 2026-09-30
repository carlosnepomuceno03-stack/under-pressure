const canvas=document.getElementById('renderCanvas');
const BUILD='UI MENU AUDIO V44';
const buildEl=document.getElementById('buildTag');
if(buildEl)buildEl.textContent=BUILD;
const engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
const scene=new BABYLON.Scene(engine);
scene.clearColor=new BABYLON.Color4(.025,.035,.075,1);
scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity=.0048;
scene.fogColor=new BABYLON.Color3(.045,.06,.12);
scene.imageProcessingConfiguration.exposure=1.08;
scene.imageProcessingConfiguration.contrast=1.34;
scene.imageProcessingConfiguration.vignetteEnabled=true;
scene.imageProcessingConfiguration.vignetteWeight=1.25;
scene.imageProcessingConfiguration.vignetteStretch=.18;
scene.imageProcessingConfiguration.vignetteColor=new BABYLON.Color4(.02,.025,.045,1);
scene.imageProcessingConfiguration.vignetteBlendMode=BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;

const light=new BABYLON.HemisphericLight('hemi',new BABYLON.Vector3(0,1,0),scene);
light.intensity=.46;
light.diffuse=new BABYLON.Color3(.34,.44,.72);
light.groundColor=new BABYLON.Color3(.22,.12,.10);

const sun=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-.45,-1,.35),scene);
sun.position=new BABYLON.Vector3(25,35,-20);
sun.intensity=.82;
sun.diffuse=new BABYLON.Color3(1,.48,.20);

// Stylized sunset sky dome — cheap, browser/mobile friendly.
const skyTex=new BABYLON.DynamicTexture('skyTex',{width:1024,height:512},scene,false);
const skyCtx=skyTex.getContext();
const skyGrad=skyCtx.createLinearGradient(0,0,0,512);
skyGrad.addColorStop(0,'#10162e');
skyGrad.addColorStop(.38,'#273457');
skyGrad.addColorStop(.68,'#8a5260');
skyGrad.addColorStop(.86,'#d77a55');
skyGrad.addColorStop(1,'#f0a15f');
skyCtx.fillStyle=skyGrad;skyCtx.fillRect(0,0,1024,512);
for(let i=0;i<90;i++){
  skyCtx.globalAlpha=.16+(i%5)*.03;
  skyCtx.fillStyle=i%3===0?'#ffd1a0':'#687399';
  const x=(i*127)%1024,y=60+(i*47)%300;
  skyCtx.fillRect(x,y,18+(i%7)*16,1+(i%3));
}
skyCtx.globalAlpha=1;skyTex.update();

const skyMat=new BABYLON.StandardMaterial('skyMat',scene);
skyMat.diffuseTexture=skyTex;
skyMat.emissiveTexture=skyTex;
skyMat.disableLighting=true;
skyMat.backFaceCulling=false;
skyMat.specularColor=BABYLON.Color3.Black();

const sky=BABYLON.MeshBuilder.CreateSphere('sky',{diameter:170,segments:18,sideOrientation:BABYLON.Mesh.BACKSIDE},scene);
sky.material=skyMat;sky.isPickable=false;sky.checkCollisions=false;

const mat=(name,hex)=>{
  const m=new BABYLON.StandardMaterial(name,scene);
  m.diffuseColor=BABYLON.Color3.FromHexString(hex);
  m.specularColor=new BABYLON.Color3(.05,.05,.05);
  return m;
};
const asphalt=mat('asphalt','#151923');
const dirt=mat('dirt','#8e472d');
const concrete=mat('concrete','#8d8982');
const wallMat=mat('wall','#3f424b');
const roofMat=mat('roof','#63382f');
const accent=mat('accent','#14d7e8');
const playerMat=mat('player','#d7d4c7');

const wallLight=mat('wallLight','#67656b');
const wallDark=mat('wallDark','#262932');
const brickMat=mat('brick','#4c3337');
const metalMat=mat('metal','#4f555c');
const woodMat=mat('wood','#6d4934');
const plantMat=mat('plant','#304b2d');
const plantLight=mat('plantLight','#46633a');
const tireMat=mat('tire','#15171a');
const bluePaint=mat('bluePaint','#13516d');
const yellowPaint=mat('yellowPaint','#f1bd22');
const curbMat=mat('curb','#c1bdb4');

function emissiveMat(name,hex,intensity=1){
  const m=mat(name,hex);
  const c=BABYLON.Color3.FromHexString(hex);
  m.emissiveColor=c.scale(intensity);
  return m;
}
const warmGlow=emissiveMat('warmGlow','#ffb35a',.85);
const cyanGlow=emissiveMat('cyanGlow','#41e7ff',.75);

function makeSurfaceTexture(name,bg,marks=[]){
  const tex=new BABYLON.DynamicTexture(name,{width:512,height:512},scene,false);
  const c=tex.getContext();
  c.fillStyle=bg;c.fillRect(0,0,512,512);
  for(let i=0;i<180;i++){
    const m=marks[i%Math.max(1,marks.length)]||'rgba(255,255,255,.03)';
    c.fillStyle=m;
    const x=(i*83)%512,y=(i*137)%512;
    const w=3+(i%7)*9,h=2+(i%5)*3;
    c.globalAlpha=.22+(i%4)*.05;
    c.fillRect(x,y,w,h);
  }
  c.globalAlpha=1;tex.update();
  tex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;
  tex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
  tex.uScale=3;tex.vScale=6;
  return tex;
}
asphalt.diffuseTexture=makeSurfaceTexture('asphaltTex','#171b26',['#252b38','#0d1016','#343847']);
asphalt.specularColor=new BABYLON.Color3(.52,.48,.44);
asphalt.specularPower=96;
dirt.diffuseTexture=makeSurfaceTexture('dirtTex','#8d452e',['#6d3424','#a85a3d','#7a3a27']);
wallMat.diffuseTexture=makeSurfaceTexture('wallTex','#3e424c',['#2b303a','#54555e','#20242c']);
wallLight.diffuseTexture=makeSurfaceTexture('wallLightTex','#67666c',['#79777d','#4c4e55','#363941']);
concrete.diffuseTexture=makeSurfaceTexture('concreteTex','#8b8781',['#77736e','#a09a92','#66625e']);
roofMat.diffuseTexture=makeSurfaceTexture('roofTex','#61362f',['#7b493e','#4c2a25','#8b5143']);

const glowLayer=new BABYLON.GlowLayer('worldGlow',scene,{blurKernelSize:16});
glowLayer.intensity=.22;
glowLayer.intensity=.34;

const puddleWarm=mat('puddleWarm','#ff8c2b');puddleWarm.alpha=.18;puddleWarm.specularColor=new BABYLON.Color3(1,.72,.42);puddleWarm.specularPower=128;
const puddlePink=mat('puddlePink','#ff2e9e');puddlePink.alpha=.15;puddlePink.specularColor=new BABYLON.Color3(1,.3,.65);puddlePink.specularPower=128;
const puddleCyan=mat('puddleCyan','#1bc7e8');puddleCyan.alpha=.13;puddleCyan.specularColor=new BABYLON.Color3(.35,.8,1);puddleCyan.specularPower=128;

function addPuddle(name,x,z,w,d,material,rot=0){
  const p=BABYLON.MeshBuilder.CreatePlane(name,{width:w,height:d},scene);
  p.rotation.x=Math.PI/2;p.rotation.z=rot;p.position.set(x,.175,z);
  p.material=material;p.checkCollisions=false;p.isPickable=false;return p;
}
for(const p of [
  [-15,-25,5.5,1.1,puddleWarm,.08],[-14,-17,3.6,.8,puddlePink,-.12],
  [-16,-8,5.0,1.0,puddleWarm,.03],[-13,2,3.2,.7,puddleCyan,.15],
  [-16,11,4.8,.9,puddleWarm,-.07],[-14,20,3.6,.75,puddlePink,.10],
  [-17,27,4.2,.8,puddleWarm,-.04]
]) addPuddle('wet'+p[1],...p);


function decalPlane(name,w,h,x,y,z,material,rotY=0){
  const p=BABYLON.MeshBuilder.CreatePlane(name,{width:w,height:h},scene);
  p.position.set(x,y,z);p.rotation.y=rotY;p.material=material;
  p.checkCollisions=false;p.isPickable=false;return p;
}

function photoDecal(name,url,w,h,x,y,z,rotY=0){
  const material=new BABYLON.StandardMaterial(name+'Mat',scene);
  const tex=new BABYLON.Texture(url,scene,true,false,BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
  tex.hasAlpha=false;
  material.diffuseTexture=tex;
  material.emissiveColor=new BABYLON.Color3(.055,.055,.055);
  material.specularColor=new BABYLON.Color3(.02,.02,.02);
  material.backFaceCulling=false;
  const p=BABYLON.MeshBuilder.CreatePlane(name,{width:w,height:h},scene);
  p.position.set(x,y,z);p.rotation.y=rotY;p.material=material;
  p.checkCollisions=false;p.isPickable=false;
  return p;
}

function signTexture(name,text,bg='#1a2530',fg='#f2d15d'){
  const tex=new BABYLON.DynamicTexture(name,{width:512,height:160},scene,false);
  const c=tex.getContext();
  c.fillStyle=bg;c.fillRect(0,0,512,160);
  c.fillStyle='rgba(255,255,255,.05)';
  for(let i=0;i<20;i++)c.fillRect((i*71)%512,(i*31)%160,20+(i%4)*20,3);
  c.fillStyle=fg;
  c.font='900 58px Arial Black, Arial';
  c.textAlign='center';c.textBaseline='middle';
  c.fillText(text,256,80);
  tex.update();return tex;
}

function addShopSign(name,text,x,y,z,w=3.4,rotY=Math.PI/2,bg='#16232d',fg='#f6cf4d'){
  const matSign=new BABYLON.StandardMaterial(name+'Mat',scene);
  matSign.diffuseTexture=signTexture(name+'Tex',text,bg,fg);
  matSign.emissiveColor=BABYLON.Color3.FromHexString(fg).scale(.08);
  matSign.backFaceCulling=false;
  return decalPlane(name,w,1.05,x,y,z,matSign,rotY);
}

function addPitchedRoof(name,x,topY,z,w,d,material=roofMat,pitch=.30){
  const panelD=d*.56;
  const left=box(name+'L',w,.16,panelD,x,topY+.72,z-d*.23,material,false);
  const right=box(name+'R',w,.16,panelD,x,topY+.72,z+d*.23,material,false);
  left.rotation.x=pitch; right.rotation.x=-pitch;
  left.checkCollisions=false;right.checkCollisions=false;
  const ridge=box(name+'Ridge',w+.08,.12,.16,x,topY+1.36,z,metalMat,false);
  ridge.checkCollisions=false;
  return [left,right,ridge];
}

function addBalcony(name,x,y,z,length=3.6,depth=1.2){
  const slab=box(name+'Slab',depth,.16,length,x,y,z,concrete,false);slab.checkCollisions=false;
  const railTop=box(name+'RailTop',.07,.08,length*.98,x+depth*.46,y+.92,z,metalMat,false);railTop.checkCollisions=false;
  for(let i=-3;i<=3;i++){
    const rz=z+i*(length*.9/6);
    const rail=box(name+'Rail'+i,.06,.86,.06,x+depth*.46,y+.48,rz,metalMat,false);
    rail.checkCollisions=false;
  }
  const postA=box(name+'PostA',.12,2.0,.12,x-depth*.34,y-1.0,z-length*.38,concrete,false);
  const postB=box(name+'PostB',.12,2.0,.12,x-depth*.34,y-1.0,z+length*.38,concrete,false);
  postA.checkCollisions=false;postB.checkCollisions=false;
}

function addMetalFence(name,x,z,length=4,height=1.7){
  const y=.32+height/2;
  const top=box(name+'Top',.07,.07,length,x,y+height/2,z,metalMat,false);top.checkCollisions=false;
  const bottom=box(name+'Bottom',.07,.07,length,x,y-height/2,z,metalMat,false);bottom.checkCollisions=false;
  for(let i=0;i<9;i++){
    const zz=z-length/2+i*(length/8);
    const bar=box(name+'Bar'+i,.055,height,.055,x,y,zz,metalMat,false);bar.checkCollisions=false;
  }
}

function addEave(name,x,y,z,length=5,depth=.8,material=roofMat){
  const e=box(name,length,.14,depth,x,y,z,material,false);
  e.rotation.z=.03;e.checkCollisions=false;return e;
}

function addMeterBox(name,x,y,z,rotY=0){
  const mb=box(name,.42,.62,.16,x,y,z,metalMat,false);
  mb.rotation.y=rotY;mb.checkCollisions=false;
  const glass=emissiveMat(name+'Glass','#8ab4b4',.08);
  const face=decalPlane(name+'Face',.24,.26,x+(Math.abs(rotY)>1?(rotY>0?-.09:.09):0),y+.06,z+(Math.abs(rotY)<1?.09:0),glass,rotY);
  return [mb,face];
}




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

// Prototype start rooftop in the foreground-left.
const startRoofBase=box('startRoofBase',10,4.2,8,-5,2.1,28,wallDark,true);
const startRoof=box('startRoof',10.5,.36,8.5,-5,4.38,28,roofMat,true);
addPitchedRoof('startRoofPitch',-5,4.30,28,10.2,8.2,roofMat,.16);
addMetalFence('startFenceA',-9.8,28,6.6,1.35);
addMetalFence('startFenceB',-.2,28,6.6,1.35);

// stepped rooftop access toward Route 3, while street/campão remain reachable by dropping down.
box('route3StepA',3.2,3.0,3.0,.8,1.5,25.8,wallDark,true);
box('route3StepB',3.2,3.8,3.0,4.6,1.9,22.0,wallDark,true);

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
const mural=box('mural',18,8,.8,12,4,-31,wallMat);
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

// PROTOTYPE BLUEPRINT V41 — layout cues from the approved overview.
function addCar(name,x,z,rot=0,bodyHex='#333943'){
  const bodyMat=mat(name+'Body',bodyHex);
  const glassMat=mat(name+'Glass','#17222e');
  const root=new BABYLON.TransformNode(name,scene);
  root.position.set(x,.48,z);root.rotation.y=rot;

  const body=box(name+'Body',1.8,.55,3.5,0,.25,0,bodyMat,false);
  body.parent=root;body.position.set(0,.22,0);body.checkCollisions=false;
  const cabin=box(name+'Cabin',1.55,.58,1.75,0,.72,-.15,glassMat,false);
  cabin.parent=root;
  cabin.checkCollisions=false;

  for(const sx of [-.82,.82]) for(const sz of [-1.05,1.05]){
    const wheel=BABYLON.MeshBuilder.CreateCylinder(name+'Wheel'+sx+sz,{diameter:.54,height:.22,tessellation:14},scene);
    wheel.parent=root;wheel.position.set(sx,.03,sz);wheel.rotation.z=Math.PI/2;wheel.material=tireMat;wheel.checkCollisions=false;
  }
  return root;
}
addCar('carStreetA',-15.7,16,.05,'#30343d');
addCar('carStreetB',-14.2,-1,-.04,'#59514b');
addCar('carStreetC',-16.4,-22,.06,'#282d35');

// pedestrian crossing like the prototype
for(let i=-4;i<=4;i++){
  const stripe=box('crosswalk'+i,5.5,.025,.34,-15,.165,8+i*.62,curbMat,false);
  stripe.checkCollisions=false;
}

// central campão border walls / gates
for(const [x,z,w,d] of [
  [-1.6,6,.45,9],[-1.0,-13,.45,8],
  [24,15,.45,9],[24,-18,.45,8]
]){
  const wv=box('lotBoundary'+x+z,w,1.5,d,x,.75,z,wallLight,false);
  wv.checkCollisions=false;
}

// campão rubble and broken low walls
for(const [x,z,w] of [[5,4,3.2],[12,-2,4.0],[18,-10,3.6],[8,-19,2.8]]){
  const rubble=box('brokenWall'+x+z,w,.65,.48,x,.33,z,concrete,false);
  rubble.checkCollisions=false;
  for(let i=0;i<4;i++){
    const rock=box('rock'+x+z+i,.35+(i%2)*.16,.25+(i%3)*.10,.32,x-w/2+.5+i*.65,.17,z+.35+(i%2)*.18,concrete,false);
    rock.rotation.y=i*.45;rock.checkCollisions=false;
  }
}

// Three route guide strokes in the same cyan / yellow / pink language as the concept.
function routeDot(name,x,y,z,material,scale=.23){
  const d=BABYLON.MeshBuilder.CreateCylinder(name,{diameter:scale,height:.035,tessellation:12},scene);
  d.position.set(x,y,z);d.material=material;d.checkCollisions=false;d.isPickable=false;return d;
}
const routeBlue=emissiveMat('routeBlue','#48bfff',.50);
const routeGold=emissiveMat('routeGold','#ffc426',.55);
const routePink=emissiveMat('routePink','#ff3b9f',.55);

for(let i=0;i<10;i++) routeDot('streetRoute'+i,-15,.19,25-i*5.3,routeBlue,.22);
const lotPath=[[0,23],[3,18],[5,12],[8,7],[10,1],[11,-6],[12,-13],[12,-20],[12,-26]];
lotPath.forEach((p,i)=>routeDot('lotRoute'+i,p[0],.20,p[1],routeGold,.24));
const roofPath=[[-1,25,3.2],[4,22,4.4],[8,18,5.3],[13,12,5.7],[18,8,7.25],[24,5,6.5],[30,-3,8.95]];
roofPath.forEach((p,i)=>routeDot('roofRoute'+i,p[0],p[2]+.10,p[1],routePink,.24));

// more skyline trees and rooftop water tanks matching the overview
addTree('treeLotCenter',10,-4,1.55);
addTree('treeLotRear',14,-20,1.05);
addWaterTank('tankStart',-7,5.1,27);
addWaterTank('tankFarA',25,9.25,-5);
addWaterTank('tankFarB',18,7.6,10);

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
mural.material=wallLight;

// Dedicated mural plane avoids box-face UV mirroring.
const muralPlane=BABYLON.MeshBuilder.CreatePlane('muralPlane',{width:17.2,height:7.2},scene);
muralPlane.position.set(12,4,-30.56);
muralPlane.rotation.y=Math.PI;
muralPlane.checkCollisions=false;

muralGameMat.diffuseTexture=muralTex;
muralGameMat.specularColor=new BABYLON.Color3(.05,.05,.05);
muralGameMat.backFaceCulling=false;
muralPlane.material=muralGameMat;

for(const x of [6,18]){
  const glow=BABYLON.MeshBuilder.CreateSphere('muralLamp'+x,{diameter:.22,segments:8},scene);
  glow.position.set(x,7.25,-30.45);
  glow.material=warmGlow;
  glow.checkCollisions=false;
  const pl=new BABYLON.PointLight('muralLight'+x,new BABYLON.Vector3(x,7,-29.8),scene);
  pl.diffuse=new BABYLON.Color3(1,.57,.3);
  pl.intensity=.7;
  pl.range=12;
}

// layered dusk backdrop using large planes instead of visible box walls
const horizonMat=emissiveMat('horizonMat','#a85855',.34);
const horizon=BABYLON.MeshBuilder.CreatePlane('horizon',{width:150,height:18},scene);
horizon.position.set(0,7,-60);
horizon.material=horizonMat;
horizon.checkCollisions=false;

const horizonTopMat=emissiveMat('horizonTop','#38456f',.28);
const horizonTop=BABYLON.MeshBuilder.CreatePlane('horizonTop',{width:150,height:28},scene);
horizonTop.position.set(0,24,-57);
horizonTop.material=horizonTopMat;
horizonTop.checkCollisions=false;

// distant skyline silhouettes
for(let i=0;i<18;i++){
  const w=3+(i%4), h=3+(i%5)*1.2, d=4+(i%3);
  const x=-42+i*5.4;
  const b=box('skyline'+i,w,h,d,x,h/2-1,-43,wallDark,false);
  b.checkCollisions=false;

  if(i%2===0){
    const glow=BABYLON.MeshBuilder.CreateSphere('farLight'+i,{diameter:.16,segments:6},scene);
    glow.position.set(x+(i%3)*.45,h*.55,-40.9);
    glow.material=warmGlow;
    glow.checkCollisions=false;
  }
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

// extra neighborhood dressing: stains, parapets, shutters, curb wear, cables and rooftop clutter
const stainMat=mat('stainMat','#4c4743'); stainMat.alpha=.22;
const fadedBlue=mat('fadedBlue','#315a67');
const fadedGreen=mat('fadedGreen','#4e6048');
const fadedRed=mat('fadedRed','#7b4239');

for(const [x,z,w,h] of [
  [-25.84,-26,3.1,1.4],[-25.84,-14,2.3,1.0],[-25.84,8,3.4,1.2],
  [3.52,18,2.7,.9],[13.5,17,2.1,.8],[24.4,5,2.5,.8]
]){
  const s=decalPlane('weather'+x+z,w,h,x,1.15,z,stainMat,Math.PI/2);
}

for(const [x,y,z,w,d] of [
  [8,5.05,18,9.7,8.7],[18,7.05,8,10.7,9.7],[30,8.75,-3,11.7,9.7]
]){
  box('parapetA'+x,w,.34,.28,x-w/2+.15,y,z,concrete,false).checkCollisions=false;
  box('parapetB'+x,w,.34,.28,x+w/2-.15,y,z,concrete,false).checkCollisions=false;
}

for(const [x,y,z,matr] of [
  [-25.82,1.7,-26,fadedBlue],[-25.82,1.7,-4,fadedGreen],[-25.82,1.7,20,fadedRed],
  [3.50,1.8,18,fadedBlue]
]){
  const sh=box('shutter'+x+z,2.6,2.5,.08,x,y,z,matr,false);sh.checkCollisions=false;
  for(let k=-4;k<=4;k++){
    const sl=box('slat'+x+z+k,2.35,.035,.04,x,y+k*.23,z-.05,metalMat,false);sl.checkCollisions=false;
  }
}

for(let z=-31;z<=31;z+=5){
  if(z%10===0)continue;
  const crack=BABYLON.MeshBuilder.CreateLines('crack'+z,{points:[
    new BABYLON.Vector3(-17.7,.17,z),
    new BABYLON.Vector3(-16.9,.175,z+.22),
    new BABYLON.Vector3(-16.1,.176,z-.08)
  ]},scene);
  crack.color=new BABYLON.Color3(.08,.08,.10);crack.isPickable=false;
}

// corrugated-roof suggestion using thin ribs
for(const [x,y,z,w,d] of [[8,4.96,18,9.2,8.1],[18,6.96,8,10.2,9.1],[30,8.66,-3,11.2,9.1]]){
  for(let rx=-w/2+.35;rx<w/2;rx+=.55){
    const rib=box('roofRib'+x+rx,.05,.07,d,x+rx,y,z,metalMat,false);
    rib.checkCollisions=false;
  }
}

// Prototype-match paint language: cyan/magenta/yellow splashes and TDG marks.
function splashMat(name,color,alpha=.72){
  const sm=mat(name,color);sm.alpha=alpha;sm.emissiveColor=BABYLON.Color3.FromHexString(color).scale(.12);return sm;
}
const sprayPink=splashMat('sprayPink','#e52c98',.80);
const sprayCyan=splashMat('sprayCyan','#00b8d9',.78);
const sprayYellow=splashMat('sprayYellow','#f5c21b',.82);

for(const [name,x,y,z,w,h,material,rot] of [
  ['spA',-25.70,3.0,-30,2.8,1.4,sprayPink,-Math.PI/2],
  ['spB',-25.69,2.7,-13,2.1,1.0,sprayCyan,-Math.PI/2],
  ['spC',-25.68,3.1,16,2.5,1.2,sprayPink,-Math.PI/2],
  ['spD',3.39,2.8,18,2.2,1.0,sprayYellow,Math.PI/2],
  ['spE',13.0,3.0,17.30,3.0,1.0,sprayCyan,0]
]){
  const p=decalPlane(name,w,h,x,y,z,material,rot);
  p.scaling.x=1;p.scaling.y=.34;
}

function makeTagDecal(name,text,color,x,y,z,w=2.2,rotY=0){
  const tex=new BABYLON.DynamicTexture(name+'Tex',{width:512,height:220},scene,false);
  const c=tex.getContext();c.clearRect(0,0,512,220);
  c.font='900 82px Impact, Arial Black, sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.strokeStyle='#111218';c.lineWidth=16;c.strokeText(text,256,110);
  c.fillStyle=color;c.fillText(text,256,110);
  for(let i=0;i<18;i++){c.fillRect((i*71)%512,180+(i%3)*8,6,18+(i%5)*8);}
  tex.update();
  const mm=new BABYLON.StandardMaterial(name+'Mat',scene);mm.diffuseTexture=tex;mm.opacityTexture=tex;mm.emissiveColor=BABYLON.Color3.FromHexString(color).scale(.18);mm.backFaceCulling=false;
  return decalPlane(name,w,w*.43,x,y,z,mm,rotY);
}
makeTagDecal('tagTDG','TDG','#f5c21b',-25.67,2.0,-7,2.5,-Math.PI/2);
makeTagDecal('tagNEPO','NEPO','#e52c98',-25.67,3.0,11,2.8,-Math.PI/2);
makeTagDecal('tagRUA','RUA','#00b8d9',3.39,2.15,18,2.1,Math.PI/2);

// // ART PASS V38 — recognizable neighborhood identity
// Real crew pieces become part of the world instead of floating UI references.
photoDecal('graffitiNepoWorld','./3d-prototype/assets/graffiti/nepo_throw.webp',4.6,2.6,-25.76,1.75,-24,-Math.PI/2);
photoDecal('graffitiGateWorld','./3d-prototype/assets/graffiti/portao26.webp',5.1,3.05,-25.74,2.05,1,-Math.PI/2);
photoDecal('graffitiAlienWorld','./3d-prototype/assets/graffiti/alien_jam.webp',5.4,3.05,3.44,1.95,18,Math.PI/2);
photoDecal('graffitiCrewWorld','./3d-prototype/assets/graffiti/crew_wall.webp',6.0,3.35,13.0,2.25,17.34,0);
photoDecal('blackbookPoster','./3d-prototype/assets/graffiti/blackbook.webp',1.35,.78,24.1,4.25,4.47,0);

// Neighborhood commerce and hand-painted signs.
addShopSign('mercadinhoSign','MERCADINHO',3.42,3.82,18,3.3,Math.PI/2,'#17313a','#f3cf52');
addShopSign('oficinaSign','OFICINA',-25.72,3.72,23,2.75,-Math.PI/2,'#412d28','#f0b862');
addShopSign('barSign','BAR',-25.72,3.42,-10,1.8,-Math.PI/2,'#253b35','#dfc35a');

// Window/gate frames make facades read as buildings, not boxes.
function facadeFrame(name,x,y,z,w,h,rotY=0){
  const frameMat=mat(name+'Frame','#2d3136');
  const t=.10;
  const top=decalPlane(name+'Top',w,t,x,y+h/2,z,frameMat,rotY);
  const bottom=decalPlane(name+'Bottom',w,t,x,y-h/2,z,frameMat,rotY);
  const left=decalPlane(name+'Left',t,h,x,y,z,frameMat,rotY);
  const right=decalPlane(name+'Right',t,h,x,y,z,frameMat,rotY);
  if(Math.abs(rotY)>1){
    left.position.z-=w/2; right.position.z+=w/2;
  }else{
    left.position.x-=w/2; right.position.x+=w/2;
  }
  return [top,bottom,left,right];
}
facadeFrame('frameShop',3.43,2.45,18,3.0,2.2,Math.PI/2);
facadeFrame('frameHouseA',-25.73,2.2,13,2.25,1.65,-Math.PI/2);

// Air-conditioners, satellite dishes and rooftop clutter.
function addAC(name,x,y,z,rotY=0){
  const body=box(name,1.15,.65,.38,x,y,z,wallLight,false);body.checkCollisions=false;body.rotation.y=rotY;
  const fan=BABYLON.MeshBuilder.CreateTorus(name+'Fan',{diameter:.43,thickness:.055,tessellation:18},scene);
  fan.position.set(x,y,z+(Math.abs(rotY)<1?.205:0));
  if(Math.abs(rotY)>1){fan.position.x=x+(rotY>0?-.205:.205);fan.rotation.y=Math.PI/2;}
  fan.material=metalMat;fan.checkCollisions=false;
}
addAC('ac1',-25.63,3.0,-17,-Math.PI/2);
addAC('ac2',-25.63,3.15,9,-Math.PI/2);
addAC('ac3',3.28,3.0,15,Math.PI/2);

function addDish(name,x,y,z,scale=1){
  const dish=BABYLON.MeshBuilder.CreateDisc(name,{radius:.72*scale,tessellation:18},scene);
  dish.position.set(x,y,z);dish.rotation.x=Math.PI/2.7;dish.rotation.z=.35;
  dish.material=metalMat;dish.checkCollisions=false;
  const stem=cyl(name+'Stem',.08*scale,.7*scale,x,y-.35*scale,z,metalMat);stem.checkCollisions=false;
}
addDish('dish1',18,7.9,9.7,.7);
addDish('dish2',30,9.7,-5,.8);

// Water tank silhouette becomes more recognizable with rings + cap.
for(const [x,y,z] of [[30,9.45,-2],[18,7.72,8]]){
  for(const oy of [-.45,0,.45]){
    const ring=BABYLON.MeshBuilder.CreateTorus('tankRing'+x+y+oy,{diameter:1.68,thickness:.045,tessellation:18},scene);
    ring.position.set(x,y+oy,z);ring.rotation.x=Math.PI/2;ring.material=metalMat;ring.checkCollisions=false;
  }
}

// Simple curb vegetation and weeds.
for(const [x,z,s] of [
  [-23.8,-30,.65],[-23.8,-18,.55],[-6.8,-8,.48],[-6.6,7,.52],
  [2.2,-22,.70],[21,-21,.62],[33,-14,.55],[6,28,.58]
]){
  for(let k=0;k<4;k++){
    const blade=BABYLON.MeshBuilder.CreatePlane('weed'+x+z+k,{width:.10*s,height:.72*s},scene);
    blade.position.set(x+(k-1.5)*.09,.35*s,z+(k%2)*.07);
    blade.rotation.y=k*.9;blade.rotation.z=(k-1.5)*.10;
    blade.material=k%2?plantMat:plantLight;blade.checkCollisions=false;blade.isPickable=false;
  }
}

// Extra dangling utility wires near the street for a denser silhouette.
for(let k=0;k<5;k++){
  wire('utilityWireDense'+k,[
    new BABYLON.Vector3(-8+k*.08,7.1-k*.08,-31),
    new BABYLON.Vector3(-8+k*.08,6.1-k*.10,-4),
    new BABYLON.Vector3(-8+k*.08,6.65-k*.08,28)
  ]);
}

// Painted curb segments / worn neighborhood color.
for(const z of [-26,-18,6,18,27]){
  const c=box('paintedCurb'+z,2.7,.12,.35,-5.72,.31,z,z%2?fadedBlue:fadedRed,false);
  c.checkCollisions=false;
}

// ENVIRONMENT ART V39 — visual shells over stable gameplay collisions.
// Pitched roofs on the residential row.
for(let i=0;i<6;i++){
  const z=-28+i*11;
  const h=5+(i%2)*2.2;
  addPitchedRoof('roofPitchL'+i,-31,h+.10,z,10.8,8.8,i%2?roofMat:metalMat,.28+(i%2)*.04);
}

// Rooftop route keeps collision flat, but gains visible roof geometry around the traversable tops.
addPitchedRoof('roofPitchShop',8,4.78,18,9.2,8.3,roofMat,.23);
addPitchedRoof('roofPitchHouse2',18,6.78,8,10.2,9.3,roofMat,.20);
addPitchedRoof('roofPitchHouse3',30,8.48,-3,11.2,9.3,roofMat,.18);

// Residential balconies / awnings / metal fences.
addBalcony('balconyL1',-25.45,3.95,-17,3.4,1.0);
addBalcony('balconyL2',-25.45,4.05,5,3.0,1.0);
addBalcony('balconyL3',-25.45,3.85,27,3.6,1.0);
addMetalFence('fenceA',-24.65,-30,4.5,1.55);
addMetalFence('fenceB',-24.65,15,3.8,1.45);
addMetalFence('fenceC',-5.05,26,4.1,1.5);

addEave('eaveMercado',3.62,3.45,18,1.0,4.2,metalMat);
addEave('eaveOficina',-25.55,3.20,23,1.0,3.4,metalMat);
addEave('eaveBar',-25.55,3.06,-10,1.0,2.8,roofMat);

// Utility details close to eye level.
addMeterBox('meterA',-25.55,1.35,-12,-Math.PI/2);
addMeterBox('meterB',-25.55,1.42,7,-Math.PI/2);
addMeterBox('meterC',3.30,1.35,15,Math.PI/2);

// Concrete wall caps and columns.
for(const [x,z,len] of [[-5.0,-23,5],[-5.0,10,4.2],[-24.7,32,5.5]]){
  const wall=box('yardWall'+z,.42,1.55,len,x,.78,z,wallLight,false);wall.checkCollisions=false;
  for(const dz of [-len/2,len/2]){
    const col=box('yardCol'+z+dz,.58,1.9,.58,x,.95,z+dz,concrete,false);col.checkCollisions=false;
    const cap=box('yardCap'+z+dz,.70,.12,.70,x,1.95,z+dz,concrete,false);cap.checkCollisions=false;
  }
}

// Street clutter: sacks, buckets, pallets and rooftop vents.
const bagMat=mat('bagMat','#25272b');
for(const [x,z,s] of [[-23.2,-2,.6],[-23.0,-1.3,.48],[1.5,-7,.55],[14,-16,.5]]){
  const bag=BABYLON.MeshBuilder.CreateSphere('trashBag'+x+z,{diameter:s,segments:8},scene);
  bag.position.set(x,s*.38,z);bag.scaling.y=.8;bag.material=bagMat;bag.checkCollisions=false;
}
for(const [x,z] of [[-23.2,22],[2.4,-17],[20,-16]]){
  const bucket=BABYLON.MeshBuilder.CreateCylinder('bucket'+x+z,{diameter:.42,height:.52,tessellation:12},scene);
  bucket.position.set(x,.26,z);bucket.material=metalMat;bucket.checkCollisions=false;
}
for(const [x,y,z] of [[8,5.25,16],[18,7.35,6],[30,9.0,-5]]){
  const vent=box('roofVent'+x,.65,.75,.65,x,y,z,metalMat,false);vent.checkCollisions=false;
  const cap=box('roofVentCap'+x,.82,.12,.82,x,y+.43,z,metalMat,false);cap.checkCollisions=false;
}

// Large cerrado tree near the lot to break the skyline.
addTree('treeHero',29,-18,1.45);

// Small warm window clusters on the residential row.
for(const [z,y] of [[-28,2.0],[-17,2.7],[-6,2.1],[5,2.7],[16,2.0],[27,2.7]]){
  addWindow('warmWin'+z,-25.88,y,z-1.5,1.05,.75,warmGlow);
  addWindow('darkWin'+z,-25.88,y,z+1.1,.82,.68,bluePaint);
}

// TDG roster retained as world/lore data.
// Visual tags are intentionally disabled until they can be attached to real wall surfaces.
const crewNames=['NEPO','TRANE','NOROK','ICON','GOM','MM','OFF','PRIKS','ANJO','SINUK','ASKA','TALYN','PATEK','ERRARO','RODEF','BOLA'];

// Chifrudo is intentionally not rendered in the blockout anymore.
// The previous tube approximation was only a placeholder and hurt the visual read.
// A proper landmark asset will replace it during the art pass.

// HERO BLOCK V42 — approved concept visual slice.
function outlineMesh(mesh,width=.022,color='#0b0c11'){
  if(!mesh)return mesh;
  mesh.renderOutline=true;
  mesh.outlineWidth=width;
  mesh.outlineColor=BABYLON.Color3.FromHexString(color);
  return mesh;
}
function heroMat(name,hex,emissive=.03){
  const mm=mat(name,hex);
  mm.specularColor=new BABYLON.Color3(.02,.02,.025);
  mm.specularPower=18;
  mm.emissiveColor=BABYLON.Color3.FromHexString(hex).scale(emissive);
  return mm;
}
const heroFacadeA=heroMat('heroFacadeA','#45414a');
const heroFacadeB=heroMat('heroFacadeB','#503b3c');
const heroFacadeC=heroMat('heroFacadeC','#33424a');
const heroRoofMat=heroMat('heroRoofMat','#372529');
const heroConcreteMat=heroMat('heroConcreteMat','#6c6766');

for(const [name,material] of [
  ['startRoofBase',heroFacadeA],['startRoof',heroRoofMat],
  ['route3StepA',heroFacadeC],['route3StepB',heroFacadeB],
  ['shop1',heroFacadeB],['roof1',heroRoofMat],
  ['house2',heroFacadeC],['roof2',heroRoofMat]
]){
  const mesh=scene.getMeshByName(name);
  if(mesh){mesh.material=material;outlineMesh(mesh,.018);}
}

// start-roof concrete edge like the approved overview
for(const [name,w,d,x,z] of [
  ['heroEdgeN',10.2,.26,-5,24.0],['heroEdgeS',10.2,.26,-5,32.0]
]){
  const p=box(name,w,.56,d,x,4.74,z,heroConcreteMat,false);
  p.checkCollisions=false;outlineMesh(p,.018);
}
for(const [name,x,z] of [['heroEdgeW',-10.0,28],['heroEdgeE',0.0,28]]){
  const p=box(name,.26,.56,7.7,x,4.74,z,heroConcreteMat,false);
  p.checkCollisions=false;outlineMesh(p,.018);
}

// dense near-camera rooftop tank silhouette
const heroTank=BABYLON.MeshBuilder.CreateCylinder('heroTank',{diameter:2.05,height:1.65,tessellation:18},scene);
heroTank.position.set(-7.4,5.38,27.2);
heroTank.material=heroMat('heroTankMat','#171d24');
heroTank.checkCollisions=false;outlineMesh(heroTank,.025);
for(const yy of [4.92,5.38,5.84]){
  const ring=BABYLON.MeshBuilder.CreateTorus('heroTankRing'+yy,{diameter:2.08,thickness:.055,tessellation:18},scene);
  ring.position.set(-7.4,yy,27.2);ring.rotation.x=Math.PI/2;ring.material=metalMat;ring.checkCollisions=false;
}

// colored illustrated graffiti close to the player
makeTagDecal('heroTagA','TDG','#f5c21b',-9.82,3.05,29.3,1.9,Math.PI/2);
makeTagDecal('heroTagB','NEPO','#e52c98',-.16,2.72,27.0,2.1,-Math.PI/2);
makeTagDecal('heroTagC','RUA','#00b8d9',3.38,2.85,20.4,1.8,Math.PI/2);

// vegetation masses / silhouette near campão entrance
for(const [x,z,s] of [[-2.8,19.0,.72],[-1.8,17.2,.58],[1.4,15.7,.62],[4.6,14.5,.55]]){
  for(let k=0;k<5;k++){
    const leaf=BABYLON.MeshBuilder.CreateSphere('heroBush'+x+z+k,{diameter:(1.0+(k%3)*.26)*s,segments:6},scene);
    leaf.position.set(x+(k-2)*.27*s,.42+(k%2)*.16,z+((k%2)?-.24:.24)*s);
    leaf.scaling.y=.65;leaf.material=k%2?plantMat:plantLight;leaf.checkCollisions=false;outlineMesh(leaf,.014);
  }
}

// hero light pools / wet asphalt near start
addPuddle('heroWet1',-15.0,24.0,5.8,1.0,puddleWarm,.02);
addPuddle('heroWet2',-14.8,19.8,3.8,.72,puddlePink,-.08);
addPuddle('heroWet3',-13.1,15.6,3.2,.65,puddleCyan,.10);

// outline nearby props so they read like the concept
for(const mesh of scene.meshes){
  if(mesh.name.startsWith('carStreet')||mesh.name.startsWith('pole')||
     mesh.name.startsWith('tank')||mesh.name.startsWith('ladder')||
     mesh.name.startsWith('crate')||mesh.name.startsWith('dumpster')){
    outlineMesh(mesh,.014);
  }
}

// FULL MAP ART PASS V43 — propagate the concept language across the whole playable block.
const fullFacadeMats=[
  heroFacadeA,heroFacadeB,heroFacadeC,
  heroMat('fullFacadeD','#5a4a45'),
  heroMat('fullFacadeE','#393b45'),
  heroMat('fullFacadeF','#4a3a46')
];
const fullRoofA=heroMat('fullRoofA','#34282b');
const fullRoofB=heroMat('fullRoofB','#4a302e');
const fullMetal=heroMat('fullMetal','#242a31');
const fullConcrete=heroMat('fullConcrete','#716b68');

// Left street row: every house now has its own concept palette and outline.
for(let i=0;i<6;i++){
  const house=scene.getMeshByName('houseL'+i);
  const roof=scene.getMeshByName('roofL'+i);
  if(house){house.material=fullFacadeMats[i%fullFacadeMats.length];outlineMesh(house,.017);}
  if(roof){roof.material=i%2?fullRoofA:fullRoofB;outlineMesh(roof,.016);}
}

// Right parkour chain: consistent stylized treatment.
for(const [name,material] of [
  ['house3',fullFacadeMats[4]],['roof3',fullRoofA],
  ['ledge',fullConcrete],['bridgeRoof',fullRoofB],
  ['highLedge',fullConcrete],['landing',fullRoofA],
  ['lowWall',fullConcrete],['vaultBox',fullConcrete]
]){
  const mesh=scene.getMeshByName(name);
  if(mesh){mesh.material=material;outlineMesh(mesh,.016);}
}

// Facade rhythm: warm/cool windows, doors, awnings and graffiti.
for(let i=0;i<6;i++){
  const z=-28+i*11;
  const warm=i%2===0;
  const glow=warm?warmGlow:cyanGlow;
  addWindow('fullWinA'+i,-25.86,2.10,z-1.55,1.20,.85,glow);
  addWindow('fullWinB'+i,-25.86,3.30,z+1.20,1.00,.72,warm?cyanGlow:warmGlow);
  addDoor('fullDoor'+i,-25.88,1.10,z+2.55,1.00,2.10,i%3===0?bluePaint:metalMat);
  addEave('fullEave'+i,-25.50,3.70,z+2.35,1.0,2.2,i%2?fullMetal:fullRoofB);

  const tagNames=['TRANE','NOROK','ICON','GOM','MM','OFF'];
  const tagColors=['#f5c21b','#e52c98','#00b8d9','#ff7040','#9b65ff','#8ff0cf'];
  makeTagDecal('fullTag'+i,tagNames[i],tagColors[i],-25.70,2.55,z-.15,1.75,-Math.PI/2);
}

// Parkour-side facade details.
for(const d of [
  ['pWin1',3.40,2.10,16.2,1.9,1.0,true],
  ['pWin2',13.10,2.60,12.2,1.4,.85,false],
  ['pWin3',24.30,3.55,5.0,1.55,.9,true],
  ['pWin4',29.95,5.10,-7.48,1.6,.9,false]
]){
  addWindow(d[0],d[1],d[2],d[3],d[4],d[5],d[6]?warmGlow:cyanGlow);
}
makeTagDecal('rightTag1','PRIKS','#e52c98',3.38,2.60,15.0,1.8,Math.PI/2);
makeTagDecal('rightTag2','ANJO','#f5c21b',13.0,3.20,17.25,1.75,0);
makeTagDecal('rightTag3','SINUK','#00b8d9',24.0,5.75,4.45,1.9,0);

// Route-3 rooftop clutter / visual beats.
for(const [name,x,y,z] of [
  ['ventR1',8,5.10,16.0],['ventR2',18,7.05,5.6],['ventR3',30,8.78,-6.2]
]){
  const body=box(name,.78,.78,.78,x,y,z,fullMetal,false);body.checkCollisions=false;outlineMesh(body,.014);
  const cap=box(name+'Cap',.96,.12,.96,x,y+.45,z,fullMetal,false);cap.checkCollisions=false;outlineMesh(cap,.014);
}
for(const [name,x,y,z] of [
  ['dishR1',8.8,5.48,19.8],['dishR2',19.0,7.48,10.7],['dishR3',28.6,9.08,-1.5]
]){
  addDish(name,x,y,z,.62);
}

// Campão: richer broken terrain silhouette, vegetation and graffiti debris.
for(const [x,z,s] of [
  [3,-1,.55],[5,-7,.60],[8,-12,.52],[13,-7,.68],[16,-15,.56],
  [20,-6,.50],[22,-18,.62],[11,-23,.48],[6,-20,.58]
]){
  for(let k=0;k<4;k++){
    const weed=BABYLON.MeshBuilder.CreatePlane('fullWeed'+x+z+k,{width:.13*s,height:.95*s},scene);
    weed.position.set(x+(k-1.5)*.12,.42*s,z+(k%2)*.10);
    weed.rotation.y=k*.82;weed.rotation.z=(k-1.5)*.08;
    weed.material=k%2?plantMat:plantLight;weed.checkCollisions=false;weed.isPickable=false;
    outlineMesh(weed,.01);
  }
}

for(const [x,z,w] of [[2,-4,2.8],[7,-2,3.4],[15,-7,2.6],[20,-15,3.2],[9,-22,2.5]]){
  const broken=box('fullBroken'+x+z,w,.48,.42,x,.24,z,fullConcrete,false);
  broken.rotation.y=(x+z)*.03;broken.checkCollisions=false;outlineMesh(broken,.012);
}
makeTagDecal('lotTag1','ASKA','#9b65ff',1.65,1.05,6.0,1.7,Math.PI/2);
makeTagDecal('lotTag2','TALYN','#00b8d9',23.75,1.15,-18.0,1.9,-Math.PI/2);

// Road: stronger wet-storytelling / reflections / curb wear.
for(const [x,z,w,d,matr,rot] of [
  [-15,-30,4.6,.70,puddleWarm,.02],[-16,-12,5.0,.85,puddleCyan,-.05],
  [-14,5,4.0,.72,puddlePink,.08],[-15,13,5.4,.82,puddleWarm,-.03],
  [-16,30,4.6,.75,puddleCyan,.04]
]){
  addPuddle('fullWet'+z,x,z,w,d,matr,rot);
}

// Street poles and wires get heavier illustrated separation.
for(const mesh of scene.meshes){
  if(mesh.name.startsWith('pole')||mesh.name.startsWith('lampArm')||
     mesh.name.startsWith('wire')||mesh.name.startsWith('crosswalk')){
    outlineMesh(mesh,.012);
  }
}

// More overhead utility wires crossing the road/campão, matching the concept density.
for(const z of [-21,-7,7,21]){
  wire('crossWireA'+z,[
    new BABYLON.Vector3(-25.5,7.6,z),
    new BABYLON.Vector3(-10,6.8,z+.4),
    new BABYLON.Vector3(5,7.15,z-.3)
  ]);
  wire('crossWireB'+z,[
    new BABYLON.Vector3(-25.5,7.3,z+.25),
    new BABYLON.Vector3(-10,6.55,z+.6),
    new BABYLON.Vector3(5,6.95,z)
  ]);
}

// Warm light pools along the left street.
for(const z of [-28,-14,0,14,28]){
  addPuddle('lampPool'+z,-11.0,z,4.4,1.05,puddleWarm,0);
}

// Final mural zone gets denser architecture and stronger framing.
for(const [x,h] of [[3,5.2],[21,6.4]]){
  const flank=box('muralFlank'+x,5.0,h,5.5,x,h/2,-31.5,fullFacadeMats[x===3?2:1],false);
  flank.checkCollisions=false;outlineMesh(flank,.018);
  addPitchedRoof('muralFlankRoof'+x,x,h+.05,-31.5,5.2,5.6,fullRoofB,.22);
}
makeTagDecal('muralSideTagA','ERRARO','#f5c21b',3.0,2.4,-28.72,1.7,Math.PI);
makeTagDecal('muralSideTagB','RODEF','#e52c98',21.0,3.2,-28.72,1.8,Math.PI);

// Crew signatures in quieter corners.
for(const [name,x,y,z,color,rot] of [
  ['BOLA',-25.68,2.2,-20,'#ff7040',-Math.PI/2],
  ['PATEK',24.0,1.3,15,'#8ff0cf',-Math.PI/2],
  ['OFF',13.0,4.0,17.25,'#00b8d9',0]
]){
  makeTagDecal('crewCorner'+name,name,color,x,y,z,1.55,rot);
}

// Global prop outline pass — intentionally excludes invisible/collision-only objects.
for(const mesh of scene.meshes){
  if(mesh.isVisible===false)continue;
  if(mesh.name.startsWith('houseL')||mesh.name.startsWith('roofL')||
     mesh.name.startsWith('tree')||mesh.name.startsWith('dish')||
     mesh.name.startsWith('shutter')||mesh.name.startsWith('yard')||
     mesh.name.startsWith('fence')||mesh.name.startsWith('balcony')){
    outlineMesh(mesh,.012);
  }
}

// player collider + simple humanoid visual rig
// The capsule remains only for collision; the visible character is built from separate limbs.
const player=BABYLON.MeshBuilder.CreateCapsule('playerCollider',{height:2.1,radius:.42},scene);
player.position=new BABYLON.Vector3(-5,5.55,28);
player.isVisible=false;
player.checkCollisions=true;
player.ellipsoid=new BABYLON.Vector3(.42,1.0,.42);

const rigRoot=new BABYLON.TransformNode('rigRoot',scene);
rigRoot.parent=player;
rigRoot.position.set(0,-.05,0);

const rigMat=mat('rig','#f0ece3');
const rigDark=mat('rigDark','#111318');
const rigAccent=mat('rigAccent','#e82b9a');
const skinMat=mat('skin','#9b6b54');
const hoodieMat=mat('hoodie','#f0ece3');
const hoodieAccent=mat('hoodieAccent','#111318');
const shoeMat=mat('shoe','#f3f0e8');
const soleMat=mat('sole','#16181c');

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
const torso=limbBox('torso',1.00,1.00,.48,rigRoot,0,.74,0,hoodieMat);
const chest=limbBox('chest',1.08,.22,.50,rigRoot,0,1.13,0,hoodieMat);

// neck + head
const neck=limbBox('neck',.24,.18,.24,rigRoot,0,1.36,0,skinMat);
const head=BABYLON.MeshBuilder.CreateSphere('head',{diameter:.62,segments:10},scene);
head.parent=rigRoot;
head.position.set(0,1.68,0);
head.material=skinMat;
head.checkCollisions=false;

// backpack
const pack=limbBox('pack',.72,.78,.34,rigRoot,0,.83,-.36,rigDark);

// clothing silhouette: hood, cap, straps and shoe soles
const hood=BABYLON.MeshBuilder.CreateTorus('hood',{diameter:.72,thickness:.09,tessellation:18},scene);
hood.parent=rigRoot;hood.position.set(0,1.40,-.03);hood.rotation.x=Math.PI/2;hood.material=hoodieMat;hood.checkCollisions=false;
const cap=BABYLON.MeshBuilder.CreateSphere('cap',{diameter:.64,segments:10,slice:.45},scene);
cap.parent=rigRoot;cap.position.set(0,1.86,0);cap.scaling.y=.38;cap.material=rigDark;cap.checkCollisions=false;
const brim=limbBox('capBrim',.44,.055,.28,rigRoot,0,1.82,.36,rigDark);
const strapL=limbBox('strapL',.08,.72,.05,rigRoot,-.25,.88,.25,rigAccent);
const strapR=limbBox('strapR',.08,.72,.05,rigRoot,.25,.88,.25,rigAccent);


// simple face markers so we can always tell which way the character is looking
const faceMat=mat('face','#101215');
const nose=limbBox('nose',.13,.14,.15,rigRoot,0,1.67,.34,skinMat);
const eyeL=limbBox('eyeL',.07,.06,.035,rigRoot,-.12,1.75,.31,faceMat);
const eyeR=limbBox('eyeR',.07,.06,.035,rigRoot,.12,1.75,.31,faceMat);

// arm hierarchy: shoulder pivot -> upper arm -> elbow pivot -> forearm
const lShoulder=joint('lShoulder',rigRoot,-.56,1.16,0);
const rShoulder=joint('rShoulder',rigRoot,.56,1.16,0);
const lUpperArm=limbBox('lUpperArm',.24,.62,.24,lShoulder,0,-.31,0,hoodieMat);
const rUpperArm=limbBox('rUpperArm',.24,.62,.24,rShoulder,0,-.31,0,hoodieMat);
const lElbow=joint('lElbow',lShoulder,0,-.62,0);
const rElbow=joint('rElbow',rShoulder,0,-.62,0);
const lForearm=limbBox('lForearm',.21,.58,.21,lElbow,0,-.29,0,skinMat);
const rForearm=limbBox('rForearm',.21,.58,.21,rElbow,0,-.29,0,skinMat);

// leg hierarchy: hips slightly narrower, knees bend backward naturally, feet forward
const lHip=joint('lHip',rigRoot,-.19,.04,0);
const rHip=joint('rHip',rigRoot,.19,.04,0);
const lThigh=limbBox('lThigh',.24,.68,.25,lHip,0,-.34,0,rigDark);
const rThigh=limbBox('rThigh',.24,.68,.25,rHip,0,-.34,0,rigDark);
const lCargo=limbBox('lCargoPocket',.12,.24,.30,lHip,-.16,-.26,.03,rigDark);
const rCargo=limbBox('rCargoPocket',.12,.24,.30,rHip,.16,-.26,.03,rigDark);
const lKnee=joint('lKnee',lHip,0,-.68,0);
const rKnee=joint('rKnee',rHip,0,-.68,0);
const lShin=limbBox('lShin',.23,.66,.23,lKnee,0,-.33,0,rigDark);
const rShin=limbBox('rShin',.23,.66,.23,rKnee,0,-.33,0,rigDark);
const lAnkle=joint('lAnkle',lKnee,0,-.66,0);
const rAnkle=joint('rAnkle',rKnee,0,-.66,0);
const lFoot=limbBox('lFoot',.29,.16,.46,lAnkle,0,-.05,.15,shoeMat);
const rFoot=limbBox('rFoot',.29,.16,.46,rAnkle,0,-.05,.15,shoeMat);
const lSole=limbBox('lSole',.30,.045,.48,lAnkle,0,-.14,.15,soleMat);
const rSole=limbBox('rSole',.30,.045,.48,rAnkle,0,-.14,.15,soleMat);

// Prototype character details: oversized white tee, orange chest mark, headphones, pink backpack mark and spray can.
const hoodieHem=limbBox('teeHem',1.04,.18,.50,rigRoot,0,.30,0,hoodieMat);
const lHand=BABYLON.MeshBuilder.CreateSphere('lHand',{diameter:.23,segments:8},scene);
lHand.parent=lElbow;lHand.position.set(0,-.61,0);lHand.material=skinMat;lHand.checkCollisions=false;
const rHand=BABYLON.MeshBuilder.CreateSphere('rHand',{diameter:.23,segments:8},scene);
rHand.parent=rElbow;rHand.position.set(0,-.61,0);rHand.material=skinMat;rHand.checkCollisions=false;

const orangeMark=emissiveMat('orangeMark','#ff6b1f',.18);
const chestMark=limbBox('chestMark',.28,.30,.035,rigRoot,0,.82,.255,orangeMark);

const phoneMat=mat('headphones','#111318');
const phoneGlow=emissiveMat('headphoneGlow','#15c9f4',.35);
for(const sx of [-1,1]){
  const ear=BABYLON.MeshBuilder.CreateTorus('earphone'+sx,{diameter:.31,thickness:.08,tessellation:16},scene);
  ear.parent=rigRoot;ear.position.set(sx*.34,1.70,0);ear.rotation.y=Math.PI/2;ear.material=phoneMat;ear.checkCollisions=false;
  const ring=BABYLON.MeshBuilder.CreateTorus('earGlow'+sx,{diameter:.23,thickness:.035,tessellation:16},scene);
  ring.parent=rigRoot;ring.position.set(sx*.345,1.70,0);ring.rotation.y=Math.PI/2;ring.material=phoneGlow;ring.checkCollisions=false;
}
const headband=BABYLON.MeshBuilder.CreateTorus('headband',{diameter:.73,thickness:.045,tessellation:18,arc:.52},scene);
headband.parent=rigRoot;headband.position.set(0,1.76,0);headband.rotation.z=Math.PI;headband.material=phoneMat;headband.checkCollisions=false;

// Yellow crown emblem on cap and pink crown-style backpack mark.
function iconPlane(name,text,color,w,h,x,y,z,parent){
  const tex=new BABYLON.DynamicTexture(name+'Tex',{width:256,height:128},scene,false);
  const c=tex.getContext();c.clearRect(0,0,256,128);
  c.font='900 78px Arial Black';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(text,128,64);
  tex.update();
  const mm=new BABYLON.StandardMaterial(name+'Mat',scene);mm.diffuseTexture=tex;mm.opacityTexture=tex;mm.emissiveColor=BABYLON.Color3.FromHexString(color).scale(.25);mm.backFaceCulling=false;
  const p=BABYLON.MeshBuilder.CreatePlane(name,{width:w,height:h},scene);p.parent=parent;p.position.set(x,y,z);p.material=mm;p.checkCollisions=false;return p;
}
iconPlane('capCrown','♛','#f5c21b',.28,.16,0,1.86,.35,rigRoot);
iconPlane('packCrown','♛','#e82b9a',.34,.22,0,.88,-.535,rigRoot);

const sprayCan=BABYLON.MeshBuilder.CreateCylinder('sprayCan',{diameter:.14,height:.42,tessellation:12},scene);
sprayCan.parent=rElbow;sprayCan.position.set(.03,-.63,.05);sprayCan.rotation.z=.15;sprayCan.material=sprayCyan;sprayCan.checkCollisions=false;


for(const mesh of scene.meshes){
  const p=mesh.parent;
  if(p===rigRoot||p===lShoulder||p===rShoulder||p===lElbow||p===rElbow||
     p===lHip||p===rHip||p===lKnee||p===rKnee||p===lAnkle||p===rAnkle){
    outlineMesh(mesh,.028,'#090a0f');
  }
}
outlineMesh(head,.030,'#090a0f');
outlineMesh(cap,.030,'#090a0f');
outlineMesh(pack,.030,'#090a0f');

let animClock=0;
let lastPlayerPos=player.position.clone();
const combatAnim={type:null,timer:0,duration:0,side:1,combo:0};
const rollAnim={active:false,timer:0,duration:.62,dir:new BABYLON.Vector3(0,0,1)};

function dampAngle(current,target,dt,speed=12){
  return BABYLON.Scalar.Lerp(current,target,1-Math.exp(-speed*dt));
}

function animateRig(dt,moveAmount,isRunning,isJumping,isClimbing,isCrouching=false){
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
  }else if(isCrouching){
    // Readable stealth crouch with a restrained crouch-walk cycle.
    const c=moving?cycle*.16:0;
    armL=-.34+opp*.12;
    armR=-.34+cycle*.12;
    elbowL=-.52;
    elbowR=-.52;
    legL=.30+c;
    legR=.30-c;
    kneeL=.78+Math.max(0,-c)*.32;
    kneeR=.78+Math.max(0,c)*.32;
    ankleL=-.20;
    ankleR=-.20;
    torsoLean=.31;
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

  const bounce=(moving&&!isJumping&&!isClimbing&&!isCrouching)?Math.abs(cycle)*.025:0;
  const crouchY=isCrouching?-.58:-.05;
  rigRoot.position.y=dampAngle(rigRoot.position.y,crouchY+bounce,dt,16);
}

// camera — simple deterministic third-person orbit.
// No pointer lock, no click, no auto-recentering, no hidden inversion.
const camera=new BABYLON.FreeCamera('cam',new BABYLON.Vector3(0,3,-8),scene);
camera.minZ=.1;

let camYaw=0;
let camPitch=.16;
let camDistance=7.2;
let pointerLocked=false;
let firstPerson=false;
const mobileInput=()=>window.UP_MOBILE_STATE||{x:0,y:0,magnitude:0,jump:false,crouch:false};
let mobileJumpWasDown=false;
let currentMoveIntent=BABYLON.Vector3.Zero();

function setFirstPerson(v){
  firstPerson=!!v;
  rigRoot.setEnabled(!firstPerson);
  document.body.classList.toggle('first-person',firstPerson);
  const btn=document.getElementById('viewToggle');
  if(btn)btn.textContent=firstPerson?'3P':'1P';
}
window.addEventListener('keydown',e=>{
  if(e.code==='KeyV'&&!e.repeat)setFirstPerson(!firstPerson);
});
document.getElementById('viewToggle')?.addEventListener('click',()=>setFirstPerson(!firstPerson));

function lockMouse(){
  if(matchMedia('(pointer:coarse)').matches)return;
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
  const cp=Math.cos(camPitch);
  const cameraCrouching=!!(keys.ControlLeft||keys.ControlRight||keys.KeyC);
  if(firstPerson){
    const eye=player.position.add(new BABYLON.Vector3(0,cameraCrouching?1.05:1.48,0));
    const look=new BABYLON.Vector3(
      -Math.sin(camYaw)*cp,
      -Math.sin(camPitch),
      Math.cos(camYaw)*cp
    ).normalize();
    const smooth=1-Math.pow(.00008,dt);
    camera.position=BABYLON.Vector3.Lerp(camera.position,eye,smooth);
    camera.setTarget(eye.add(look.scale(10)));
    camera.fov=BABYLON.Scalar.Lerp(camera.fov,.92,1-Math.exp(-8*dt));
    return;
  }

  const target=player.position.add(new BABYLON.Vector3(0,cameraCrouching?.58:.9,0));
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
let gameplayLocked=false;
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
function activeGamepad(){
  const pads=navigator.getGamepads?.()||[];
  for(const p of pads)if(p&&p.connected)return p;
  return null;
}
function getMoveIntentWorld(){
  const f=forwardFlat(),r=rightFlat();
  let wish=BABYLON.Vector3.Zero();
  if(keys.KeyW||keys.ArrowUp)wish.addInPlace(f);
  if(keys.KeyS||keys.ArrowDown)wish.subtractInPlace(f);
  if(keys.KeyD||keys.ArrowRight)wish.addInPlace(r);
  if(keys.KeyA||keys.ArrowLeft)wish.subtractInPlace(r);

  const pad=activeGamepad();
  if(pad&&pad.axes?.length>=2){
    const ax=Math.abs(pad.axes[0])>.16?pad.axes[0]:0;
    const ay=Math.abs(pad.axes[1])>.16?pad.axes[1]:0;
    if(ax||ay){
      wish.addInPlace(r.scale(ax));
      wish.addInPlace(f.scale(-ay));
    }
  }

  const mobile=mobileInput();
  if(Math.abs(mobile.x)>.06||Math.abs(mobile.y)>.06){
    wish.addInPlace(r.scale(mobile.x));
    wish.addInPlace(f.scale(mobile.y));
  }

  if(wish.lengthSquared()>1)wish.normalize();
  return wish;
}
function startDirectionalRoll(direction){
  if(gameplayLocked||rollAnim.active||parkourState!=='normal'||!grounded)return false;
  let dir=direction?.clone?.()||getMoveIntentWorld();
  dir.y=0;
  if(dir.lengthSquared()<.01)dir=playerForward();
  if(dir.lengthSquared()<.01)return false;
  dir.normalize();

  rollAnim.active=true;
  rollAnim.timer=0;
  rollAnim.dir.copyFrom(dir);
  moveVelocity.set(0,0,0);
  vy=0;
  player.rotation.y=Math.atan2(dir.x,dir.z);
  return true;
}
function updateDirectionalRoll(dt){
  if(!rollAnim.active)return false;
  rollAnim.timer+=dt;
  const t=BABYLON.Scalar.Clamp(rollAnim.timer/rollAnim.duration,0,1);
  const ease=t*t*(3-2*t);
  const tuck=Math.sin(Math.PI*t);
  const speed=BABYLON.Scalar.Lerp(7.9,3.1,ease);
  player.moveWithCollisions(rollAnim.dir.scale(speed*dt));

  // Shoulder-roll: compact silhouette, one clean rotation, stable collision capsule.
  rigRoot.rotation.y=Math.PI;
  rigRoot.rotation.x=ease*Math.PI*2;
  rigRoot.rotation.z=.10*Math.sin(Math.PI*t);
  rigRoot.position.y=-.13-.28*tuck;
  torso.rotation.x=.34*tuck;
  chest.rotation.x=.20*tuck;
  lShoulder.rotation.x=-.82*tuck;
  rShoulder.rotation.x=-.82*tuck;
  lShoulder.rotation.z=.28*tuck;
  rShoulder.rotation.z=-.28*tuck;
  lElbow.rotation.x=-.72*tuck;
  rElbow.rotation.x=-.72*tuck;
  lHip.rotation.x=.42*tuck;
  rHip.rotation.x=.42*tuck;
  lKnee.rotation.x=1.08*tuck;
  rKnee.rotation.x=1.08*tuck;

  if(t>=1){
    rollAnim.active=false;rollAnim.timer=0;
    rigRoot.rotation.x=0;rigRoot.rotation.z=0;rigRoot.position.y=-.05;
    torso.rotation.y=0;chest.rotation.y=0;pelvis.rotation.y=0;
  }
  return true;
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

  if(gameplayLocked){
    moveVelocity.set(0,0,0);
    vy=0;
    parkourState='normal';
    activeObstacle=null;
    animateRig(dt,0,false,false,false,false);
    lastPlayerPos.copyFrom(player.position);
    return;
  }

  // Small camera feedback for speed/landing without changing controls.
  const sprintingNow=!!(keys.ShiftLeft||keys.ShiftRight)||mobileInput().magnitude>.88;
  const targetFov=firstPerson?.92:(combatAnim.timer>0?.80:(sprintingNow&&parkourState==='normal'?.91:.84));
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

  if(rollAnim.active){
    updateDirectionalRoll(dt);
    lastPlayerPos.copyFrom(player.position);
    return;
  }

  const mobile=mobileInput();
  let wish=getMoveIntentWorld();

  const crouching=!!(keys.ControlLeft||keys.ControlRight||keys.KeyC||mobile.crouch);
  const running=!crouching&&(!!(keys.ShiftLeft||keys.ShiftRight)||mobile.magnitude>.88);
  const maxSpeed=crouching?2.15:(running?7.2:4.7);
  const accel=grounded?18:7;
  const friction=grounded?15:2.2;

  if(wish.lengthSquared()>.001){
    const analogStrength=(Math.abs(mobile.x)>.01||Math.abs(mobile.y)>.01)
      ?BABYLON.Scalar.Clamp(mobile.magnitude,0,1):1;
    wish.normalize();
    currentMoveIntent.copyFrom(wish);
    const desired=wish.scale(maxSpeed*analogStrength);
    moveVelocity=BABYLON.Vector3.Lerp(
      moveVelocity,
      desired,
      1-Math.exp(-accel*dt)
    );

    const yaw=Math.atan2(wish.x,wish.z);
    let dyaw=((yaw-player.rotation.y+Math.PI)%(Math.PI*2)+Math.PI)%(Math.PI*2)-Math.PI;
    player.rotation.y+=dyaw*(1-Math.exp(-12*dt));
  }else{
    currentMoveIntent.scaleInPlace(.82);
    moveVelocity=BABYLON.Vector3.Lerp(
      moveVelocity,
      BABYLON.Vector3.Zero(),
      1-Math.exp(-friction*dt)
    );
  }

  const mobileJump=!!mobile.jump;
  if(mobileJump&&!mobileJumpWasDown){
    spacePressedAt=performance.now();
    jumpBufferTimer=.13;
  }
  mobileJumpWasDown=mobileJump;
  const spaceHeld=!!keys.Space||mobileJump;
  const heldMs=spaceHeld?(performance.now()-spacePressedAt):0;

  // Enter contextual parkour only from normal movement.
  const forwardIntent=!!(keys.KeyW||keys.ArrowUp)||mobile.y>.28;
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

  const stableCrouch=crouching&&parkourState==='normal'&&grounded;
  animateRig(dt,moveAmount,running&&moveAmount>.1,isJumping,isClimbing,stableCrouch);

  // Action-game combat pass: clean anticipation, contact and recovery without limb overextension.
  if(combatAnim.timer>0){
    combatAnim.timer=Math.max(0,combatAnim.timer-dt);
    const t=1-combatAnim.timer/combatAnim.duration;
    const side=combatAnim.side;
    const wind=t<.30?Math.sin((t/.30)*Math.PI*.5):Math.max(0,1-(t-.30)/.70);
    const hit=t<.22?0:Math.sin(Math.PI*BABYLON.Scalar.Clamp((t-.22)/.46,0,1));
    const kick=combatAnim.type==='light'&&combatAnim.combo===3;

    if(combatAnim.type==='heavy'){
      torso.rotation.y=side*(-.34*wind+.62*hit);
      chest.rotation.y=side*(-.16*wind+.28*hit);
      pelvis.rotation.y=-side*(-.12*wind+.22*hit);
      torso.rotation.x=.12*wind+.13*hit;
      const a=side>0?rShoulder:lShoulder;
      const e=side>0?rElbow:lElbow;
      const o=side>0?lShoulder:rShoulder;
      a.rotation.x=-1.02*wind-.70*hit;
      a.rotation.z=-side*(.62*wind+.72*hit);
      e.rotation.x=-.62*wind+.16*hit;
      o.rotation.x=.28*wind;
      lHip.rotation.x+=.12*wind;rHip.rotation.x+=.12*wind;
      lKnee.rotation.x+=.16*wind;rKnee.rotation.x+=.16*wind;
      rigRoot.position.z=.11*hit;
    }else if(kick){
      torso.rotation.y=side*(-.20*wind+.42*hit);
      chest.rotation.y=side*(-.10*wind+.18*hit);
      pelvis.rotation.y=side*(.14*wind-.32*hit);
      torso.rotation.x=.10*wind-.05*hit;
      lShoulder.rotation.x=-.30*wind+.20*hit;
      rShoulder.rotation.x=-.30*wind+.20*hit;
      const kh=side>0?rHip:lHip, kk=side>0?rKnee:lKnee;
      const ph=side>0?lHip:rHip;
      kh.rotation.x=-.34*wind-.88*hit;
      kk.rotation.x=.72*wind-.30*hit;
      ph.rotation.x+=.13*wind;
      rigRoot.position.z=.13*hit;
    }else{
      const a=side>0?rShoulder:lShoulder;
      const e=side>0?rElbow:lElbow;
      const o=side>0?lShoulder:rShoulder;
      torso.rotation.y=side*(-.24*wind+.54*hit);
      chest.rotation.y=side*(-.11*wind+.24*hit);
      pelvis.rotation.y=-side*(-.08*wind+.18*hit);
      torso.rotation.x=.05*wind+.08*hit;
      a.rotation.x=-.86*wind-.82*hit;
      a.rotation.z=-side*(.48*wind+.78*hit);
      e.rotation.x=-.46*wind+.20*hit;
      o.rotation.x=.20*wind-.12*hit;
      rigRoot.position.z=.09*hit;
    }

    if(grounded&&hit>.30){
      const lunge=combatAnim.type==='heavy'?1.40:(kick?1.55:1.05);
      player.moveWithCollisions(playerForward().scale(lunge*hit*dt));
    }
  }else{
    torso.rotation.y=dampAngle(torso.rotation.y,0,dt,16);
    chest.rotation.y=dampAngle(chest.rotation.y,0,dt,16);
    pelvis.rotation.y=dampAngle(pelvis.rotation.y,0,dt,16);
    lShoulder.rotation.z=dampAngle(lShoulder.rotation.z,0,dt,16);
    rShoulder.rotation.z=dampAngle(rShoulder.rotation.z,0,dt,16);
    lElbow.rotation.z=dampAngle(lElbow.rotation.z,0,dt,16);
    rElbow.rotation.z=dampAngle(rElbow.rotation.z,0,dt,16);
    rigRoot.position.z=BABYLON.Scalar.Lerp(rigRoot.position.z,0,1-Math.exp(-16*dt));
  }

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
    player.position.set(-5,5.55,28);
    moveVelocity.set(0,0,0);
    parkourState='normal';
    activeObstacle=null;
    vy=0;
  }
});

// Stable API for separate gameplay systems. Controls remain owned by this file.
window.UP3D={
  scene,engine,canvas,player,camera,muralTex,muralPlane,
  materials:{metal:metalMat,cyan:cyanGlow,warm:warmGlow},
  makeMat:mat,
  makeEmissive:emissiveMat,
  setGameplayLocked(v){gameplayLocked=!!v;},
  getStealthState(){
    const m=mobileInput();
    const crouching=!!(keys.ControlLeft||keys.ControlRight||keys.KeyC||m.crouch);
    const running=!crouching&&(!!(keys.ShiftLeft||keys.ShiftRight)||m.magnitude>.88);
    return {
      crouching,
      running,
      speed:Math.sqrt(moveVelocity.x*moveVelocity.x+moveVelocity.z*moveVelocity.z)
    };
  },
  addLookDelta(dx,dy){
    camYaw-=dx*.0042;
    camPitch=BABYLON.Scalar.Clamp(camPitch+dy*.0033,-.38,.48);
  },
  toggleView(){setFirstPerson(!firstPerson);},
  getMoveDirection(){
    if(currentMoveIntent.lengthSquared()>.04)return currentMoveIntent.clone().normalize();
    return new BABYLON.Vector3(-Math.sin(player.rotation.y),0,-Math.cos(player.rotation.y)).normalize();
  },
  getForward(){
    return new BABYLON.Vector3(
      -Math.sin(player.rotation.y),0,-Math.cos(player.rotation.y)
    ).normalize();
  },
  getMoveIntent(){
    const d=getMoveIntentWorld();
    return d.lengthSquared()>.01?d.normalize():playerForward();
  },
  startRoll(direction){
    return startDirectionalRoll(direction);
  },
  isRolling(){
    return rollAnim.active;
  },
  playAttack(type='light'){
    combatAnim.type=type;
    combatAnim.combo=(combatAnim.combo+1)%4;
    combatAnim.side*=-1;
    combatAnim.duration=type==='heavy'?.72:.42;
    combatAnim.timer=combatAnim.duration;
  },
  resetMotion(){
    moveVelocity.set(0,0,0);
    vy=0;
    parkourState='normal';
    activeObstacle=null;
    parkourCooldown=.2;
    rollAnim.active=false;
    rollAnim.timer=0;
    rigRoot.rotation.x=0;
  }
};

// Lightweight dynamic shadows: character only on mobile, character + nearby props on desktop.
const shadowMapSize=matchMedia('(pointer:coarse)').matches?512:1024;
const shadowGen=new BABYLON.ShadowGenerator(shadowMapSize,sun);
shadowGen.useBlurExponentialShadowMap=true;
shadowGen.blurKernel=12;
shadowGen.bias=.0025;
for(const mesh of scene.meshes){
  if(mesh===player||mesh.parent===rigRoot||mesh.parent===lShoulder||mesh.parent===rShoulder||
     mesh.parent===lElbow||mesh.parent===rElbow||mesh.parent===lHip||mesh.parent===rHip||
     mesh.parent===lKnee||mesh.parent===rKnee||mesh.parent===lAnkle||mesh.parent===rAnkle){
    if(mesh!==player)shadowGen.addShadowCaster(mesh);
  }
  if(['ground','road','sidewalkL','sidewalkR'].includes(mesh.name)||mesh.name.startsWith('roof')){
    mesh.receiveShadows=true;
  }
}

scene.collisionsEnabled=true;
engine.runRenderLoop(()=>scene.render());
window.addEventListener('resize',()=>engine.resize());