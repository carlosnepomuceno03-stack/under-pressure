(()=>{
  const coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
  if(!coarse)return;

  document.body.classList.add('touch-game');
  const controls=document.getElementById('mobileControls');
  controls?.setAttribute('aria-hidden','false');

  const state=window.UP_MOBILE_STATE={
    x:0,y:0,magnitude:0,jump:false,crouch:false
  };

  const pad=document.getElementById('movePad');
  const knob=document.getElementById('moveKnob');
  const base=pad?.querySelector('.stickBase');
  let movePointer=null;

  function setStickFromEvent(e){
    if(!base||!knob)return;
    const r=base.getBoundingClientRect();
    const cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;
    const max=r.width*.36;
    const len=Math.hypot(dx,dy);
    if(len>max){dx=dx/len*max;dy=dy/len*max;}
    const nx=dx/max,ny=dy/max;
    const mag=Math.min(1,Math.hypot(nx,ny));
    const dead=.10;
    state.x=Math.abs(nx)<dead?0:nx;
    state.y=Math.abs(ny)<dead?0:-ny;
    state.magnitude=mag<dead?0:mag;
    knob.style.transform='translate('+dx+'px,'+dy+'px)';
  }
  function resetStick(){
    state.x=0;state.y=0;state.magnitude=0;
    if(knob)knob.style.transform='translate(0px,0px)';
  }
  pad?.addEventListener('pointerdown',e=>{
    movePointer=e.pointerId;pad.setPointerCapture?.(e.pointerId);
    setStickFromEvent(e);e.preventDefault();
  },{passive:false});
  pad?.addEventListener('pointermove',e=>{
    if(e.pointerId!==movePointer)return;
    setStickFromEvent(e);e.preventDefault();
  },{passive:false});
  const endMove=e=>{
    if(movePointer===null||e.pointerId!==movePointer)return;
    movePointer=null;resetStick();e.preventDefault();
  };
  pad?.addEventListener('pointerup',endMove,{passive:false});
  pad?.addEventListener('pointercancel',endMove,{passive:false});

  // Right side camera look. Buttons sit above this zone with a higher z-index.
  const look=document.getElementById('lookPad');
  let lookPointer=null,lastX=0,lastY=0;
  look?.addEventListener('pointerdown',e=>{
    lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;
    look.setPointerCapture?.(e.pointerId);e.preventDefault();
  },{passive:false});
  look?.addEventListener('pointermove',e=>{
    if(e.pointerId!==lookPointer)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;
    lastX=e.clientX;lastY=e.clientY;
    window.UP3D?.addLookDelta?.(dx,dy);
    e.preventDefault();
  },{passive:false});
  const endLook=e=>{
    if(e.pointerId===lookPointer)lookPointer=null;
    e.preventDefault();
  };
  look?.addEventListener('pointerup',endLook,{passive:false});
  look?.addEventListener('pointercancel',endLook,{passive:false});

  function holdButton(id,onDown,onUp){
    const el=document.getElementById(id);if(!el)return;
    let pid=null;
    el.addEventListener('pointerdown',e=>{
      pid=e.pointerId;el.setPointerCapture?.(e.pointerId);
      el.classList.add('pressed');onDown?.();e.preventDefault();e.stopPropagation();
    },{passive:false});
    const done=e=>{
      if(pid!==e.pointerId)return;
      pid=null;el.classList.remove('pressed');onUp?.();e.preventDefault();e.stopPropagation();
    };
    el.addEventListener('pointerup',done,{passive:false});
    el.addEventListener('pointercancel',done,{passive:false});
  }
  function tapButton(id,fn){
    holdButton(id,()=>{fn?.();try{navigator.vibrate?.(18);}catch(_){}},null);
  }

  holdButton('mJump',()=>state.jump=true,()=>state.jump=false);
  tapButton('mAttack',()=>window.UP3D_ACTIONS?.light?.());
  tapButton('mHeavy',()=>window.UP3D_ACTIONS?.heavy?.());
  tapButton('mDodge',()=>window.UP3D_ACTIONS?.dodge?.());
  tapButton('mInteract',()=>window.UP3D_ACTIONS?.interact?.());
  tapButton('mView',()=>{
    window.UP3D?.toggleView?.();
    const b=document.getElementById('mView');
    if(b)b.textContent=b.textContent==='1P'?'3P':'1P';
  });

  const crouch=document.getElementById('mCrouch');
  crouch?.addEventListener('pointerdown',e=>{
    state.crouch=!state.crouch;
    crouch.classList.toggle('active',state.crouch);
    crouch.textContent=state.crouch?'LEVANTAR':'AGACHAR';
    try{navigator.vibrate?.(12);}catch(_){}
    e.preventDefault();e.stopPropagation();
  },{passive:false});

  // Prevent Safari gestures / scrolling while playing.
  for(const evt of ['touchmove','gesturestart','gesturechange']){
    document.addEventListener(evt,e=>{
      if(document.body.classList.contains('touch-game')&&!document.getElementById('graffitiMode')?.classList.contains('show')){
        e.preventDefault();
      }
    },{passive:false});
  }

  window.addEventListener('blur',()=>{
    resetStick();state.jump=false;
  });
})();