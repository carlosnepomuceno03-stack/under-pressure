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
    complete:document.getElementById('missionComplete'),
    combat:document.getElementById('combatHud'),
    combo:document.getElementById('comboText'),
    hpBar:document.getElementById('hpBar'),
    enemyBar:document.getElementById('enemyBar')
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
    missionComplete:false,
    health:100,
    combo:0,
    comboTimer:0,
    combatTarget:null,
    attacking:false,
    dodging:false
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
    if(ui.collect)ui.collect.textContent='ITENS '+STATE.collected.size+'/'+STATE.totalCollectibles;
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
      this.hp=100;
      this.stun=0;
      this.attackCooldown=0;
      this.down=false;
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
      if(this.down)return {seen:false,dist:999};
      this.stun=Math.max(0,this.stun-dt);
      this.attackCooldown=Math.max(0,this.attackCooldown-dt);

      const vision=this.canSeePlayer();
      this.sees=vision.seen;
      this.beacon.isVisible=STATE.alertState==='ALERT'||this.sees;

      if(this.stun>0)return vision;

      if(STATE.alertState==='ALERT'){
        const d=BABYLON.Vector3.Distance(this.root.position,player.position);
        if(d>1.55){
          this.moveToward(player.position,this.chaseSpeed,dt);
        }else if(this.attackCooldown<=0&&!STATE.dodging){
          this.attackCooldown=1.05+Math.random()*.35;
          damagePlayer(12);
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

  function setEnemyBar(v){
    if(ui.enemyBar)ui.enemyBar.style.width=Math.max(0,Math.min(100,v))+'%';
  }
  function setHp(v){
    STATE.health=Math.max(0,Math.min(100,v));
    if(ui.hpBar)ui.hpBar.style.width=STATE.health+'%';
  }
  function damagePlayer(amount){
    if(STATE.dodging||STATE.caught||STATE.missionComplete)return;
    setHp(STATE.health-amount);
    toast('-'+amount+' HP',650);
    if(STATE.health<=0)catchPlayer();
  }
  function nearestGuard(maxDist=2.4){
    let best=null,bestD=maxDist;
    for(const g of guards){
      if(g.down)continue;
      const d=BABYLON.Vector3.Distance(player.position,g.root.position);
      if(d<bestD){best=g;bestD=d;}
    }
    return best;
  }
  function hitGuard(g,damage,stun=.25){
    if(!g||g.down)return;
    g.hp=Math.max(0,g.hp-damage);
    g.stun=Math.max(g.stun,stun);
    STATE.combo++;
    STATE.comboTimer=1.3;
    STATE.combatTarget=g;
    setEnemyBar(g.hp);
    if(ui.combo)ui.combo.textContent='COMBO x'+STATE.combo;
    ui.combat?.classList.add('show');
    if(g.hp<=0){
      g.down=true;
      g.root.rotation.z=Math.PI/2;
      g.beacon.isVisible=false;
      toast('GUARDA DERRUBADO',900);
      setTimeout(()=>g.root.setEnabled(false),450);
      STATE.combatTarget=null;
      setEnemyBar(0);
    }
  }
  function doAttack(type){
    if(STATE.attacking||STATE.dodging||STATE.graffitiOpen||STATE.caught)return;
    const g=nearestGuard(type==='heavy'?2.45:2.1);
    if(!g)return;
    STATE.attacking=true;
    const dmg=type==='heavy'?34:20;
    const stun=type==='heavy'?.55:.25;
    hitGuard(g,dmg,stun);
    setTimeout(()=>STATE.attacking=false,type==='heavy'?420:230);
  }
  function doDodge(){
    if(STATE.dodging||STATE.graffitiOpen||STATE.caught)return;
    STATE.dodging=true;
    const dir=playerForward ? playerForward() : new BABYLON.Vector3(0,0,1);
    try{ player.moveWithCollisions(dir.scale(-1.6)); }catch(e){}
    setTimeout(()=>STATE.dodging=false,420);
  }
  function stealthTakedown(){
    if(STATE.graffitiOpen||STATE.alertState==='ALERT')return false;
    let best=null,bestD=1.6;
    for(const g of guards){
      if(g.down)continue;
      const d=BABYLON.Vector3.Distance(player.position,g.root.position);
      if(d<bestD){
        const toPlayer=player.position.subtract(g.root.position);toPlayer.y=0;toPlayer.normalize();
        const facingDot=BABYLON.Vector3.Dot(g.facing,toPlayer);
        if(facingDot<-.25){best=g;bestD=d;}
      }
    }
    if(best){
      hitGuard(best,100,1);
      toast('TAKEDOWN',900);
      return true;
    }
    return false;
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
    player.position.set(-16,1.2,27);
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

  // combat controls
  window.addEventListener('keydown',e=>{
    if(e.code==='KeyE'){
      if(!stealthTakedown())doAttack('light');
    }
    if(e.code==='KeyR')doAttack('heavy');
    if(e.code==='KeyQ')doDodge();
  });

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
        const effect={
          'Skinny Cap':'CAP FINO LIBERADO NO GRAFFITI',
          'Fat Cap':'CAP LARGO LIBERADO NO GRAFFITI',
          'UV':'COR UV LIBERADA',
          'Luvas':'-25% GASTO DE TINTA'
        }[p.name]||'COLETADO';
        toast(p.name.toUpperCase()+' • '+effect,1700);
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
    updateMission();
    updateAlert(dt);
    graffitiMarker.rotation.z+=dt*.7;
    STATE.comboTimer=Math.max(0,STATE.comboTimer-dt);
    if(STATE.comboTimer<=0&&STATE.combo>0){
      STATE.combo=0;
      if(ui.combo)ui.combo.textContent='COMBO x0';
    }
    if(STATE.combatTarget&&!STATE.combatTarget.down){
      setEnemyBar(STATE.combatTarget.hp);
      ui.combat?.classList.add('show');
    }else if(STATE.alertState!=='ALERT'){
      ui.combat?.classList.remove('show');
    }
    updateHUD();
  });

  setObjective('Alcance o mural pelos telhados, rua ou campão');
  updateHUD();
})();