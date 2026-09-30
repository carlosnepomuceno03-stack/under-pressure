(()=>{
  const G=window.UP3D;
  if(!G)return;

  const {scene,player,canvas,muralTex}=G;
  const ui={
    objective:document.getElementById('objectiveText'),
    alertWrap:document.getElementById('alertWrap'),
    alertBar:document.getElementById('alertBar'),
    alertText:document.getElementById('alertText'),
    collect:document.getElementById('collectibles'),
    interact:document.getElementById('interactPrompt'),
    toast:document.getElementById('toast'),
    graffiti:document.getElementById('graffitiMode'),
    paint:document.getElementById('graffitiCanvas'),
    finish:document.getElementById('finishGraffiti'),
    close:document.getElementById('cancelGraffiti'),
    complete:document.getElementById('missionComplete')
  };

  const STATE={
    mission:'approach',
    alert:0,
    alertState:'SAFE',
    caught:false,
    checkpoint:new BABYLON.Vector3(-16,1.2,27),
    checkpoint2:false,
    collected:new Set(),
    totalCollectibles:4,
    graffitiOpen:false,
    missionComplete:false
  };

  function toast(msg,ms=1700){
    if(!ui.toast)return;
    ui.toast.textContent=msg;
    ui.toast.classList.add('show');
    clearTimeout(toast.t);
    toast.t=setTimeout(()=>ui.toast.classList.remove('show'),ms);
  }
  function setObjective(text){
    if(ui.objective)ui.objective.textContent=text;
  }
  function setInteract(text=''){
    if(!ui.interact)return;
    ui.interact.textContent=text;
    ui.interact.classList.toggle('show',!!text);
  }
  function updateHUD(){
    if(ui.alertBar)ui.alertBar.style.width=(STATE.alert*100).toFixed(0)+'%';
    if(ui.alertWrap)ui.alertWrap.dataset.state=STATE.alertState;
    if(ui.alertText)ui.alertText.textContent=STATE.alertState==='ALERT'?'PERSEGUIÇÃO':STATE.alertState==='SUSPICIOUS'?'SUSPEITO':'OCULTO';
    if(ui.collect)ui.collect.textContent='SPRAYS '+STATE.collected.size+'/'+STATE.totalCollectibles;
  }

  const guardMat=G.makeMat('guardUniform','#17202a');
  const guardSkin=G.makeMat('guardSkin','#a87963');
  const guardAlert=G.makeMat('guardAlert','#d63b44');
  guardAlert.emissiveColor=new BABYLON.Color3(.55,.03,.04);

  function guardPart(name,w,h,d,parent,x,y,z,material){
    const m=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
    m.parent=parent;m.position.set(x,y,z);m.material=material;
    m.checkCollisions=false;m.isPickable=false;m.metadata={guard:true};
    return m;
  }

  class Guard{
    constructor(id,points){
      this.id=id;
      this.points=points.map(p=>new BABYLON.Vector3(p[0],1.05,p[1]));
      this.index=1;
      this.speed=1.45;
      this.chaseSpeed=3.45;
      this.root=new BABYLON.TransformNode('guardRoot'+id,scene);
      this.root.position.copyFrom(this.points[0]);

      guardPart('guardBody'+id,.62,.95,.35,this.root,0,.55,0,guardMat);
      guardPart('guardLegL'+id,.20,.72,.22,this.root,-.16,-.18,0,guardMat);
      guardPart('guardLegR'+id,.20,.72,.22,this.root,.16,-.18,0,guardMat);
      const head=BABYLON.MeshBuilder.CreateSphere('guardHead'+id,{diameter:.46,segments:8},scene);
      head.parent=this.root;head.position.set(0,1.2,0);head.material=guardSkin;
      head.checkCollisions=false;head.isPickable=false;head.metadata={guard:true};

      this.beacon=BABYLON.MeshBuilder.CreateSphere('guardBeacon'+id,{diameter:.16,segments:8},scene);
      this.beacon.parent=this.root;this.beacon.position.set(0,1.62,0);this.beacon.material=guardAlert;
      this.beacon.isVisible=false;this.beacon.isPickable=false;

      this.facing=new BABYLON.Vector3(0,0,1);
      this.sees=false;
    }
    eye(){
      return this.root.position.add(new BABYLON.Vector3(0,1.25,0));
    }
    canSeePlayer(){
      const eye=this.eye();
      const target=player.position.add(new BABYLON.Vector3(0,.72,0));
      const delta=target.subtract(eye);
      const dist=delta.length();
      if(dist>14.5)return {seen:false,dist};
      const dir=delta.normalize();
      const flat=new BABYLON.Vector3(dir.x,0,dir.z).normalize();
      const dot=BABYLON.Vector3.Dot(this.facing,flat);
      const fov=STATE.alertState==='ALERT'?.30:.58;
      if(dot<fov)return {seen:false,dist};

      const ray=new BABYLON.Ray(eye,dir,dist);
      const hit=scene.pickWithRay(ray,m=>
        m!==player&&m.checkCollisions&&m.metadata?.guard!==true&&m.isVisible!==false
      );
      const blocked=hit?.hit&&hit.distance<dist-.55;
      return {seen:!blocked,dist};
    }
    moveToward(target,speed,dt){
      const d=target.subtract(this.root.position);d.y=0;
      const len=d.length();
      if(len<.08)return;
      d.scaleInPlace(1/len);
      this.facing=BABYLON.Vector3.Lerp(this.facing,d,1-Math.exp(-8*dt)).normalize();
      this.root.position.addInPlace(d.scale(speed*dt));
      this.root.rotation.y=Math.atan2(d.x,d.z);
    }
    update(dt){
      const vision=this.canSeePlayer();
      this.sees=vision.seen;
      this.beacon.isVisible=STATE.alertState==='ALERT'||this.sees;

      if(STATE.alertState==='ALERT'){
        this.moveToward(player.position,this.chaseSpeed,dt);
        if(BABYLON.Vector3.Distance(this.root.position,player.position)<1.35){
          catchPlayer();
        }
      }else{
        const target=this.points[this.index];
        this.moveToward(target,this.speed,dt);
        if(BABYLON.Vector3.Distance(this.root.position,target)<.6){
          this.index=(this.index+1)%this.points.length;
        }
      }
      return vision;
    }
  }

  const guards=[
    new Guard(1,[[-18,7],[-18,-18],[-11,-18],[-11,7]]),
    new Guard(2,[[6,-2],[18,-5],[18,-20],[7,-18]]),
    new Guard(3,[[28,12],[28,-10],[22,-10],[22,12]])
  ];

  function respawn(){
    STATE.caught=false;
    STATE.alert=0;
    STATE.alertState='SAFE';
    G.setGameplayLocked(false);
    player.position.copyFrom(STATE.checkpoint);
    G.resetMotion();
    guards[0].root.position.copyFrom(guards[0].points[0]);
    guards[1].root.position.copyFrom(guards[1].points[0]);
    guards[2].root.position.copyFrom(guards[2].points[0]);
    toast('VOLTOU AO CHECKPOINT',1500);
  }
  function catchPlayer(){
    if(STATE.caught||STATE.missionComplete)return;
    STATE.caught=true;
    G.setGameplayLocked(true);
    toast('VOCÊ FOI PEGO',1100);
    setTimeout(respawn,1050);
  }

  // checkpoint marker
  const cpMat=G.makeMat('checkpointMat','#41e7ff');
  cpMat.emissiveColor=new BABYLON.Color3(.05,.55,.65);
  const checkpoint=BABYLON.MeshBuilder.CreateTorus('checkpoint',{diameter:1.8,thickness:.10,tessellation:24},scene);
  checkpoint.position.set(8,.16,4);checkpoint.rotation.x=Math.PI/2;checkpoint.material=cpMat;
  checkpoint.checkCollisions=false;checkpoint.isPickable=false;

  // collectibles
  const pickupMat=[
    G.makeEmissive('pickupPink','#ff4c8b',.8),
    G.makeEmissive('pickupCyan','#38e5ff',.8),
    G.makeEmissive('pickupYellow','#ffd34e',.8),
    G.makeEmissive('pickupPurple','#a96bff',.8)
  ];
  const pickupDefs=[
    {name:'Skinny Cap',pos:[-20,1.0,-5],mat:0},
    {name:'Luvas',pos:[9,1.0,-10],mat:2},
    {name:'UV',pos:[18,7.55,8],mat:1},
    {name:'Fat Cap',pos:[30,9.25,-3],mat:3}
  ];
  const pickups=pickupDefs.map((d,i)=>{
    const root=new BABYLON.TransformNode('pickupRoot'+i,scene);
    root.position.set(d.pos[0],d.pos[1],d.pos[2]);
    const can=BABYLON.MeshBuilder.CreateCylinder('pickup'+i,{diameter:.28,height:.72,tessellation:14},scene);
    can.parent=root;can.material=pickupMat[d.mat];can.checkCollisions=false;can.isPickable=false;
    const cap=BABYLON.MeshBuilder.CreateCylinder('pickupCap'+i,{diameter:.2,height:.12,tessellation:12},scene);
    cap.parent=root;cap.position.y=.42;cap.material=G.materials.metal;cap.checkCollisions=false;cap.isPickable=false;
    return {...d,root,mesh:can,t:Math.random()*4,collected:false};
  });

  // graffiti interaction point
  const graffitiPoint=new BABYLON.Vector3(26,1.1,-24.4);
  const graffitiMarker=BABYLON.MeshBuilder.CreateTorus('graffitiMarker',{diameter:2.2,thickness:.10,tessellation:30},scene);
  graffitiMarker.position.copyFrom(graffitiPoint);graffitiMarker.rotation.x=Math.PI/2;
  graffitiMarker.material=pickupMat[0];graffitiMarker.checkCollisions=false;graffitiMarker.isPickable=false;

  function openGraffiti(){
    if(STATE.graffitiOpen||STATE.missionComplete)return;
    STATE.graffitiOpen=true;
    G.setGameplayLocked(true);
    if(document.pointerLockElement)document.exitPointerLock();
    if(ui.graffiti)ui.graffiti.classList.add('show');
    initPaintCanvas();
    setInteract('');
  }
  function closeGraffiti(){
    STATE.graffitiOpen=false;
    G.setGameplayLocked(false);
    if(ui.graffiti)ui.graffiti.classList.remove('show');
  }

  let paintCtx=null,painting=false,last=null,paintInitialized=false;
  function initPaintCanvas(){
    if(!ui.paint)return;
    const rect=ui.paint.getBoundingClientRect();
    const w=Math.max(640,Math.round(rect.width*devicePixelRatio));
    const h=Math.max(360,Math.round(rect.height*devicePixelRatio));
    if(ui.paint.width!==w||ui.paint.height!==h){
      ui.paint.width=w;ui.paint.height=h;
      paintInitialized=false;
    }
    paintCtx=ui.paint.getContext('2d');
    if(!paintInitialized){
      paintCtx.fillStyle='#b7afa5';paintCtx.fillRect(0,0,w,h);
      paintCtx.fillStyle='rgba(65,54,49,.18)';
      for(let i=0;i<70;i++)paintCtx.fillRect((i*97)%w,(i*53)%h,12+(i%5)*9,3+(i%3)*4);
      paintInitialized=true;
    }
    paintCtx.lineCap='round';paintCtx.lineJoin='round';
  }
  function paintPos(e){
    const r=ui.paint.getBoundingClientRect();
    return {
      x:(e.clientX-r.left)*(ui.paint.width/r.width),
      y:(e.clientY-r.top)*(ui.paint.height/r.height)
    };
  }
  ui.paint?.addEventListener('pointerdown',e=>{
    painting=true;last=paintPos(e);ui.paint.setPointerCapture?.(e.pointerId);
  });
  ui.paint?.addEventListener('pointermove',e=>{
    if(!painting||!paintCtx)return;
    const p=paintPos(e);
    const speed=Math.hypot(p.x-last.x,p.y-last.y);
    paintCtx.strokeStyle=document.querySelector('[data-paint].active')?.dataset.paint||'#35d7df';
    paintCtx.lineWidth=Math.max(7,32-Math.min(25,speed*.35));
    paintCtx.beginPath();paintCtx.moveTo(last.x,last.y);paintCtx.lineTo(p.x,p.y);paintCtx.stroke();
    if(speed<3&&Math.random()<.12){
      paintCtx.beginPath();paintCtx.moveTo(p.x,p.y);paintCtx.lineTo(p.x,p.y+18+Math.random()*35);paintCtx.stroke();
    }
    last=p;
  });
  window.addEventListener('pointerup',()=>painting=false);

  document.querySelectorAll('[data-paint]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-paint]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }));

  function saveGraffiti(){
    if(!ui.paint||!paintCtx)return;
    const targetCtx=muralTex.getContext();
    targetCtx.clearRect(0,0,1024,512);
    targetCtx.drawImage(ui.paint,0,0,1024,512);
    muralTex.update();
    try{localStorage.setItem('UP3D_PHASE1_ART',ui.paint.toDataURL('image/webp',.78));}catch(e){}
    STATE.mission='complete';
    STATE.missionComplete=true;
    closeGraffiti();
    graffitiMarker.setEnabled(false);
    setObjective('Graffiti concluído — Fase 1 finalizada');
    ui.complete?.classList.add('show');
    toast('MISSÃO CONCLUÍDA',2600);
  }
  ui.finish?.addEventListener('click',saveGraffiti);
  ui.close?.addEventListener('click',closeGraffiti);

  // restore exact player art
  try{
    const saved=localStorage.getItem('UP3D_PHASE1_ART');
    if(saved){
      const img=new Image();
      img.onload=()=>{
        const c=muralTex.getContext();c.clearRect(0,0,1024,512);c.drawImage(img,0,0,1024,512);muralTex.update();
      };
      img.src=saved;
    }
  }catch(e){}

  // keyboard interaction
  let fPressed=false;
  window.addEventListener('keydown',e=>{
    if(e.code==='KeyF'&&!fPressed){
      fPressed=true;
      if(!STATE.graffitiOpen&&!STATE.missionComplete&&BABYLON.Vector3.Distance(player.position,graffitiPoint)<3.1){
        if(STATE.alertState==='ALERT')toast('PERCA A POLÍCIA PRIMEIRO');
        else openGraffiti();
      }
    }
  });
  window.addEventListener('keyup',e=>{if(e.code==='KeyF')fPressed=false});

  function updateCheckpoint(){
    if(STATE.checkpoint2)return;
    if(BABYLON.Vector3.Distance(player.position,checkpoint.position)<1.55){
      STATE.checkpoint2=true;
      STATE.checkpoint.copyFrom(new BABYLON.Vector3(8,1.2,4));
      checkpoint.setEnabled(false);
      toast('CHECKPOINT',1500);
    }
  }
  function updatePickups(dt){
    for(const p of pickups){
      if(p.collected)continue;
      p.t+=dt;
      p.root.rotation.y+=dt*1.4;
      p.root.position.y=p.pos[1]+Math.sin(p.t*2.2)*.14;
      if(BABYLON.Vector3.Distance(player.position,p.root.position)<1.2){
        p.collected=true;
        p.root.setEnabled(false);
        STATE.collected.add(p.name);
        toast(p.name.toUpperCase()+' COLETADO',1300);
      }
    }
  }
  function updateMission(){
    if(STATE.missionComplete)return;
    const d=BABYLON.Vector3.Distance(player.position,graffitiPoint);
    if(d<8&&STATE.mission==='approach'){
      STATE.mission='graffiti';
      setObjective('Chegue ao ponto marcado no mural');
    }
    if(d<3.1&&!STATE.graffitiOpen){
      setInteract(STATE.alertState==='ALERT'?'DESPISTE A POLÍCIA':'F — GRAFITAR');
    }else if(!STATE.graffitiOpen)setInteract('');
  }
  function updateAlert(dt){
    if(STATE.graffitiOpen||STATE.caught||STATE.missionComplete)return;

    let best=null;
    for(const g of guards){
      const v=g.update(dt);
      if(v.seen&&(!best||v.dist<best.dist))best=v;
    }

    if(best){
      const gain=BABYLON.Scalar.Clamp(1.45-best.dist/18,.35,1.25);
      STATE.alert=Math.min(1,STATE.alert+gain*dt*.72);
    }else{
      STATE.alert=Math.max(0,STATE.alert-dt*(STATE.alertState==='ALERT'?.12:.28));
    }

    if(STATE.alert>=1)STATE.alertState='ALERT';
    else if(STATE.alert>.28)STATE.alertState='SUSPICIOUS';
    else STATE.alertState='SAFE';

    if(STATE.alertState==='ALERT'&&!best&&STATE.alert<.16){
      STATE.alertState='SAFE';
    }
  }

  // If graffiti overlay is open guards still visually idle; player controls remain locked.
  scene.onBeforeRenderObservable.add(()=>{
    const dt=Math.min(.033,G.engine.getDeltaTime()/1000);
    updatePickups(dt);
    updateCheckpoint();
    updateMission();
    updateAlert(dt);
    graffitiMarker.rotation.z+=dt*.7;
    checkpoint.rotation.z+=dt*.4;
    updateHUD();
  });

  setObjective('Alcance o mural pelos telhados, rua ou campão');
  updateHUD();
})();