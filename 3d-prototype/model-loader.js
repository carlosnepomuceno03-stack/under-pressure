(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const params=new URLSearchParams(location.search);
  const STATIC_TEST=params.has('staticplayer');
  // Raw UAL tracks are not compatible with this player bind pose.
  // Explicit opt-in only until proper skeleton retargeting is implemented.
  const EXPERIMENTAL_UAL=params.has('experimentalual');
  const FILES=STATIC_TEST?['player_meshy.glb','rigged-model.glb']:['under_pressure_personagem_16_animacoes.glb','rigged-model.glb','player_meshy.glb'];
  const DEBUG_PLAYER=STATIC_TEST||new URLSearchParams(location.search).has('debugplayer');
  let testPanel=null;
  function status(message){
    console.info('[Under Pressure] model:',message);
    if(!DEBUG_PLAYER)return;
    if(!testPanel){
      testPanel=document.createElement('div');
      Object.assign(testPanel.style,{position:'fixed',top:'12px',left:'12px',zIndex:'99999',maxWidth:'min(85vw,480px)',padding:'12px 16px',background:'#10151fe8',color:'#b7ffca',font:'bold 14px monospace',border:'1px solid #5edb88',borderRadius:'9px',pointerEvents:'none',whiteSpace:'pre-wrap'});
      document.body.appendChild(testPanel);
    }
    testPanel.textContent='TESTE DO PERSONAGEM\n'+message;
  }
  const ANIM_FILE='player_ual_anims.glb';
  const TARGET_HEIGHT=2.18;
  const VISUAL_FEET_Y=-1.015; // capsule bottom is ~-1.05: keep soles just above collision floor

  function boot(){
    if(!window.UP3D?.scene||!window.BABYLON?.SceneLoader){
      setTimeout(boot,50);
      return;
    }
    loadPlayer().catch(err=>{
      console.error('[Under Pressure] model initialization failed',err);
      const original=window.UP3D?.scene?.getTransformNodeByName('rigRoot');
      original?.setEnabled(true);
      document.body.classList.remove('glb-player-loading');
      document.body.classList.add('glb-player-fallback');
      status('ERRO: '+(err?.message||err)+'\nPersonagem anterior restaurado.');
    });
  }

  function readableMaterial(scene,mesh){
    if(!mesh?.material)return;
    const src=mesh.material;
    const tex=src.albedoTexture||src.diffuseTexture||null;
    const mat=new BABYLON.StandardMaterial('UP_PlayerMat_'+mesh.uniqueId,scene);
    mat.diffuseColor=new BABYLON.Color3(1,1,1);
    mat.specularColor=new BABYLON.Color3(.055,.055,.055);
    mat.emissiveColor=new BABYLON.Color3(.08,.08,.08);
    mat.backFaceCulling=false;
    mat.alpha=1;
    if(tex){
      mat.diffuseTexture=tex;
      mat.emissiveTexture=tex;
      mat.emissiveColor=new BABYLON.Color3(.07,.07,.07);
    }
    mesh.material=mat;
  }

  function getBounds(meshes){
    let min=new BABYLON.Vector3(Infinity,Infinity,Infinity);
    let max=new BABYLON.Vector3(-Infinity,-Infinity,-Infinity);
    let found=false;
    for(const m of meshes){
      if(!m||m.name==='__root__'||(m.getTotalVertices?.()||0)<=0)continue;
      m.computeWorldMatrix(true);
      const bi=m.getBoundingInfo?.();
      if(!bi)continue;
      const bb=bi.boundingBox;
      min=BABYLON.Vector3.Minimize(min,bb.minimumWorld);
      max=BABYLON.Vector3.Maximize(max,bb.maximumWorld);
      found=true;
    }
    return found?{min,max,height:max.y-min.y,center:min.add(max).scale(.5)}:null;
  }

  function normalizeName(name=''){
    return name
      .replace(/^mixamorig[:_]?/i,'')
      .replace(/[^a-z0-9]/gi,'')
      .toLowerCase();
  }

  function buildTargetLookup(result){
    const map=new Map();
    const nodes=[
      ...(result.transformNodes||[]),
      ...(result.meshes||[])
    ];
    for(const sk of (result.skeletons||[])){
      for(const bone of (sk.bones||[])){
        const tn=bone.getTransformNode?.();
        if(tn)nodes.push(tn);
      }
    }
    for(const n of nodes){
      if(!n?.name)continue;
      map.set(normalizeName(n.name),n);
    }
    return map;
  }

  const SOURCE_TO_TARGET={
    root:null,
    pelvis:['Hips','Pelvis'],
    spine01:['Spine'],
    spine02:['Spine1','Spine2','Chest'],
    spine03:['Spine2','Spine1','Chest'],
    neck01:['Neck'],
    head:['Head'],
    claviclel:['LeftShoulder','ShoulderL'],
    upperarml:['LeftArm','UpperArmL'],
    lowerarml:['LeftForeArm','LeftForearm','LowerArmL'],
    handl:['LeftHand','HandL'],
    clavicler:['RightShoulder','ShoulderR'],
    upperarmr:['RightArm','UpperArmR'],
    lowerarmr:['RightForeArm','RightForearm','LowerArmR'],
    handr:['RightHand','HandR'],
    thighl:['LeftUpLeg','LeftUpperLeg','ThighL'],
    calfl:['LeftLeg','LeftLowerLeg','CalfL'],
    footl:['LeftFoot','FootL'],
    thighr:['RightUpLeg','RightUpperLeg','ThighR'],
    calfr:['RightLeg','RightLowerLeg','CalfR'],
    footr:['RightFoot','FootR']
  };

  function targetForSource(sourceName,lookup){
    const key=normalizeName(sourceName);
    const aliases=SOURCE_TO_TARGET[key];
    if(aliases===null)return null;
    if(aliases){
      for(const a of aliases){
        const hit=lookup.get(normalizeName(a));
        if(hit)return hit;
      }
    }
    return lookup.get(key)||null;
  }

  async function loadUALAnimations(scene,targetResult){
    try{
      const src=await BABYLON.SceneLoader.ImportMeshAsync('',PATH,ANIM_FILE,scene);
      const lookup=buildTargetLookup(targetResult);
      const out=[];

      for(const sg of (src.animationGroups||[])){
        const g=new BABYLON.AnimationGroup(sg.name,scene);
        let count=0;
        for(const ta of (sg.targetedAnimations||[])){
          const target=targetForSource(ta.target?.name||'',lookup);
          if(!target)continue;
          const anim=ta.animation.clone();
          g.addTargetedAnimation(anim,target);
          count++;
        }
        if(count){
          out.push(g);
        }else{
          g.dispose();
        }
      }

      for(const g of (src.animationGroups||[]))g.dispose();
      for(const m of (src.meshes||[]))m.dispose(false,true);
      for(const t of (src.transformNodes||[])){
        if(!t.isDisposed?.())t.dispose(false,true);
      }

      console.info('[Under Pressure] UAL retarget ready',out.map(g=>({clip:g.name,tracks:g.targetedAnimations.length})), 'targetNodes',lookup.size);
      if(!out.length)console.warn('[Under Pressure] No UAL tracks matched the player skeleton: check bone names and rig compatibility');
      return out;
    }catch(err){
      console.warn('[Under Pressure] UAL animation pack not available yet',err);
      return [];
    }
  }

  async function loadPlayer(){
    const G=window.UP3D;
    const scene=G.scene;
    const player=G.player;
    const oldRig=scene.getTransformNodeByName('rigRoot');

    status('Carregando arquivo GLB...');
    oldRig?.setEnabled(false);
    document.body.classList.add('glb-player-loading');

    let result=null,loadedFile=null,lastErr=null;
    for(const file of FILES){
      try{
        result=await BABYLON.SceneLoader.ImportMeshAsync('',PATH,file,scene);
        loadedFile=file;
        status('Arquivo importado: '+file+'\nCalculando tamanho e posição...');
        break;
      }catch(e){ lastErr=e; }
    }

    if(!result){
      oldRig?.setEnabled(true);
      document.body.classList.remove('glb-player-loading');
      document.body.classList.add('glb-player-fallback');
      console.error('[Under Pressure] player load failed',lastErr);
      status('Nenhum GLB carregou. '+(lastErr?.message||lastErr)+'\nPersonagem anterior restaurado.');
      return;
    }

    const meshes=result.meshes||[];
    const nativeGroups=result.animationGroups||[];
    const importRoot=meshes.find(m=>m.name==='__root__')||meshes[0];

    if(!importRoot){
      oldRig?.setEnabled(true);
      throw new Error('Imported player root missing');
    }

    for(const mesh of meshes){
      mesh.checkCollisions=false;
      mesh.isPickable=false;
      mesh.setEnabled(true);
      mesh.isVisible=true;
      mesh.visibility=1;
      if((mesh.getTotalVertices?.()||0)>0)readableMaterial(scene,mesh);
    }

    // Preserve rig hierarchy. Only fit the GLB root to the proven gameplay collider.
    importRoot.parent=null;
    importRoot.rotationQuaternion=null;
    importRoot.rotation.set(0,Math.PI,0);
    importRoot.scaling.setAll(1);
    importRoot.position.set(0,0,0);
    importRoot.computeWorldMatrix(true);

    let b=getBounds(meshes);
    if(!b||!Number.isFinite(b.height)||b.height<.2)throw new Error('Invalid player bounds');

    const scale=TARGET_HEIGHT/b.height;
    importRoot.scaling.setAll(scale);
    importRoot.computeWorldMatrix(true);
    for(const mesh of meshes)mesh.computeWorldMatrix?.(true);

    b=getBounds(meshes);
    if(!b)throw new Error('Could not fit player');

    // Fix: old -1.46 value belonged to the procedural character and buried the shoes.
    importRoot.position.y=VISUAL_FEET_Y-b.min.y;
    importRoot.parent=player;

    // Lightweight UAL animation-only GLB (~410 KB), retargeted onto the good AnnoMotion rig.
    status('Modelo: '+loadedFile+'\nRig: '+(result.skeletons||[]).length+' skeleton(s)\nClipes originais: '+nativeGroups.length+'\n'+(EXPERIMENTAL_UAL?'UAL experimental':'Modo seguro: sem retarget direto'));
    const isBakedPack=loadedFile==='under_pressure_personagem_16_animacoes.glb';
    const ualGroups=(!STATIC_TEST&&!isBakedPack&&EXPERIMENTAL_UAL)?await loadUALAnimations(scene,result):[];
    const groups=ualGroups.length?ualGroups:nativeGroups;
    if(isBakedPack)console.info('[Under Pressure] 16 retargeted animations using the SAME baked skeleton; direct UAL retarget disabled');
    if(!STATIC_TEST&&DEBUG_PLAYER)status('Modelo: '+loadedFile+'\nAnimações UAL: '+ualGroups.length+'\nNativas: '+nativeGroups.length+'\n'+(ualGroups.length?'UAL EXPERIMENTAL':'UAL pausado: rig incompatível'));

    // Prefer the player's own correctly bound idle even when testing other clips.
    const nativeIdle=nativeGroups.find(g=>/^idle$/i.test(g.name||''))||nativeGroups.find(g=>/^idle/i.test(g.name||''));
    const by=(...names)=>groups.find(g=>{
      const x=(g.name||'').toLowerCase();
      return names.some(n=>x===n.toLowerCase()||x.includes(n.toLowerCase()));
    });

    const clips={
      idle:nativeIdle||by('Idle_Loop','Idle'),
      walk:by('Walk_Loop','Walk'),
      jog:by('Jog_Fwd_Loop','Jog','Run'),
      sprint:by('Sprint_Loop','Sprint'),
      crouchIdle:by('Crouch_Idle_Loop','Crouch Idle','Crouch'),
      crouchWalk:by('Crouch_Fwd_Loop','Crouch Walk'),
      jumpStart:by('Jump_Start','NinjaJump_Start','Jump Start'),
      jumpLoop:by('Jump_Loop','NinjaJump_Idle_Loop','Jump Loop','Jump'),
      jumpLand:by('Jump_Land','NinjaJump_Land','Jump Land'),
      roll:by('Roll','RollForward'),
      punchJab:by('Punch_Jab','Punch Jab'),
      punchCross:by('Punch_Cross','Punch Cross'),
      heavy:by('Melee_Hook','Hook','Heavy'),
      hit:by('Hit_Chest','Hit_Knockback','Hit'),
      interact:by('Interact'),
      climb:by('ClimbUp_1m','Climb'),
      slideStart:by('Slide_Start'),
      slideLoop:by('Slide_Loop'),
      slideExit:by('Slide_Exit')
    };

    let current=null;
    let lockedUntil=0;
    let prevY=player.position.y;
    let wasAirborne=false;
    let airStarted=0;
    let jumpLoopStarted=false;
    let wasClimbing=false;
    // Foot joint height changes with poses; visually align soles to player collider.
    const feet=['LeftFoot','RightFoot'].map(name=>(result.transformNodes||[]).find(n=>n.name===name)).filter(Boolean);
    const soleBelowFoot=.09*scale;
    function alignFeet(){
      if(!feet.length)return;
      const inv=player.getWorldMatrix().clone().invert();
      const ys=feet.map(n=>BABYLON.Vector3.TransformCoordinates(n.getAbsolutePosition(),inv).y);
      const bottom=Math.min(...ys);
      if(!Number.isFinite(bottom))return;
      const correction=BABYLON.Scalar.Clamp(VISUAL_FEET_Y+soleBelowFoot-bottom,-.45,.45);
      importRoot.position.y+=correction*.25;
    }

    function play(g,loop=true,speed=1){
      if(!g)return false;
      if(current===g)return true;
      for(const x of [...groups,...nativeGroups])if(x!==g&&x.isPlaying)x.stop();
      current=g;
      g.start(loop,speed,g.from,g.to,false);
      return true;
    }

    if(groups.length){
      play(clips.idle||groups[0],true,1);

      const originalRoll=G.startRoll?.bind(G);
      G.startRoll=(dir)=>{
        const ok=originalRoll?.(dir);
        if(!ok)return false;
        lockedUntil=performance.now()+650;
        play(clips.roll,false,1);
        return true;
      };

      const originalAttack=G.playAttack?.bind(G);
      let combo=0;
      G.playAttack=(type='light')=>{
        originalAttack?.(type);
        lockedUntil=performance.now()+(type==='heavy'?760:480);
        if(type==='heavy')play(clips.heavy||clips.punchCross||clips.punchJab,false,1);
        else{
          combo=(combo+1)%2;
          play(combo?clips.punchJab:clips.punchCross,false,1.04);
        }
      };

      scene.onBeforeRenderObservable.add(()=>{
        const now=performance.now();
        const motion=G.getMotionState?.()||{};
        const st=G.getStealthState?.()||{speed:0,crouching:false,running:false};
        const climbing=['climb','hang','mantle'].includes(motion.parkourState);
        const dy=player.position.y-prevY;
        prevY=player.position.y;
        const airborne=motion.grounded===undefined?Math.abs(dy)>.012:(!motion.grounded&&motion.parkourState==='normal');

        if(climbing){
          if(!wasClimbing){wasClimbing=true;play(clips.climb||clips.crouchWalk||clips.idle,true,.95);}
          alignFeet();return;
        }
        if(wasClimbing){wasClimbing=false;play(clips.idle,true);}
        if(now<lockedUntil){alignFeet();return;}
        if(airborne){
          if(!wasAirborne){
            wasAirborne=true;airStarted=now;jumpLoopStarted=false;
            play(clips.jumpStart||clips.jumpLoop||clips.idle,false,1);
          }else if(!jumpLoopStarted&&now-airStarted>380){
            jumpLoopStarted=true;
            play(clips.jumpLoop||clips.idle,true,1);
          }
        }else if(wasAirborne){
          wasAirborne=false;jumpLoopStarted=false;
          lockedUntil=now+200;
          play(clips.jumpLand||clips.idle,false,1);
        }else if(st.crouching){
          play(st.speed>.22?(clips.crouchWalk||clips.crouchIdle||clips.idle):(clips.crouchIdle||clips.idle),true,st.speed>.22?1:.9);
        }else if(st.speed>5.6){
          play(clips.sprint||clips.jog||clips.walk||clips.idle,true,1.02);
        }else if(st.speed>2){
          play(clips.jog||clips.walk||clips.idle,true,.94);
        }else if(st.speed>.3){
          play(clips.walk||clips.jog||clips.idle,true,.9);
        }else{
          play(clips.idle||groups[0],true,1);
        }
        alignFeet();
      });
    }

    const fill=new BABYLON.PointLight('UP_PlayerFill',new BABYLON.Vector3(0,1,-.8),scene);
    fill.parent=player;
    fill.diffuse=new BABYLON.Color3(.72,.82,1);
    fill.specular=new BABYLON.Color3(.08,.08,.1);
    fill.intensity=.42;
    fill.range=4.5;

    window.UP_MODEL={
      loaded:true,ready:true,
      rigged:(result.skeletons||[]).length>0,
      animated:groups.length>0,
      animationSource:isBakedPack?'UAL_BAKED_16':(ualGroups.length?'UAL_EXPERIMENTAL':(nativeGroups.length?'native':'none')),
      file:loadedFile,root:importRoot,scale,groups,clips
    };

    document.body.classList.remove('glb-player-loading','glb-player-fallback');
    document.body.classList.add('glb-player-loaded');
    status('OK: '+loadedFile+'\nAltura: '+TARGET_HEIGHT+'m\nRig: '+((result.skeletons||[]).length?'SIM':'NÃO')+'\nAnimações: '+groups.length+' (UAL: '+ualGroups.length+', nativas: '+nativeGroups.length+')\nIdle: '+(clips.idle?.name||'NÃO ENCONTRADO')+'\nEscala: '+scale.toFixed(3));
    window.dispatchEvent(new CustomEvent('up-player-ready'));
    console.info('[Under Pressure] player active',{
      file:loadedFile,
      skeletons:(result.skeletons||[]).length,
      animationSource:window.UP_MODEL.animationSource,
      animations:groups.map(g=>g.name),
      scale
    });
  }

  boot();
})();