(()=>{
  const PATH='./3d-prototype/assets/characters/player/';
  const FILES=['player_meshy.glb','player_main.glb'];

  function waitForGame(){
    if(window.UP3D?.scene&&window.BABYLON?.SceneLoader)return init();
    setTimeout(waitForGame,40);
  }

  async function init(){
    const G=window.UP3D;
    const scene=G.scene;
    const player=G.player;
    const beforeLights=new Set(scene.lights);

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
      const imported=new Set(result.meshes);

      // Production safety: ignore any preview helpers if an older GLB revision is cached.
      for(const mesh of result.meshes){
        if(mesh.name==='PreviewFloor'||mesh.name==='DeliveryCamera'){
          mesh.setEnabled(false);
        }
        mesh.checkCollisions=false;
        mesh.isPickable=false;
      }
      for(const light of [...scene.lights]){
        if(!beforeLights.has(light)&&/^Area/.test(light.name))light.dispose();
      }

      const modelRoot=new BABYLON.TransformNode('UP_Player_ModelRoot',scene);
      modelRoot.parent=player;
      modelRoot.position.set(0,0,0);
      modelRoot.rotation.y=Math.PI;
      modelRoot.scaling.setAll(1.05);

      // Parent only top-level imported transform/mesh nodes so the rig hierarchy stays intact.
      const topNodes=[];
      const candidates=[...(result.transformNodes||[]),...(result.meshes||[])];
      for(const node of candidates){
        if(node===modelRoot)continue;
        const p=node.parent;
        if(!p||(!imported.has(p)&&!(result.transformNodes||[]).includes(p))){
          if(!topNodes.includes(node))topNodes.push(node);
        }
      }
      for(const node of topNodes)node.parent=modelRoot;

      const oldRig=scene.getTransformNodeByName('rigRoot');
      oldRig?.setEnabled(false);

      const groups=result.animationGroups||[];
      const hasRiggedAnimation=groups.length>0;
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
        // Collider rotates to the analog direction before the movement starts,
        // so the forward roll clip travels exactly where the player aimed.
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
        animationGroups:groups,
        clips
      };
      document.body.classList.add('glb-player-loaded');
      console.info('[Under Pressure] player model loaded',loadedFile,{rigged:hasRiggedAnimation,animations:groups.map(g=>g.name)});
    }catch(err){
      console.warn('[Under Pressure] GLB player unavailable, keeping procedural fallback.',err);
      document.body.classList.add('glb-player-fallback');
    }
  }

  waitForGame();
})();