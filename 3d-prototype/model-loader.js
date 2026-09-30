(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const FILES=['player_meshy.glb','player_main.glb'];

  // Exact source bounds of the Meshy file the user uploaded.
  const MESHY_SIZE={x:.807953,y:1.898151,z:.935003};
  const MESHY_CENTER={x:-.0036635,y:-.0018715,z:-.0025985};
  const MESHY_TARGET_HEIGHT=2.35;

  function waitForGame(){
    if(window.UP3D?.scene&&window.BABYLON?.SceneLoader){
      setTimeout(init,350);
      return;
    }
    setTimeout(waitForGame,50);
  }

  function showFallback(oldRig){
    oldRig?.setEnabled(true);
    document.body.classList.remove('glb-player-loading','glb-player-loaded');
    document.body.classList.add('glb-player-fallback');
  }

  async function init(){
    const G=window.UP3D;
    const scene=G.scene;
    const player=G.player;
    const oldRig=scene.getTransformNodeByName('rigRoot');
    const beforeLights=new Set(scene.lights);

    // No flash of the old blocky character while the real model is loading.
    oldRig?.setEnabled(false);
    document.body.classList.add('glb-player-loading');

    try{
      let result=null;
      let loadedFile=null;
      let lastError=null;

      for(const file of FILES){
        try{
          result=await BABYLON.SceneLoader.ImportMeshAsync('',PATH,file,scene);
          loadedFile=file;
          break;
        }catch(err){
          lastError=err;
        }
      }
      if(!result)throw lastError||new Error('No player GLB available');

      const meshes=(result.meshes||[]).filter(m=>m&&!m.isDisposed?.());
      const transforms=result.transformNodes||[];

      for(const light of [...scene.lights]){
        if(!beforeLights.has(light)&&/^Area/.test(light.name))light.dispose();
      }

      for(const mesh of meshes){
        mesh.checkCollisions=false;
        mesh.isPickable=false;
        mesh.setEnabled(true);
        mesh.isVisible=true;
        mesh.visibility=1;
        mesh.alwaysSelectAsActiveMesh=true;
        if(mesh.material){
          mesh.material.alpha=1;
          mesh.material.backFaceCulling=false;
        }
      }

      const modelRoot=new BABYLON.TransformNode('UP_Player_ModelRoot',scene);
      modelRoot.parent=player;
      modelRoot.position.set(0,0,0);
      modelRoot.rotationQuaternion=null;
      modelRoot.rotation.set(0,Math.PI,0);
      modelRoot.scaling.setAll(1);

      if(loadedFile==='player_meshy.glb'){
        // Meshy export is a single static mesh. Attach the real geometry directly
        // to the player collider and use known source dimensions. This avoids
        // importer/root-node bounding quirks that were making the model vanish.
        const visual=meshes
          .filter(m=>m.name!=='__root__'&&(m.getTotalVertices?.()||0)>0)
          .sort((a,b)=>(b.getTotalVertices?.()||0)-(a.getTotalVertices?.()||0))[0];

        if(!visual)throw new Error('Meshy geometry mesh not found');

        // Detach the geometry from Babylon's generated __root__.
        visual.parent=modelRoot;
        visual.position.set(
          -MESHY_CENTER.x,
          .28-MESHY_CENTER.y,
          -MESHY_CENTER.z
        );
        visual.rotationQuaternion=null;
        visual.rotation.set(0,0,0);

        const scale=MESHY_TARGET_HEIGHT/MESHY_SIZE.y;
        visual.scaling.setAll(scale);

        // Disable importer helper/root nodes, never the geometry itself.
        for(const node of [...meshes,...transforms]){
          if(node===visual||node===modelRoot)continue;
          if(node.name==='__root__'||node.name==='PreviewFloor'||node.name==='DeliveryCamera'){
            node.setEnabled?.(false);
          }
        }

        visual.computeWorldMatrix(true);
        const bi=visual.getBoundingInfo();
        const bb=bi.boundingBox;
        const worldHeight=bb.maximumWorld.y-bb.minimumWorld.y;

        if(!Number.isFinite(worldHeight)||worldHeight<1||worldHeight>4){
          throw new Error('Meshy player fitted to invalid height: '+worldHeight);
        }

        window.UP_MODEL={
          loaded:true,
          file:loadedFile,
          rigged:false,
          root:modelRoot,
          visual,
          scale,
          worldHeight
        };

        document.body.classList.remove('glb-player-loading','glb-player-fallback');
        document.body.classList.add('glb-player-loaded');
        console.info('[Under Pressure] Meshy visual active',{scale,worldHeight});
        return;
      }

      // Rigged fallback model pipeline.
      const importedSet=new Set([...meshes,...transforms]);
      const topNodes=[];
      for(const node of [...transforms,...meshes]){
        if(node===modelRoot)continue;
        const p=node.parent;
        if(!p||!importedSet.has(p)){
          if(!topNodes.includes(node))topNodes.push(node);
        }
      }
      for(const node of topNodes)node.parent=modelRoot;

      const groups=result.animationGroups||[];
      const byName=(needle)=>groups.find(g=>g.name.toLowerCase().includes(needle.toLowerCase()));
      const clips={
        idle:byName('Idle'),run:byName('Run'),crouch:byName('Crouch'),punch:byName('Punch'),
        rollForward:byName('RollForward'),rollBackward:byName('RollBackward'),
        rollLeft:byName('RollLeft'),rollRight:byName('RollRight')
      };

      let current=null;
      let actionUntil=0;
      function play(group,loop=true,speed=1){
        if(!group)return;
        if(current===group&&group.isPlaying)return;
        for(const g of groups)if(g!==group&&g.isPlaying)g.stop();
        current=group;
        group.start(loop,speed,group.from,group.to,false);
      }
      play(clips.idle,true,1);

      const originalAttack=G.playAttack?.bind(G);
      G.playAttack=(type='light')=>{
        originalAttack?.(type);
        actionUntil=performance.now()+(type==='heavy'?720:460);
        play(clips.punch,false,type==='heavy'?.82:1.12);
      };

      const originalRoll=G.startRoll?.bind(G);
      G.startRoll=(direction)=>{
        const ok=originalRoll?.(direction);
        if(!ok)return false;
        actionUntil=performance.now()+650;
        play(clips.rollForward,false,1.08);
        return true;
      };

      scene.onBeforeRenderObservable.add(()=>{
        if(performance.now()<actionUntil)return;
        const st=G.getStealthState?.()||{speed:0,crouching:false,running:false};
        if(G.isRolling?.())return;
        if(st.crouching)play(clips.crouch,true,st.speed>.25?1.15:.82);
        else if(st.speed>.35)play(clips.run,true,st.running?1.12:.82);
        else play(clips.idle,true,1);
      });

      window.UP_MODEL={loaded:true,file:loadedFile,rigged:true,root:modelRoot,animationGroups:groups,clips};
      document.body.classList.remove('glb-player-loading','glb-player-fallback');
      document.body.classList.add('glb-player-loaded');

    }catch(err){
      console.warn('[Under Pressure] player model failed; fallback restored.',err);
      showFallback(oldRig);
    }
  }

  waitForGame();
})();