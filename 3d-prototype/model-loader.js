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
    loadMeshy();
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

      // Force a predictable textured StandardMaterial. The Meshy PBR export is
      // overly metallic/dark in this prototype lighting.
      if(visual.material){
        const src=visual.material;
        const tex=src.albedoTexture||src.diffuseTexture||null;
        const matte=new BABYLON.StandardMaterial('UP_PlayerMeshyMaterial',scene);
        matte.diffuseColor=new BABYLON.Color3(1,1,1);
        matte.specularColor=new BABYLON.Color3(.08,.08,.08);
        matte.emissiveColor=new BABYLON.Color3(.18,.18,.18);
        matte.backFaceCulling=false;
        matte.alpha=1;
        if(tex){
          matte.diffuseTexture=tex;
          matte.emissiveTexture=tex;
          matte.emissiveColor=new BABYLON.Color3(.14,.14,.14);
        }
        visual.material=matte;
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
        // Stable world-space follow. No fake squash/tilt/roll on an unrigged mesh:
        // the collider owns gameplay physics and the model only mirrors position + yaw.
        const p=player.getAbsolutePosition();

        visual.position.x=p.x;
        visual.position.z=p.z;
        visual.position.y=p.y + FEET_OFFSET - (SRC_MIN_Y*SCALE);

        visual.rotationQuaternion=null;
        visual.rotation.x=0;
        visual.rotation.z=0;
        visual.rotation.y=player.rotation.y + Math.PI;

        visual.scaling.setAll(SCALE);
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

      // Extra soft fill dedicated to the player so the character remains readable
      // against the dark prototype lighting without affecting the rest of the map.
      const playerFill=new BABYLON.PointLight('UP_PlayerFill',player.getAbsolutePosition().add(new BABYLON.Vector3(0,1.2,-.8)),scene);
      playerFill.diffuse=new BABYLON.Color3(.72,.82,1.0);
      playerFill.specular=new BABYLON.Color3(.15,.15,.18);
      playerFill.intensity=.62;
      playerFill.range=6.5;

      scene.onBeforeRenderObservable.add(()=>{
        syncVisual();
        const p=player.getAbsolutePosition();
        playerFill.position.set(p.x,p.y+1.15,p.z-.75);
      });

      window.UP_MODEL={
        loaded:true,
        ready:true,
        file:FILE,
        rigged:false,
        visual,
        playerFill,
        scale:SCALE,
        worldHeight:h
      };

      document.body.classList.remove('glb-player-loading','glb-player-fallback');
      document.body.classList.add('glb-player-loaded');
      window.dispatchEvent(new CustomEvent('up-player-ready'));
      console.info('[Under Pressure] Meshy player ready',{height:h,scale:SCALE});

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