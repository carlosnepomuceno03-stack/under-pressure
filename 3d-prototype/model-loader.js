(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const FILE='player_meshy.glb';

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
    setTimeout(loadMeshy,300);
  }

  async function loadMeshy(){
    const G=window.UP3D;
    const scene=G.scene;
    const player=G.player;
    const oldRig=scene.getTransformNodeByName('rigRoot');

    oldRig?.setEnabled(false);
    document.body.classList.add('glb-player-loading');

    let visual=null;

    try{
      const result=await BABYLON.SceneLoader.ImportMeshAsync('',PATH,FILE,scene);

      visual=(result.meshes||[])
        .filter(m=>m && m.name!=='__root__' && (m.getTotalVertices?.()||0)>1000)
        .sort((a,b)=>(b.getTotalVertices?.()||0)-(a.getTotalVertices?.()||0))[0];

      if(!visual)throw new Error('player_meshy geometry not found');

      // Detach completely from importer hierarchy.
      visual.setParent(null);
      visual.rotationQuaternion=null;
      visual.scaling.setAll(SCALE);
      visual.rotation.set(0,0,0);

      // Keep materials visible from either side.
      if(visual.material){
        visual.material.alpha=1;
        visual.material.backFaceCulling=false;
      }

      visual.checkCollisions=false;
      visual.isPickable=false;
      visual.alwaysSelectAsActiveMesh=true;
      visual.setEnabled(true);
      visual.isVisible=true;
      visual.visibility=1;

      // Disable only importer helpers, never the actual geometry.
      for(const node of [...(result.meshes||[]),...(result.transformNodes||[])]){
        if(node===visual)continue;
        if(node.name==='__root__'||node.name==='PreviewFloor'||node.name==='DeliveryCamera'){
          node.setEnabled?.(false);
        }
      }

      const syncVisual=()=>{
        // World-space follow: avoids all parent/root transform bugs.
        const p=player.getAbsolutePosition();
        visual.position.x=p.x;
        visual.position.z=p.z;

        // Feet baseline based on the real Meshy source bounds.
        visual.position.y=p.y + FEET_OFFSET - (SRC_MIN_Y*SCALE);

        // Preserve the already-approved movement orientation.
        visual.rotation.y=player.rotation.y + Math.PI;

        visual.computeWorldMatrix(true);
      };

      syncVisual();

      // Force a test of actual world-space bounds.
      visual.refreshBoundingInfo?.();
      const bb=visual.getBoundingInfo().boundingBox;
      const h=bb.maximumWorld.y-bb.minimumWorld.y;

      if(!Number.isFinite(h)||h<1.4||h>3.0){
        throw new Error('Meshy world height invalid: '+h);
      }

      // Bright debug marker at chest height for this build only.
      // If model fails to render but this marker is visible, the issue is material/geometry.
      const debug=BABYLON.MeshBuilder.CreateSphere('UP_PlayerDebugMarker',{diameter:.12,segments:8},scene);
      debug.material=new BABYLON.StandardMaterial('UP_PlayerDebugMat',scene);
      debug.material.emissiveColor=new BABYLON.Color3(1,0,.55);
      debug.isPickable=false;
      debug.checkCollisions=false;

      scene.onBeforeRenderObservable.add(()=>{
        syncVisual();
        const p=player.getAbsolutePosition();
        debug.position.set(p.x,p.y+.55,p.z);
      });

      window.UP_MODEL={
        loaded:true,
        file:FILE,
        rigged:false,
        visual,
        debug,
        scale:SCALE,
        worldHeight:h
      };

      document.body.classList.remove('glb-player-loading','glb-player-fallback');
      document.body.classList.add('glb-player-loaded');
      console.info('[Under Pressure] Meshy world-follow active',{height:h,scale:SCALE});

    }catch(err){
      console.error('[Under Pressure] Meshy load failed',err);
      if(visual)visual.setEnabled(false);
      oldRig?.setEnabled(true);
      document.body.classList.remove('glb-player-loading');
      document.body.classList.add('glb-player-fallback');
    }
  }

  boot();
})();