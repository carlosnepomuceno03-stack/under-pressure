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
    enemyBar:document.getElementById('enemyBar'),
    stealth:document.getElementById('stealthState'),
    guide:document.getElementById('guideCanvas'),
    coverage:document.getElementById('coverageBar'),
    coverageText:document.getElementById('coverageText'),
    pressure:document.getElementById('pressureBar'),
    pressureText:document.getElementById('pressureText'),
    ink:document.getElementById('inkBar'),
    inkText:document.getElementById('inkText'),
    rep:document.getElementById('repText'),
    shake:document.getElementById('shakeCan'),
    gallery:document.getElementById('artGallery'),
    galleryList:document.getElementById('artGalleryList'),
    founderCount:document.getElementById('founderCount')
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
    dodging:false,
    crouching:false,
    founders:new Set(),
    selectedArt:'nepo_throw'
  };

  const ART_CATALOG=[
    {id:'nepo_throw',name:'NEPO THROW',type:'THROW-UP',difficulty:1,rep:1.00,desc:'Rápido, simples e direto.'},
    {id:'gate_piece',name:'PORTÃO 26',type:'PIECE',difficulty:3,rep:1.25,desc:'Peça colorida com preenchimento grande.'},
    {id:'alien_jam',name:'ALIEN JAM',type:'MURAL',difficulty:4,rep:1.45,desc:'Peça grande com personagem alien.'},
    {id:'crew_wall',name:'CREW WALL',type:'MURAL',difficulty:5,rep:1.65,desc:'Mural pesado de crew.'},
    {id:'blackbook',name:'BLACKBOOK WILD',type:'PIECE',difficulty:4,rep:1.40,desc:'Wildstyle inspirado em sketch de blackbook.'}
  ];

  function renderGallery(){
    if(!ui.galleryList)return;
    ui.galleryList.innerHTML='';
    for(const art of ART_CATALOG){
      const b=document.createElement('button');
      b.className='artCard'+(STATE.selectedArt===art.id?' active':'');
      b.dataset.art=art.id;
      b.innerHTML='<strong>'+art.name+'</strong><span>'+art.type+' • DIF '+art.difficulty+'</span><small>'+art.desc+'</small>';
      b.addEventListener('click',()=>{
        STATE.selectedArt=art.id;
        renderGallery();
        toast(art.name+' SELECIONADO',900);
      });
      ui.galleryList.appendChild(b);
    }
  }

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
    if(ui.founderCount)ui.founderCount.textContent='FUNDADORES '+STATE.founders.size+'/4';
    const stealth=G.getStealthState?.()||{crouching:false,running:false};
    STATE.crouching=!!stealth.crouching;
    if(ui.stealth)ui.stealth.textContent=stealth.crouching?'AGACHADO • SILENCIOSO':(stealth.running?'CORRENDO • BARULHENTO':'EM PÉ');
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

      this.flashlight=new BABYLON.SpotLight(
        'guardFlashlight'+id,
        this.root.position.add(new BABYLON.Vector3(0,1.18,0)),
        new BABYLON.Vector3(0,-.08,1),
        .58,14,scene
      );
      this.flashlight.diffuse=new BABYLON.Color3(1,.92,.68);
      this.flashlight.specular=new BABYLON.Color3(.4,.36,.24);
      this.flashlight.intensity=.72;
      this.flashlight.range=13;

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
      const stealth=G.getStealthState?.()||{crouching:false,running:false,speed:0};
      const eye=this.eye();
      const target=player.position.add(new BABYLON.Vector3(0,stealth.crouching?.40:.72,0));
      const delta=target.subtract(eye);
      const dist=delta.length();

      // Crouching reduces visual range dramatically unless already in pursuit.
      const maxVision=STATE.alertState==='ALERT'?15:(stealth.crouching?8.2:14.5);
      if(dist>maxVision)return {seen:false,heard:false,dist};

      const dir=delta.normalize();
      const flat=new BABYLON.Vector3(dir.x,0,dir.z).normalize();
      const dot=BABYLON.Vector3.Dot(this.facing,flat);
      const fov=STATE.alertState==='ALERT'?.30:(stealth.crouching?.70:.58);

      let visible=false;
      if(dot>=fov){
        const ray=new BABYLON.Ray(eye,dir,dist);
        const hit=scene.pickWithRay(ray,m=>
          m!==player&&m.checkCollisions&&m.metadata?.guard!==true&&m.isVisible!==false
        );
        visible=!(hit?.hit&&hit.distance<dist-.55);
      }

      // Hearing: sprinting is loud, walking is moderate, crouching nearly silent.
      let hearRadius=.7;
      if(!stealth.crouching&&stealth.speed>.35)hearRadius=stealth.running?7.2:3.4;
      const heard=dist<hearRadius;

      return {seen:visible,heard,dist};
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
      this.sees=vision.seen||vision.heard;
      this.beacon.isVisible=STATE.alertState==='ALERT'||vision.seen;

      const eye=this.eye();
      this.flashlight.position.copyFrom(eye);
      this.flashlight.direction.copyFrom(new BABYLON.Vector3(this.facing.x,-.10,this.facing.z).normalize());

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
    const oldTilt=g.root.rotation.x;
    g.root.rotation.x=.20;
    setTimeout(()=>{if(!g.down)g.root.rotation.x=oldTilt;},140);
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
    STATE.attacking=true;
    G.playAttack?.(type);

    const range=type==='heavy'?3.0:2.65;
    const g=nearestGuard(range);
    if(g){
      // Mild auto-facing makes close combat readable without turning it into lock-on.
      const toGuard=g.root.position.subtract(player.position);toGuard.y=0;
      const dist=toGuard.length();
      if(dist>.001){
        toGuard.normalize();
        const forward=G.getForward?.()||toGuard;
        const facing=BABYLON.Vector3.Dot(forward,toGuard);
        if(facing>.05){
          const dmg=type==='heavy'?34:20;
          const stun=type==='heavy'?.55:.25;
          // Delay damage to match the visible swing impact.
          setTimeout(()=>{
            if(!g.down&&BABYLON.Vector3.Distance(player.position,g.root.position)<=range+.35){
              hitGuard(g,dmg,stun);
            }
          },type==='heavy'?210:115);
        }
      }
    }
    setTimeout(()=>STATE.attacking=false,type==='heavy'?470:290);
  }
  function doDodge(){
    if(STATE.dodging||STATE.graffitiOpen||STATE.caught)return;
    STATE.dodging=true;
    const dir=G.getForward?.()||new BABYLON.Vector3(0,0,1);
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
    setHp(100);
    guards[0].root.position.copyFrom(guards[0].points[0]);
    guards[1].root.position.copyFrom(guards[1].points[0]);
    guards[2].root.position.copyFrom(guards[2].points[0]);
    toast('RECOMEÇANDO',1200);
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

  // founder relics
  const founderDefs=[
    {name:'NEPO',pos:[-20,1.0,18]},
    {name:'TRANE',pos:[6,1.0,-14]},
    {name:'NOROK',pos:[18,7.5,8]},
    {name:'ICON',pos:[30,9.2,-3]}
  ];
  const founderMat=G.makeEmissive('founderRelic','#ffd34e',.9);
  const founderRelics=founderDefs.map((d,i)=>{
    const r=BABYLON.MeshBuilder.CreateTorus('founder_'+d.name,{diameter:.8,thickness:.12,tessellation:20},scene);
    r.position.set(d.pos[0],d.pos[1],d.pos[2]);r.material=founderMat;r.rotation.x=Math.PI/2;
    r.checkCollisions=false;r.isPickable=false;
    return {...d,mesh:r,t:i};
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
    renderGallery();
    initPaintCanvas();
    setInteract('');
  }
  function closeGraffiti(){
    STATE.graffitiOpen=false;
    G.setGameplayLocked(false);
    if(ui.graffiti)ui.graffiti.classList.remove('show');
  }

  let paintCtx=null,guideCtx=null,painting=false,last=null,paintInitialized=false;
  let pressure=100,ink=100,coverage=0,rep=0,drips=0;
  let selectedCap='normal';
  const targetCells=new Set(),coveredCells=new Set();
  const GRID_X=64,GRID_Y=36;

  function drawGuide(){
    if(!ui.guide)return;
    ui.guide.width=1024;ui.guide.height=576;
    guideCtx=ui.guide.getContext('2d');
    guideCtx.clearRect(0,0,1024,576);
    guideCtx.save();
    guideCtx.textAlign='center';
    guideCtx.textBaseline='middle';
    guideCtx.font='900 210px Arial Black, Arial';
    guideCtx.lineJoin='round';
    guideCtx.lineWidth=28;
    guideCtx.strokeStyle='rgba(20,20,24,.72)';
    guideCtx.strokeText('TDG',512,292);
    guideCtx.lineWidth=8;
    guideCtx.strokeStyle='rgba(255,255,255,.75)';
    guideCtx.strokeText('TDG',512,292);
    guideCtx.restore();

    // Build a coarse target mask for coverage scoring.
    targetCells.clear();
    const img=guideCtx.getImageData(0,0,1024,576).data;
    for(let gy=0;gy<GRID_Y;gy++){
      for(let gx=0;gx<GRID_X;gx++){
        const px=Math.floor((gx+.5)*1024/GRID_X);
        const py=Math.floor((gy+.5)*576/GRID_Y);
        const a=img[(py*1024+px)*4+3];
        if(a>35)targetCells.add(gx+','+gy);
      }
    }
  }

  function updateGraffitiHUD(){
    coverage=targetCells.size?coveredCells.size/targetCells.size:0;
    const clean=Math.max(0,1-drips*.035);
    rep=Math.round(coverage*800+clean*200);

    if(ui.coverage)ui.coverage.style.width=(coverage*100).toFixed(0)+'%';
    if(ui.coverageText)ui.coverageText.textContent=Math.round(coverage*100)+'%';
    if(ui.pressure)ui.pressure.style.width=pressure+'%';
    if(ui.pressureText)ui.pressureText.textContent=Math.round(pressure)+'%';
    if(ui.ink)ui.ink.style.width=ink+'%';
    if(ui.inkText)ui.inkText.textContent=Math.round(ink)+'%';
    if(ui.rep)ui.rep.textContent='REP '+rep;

    if(ui.finish){
      ui.finish.disabled=coverage<.62;
      ui.finish.textContent=coverage<.62?'PREENCHA '+Math.round(62-coverage*100)+'%':'FINALIZAR';
    }
  }

  function refreshUnlocks(){
    document.querySelectorAll('[data-cap]').forEach(btn=>{
      const cap=btn.dataset.cap;
      const unlocked=cap==='normal'||(cap==='skinny'&&STATE.collected.has('Skinny Cap'))||(cap==='fat'&&STATE.collected.has('Fat Cap'));
      btn.disabled=!unlocked;
      btn.classList.toggle('locked',!unlocked);
    });
    const uv=document.querySelector('[data-paint="#9b65ff"]');
    if(uv){
      const unlocked=STATE.collected.has('UV');
      uv.disabled=!unlocked;uv.classList.toggle('locked',!unlocked);
    }
  }

  function initPaintCanvas(){
    if(!ui.paint)return;
    ui.paint.width=1024;ui.paint.height=576;
    paintCtx=ui.paint.getContext('2d');
    if(!paintInitialized){
      paintCtx.fillStyle='#b7afa5';paintCtx.fillRect(0,0,1024,576);
      paintCtx.fillStyle='rgba(65,54,49,.16)';
      for(let i=0;i<90;i++)paintCtx.fillRect((i*97)%1024,(i*53)%576,12+(i%5)*9,3+(i%3)*4);
      paintInitialized=true;
      pressure=100;ink=100;coverage=0;rep=0;drips=0;coveredCells.clear();
    }
    paintCtx.lineCap='round';paintCtx.lineJoin='round';
    drawGuide();refreshUnlocks();updateGraffitiHUD();
  }

  function paintPos(e){
    const r=ui.paint.getBoundingClientRect();
    return {x:(e.clientX-r.left)*(1024/r.width),y:(e.clientY-r.top)*(576/r.height)};
  }

  function capWidth(){
    if(selectedCap==='skinny')return 12;
    if(selectedCap==='fat')return 54;
    return 30;
  }

  function markCoverage(a,b,width){
    const dist=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));
    const steps=Math.ceil(dist/8);
    const radius=Math.max(1,Math.ceil(width/1024*GRID_X*.65));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
      const gx=Math.floor(x/1024*GRID_X),gy=Math.floor(y/576*GRID_Y);
      for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
        const key=(gx+ox)+','+(gy+oy);
        if(targetCells.has(key))coveredCells.add(key);
      }
    }
  }

  ui.paint?.addEventListener('pointerdown',e=>{
    if(pressure<=2||ink<=1)return;
    painting=true;last=paintPos(e);ui.paint.setPointerCapture?.(e.pointerId);
  });

  ui.paint?.addEventListener('pointermove',e=>{
    if(!painting||!paintCtx||pressure<=0||ink<=0)return;
    const p=paintPos(e);
    const speed=Math.hypot(p.x-last.x,p.y-last.y);
    const base=capWidth();
    const width=Math.max(base*.55,base+10-Math.min(base*.55,speed*.22));
    const color=document.querySelector('[data-paint].active:not(:disabled)')?.dataset.paint||'#35d7df';

    // Low pressure becomes patchy / weak.
    paintCtx.globalAlpha=Math.max(.28,pressure/100);
    paintCtx.strokeStyle=color;
    paintCtx.lineWidth=width;
    paintCtx.beginPath();paintCtx.moveTo(last.x,last.y);paintCtx.lineTo(p.x,p.y);paintCtx.stroke();
    paintCtx.globalAlpha=1;

    markCoverage(last,p,width);

    const gloveMul=STATE.collected.has('Luvas')?.75:1;
    ink=Math.max(0,ink-(.035+speed*.0008)*gloveMul);
    pressure=Math.max(0,pressure-(.055+speed*.00035));

    // Staying too long creates drips and costs clean-style REP.
    if(speed<2.2&&Math.random()<.22){
      drips++;
      paintCtx.globalAlpha=.78;
      paintCtx.lineWidth=Math.max(4,width*.22);
      paintCtx.beginPath();paintCtx.moveTo(p.x,p.y);paintCtx.lineTo(p.x,p.y+15+Math.random()*48);paintCtx.stroke();
      paintCtx.globalAlpha=1;
    }

    last=p;updateGraffitiHUD();
  });
  window.addEventListener('pointerup',()=>painting=false);

  document.querySelectorAll('[data-paint]').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.disabled)return;
    document.querySelectorAll('[data-paint]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }));
  document.querySelectorAll('[data-cap]').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.disabled)return;
    document.querySelectorAll('[data-cap]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedCap=btn.dataset.cap;
  }));
  ui.shake?.addEventListener('click',()=>{
    pressure=Math.min(100,pressure+42);
    updateGraffitiHUD();
    toast('TSH TSH TSH • PRESSÃO RECUPERADA',650);
  });

  function saveGraffiti(){
    if(!ui.paint||!paintCtx)return;
    if(coverage<.62){
      toast('TERMINE MAIS DA PEÇA',1000);
      return;
    }
    const targetCtx=muralTex.getContext();
    targetCtx.clearRect(0,0,1024,512);
    targetCtx.drawImage(ui.paint,0,0,1024,512);
    muralTex.update();
    try{localStorage.setItem('UP3D_PHASE1_ART',ui.paint.toDataURL('image/webp',.78));}catch(e){}
    STATE.mission='complete';
    STATE.missionComplete=true;
    closeGraffiti();
    graffitiMarker.setEnabled(false);
    setObjective('Graffiti concluído — REP '+rep);
    ui.complete?.classList.add('show');
    const rank=rep>=850?'S':rep>=700?'A':rep>=550?'B':'C';
    ui.complete?.querySelector('span')?.replaceChildren(document.createTextNode('REP '+rep+' • RANK '+rank));
    toast('MISSÃO CONCLUÍDA • REP '+rep,2600);
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
        refreshUnlocks();
      }
    }
  }
  function updateFounders(dt){
    if(typeof founderRelics==='undefined')return;
    for(const f of founderRelics){
      if(!f.mesh.isEnabled())continue;
      f.t+=dt;
      f.mesh.rotation.z+=dt*1.2;
      f.mesh.position.y+=Math.sin(f.t*2)*.002;
      if(BABYLON.Vector3.Distance(player.position,f.mesh.position)<1.1){
        f.mesh.setEnabled(false);
        STATE.founders.add(f.name);
        toast('FUNDADOR TDG • '+f.name,1500);
        if(STATE.founders.size===4)toast('4 FUNDADORES ENCONTRADOS • MURAL TDG LIBERADO',2200);
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
      if((v.seen||v.heard)&&(!best||v.dist<best.dist))best=v;
    }

    if(best){
      const stealth=G.getStealthState?.()||{crouching:false};
      const gain=BABYLON.Scalar.Clamp(1.45-best.dist/18,.35,1.25);
      const stealthMul=stealth.crouching?.42:1;
      STATE.alert=Math.min(1,STATE.alert+gain*dt*.72*stealthMul);
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
    updateFounders(dt);
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
    }else{
      ui.combat?.classList.add('show');
    }
    updateHUD();
  });

  setObjective('Alcance o mural pelos telhados, rua ou campão');
  updateHUD();
})();