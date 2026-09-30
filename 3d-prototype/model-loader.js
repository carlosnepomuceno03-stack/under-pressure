(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const FILES=['player_meshy_rigged_v1.glb','player_meshy.glb'];
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

  async function loadPlayer(){
    const G=window.UP3D;
    const scene=G.scene;
    const player=G.player;
    const oldRig=scene.getTransformNodeByName('rigRoot');
    oldRig?.setEnabled(false);
    document.body.classList.add('glb-player-loading');

    let result=null, loadedFile=null, lastErr=null;
    for(const file of FILES){
      try{
        result=await BABYLON.SceneLoader.ImportMeshAsync('',PATH,file,scene);
        loadedFile=file;
        break;
      }catch(e){ lastErr=e; }
    }
    if(!result){
      oldRig?.setEnabled(true);
      console.error('[Under Pressure] player load failed',lastErr);
      return;
    }

    const meshes=result.meshes||[];
    const groups=result.animationGroups||[];
    const rigged=groups.length>0 && loadedFile.includes('rigged');

    if(rigged){
      const root=new BABYLON.TransformNode('UP_RiggedPlayerRoot',scene);
      root.parent=player;
      root.position.set(0, FEET_OFFSET-(SRC_MIN_Y*SCALE), 0);
      root.rotation.y=Math.PI;
      root.scaling.setAll(SCALE);

      const imported=new Set([...(result.meshes||[]),...(result.transformNodes||[])]);
      for(const node of [...(result.transformNodes||[]),...(result.meshes||[])]){
        const p=node.parent;
        if(!p||!imported.has(p)) node.parent=root;
      }

      for(const m of meshes){
        m.checkCollisions=false;
        m.isPickable=false;
        if(m.material){
          if('metallic' in m.material)m.material.metallic=0;
          if('roughness' in m.material)m.material.roughness=.72;
          m.material.backFaceCulling=false;
        }
      }

      const by=(n)=>groups.find(g=>g.name.toLowerCase()===n.toLowerCase()||g.name.toLowerCase().includes(n.toLowerCase()));
      const clips={
        idle:by('Idle'),
        run:by('Run'),
        crouch:by('Crouch'),
        jump:by('Jump'),
        roll:by('RollForward')
      };

      let current=null;
      let lockedUntil=0;
      let prevY=player.position.y;

      function play(g,loop=true,speed=1){
        if(!g)return;
        if(current===g && g.isPlaying)return;
        for(const x of groups)if(x!==g&&x.isPlaying)x.stop();
        current=g;
        g.start(loop,speed,g.from,g.to,false);
      }

      play(clips.idle,true,1);

      const originalRoll=G.startRoll?.bind(G);
      G.startRoll=(dir)=>{
        const ok=originalRoll?.(dir);
        if(!ok)return false;
        lockedUntil=performance.now()+650;
        play(clips.roll,false,1.0);
        return true;
      };

      scene.onBeforeRenderObservable.add(()=>{
        if(performance.now()<lockedUntil)return;
        const st=G.getStealthState?.()||{speed:0,crouching:false,running:false};
        const dy=player.position.y-prevY;
        prevY=player.position.y;

        if(Math.abs(dy)>.018){
          play(clips.jump,false,1.0);
        }else if(st.crouching){
          play(clips.crouch,true,st.speed>.2?1.1:.85);
        }else if(st.speed>.35){
          play(clips.run,true,st.running?1.15:.78);
        }else{
          play(clips.idle,true,1.0);
        }
      });

      window.UP_MODEL={loaded:true,ready:true,rigged:true,file:loadedFile,root,groups,clips};
      document.body.classList.remove('glb-player-loading','glb-player-fallback');
      document.body.classList.add('glb-player-loaded');
      window.dispatchEvent(new CustomEvent('up-player-ready'));
      console.info('[Under Pressure] RIGGED player active',loadedFile,groups.map(g=>g.name));
      return;
    }

    // Static fallback if rigged file has not been uploaded yet.
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

    if(visual.material){
      const src=visual.material;
      const tex=src.albedoTexture||src.diffuseTexture||null;
      const matte=new BABYLON.StandardMaterial('UP_PlayerMeshyMaterial',scene);
      matte.diffuseColor=new BABYLON.Color3(1,1,1);
      matte.specularColor=new BABYLON.Color3(.08,.08,.08);
      matte.emissiveColor=new BABYLON.Color3(.14,.14,.14);
      matte.backFaceCulling=false;
      if(tex){matte.diffuseTexture=tex;matte.emissiveTexture=tex;}
      visual.material=matte;
    }

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