(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const FILE='player_meshy.glb';

  // Real source bounds from the uploaded Meshy GLB.
  const SRC_MIN_Y=-0.9509469866752625;
  const SRC_HEIGHT=1.8981509804725647;
  const TARGET_HEIGHT=2.28;
  const SCALE=TARGET_HEIGHT/SRC_HEIGHT;

  function boot(){
    if(!window.UP3D?.scene||!window.BABYLON?.SceneLoader){
      setTimeout(boot,50);
      return;
    }
    setTimeout(loadMeshy,250);
  }

  async function loadMeshy(){
    const G=window.UP3D;
    const scene=G.scene;
    const player=G.player;
    const oldRig=scene.getTransformNodeByName('rigRoot');

    // Avoid showing the blocky fallback while the real model arrives.
    oldRig?.setEnabled(false);
    document.body.classList.add('glb-player-loading');

    try{
      const result=await BABYLON.SceneLoader.ImportMeshAsync('',PATH,FILE,scene);
      const visual=(result.meshes||[])
        .filter(m=>m && m.name!=='__root__' && (m.getTotalVertices?.()||0)>1000)
        .sort((a,b)=>(b.getTotalVertices?.()||0)-(a.getTotalVertices?.()||0))[0];

      if(!visual)throw new Error('player_meshy geometry not found');

      // Detach from Babylon's generated import root and attach DIRECTLY to gameplay collider.
      visual.parent=null;
      visual.rotationQuaternion=null;
      visual.position.set(0,0,0);
      visual.rotation.set(0,Math.PI,0);
      visual.scaling.setAll(SCALE);

      // Put feet at the same visual baseline used by the old procedural character.
      const desiredFeetY=-1.48;
      visual.position.y=desiredFeetY-(SRC_MIN_Y*SCALE);

      visual.parent=player;
      visual.setEnabled(true);
      visual.isVisible=true;
      visual.visibility=1;
      visual.checkCollisions=false;
      visual.isPickable=false;
      visual.alwaysSelectAsActiveMesh=true;

      if(visual.material){
        visual.material.alpha=1;
        visual.material.backFaceCulling=false;
      }

      // Kill importer helpers only AFTER the real geometry has been detached.
      for(const node of [...(result.meshes||[]),...(result.transformNodes||[])]){
        if(node===visual)continue;
        if(node.name==='__root__'||node.name==='PreviewFloor'||node.name==='DeliveryCamera'){
          node.setEnabled?.(false);
        }
      }

      visual.computeWorldMatrix(true);
      visual.refreshBoundingInfo?.();
      const bb=visual.getBoundingInfo().boundingBox;
      const h=bb.maximumWorld.y-bb.minimumWorld.y;
      const center=bb.centerWorld;
      const dist=BABYLON.Vector3.Distance(center,player.getAbsolutePosition());

      if(!Number.isFinite(h)||h<1.5||h>3.2||!Number.isFinite(dist)||dist>4){
        throw new Error('Meshy transform invalid: h='+h+' dist='+dist);
      }

      window.UP_MODEL={
        loaded:true,
        file:FILE,
        rigged:false,
        visual,
        scale:SCALE,
        worldHeight:h
      };

      document.body.classList.remove('glb-player-loading','glb-player-fallback');
      document.body.classList.add('glb-player-loaded');
      console.info('[Under Pressure] Meshy player visible',{height:h,scale:SCALE,dist});

    }catch(err){
      console.error('[Under Pressure] Meshy load failed',err);
      oldRig?.setEnabled(true);
      document.body.classList.remove('glb-player-loading');
      document.body.classList.add('glb-player-fallback');
    }
  }

  boot();
})();