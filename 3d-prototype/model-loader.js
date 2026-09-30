(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const FILES=['player_final_quaternius.glb','player_meshy_rigged_v1.glb','player_meshy.glb'];
  const SRC_MIN_Y=-0.9509469866752625;
  const SRC_HEIGHT=1.8981509804725647;
  const TARGET_HEIGHT=2.18;
  const SCALE=TARGET_HEIGHT/SRC_HEIGHT;
  const FEET_OFFSET=-1.46;

  function boot(){
    if(!window.UP3D?.scene||!window.BABYLON?.SceneLoader){
      setTimeout(boot,50);
      return;
    }
    loadPlayer();
  }

  function makeReadableMaterial(scene, mesh){
    if(!mesh?.material)return;
    const src=mesh.material;
    const tex=src.albedoTexture||src.diffuseTexture||null;
    const matte=new BABYLON.StandardMaterial('UP_PlayerMat_'+mesh.uniqueId,scene);
    matte.diffuseColor=new BABYLON.Color3(1,1,1);
    matte.specularColor=new BABYLON.Color3(.06,.06,.06);
    matte.emissiveColor=new BABYLON.Color3(.16,.16,.16);
    matte.backFaceCulling=false;
    matte.alpha=1;
    if(tex){
      matte.diffuseTexture=tex;
      matte.emissiveTexture=tex;
      matte.emissiveColor=new BABYLON.Color3(.12,.12,.12);
    }
    mesh.material=matte;
  }

  async function loadPlayer(){
    const G=window.UP3D;
    const scene=G.scene;
    const player=G.player;
    const oldRig=scene.getTransformNodeByName('rigRoot');

    oldRig?.setEnabled(false);
    document.body.classList.add('glb-player-loading');

    let result=null,loadedFile=null,lastErr=null;
    for(const file of FILES){
      try{
        result=await BABYLON.SceneLoader.ImportMeshAsync('',PATH,file,scene);
        loadedFile=file;
        break;
      }catch(e){
        lastErr=e;
      }
    }

    if(!result){
      oldRig?.setEnabled(true);
      document.body.classList.remove('glb-player-loading');
      document.body.classList.add('glb-player-fallback');
      console.error('[Under Pressure] player load failed',lastErr);
      return;
    }

    const meshes=result.meshes||[];
    const groups=result.animationGroups||[];
    const rigged=groups.length>0&&loadedFile!=='player_meshy.glb';

    if(rigged){
      // IMPORTANT: keep imported skin/skeleton hierarchy intact.
      // Babylon's glTF importer creates one __root__ for the whole GLB.
      const importRoot=meshes.find(m=>m.name==='__root__')||meshes[0];
      if(!importRoot){
        throw new Error('Rigged GLB import root missing');
      }

      for(const mesh of meshes){
        mesh.checkCollisions=false;
        mesh.isPickable=false;
        mesh.setEnabled(true);
        mesh.isVisible=true;
        mesh.visibility=1;
        if((mesh.getTotalVertices?.()||0)>0)makeReadableMaterial(scene,mesh);
      }

      // Only transform the importer root. Never reparent bones or skinned mesh nodes.
      importRoot.parent=player;
      importRoot.rotationQuaternion=null;
      importRoot.rotation.set(0,Math.PI,0);
      importRoot.scaling.setAll(SCALE);
      importRoot.position.set(0,FEET_OFFSET-(SRC_MIN_Y*SCALE),0);

      const by=(n)=>groups.find(g=>{
        const x=(g.name||'').toLowerCase();
        return x===n.toLowerCase()||x.includes(n.toLowerCase());
      });
      const clips={
        idle:by('Idle_Loop')||by('Idle'),
        walk:by('Walk_Loop'),
        jog:by('Jog_Fwd_Loop')||by('Run'),
        sprint:by('Sprint_Loop')||by('Jog_Fwd_Loop')||by('Run'),
        crouchIdle:by('Crouch_Idle_Loop')||by('Crouch'),
        crouchWalk:by('Crouch_Fwd_Loop')||by('Crouch'),
        jumpStart:by('Jump_Start')||by('NinjaJump_Start')||by('Jump'),
        jumpLoop:by('Jump_Loop')||by('NinjaJump_Idle_Loop')||by('Jump'),
        jumpLand:by('Jump_Land')||by('NinjaJump_Land'),
        roll:by('Roll')||by('RollForward'),
        punchJab:by('Punch_Jab'),
        punchCross:by('Punch_Cross'),
        meleeHook:by('Melee_Hook'),
        hit:by('Hit_Chest')||by('Hit_Knockback'),
        interact:by('Interact'),
        climb:by('ClimbUp_1m'),
        slideStart:by('Slide_Start'),
        slideLoop:by('Slide_Loop'),
        slideExit:by('Slide_Exit')
      };

      let current=null;
      let lockedUntil=0;
      let prevY=player.position.y;

      function play(g,loop=true,speed=1){
        if(!g)return;
        if(current===g&&g.isPlaying)return;
        for(const x of groups){
          if(x!==g&&x.isPlaying)x.stop();
        }
        current=g;
        g.start(loop,speed,g.from,g.to,false);
      }

      play(clips.idle,true,1);

      const originalRoll=G.startRoll?.bind(G);
      G.startRoll=(dir)=>{
        const ok=originalRoll?.(dir);
        if(!ok)return false;
        lockedUntil=performance.now()+650;
        play(clips.roll,false,1);
        return true;
      };

      const originalAttack=G.playAttack?.bind(G);
      let comboStep=0;
      G.playAttack=(type='light')=>{
        originalAttack?.(type);
        lockedUntil=performance.now()+(type==='heavy'?760:470);
        if(type==='heavy'){
          play(clips.meleeHook||clips.punchCross||clips.punchJab,false,.98);
        }else{
          comboStep=(comboStep+1)%2;
          play(comboStep?clips.punchJab:clips.punchCross,false,1.05);
        }
      };

      scene.onBeforeRenderObservable.add(()=>{
        if(performance.now()<lockedUntil)return;

        const st=G.getStealthState?.()||{speed:0,crouching:false,running:false};
        const dy=player.position.y-prevY;
        prevY=player.position.y;

        if(Math.abs(dy)>.018){
          play(dy>0?(clips.jumpStart||clips.jumpLoop):(clips.jumpLoop||clips.jumpLand),false,1);
        }else if(st.crouching){
          play(st.speed>.22?(clips.crouchWalk||clips.crouchIdle):clips.crouchIdle,true,st.speed>.22?1.0:.9);
        }else if(st.speed>5.6){
          play(clips.sprint||clips.jog,true,1.02);
        }else if(st.speed>2.0){
          play(clips.jog||clips.walk,true,.92);
        }else if(st.speed>.30){
          play(clips.walk||clips.jog,true,.88);
        }else{
          play(clips.idle,true,1);
        }
      });

      const fill=new BABYLON.PointLight('UP_PlayerRigFill',new BABYLON.Vector3(0,1,-.8),scene);
      fill.parent=player;
      fill.diffuse=new BABYLON.Color3(.72,.82,1);
      fill.specular=new BABYLON.Color3(.1,.1,.12);
      fill.intensity=.58;
      fill.range=5;

      window.UP_MODEL={
        loaded:true,
        ready:true,
        rigged:true,
        file:loadedFile,
        root:importRoot,
        groups,
        clips
      };

      document.body.classList.remove('glb-player-loading','glb-player-fallback');
      document.body.classList.add('glb-player-loaded');
      window.dispatchEvent(new CustomEvent('up-player-ready'));
      console.info('[Under Pressure] rigged player active',groups.map(g=>g.name));
      return;
    }

    // Static fallback.
    const visual=meshes
      .filter(m=>m&&m.name!=='__root__'&&(m.getTotalVertices?.()||0)>1000)
      .sort((a,b)=>(b.getTotalVertices?.()||0)-(a.getTotalVertices?.()||0))[0];

    if(!visual){
      oldRig?.setEnabled(true);
      throw new Error('Static player geometry not found');
    }

    visual.setParent(null);
    visual.rotationQuaternion=null;
    visual.scaling.setAll(SCALE);
    makeReadableMaterial(scene,visual);

    const sync=()=>{
      const p=player.getAbsolutePosition();
      visual.position.set(p.x,p.y+FEET_OFFSET-(SRC_MIN_Y*SCALE),p.z);
      visual.rotation.set(0,player.rotation.y+Math.PI,0);
      visual.scaling.setAll(SCALE);
    };
    sync();
    scene.onBeforeRenderObservable.add(sync);

    window.UP_MODEL={loaded:true,ready:true,rigged:false,file:loadedFile,visual};
    document.body.classList.remove('glb-player-loading','glb-player-fallback');
    document.body.classList.add('glb-player-loaded');
  }

  boot();
})();