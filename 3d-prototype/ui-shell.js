(()=>{
  const G=()=>window.UP3D;
  const GAME=()=>window.UP3D_GAME;
  const q=id=>document.getElementById(id);

  const start=q('startMenu'),pause=q('pauseMenu');
  const settings=q('settingsPanel'),missions=q('missionsPanel'),crew=q('crewPanel');

  function lock(v){G()?.setGameplayLocked?.(v);}
  function hide(el){el?.classList.remove('show');}
  function show(el){el?.classList.add('show');}

  function closeStart(){
    hide(start);lock(false);
    window.UP_AUDIO?.startMusic?.();
    window.UP_AUDIO?.sfx?.('ui');
  }
  function openPause(){
    if(document.getElementById('graffitiMode')?.classList.contains('show'))return;
    show(pause);lock(true);
    if(document.pointerLockElement)document.exitPointerLock?.();
  }
  function closePause(){hide(pause);lock(false);window.UP_AUDIO?.sfx?.('ui');}
  function openModal(el){show(el);lock(true);window.UP_AUDIO?.sfx?.('ui');}
  function closeModal(el){
    hide(el);
    if(!start?.classList.contains('show')&&!pause?.classList.contains('show'))lock(false);
  }

  // Start locked on title screen.
  lock(true);

  q('menuContinue')?.addEventListener('click',closeStart);
  q('menuNew')?.addEventListener('click',()=>{
    try{localStorage.removeItem('UP3D_PHASE1_ART');}catch(_){}
    location.reload();
  });
  q('menuMissions')?.addEventListener('click',()=>openModal(missions));
  q('menuCrew')?.addEventListener('click',()=>openModal(crew));
  q('menuSettings')?.addEventListener('click',()=>openModal(settings));

  q('pauseButton')?.addEventListener('click',openPause);
  q('pauseContinue')?.addEventListener('click',closePause);
  q('pauseRestart')?.addEventListener('click',()=>GAME()?.restart?.());
  q('pauseSettings')?.addEventListener('click',()=>openModal(settings));
  q('pauseMenuBack')?.addEventListener('click',()=>{hide(pause);show(start);lock(true);});

  document.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',()=>{
    closeModal(btn.closest('.modalPanel'));
  }));

  const music=q('musicVolume'),sfx=q('sfxVolume');
  if(music){
    music.value=String(window.UP_AUDIO?.state?.music??.55);
    music.addEventListener('input',()=>window.UP_AUDIO?.setMusic?.(music.value));
  }
  if(sfx){
    sfx.value=String(window.UP_AUDIO?.state?.sfx??.75);
    sfx.addEventListener('input',()=>window.UP_AUDIO?.setSfx?.(sfx.value));
  }

  window.addEventListener('keydown',e=>{
    if(e.code!=='Escape')return;
    if(settings?.classList.contains('show')){closeModal(settings);return;}
    if(missions?.classList.contains('show')){closeModal(missions);return;}
    if(crew?.classList.contains('show')){closeModal(crew);return;}
    if(start?.classList.contains('show'))return;
    if(pause?.classList.contains('show'))closePause(); else openPause();
  });

  // First user gesture unlocks WebAudio on iPhone/Safari.
  const unlock=()=>{window.UP_AUDIO?.ensure?.();document.removeEventListener('pointerdown',unlock);};
  document.addEventListener('pointerdown',unlock,{passive:true});
})();