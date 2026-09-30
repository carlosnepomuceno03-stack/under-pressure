(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const FILES=['player_meshy.glb','player_main.glb'];
  const TARGET_HEIGHT=1.92;

  function waitForGame(){
    if(window.UP3D?.scene&&window.BABYLON?.SceneLoader){
      const kick=()=>setTimeout(init,700);
      if('requestIdleCallback' in window)requestIdleCallback(kick,{timeout:1800});
      else kick();
      return;
    }
    setTimeout(waitForGame,50);
  }

  function getBounds(meshes){
    let min=new BABYLON.Vector3(Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY);
    let max=new BABYLON.Vector3(Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY);
    let found=false;

    for(const mesh of meshes){
      if(!mesh||mesh.isDisposed?.()||mesh.name==='__root__')continue;
      mesh.computeWorldMatrix?.(true);
      const bi=mesh.getBoundingInfo?.();
      if(!bi)continue;
      const bb=bi.boundingBox;
      min=BABYLON.Vector3.Minimize(min,bb.minimumWorld);
      max=BABYLON.Vector3.Maximize(max,bb.maximumWorld);
      found=true;
    }
    return found?{min,max,size:max.subtract(min),center:min.add(max).scale(.5)}:null;
  }

  async function init(){
    const G=window.UP3D;
    const scene=G.scene;
    const player=G.player;
    const oldRig=scene.getTransformNodeByName('rigRoot');
    const beforeLights=new Set(scene.lights);

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

      const importedMeshes=result.meshes||[];
      const importedTransforms=result.transformNodes||[];
      const importedSet=new Set([...importedMeshes,...importedTransforms]);

      for(const mesh of importedMeshes){
        if(mesh.name==='PreviewFloor'||mesh.name==='DeliveryCamera'){
          mesh.setEnabled(false);
          continue;
        }
        mesh.checkCollisions=false;
        mesh.isPickable=false;
        mesh.alwaysSelectAsActiveMesh=true;
      }

      for(const light of [...scene.lights]){
        if(!beforeLights.has(light)&&/^Area/.test(light.name))light.dispose();
      }

      const modelRoot=new BABYLON.TransformNode('UP_Player_ModelRoot',scene);

      // Keep the internal hierarchy intact and only re-parent real top-level nodes.
      const topNodes=[];
      for(const node of [...importedTransforms,...importedMeshes]){
        if(!node||node===modelRoot)continue;
        const p=node.parent;
        if(!p||!importedSet.has(p)){
          if(!topNodes.includes(node))topNodes.push(node);
        }
      }
      for(const node of topNodes)node.parent=modelRoot;

      // First measure at source scale.
      modelRoot.rotationQuaternion=null;
      modelRoot.rotation.set(0,Math.PI,0);
      modelRoot.scaling.setAll(1);
      modelRoot.position.set(0,0,0);
      modelRoot.computeWorldMatrix(true);
      for(const mesh of importedMeshes)mesh.computeWorldMatrix?.(true);

      let bounds=getBounds(importedMeshes);
      if(!bounds||!Number.isFinite(bounds.size.y)||bounds.size.y<=.001){
        throw new Error('Invalid Meshy model bounds');
      }

      const scale=Math.min(8,Math.max(.05,TARGET_HEIGHT/bounds.size.y));
      modelRoot.scaling.setAll(scale);
      modelRoot.computeWorldMatrix(true);
      for(const mesh of importedMeshes)mesh.computeWorldMatrix?.(true);

      bounds=getBounds(importedMeshes);
      if(!bounds)throw new Error('Could not fit player model');

      // Center feet on the collision capsule's local origin.
      modelRoot.position.x-=bounds.center.x;
      modelRoot.position.z-=bounds.center.z;
      modelRoot.position.y-=bounds.min.y;
      modelRoot.computeWorldMatrix(true);

      // Only now attach to the moving collider.
      modelRoot.parent=player;

      // Meshy source has no rig yet. It is still valid as the visual player.
      const groups=result.animationGroups||[];
      const hasRiggedAnimation=groups.length>0;

      // Do not hide fallback until we know the new model is visible and fitted.
      oldRig?.setEnabled(false);

      const byName=(needle)=>groups.find(g=>g.name.toLowerCase().includes(needle.toLowerCase()));
      const clips={
        idle:byName('Idle'),
        run:byName('Run'),
        crouch:byName('Crouch'),
        punch:byName('Punch'),
        rollForward:byName('RollForward'),
        rollBackward:byName('RollBackward'),
        rollLeft:byName('RollLeft'),
        rollRight:byName('RollRight')
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
      if(hasRiggedAnimation)play(clips.idle,true,1);

      const originalAttack=G.playAttack?.bind(G);
      G.playAttack=(type='light')=>{
        originalAttack?.(type);
        actionUntil=performance.now()+(type==='heavy'?720:460);
        if(hasRiggedAnimation)play(clips.punch,false,type==='heavy'?.82:1.12);
      };

      const originalRoll=G.startRoll?.bind(G);
      G.startRoll=(direction)=>{
        const ok=originalRoll?.(direction);
        if(!ok)return false;
        actionUntil=performance.now()+650;
        if(hasRiggedAnimation)play(clips.rollForward,false,1.08);
        return true;
      };

      scene.onBeforeRenderObservable.add(()=>{
        if(!hasRiggedAnimation)return;
        if(performance.now()<actionUntil)return;
        const st=G.getStealthState?.()||{speed:0,crouching:false,running:false};
        if(G.isRolling?.())return;
        if(st.crouching)play(clips.crouch,true,st.speed>.25?1.15:.82);
        else if(st.speed>.35)play(clips.run,true,st.running?1.12:.82);
        else play(clips.idle,true,1);
      });

      window.UP_MODEL={
        loaded:true,
        file:loadedFile,
        rigged:hasRiggedAnimation,
        root:modelRoot,
        scale,
        height:TARGET_HEIGHT,
        animationGroups:groups,
        clips
      };

      document.body.classList.remove('glb-player-loading','glb-player-fallback');
      document.body.classList.add('glb-player-loaded');
      console.info('[Under Pressure] player model fitted',loadedFile,{scale,rigged:hasRiggedAnimation});

    }catch(err){
      oldRig?.setEnabled(true);
      document.body.classList.remove('glb-player-loading');
      document.body.classList.add('glb-player-fallback');
      console.warn('[Under Pressure] GLB player unavailable, keeping procedural fallback.',err);
    }
  }

  waitForGame();
})();