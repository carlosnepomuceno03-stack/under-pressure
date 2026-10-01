(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const FILES=['rigged-model.glb','player_meshy.glb'];
  const TARGET_HEIGHT=2.18;
  const FEET_OFFSET=-1.46;

  function boot(){
    if(!window.UP3D?.scene||!window.BABYLON?.SceneLoader){
      setTimeout(boot,50);
      return;
    }
    loadPlayer();
  }

  function readableMaterial(scene,mesh){
    if(!mesh?.material)return;
    const src=mesh.material;
    const tex=src.albedoTexture||src.diffuseTexture||null;
    const mat=new BABYLON.StandardMaterial('UP_PlayerMat_'+mesh.uniqueId,scene);
    mat.diffuseColor=new BABYLON.Color3(1,1,1);
    mat.specularColor=new BABYLON.Color3(.06,.06,.06);
    mat.emissiveColor=new BABYLON.Color3(.11,.11,.11);
    mat.backFaceCulling=false;
    mat.alpha=1;
    if(tex){
      mat.diffuseTexture=tex;
      mat.emissiveTexture=tex;
      mat.emissiveColor=new BABYLON.Color3(.09,.09,.09);
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
      }catch(e){ lastErr=e; }
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

    // Preserve the entire imported hierarchy. Measure it in bind pose,
    // then fit the root to the gameplay collider without touching bones.
    importRoot.parent=null;
    importRoot.rotationQuaternion=null;
    importRoot.rotation.set(0,Math.PI,0);
    importRoot.scaling.setAll(1);
    importRoot.position.set(0,0,0);
    importRoot.computeWorldMatrix(true);

    let b=getBounds(meshes);
    if(!b||!Number.isFinite(b.height)||b.height<.2){
      throw new Error('Invalid player bounds');
    }

    const scale=TARGET_HEIGHT/b.height;
    importRoot.scaling.setAll(scale);
    importRoot.computeWorldMatrix(true);
    for(const mesh of meshes)mesh.computeWorldMatrix?.(true);

    b=getBounds(meshes);
    if(!b)throw new Error('Could not fit player');

    importRoot.position.y=FEET_OFFSET-b.min.y;
    importRoot.parent=player;

    const by=(...names)=>groups.find(g=>{
      const x=(g.name||'').toLowerCase();
      return names.some(n=>x===n.toLowerCase()||x.includes(n.toLowerCase()));
    });

    const clips={
      idle:by('Idle_Loop','Idle'),
      walk:by('Walk_Loop','Walk'),
      jog:by('Jog_Fwd_Loop','Jog','Run'),
      sprint:by('Sprint_Loop','Sprint'),
      crouchIdle:by('Crouch_Idle_Loop','Crouch Idle','Crouch'),
      crouchWalk:by('Crouch_Fwd_Loop','Crouch Walk'),
      jumpStart:by('Jump_Start','Jump Start','NinjaJump_Start'),
      jumpLoop:by('Jump_Loop','Jump Loop','NinjaJump_Idle_Loop','Jump'),
      jumpLand:by('Jump_Land','Jump Land','NinjaJump_Land'),
      roll:by('Roll','RollForward'),
      punchJab:by('Punch_Jab','Punch Jab'),
      punchCross:by('Punch_Cross','Punch Cross'),
      heavy:by('Melee_Hook','Hook','Heavy'),
      hit:by('Hit_Chest','Hit_Knockback','Hit'),
      interact:by('Interact'),
      climb:by('ClimbUp_1m','Climb')
    };

    let current=null;
    let lockedUntil=0;
    let prevY=player.position.y;

    function play(g,loop=true,speed=1){
      if(!g)return false;
      if(current===g&&g.isPlaying)return true;
      for(const x of groups)if(x!==g&&x.isPlaying)x.stop();
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
        if(type==='heavy') play(clips.heavy||clips.punchCross||clips.punchJab,false,1);
        else{
          combo=(combo+1)%2;
          play(combo?clips.punchJab:clips.punchCross,false,1.05);
        }
      };

      scene.onBeforeRenderObservable.add(()=>{
        if(performance.now()<lockedUntil)return;
        const st=G.getStealthState?.()||{speed:0,crouching:false,running:false};
        const dy=player.position.y-prevY;
        prevY=player.position.y;

        if(Math.abs(dy)>.018) play(dy>0?(clips.jumpStart||clips.jumpLoop):(clips.jumpLoop||clips.jumpLand),false,1);
        else if(st.crouching) play(st.speed>.22?(clips.crouchWalk||clips.crouchIdle):clips.crouchIdle,true,st.speed>.22?1:.9);
        else if(st.speed>5.6) play(clips.sprint||clips.jog||clips.walk,true,1.02);
        else if(st.speed>2) play(clips.jog||clips.walk,true,.94);
        else if(st.speed>.3) play(clips.walk||clips.jog,true,.9);
        else play(clips.idle,true,1);
      });
    }

    const fill=new BABYLON.PointLight('UP_PlayerFill',new BABYLON.Vector3(0,1,-.8),scene);
    fill.parent=player;
    fill.diffuse=new BABYLON.Color3(.72,.82,1);
    fill.specular=new BABYLON.Color3(.08,.08,.1);
    fill.intensity=.5;
    fill.range=5;

    window.UP_MODEL={
      loaded:true,
      ready:true,
      rigged:(result.skeletons||[]).length>0,
      animated:groups.length>0,
      file:loadedFile,
      root:importRoot,
      scale,
      groups,
      clips
    };

    document.body.classList.remove('glb-player-loading','glb-player-fallback');
    document.body.classList.add('glb-player-loaded');
    window.dispatchEvent(new CustomEvent('up-player-ready'));
    console.info('[Under Pressure] player active',{
      file:loadedFile,
      skeletons:(result.skeletons||[]).length,
      animations:groups.map(g=>g.name),
      scale
    });
  }

  boot();
})();