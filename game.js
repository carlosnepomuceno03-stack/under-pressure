
const GW=1672,GH=941;
const YELLOW=0xffd447,PINK=0xff2d78,CYAN=0x19d7e7,DARK=0x090c12,MID=0x1a2130;
const IS_TOUCH=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
const IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
const IS_STANDALONE=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;

async function requestGameFullscreen(){
  const el=document.documentElement;
  try{
    if(document.fullscreenElement){await document.exitFullscreen();return true;}
    if(el.requestFullscreen){await el.requestFullscreen({navigationUI:'hide'});return true;}
    if(el.webkitRequestFullscreen){el.webkitRequestFullscreen();return true;}
  }catch(e){}
  return false;
}



const SAVE={
  get(){try{return JSON.parse(localStorage.getItem('up_v9')||'{}')}catch(e){return{}}},
  set(v){try{localStorage.setItem('up_v9',JSON.stringify(v))}catch(e){}}
};

let P=Object.assign({
  tag:'REBELDE',
  skin:'#C98A65',
  shirt:'#F0ECE3',
  mask:false,
  spray:'#ff2d78',
  muted:false,
  missionComplete:false,
  phase:1,
  phase1Complete:false,
  phase2Complete:false,
  phase3Complete:false,
  bucketUnlocked:false,
  specialSprayUnlocked:false,
  legendarySprays:[],
  skinnyCapUnlocked:false,
  fatCapUnlocked:false,
  glovesUnlocked:false,
  rareMaskUnlocked:false,
  rareMaskEquipped:false,
  neonUnlocked:false,
  campaignComplete:false,
  replayCount:0,
  phase1Art:null,
  phase2Art:null,
  phase3Art:null,
  lastScore:0,
  lastStars:0,
  finalColors:['#ff2d78','#19d7e7','#ffd447']
},SAVE.get());

function panel(s,x,y,w,h,a=.93,stroke=0xffffff){
  return s.add.rectangle(x,y,w,h,DARK,a).setStrokeStyle(2,stroke,.12);
}
function txt(s,x,y,t,size=20,col='#fff',bold=false){
  return s.add.text(x,y,t,{fontFamily:'Arial',fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color:col});
}
function btn(s,x,y,w,h,label,fill=YELLOW,col='#111',size=20){
  const bg=s.add.rectangle(x,y,w,h,fill,1).setStrokeStyle(3,0xffffff,.13).setInteractive({useHandCursor:true});
  const tx=txt(s,x,y,label,size,col,true).setOrigin(.5);
  bg.on('pointerover',()=>{bg.setScale(1.02);AUDIO.hover()});
  bg.on('pointerout',()=>bg.setScale(1));
  bg.on('pointerdown',()=>AUDIO.click());
  return {bg,tx,on:(e,f)=>bg.on(e,f)};
}
function hexNum(h){return Phaser.Display.Color.HexStringToColor(h).color}
function addOrientationHint(scene){
  if(!IS_TOUCH)return;
  const update=()=>{
    const portrait=window.innerHeight>window.innerWidth;
    if(portrait){
      if(!scene._rotateOverlay){
        scene._rotateOverlay=scene.add.container(0,0).setDepth(20000);
        const bg=scene.add.rectangle(GW/2,GH/2,GW,GH,0x05070a,.96);
        const icon=txt(scene,GW/2,GH/2-55,'↻',86,'#ffd447',true).setOrigin(.5);
        const title=txt(scene,GW/2,GH/2+35,'GIRE O IPHONE',34,'#fff',true).setOrigin(.5);
        const sub=txt(scene,GW/2,GH/2+82,'O jogo foi feito para jogar na horizontal.',18,'#aeb7c8').setOrigin(.5);
        scene._rotateOverlay.add([bg,icon,title,sub]);
      }
      scene._rotateOverlay.setVisible(true);
    }else if(scene._rotateOverlay)scene._rotateOverlay.setVisible(false);
  };
  update();
  scene.scale.on('resize',update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.scale.off('resize',update));
}

function colorDistance(a,b){
  const A=Phaser.Display.Color.HexStringToColor(a),B=Phaser.Display.Color.HexStringToColor(b);
  return Math.hypot(A.red-B.red,A.green-B.green,A.blue-B.blue);
}

// ---------- ORIGINAL PROCEDURAL HIP-HOP AUDIO ----------
class AudioEngine{
  constructor(){
    this.ctx=null;this.master=null;this.musicGain=null;this.fxGain=null;this.scene='menu';
    this.unlocked=false;this.muted=!!P.muted;this.timer=null;this.step=0;this.toolLoop=null;
  }
  unlock(){
    if(this.unlocked){if(this.ctx?.state==='suspended')this.ctx.resume();return}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    this.ctx=new AC();this.master=this.ctx.createGain();this.musicGain=this.ctx.createGain();this.fxGain=this.ctx.createGain();
    this.musicGain.gain.value=.34;this.fxGain.gain.value=.82;
    this.musicGain.connect(this.master);this.fxGain.connect(this.master);this.master.connect(this.ctx.destination);
    this.unlocked=true;this.applyMute();this.startBeat();
  }
  applyMute(){if(this.master)this.master.gain.value=this.muted?0:1}
  toggleMute(){this.muted=!this.muted;P.muted=this.muted;SAVE.set(P);this.applyMute();return this.muted}
  setScene(s){this.scene=s;this.step=0}
  osc(freq,dur=.08,type='sine',vol=.08,when=0,dest=null){
    if(!this.unlocked||this.muted)return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,this.ctx.currentTime+when);
    g.gain.setValueAtTime(vol,this.ctx.currentTime+when);g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+when+dur);
    o.connect(g);g.connect(dest||this.fxGain);o.start(this.ctx.currentTime+when);o.stop(this.ctx.currentTime+when+dur+.03);
  }
  noise(dur=.06,vol=.04,filter=5000,dest=null){
    if(!this.unlocked||this.muted)return;
    const n=Math.floor(this.ctx.sampleRate*dur),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();
    s.buffer=b;f.type='lowpass';f.frequency.value=filter;g.gain.value=vol;
    s.connect(f);f.connect(g);g.connect(dest||this.fxGain);s.start();s.stop(this.ctx.currentTime+dur);
  }
  click(){this.unlock();this.osc(510,.045,'square',.032);this.osc(760,.04,'square',.022,.025)}
  hover(){if(this.unlocked)this.osc(930,.022,'sine',.011)}
  select(){this.unlock();this.osc(410,.05,'triangle',.04);this.osc(690,.08,'triangle',.034,.035)}
  stepFx(){this.noise(.035,.03,1000);this.osc(100,.03,'sine',.02)}
  dripFx(){this.osc(500,.035,'sine',.045);this.osc(200,.085,'sine',.028,.02)}
  shake(){
    this.unlock();
    for(let i=0;i<7;i++){
      setTimeout(()=>this.noise(.055,.06,4200),i*65);
      setTimeout(()=>this.osc(900+Math.random()*260,.025,'square',.012),i*65);
    }
  }
  siren(){
    this.unlock();
    for(let i=0;i<6;i++)this.osc(i%2?760:480,.18,'sawtooth',.032,i*.15);
  }
  whistle(){
    this.unlock();
    this.osc(1650,.16,'sine',.05);
    this.osc(2050,.12,'sine',.045,.12);
    this.osc(1500,.18,'sine',.04,.26);
  }
  startTool(kind){
    this.unlock();this.stopTool();if(!this.ctx)return;
    const n=2*this.ctx.sampleRate,b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();
    s.buffer=b;s.loop=true;
    if(kind==='marker'){f.type='highpass';f.frequency.value=1350;g.gain.value=.035}
    else if(kind==='drip'){f.type='bandpass';f.frequency.value=2400;g.gain.value=.07}
    else{f.type='bandpass';f.frequency.value=3250;g.gain.value=.10}
    s.connect(f);f.connect(g);g.connect(this.fxGain);s.start();this.toolLoop=s;
  }
  stopTool(){try{this.toolLoop?.stop()}catch(e){}this.toolLoop=null}
  startBeat(){
    clearInterval(this.timer);
    // roughly 92 BPM sixteenth-note grid: old-school boom-bap feel, original notes/rhythm
    this.timer=setInterval(()=>this.beat(),163);
  }
  beat(){
    if(!this.unlocked||this.muted)return;
    const st=this.step++%16;
    const bass=[55,65.4,49,73.4];
    if(this.scene==='menu'){
      if([0,7,10].includes(st))this.osc(st===7?62:55,.14,'sine',.075,0,this.musicGain);
      if(st===4||st===12)this.noise(.09,.035,1550,this.musicGain);
      if([0,2,6,8,11,14].includes(st))this.noise(.028,.012,7200,this.musicGain);
      if([0,5,8,13].includes(st))this.osc(bass[[0,5,8,13].indexOf(st)],.22,'triangle',.024,0,this.musicGain);
      if(st===15)this.noise(.18,.006,4200,this.musicGain); // vinyl-ish breath
    }else if(this.scene==='map'){
      if([0,10].includes(st))this.osc(52,.16,'sine',.035,0,this.musicGain);
      if(st===4||st===12)this.noise(.075,.018,1600,this.musicGain);
      if([2,6,9,14].includes(st))this.noise(.025,.007,6000,this.musicGain);
      if([0,8].includes(st))this.osc(st?58:49,.26,'triangle',.016,0,this.musicGain);
    }else if(this.scene==='paint'){
      if([0,6,10].includes(st))this.osc(st===6?68:58,.13,'sine',.06,0,this.musicGain);
      if(st===4||st===12)this.noise(.09,.03,1700,this.musicGain);
      if([0,2,6,8,11,14].includes(st))this.noise(.028,.013,7500,this.musicGain);
      if([0,5,8,13].includes(st))this.osc([116,138,103,155][[0,5,8,13].indexOf(st)],.16,'triangle',.018,0,this.musicGain);
    }
  }
}
const AUDIO=new AudioEngine();
document.addEventListener('pointerdown',()=>AUDIO.unlock());
document.addEventListener('touchstart',()=>AUDIO.unlock(),{passive:true});

// ---------- BOOT ----------
class Boot extends Phaser.Scene{
  constructor(){super('Boot')}
  preload(){
    this.load.image('map','assets/map.png');
    this.load.image('menu','assets/menu.png');
    this.load.image('brick','assets/brick_wall.png');
    this.load.image('clean_wall','assets/mission_wall_clean.png');
    this.load.image('monkey','assets/monkey_mask_clean.png');
    this.load.image('mask_full','assets/mask_full.png');
    this.load.image('mask_left','assets/mask_left.png');
    this.load.image('mask_right','assets/mask_right.png');
    this.load.image('monkey_sticker','assets/monkey_sticker.png');
    this.load.image('front_gc','assets/front_gc.png');
    this.load.image('painter_idle_src','assets/painter_idle.png');
    this.load.image('painter_spray_src','assets/painter_spray_clean.png');

    const fs=['idle_front','idle_back','idle_left','idle_right',
      'walk_right_1','walk_right_2','walk_right_3','walk_right_4',
      'walk_left_1','walk_left_2','walk_left_3','walk_left_4',
      'walk_back_1','walk_back_2','walk_back_3','walk_back_4',
      'walk_front_1','walk_front_2','walk_front_3','walk_front_4'];
    fs.forEach(f=>{
      this.load.image('base_'+f,'assets/player/'+f+'.png');
      this.load.image('maskframe_'+f,'assets/mask_frames/'+f+'.png');
    });
  }
  create(){
    this.buildLiveTextures();
    this.scene.start('Menu');
  }
  recolorImage(srcKey,outKey,kind='game'){
    const src=this.textures.get(srcKey).getSourceImage();
    const c=document.createElement('canvas');c.width=src.width;c.height=src.height;
    const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(src,0,0);
    const im=cx.getImageData(0,0,c.width,c.height),d=im.data;
    const skin=Phaser.Display.Color.HexStringToColor(P.skin),shirt=Phaser.Display.Color.HexStringToColor(P.shirt);

    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const i=(y*c.width+x)*4;if(d[i+3]<10)continue;
      const r=d[i],g=d[i+1],b=d[i+2],lum=(r+g+b)/3,sat=Math.max(r,g,b)-Math.min(r,g,b);
      let tr=null;
      if(r>72&&r>g*1.05&&g>b*1.02&&r-b>18)tr=skin;
      if(lum>115&&sat<72)tr=shirt;
      if(tr){
        const k=Math.max(.22,Math.min(1.35,lum/155));
        d[i]=Math.min(255,tr.red*k);d[i+1]=Math.min(255,tr.green*k);d[i+2]=Math.min(255,tr.blue*k);
      }
    }
    cx.putImageData(im,0,0);
    if(this.textures.exists(outKey))this.textures.remove(outKey);
    this.textures.addCanvas(outKey,c);
  }

  buildLiveTextures(){
    const fs=['idle_front','idle_back','idle_left','idle_right',
      'walk_right_1','walk_right_2','walk_right_3','walk_right_4',
      'walk_left_1','walk_left_2','walk_left_3','walk_left_4',
      'walk_back_1','walk_back_2','walk_back_3','walk_back_4',
      'walk_front_1','walk_front_2','walk_front_3','walk_front_4'];
    fs.forEach(f=>this.recolorImage('base_'+f,'game_'+f,'game'));
    this.recolorImage('painter_idle_src','painter_idle_live','painter');
    this.recolorImage('painter_spray_src','painter_spray_live','painter');
  }
}

// ---------- MENU ----------
class Menu extends Phaser.Scene{
  constructor(){super('Menu')}
  create(){
    AUDIO.setScene('menu');
    addOrientationHint(this);
    this.add.image(GW/2,GH/2,'menu');
    const zones=[
      [258,466,365,88,()=>{P.missionComplete=P.phase3Complete;SAVE.set(P);this.scene.start('Custom',{next:'Map'})}],
      [263,557,345,70,()=>this.scene.start('Custom',{next:'Menu'})],
      [270,642,340,70,()=>this.toast('M = áudio • WASD = andar • E = interagir • ESPAÇO = chacoalhar')],
      [270,728,340,66,()=>this.toast('UNDER PRESSURE • TDG CREW EDITION')],
      [270,813,320,66,()=>this.toast('TDG • ARTE • RUA • EXPRESSÃO')]
    ];
    zones.forEach((h,i)=>{
      const r=this.add.rectangle(h[0],h[1],h[2],h[3],0xffffff,0.001).setInteractive({useHandCursor:true});
      r.on('pointerover',()=>{r.setFillStyle(i===0?YELLOW:0xffffff,.12);AUDIO.hover()});
      r.on('pointerout',()=>r.setFillStyle(0xffffff,.001));
      r.on('pointerdown',()=>{AUDIO.click();h[4]()});
    });
    this.add.image(1495,760,'monkey_sticker').setScale(.11).setAlpha(.72).setAngle(-7);
    this.mute=txt(this,GW-24,22,P.muted?'M • ÁUDIO OFF':'M • ÁUDIO ON',14,'#fff',true).setOrigin(1,0).setBackgroundColor('#090c12').setPadding(9,6);
    this.input.keyboard.on('keydown-M',()=>{const m=AUDIO.toggleMute();this.mute.setText(m?'M • ÁUDIO OFF':'M • ÁUDIO ON')});
  }
  toast(m){const t=txt(this,GW/2,GH-45,m,17,'#fff',true).setOrigin(.5).setBackgroundColor('#090c12').setPadding(14,8);this.time.delayedCall(1850,()=>t.destroy())}
}

// ---------- CLEAN CUSTOMIZER ----------
class Custom extends Phaser.Scene{
  constructor(){super('Custom')}
  init(data){this.next=data.next||'Map'}
  create(){
    AUDIO.setScene('menu');
    addOrientationHint(this);
    this.add.image(GW/2,GH/2,'menu');
    this.add.rectangle(GW/2,GH/2,GW,GH,0x000000,.64);

    txt(this,75,55,'PERSONAGEM',42,'#fff',true);
    txt(this,77,105,'Só o que realmente funciona no gameplay.',18,'#b9c2d1');

    panel(this,400,505,590,720,.95);
    panel(this,1165,505,850,720,.95);

    this.add.image(405,540,'front_gc').setScale(1.65).setAlpha(.9);
    txt(this,405,165,'VISUAL',17,'#ffd447',true).setOrigin(.5);

    panel(this,640,365,210,300,.9);
    txt(this,640,235,'NO JOGO',15,'#ffd447',true).setOrigin(.5);
    this.preview=this.add.sprite(640,490,'game_idle_front').setOrigin(.5,.92).setScale(.72);
    this.previewMask=this.add.image(640,348,'mask_full').setScale(.0195).setVisible(P.mask).setDepth(20);

    txt(this,825,185,'NOME / TAG',17,'#ffd447',true);
    const el=document.createElement('input');el.className='up-input';el.value=P.tag;el.maxLength=12;
    this.tagDom=this.add.dom(1035,235,el).setOrigin(.5);
    el.addEventListener('input',()=>{P.tag=(el.value||'REBELDE').toUpperCase();SAVE.set(P)});

    txt(this,825,310,'PELE',17,'#ffd447',true);
    this.skinDots=[];
    ['#6d402b','#8b563b','#a96c4b','#c98a65','#e0a982','#f0c3a2'].forEach((c,i)=>{
      const q=this.add.circle(855+i*62,370,22,hexNum(c),1).setStrokeStyle(P.skin===c?5:2,P.skin===c?YELLOW:0xffffff,.8).setInteractive({useHandCursor:true});
      q.on('pointerdown',()=>{P.skin=c;SAVE.set(P);AUDIO.select();this.refreshPreview();this.scene.restart({next:this.next})});
    });

    txt(this,825,445,'CAMISETA',17,'#ffd447',true);
    [['#F0ECE3','BRANCA'],['#ff2d78','ROSA'],['#19d7e7','CIANO'],['#ffd447','AMARELA']].forEach((o,i)=>{
      const x=885+i*145;
      const b=this.add.rectangle(x,515,125,78,0x10151e,1).setStrokeStyle(P.shirt===o[0]?4:2,P.shirt===o[0]?YELLOW:0x3c465a,1).setInteractive({useHandCursor:true});
      this.add.circle(x,498,20,hexNum(o[0]),1).setStrokeStyle(2,0xffffff,.45);
      txt(this,x,544,o[1],11,'#fff',true).setOrigin(.5);
      b.on('pointerdown',()=>{P.shirt=o[0];SAVE.set(P);AUDIO.select();this.refreshPreview();this.scene.restart({next:this.next})});
    });

    txt(this,825,595,'MÁSCARA',17,'#ffd447',true);
    const none=btn(this,885,665,145,58,'SEM MÁSCARA',!P.mask?YELLOW:MID,!P.mask?'#111':'#fff',12);
    const monkey=btn(this,1050,665,165,58,'MACACO TDG',P.mask&&!P.rareMaskEquipped?YELLOW:MID,P.mask&&!P.rareMaskEquipped?'#111':'#fff',12);
    none.on('pointerdown',()=>{P.mask=false;P.rareMaskEquipped=false;SAVE.set(P);this.refreshPreview();this.scene.restart({next:this.next})});
    monkey.on('pointerdown',()=>{P.mask=true;P.rareMaskEquipped=false;SAVE.set(P);this.refreshPreview();this.scene.restart({next:this.next})});

    if(P.rareMaskUnlocked){
      const rare=btn(this,1245,665,195,58,'MACACO RARO',P.rareMaskEquipped?YELLOW:0x4b2a6f,P.rareMaskEquipped?'#111':'#fff',12);
      rare.on('pointerdown',()=>{P.mask=true;P.rareMaskEquipped=true;SAVE.set(P);this.refreshPreview();this.scene.restart({next:this.next})});
      txt(this,1245,705,'RECOMPENSA DA CAMPANHA',10,'#d6a8ff',true).setOrigin(.5);
    }else{
      txt(this,1245,665,'???',20,'#6f7480',true).setOrigin(.5);
      txt(this,1245,700,'TERMINE AS 3 FASES',10,'#7f8796',true).setOrigin(.5);
    }

    this.add.image(1455,655,'monkey').setScale(.05).setTint(P.rareMaskEquipped?0xd28cff:0xffffff);
    txt(this,1510,640,P.rareMaskEquipped?'MÁSCARA RARA':'MÁSCARA DA CREW',12,P.rareMaskEquipped?'#d6a8ff':'#aeb7c8',true);

    txt(this,825,745,'COR INICIAL DO SPRAY',17,'#ffd447',true);
    ['#ff2d78','#19d7e7','#ffd447','#a7ff4a','#8c63ff'].forEach((c,i)=>{
      const q=this.add.circle(855+i*62,807,21,hexNum(c),1).setStrokeStyle(P.spray===c?5:2,P.spray===c?YELLOW:0xffffff,.8).setInteractive({useHandCursor:true});
      q.on('pointerdown',()=>{P.spray=c;SAVE.set(P);AUDIO.select()});
    });

    const back=btn(this,1000,875,180,54,'VOLTAR',MID,'#fff',18);back.on('pointerdown',()=>this.scene.start('Menu'));
    const go=btn(this,1320,875,320,54,this.next==='Map'?'SALVAR E JOGAR':'SALVAR',YELLOW,'#111',19);
    go.on('pointerdown',()=>{
      // Finishing the campaign unlocks the rare mask. Replaying with it equipped
      // unlocks the neon palette and starts a fresh run while keeping inventory.
      if(this.next==='Map'&&P.phase3Complete&&P.rareMaskUnlocked&&P.rareMaskEquipped){
        P.neonUnlocked=true;P.replayCount=(P.replayCount||0)+1;
        P.phase1Complete=false;P.phase2Complete=false;P.phase3Complete=false;
        P.missionComplete=false;P.phase=1;
        P.phase1Art=null;P.phase2Art=null;P.phase3Art=null;
      }
      SAVE.set(P);this.scene.get('Boot').buildLiveTextures();this.scene.start(this.next)
    });
    this.input.keyboard.on('keydown-ESC',()=>this.scene.start('Menu'));
  }
  refreshPreview(){
    this.scene.get('Boot').buildLiveTextures();
    this.preview?.setTexture('game_idle_front');
    if(this.previewMask){
      this.previewMask.setVisible(P.mask);
      this.previewMask.setTint(P.rareMaskEquipped?0xc56cff:0xffffff);
    }
  }
}

// ---------- MAP ----------
class MapScene extends Phaser.Scene{
  constructor(){super('Map')}
  create(){
    AUDIO.setScene('map');
    addOrientationHint(this);
    this.world=this.add.container(0,0);
    this.ui=this.add.container(0,0);

    // Expanded temporary world: reuse the existing environment as three connected districts.
    this.worldW=GW*2; this.worldH=GH*2;
    const bg1=this.add.image(GW/2,GH/2,'map');
    const bg2=this.add.image(GW+GW/2,GH/2,'map').setFlipX(true).setTint(0x6fb7ff);
    const bg3=this.add.image(GW+GW/2,GH+GH/2,'map').setFlipY(true).setTint(0xd982ff);
    const bg4=this.add.image(GW/2,GH+GH/2,'map').setFlipX(true).setFlipY(true).setTint(0x63d6a4);

    // Color grading overlays so each district reads as a different neighborhood.
    const grade2=this.add.rectangle(GW+GW/2,GH/2,GW,GH,0x1266a8,.14).setBlendMode(Phaser.BlendModes.ADD);
    const grade3=this.add.rectangle(GW+GW/2,GH+GH/2,GW,GH,0x8c27b8,.15).setBlendMode(Phaser.BlendModes.ADD);
    const grade4=this.add.rectangle(GW/2,GH+GH/2,GW,GH,0x167b62,.13).setBlendMode(Phaser.BlendModes.ADD);
    this.world.add([bg1,bg2,bg3,bg4,grade2,grade3,grade4]);

    // Mission walls. These are temporary reused assets until bespoke districts are generated.
    this.wall1=this.add.image(1245,408,'clean_wall').setDisplaySize(520,255).setDepth(1);
    this.wall2=this.add.image(GW+505,330,'clean_wall').setDisplaySize(440,235).setDepth(1).setFlipX(true);
    this.wall3=this.add.image(GW+1180,GH+360,'clean_wall').setDisplaySize(500,250).setDepth(1).setTint(0xd7cadf);
    this.world.add([this.wall1,this.wall2,this.wall3]);
    if(P.phase1Complete)this.addFinishedGraffiti();
    if(P.phase2Complete)this.addSecondFinishedGraffiti();
    if(P.phase3Complete)this.addThirdFinishedGraffiti();

    const sticker=this.add.image(1480,440,'monkey_sticker').setScale(.052).setAlpha(.35).setAngle(-7).setDepth(2);
    this.world.add(sticker);
    const sticker2=this.add.image(GW+1340,500,'monkey_sticker').setScale(.048).setAlpha(.28).setAngle(8).setDepth(2);
    const sticker3=this.add.image(GW+980,GH+450,'monkey_sticker').setScale(.055).setAlpha(.25).setAngle(-12).setDepth(2);
    this.world.add([sticker2,sticker3]);

    this.shadow=this.add.ellipse(790,742,58,17,0x000000,.4).setDepth(100);
    this.player=this.add.sprite(790,735,'game_idle_front').setOrigin(.5,.92).setScale(.47).setDepth(101);
    this.maskOverlay=this.add.sprite(790,735,'maskframe_idle_front').setOrigin(.5,.92).setScale(.47).setDepth(103).setVisible(P.mask);
    this.world.add([this.shadow,this.player,this.maskOverlay]);

    this.last='front';this.frame=0;this.speed=255;this.lastStep=0;
    this.keys=this.input.keyboard.addKeys('W,A,S,D,E');this.cursors=this.input.keyboard.createCursorKeys();

    // Cleaner hitboxes: deliberately smaller than the artwork so invisible walls do not catch the player.
    const baseRects=[
      [350,270,125,135],[205,470,88,92],[770,450,120,92],[1390,505,165,65]
    ];
    this.blockers=[];
    const addTileRects=(ox,oy)=>baseRects.forEach(r=>this.blockers.push(new Phaser.Geom.Rectangle(r[0]+ox,r[1]+oy,r[2],r[3])));
    addTileRects(0,0);addTileRects(GW,0);addTileRects(0,GH);addTileRects(GW,GH);

    this.phase2=P.phase1Complete&&!P.phase2Complete;
    this.phase3=P.phase2Complete&&!P.phase3Complete;
    this.activePhase=this.phase3?3:(this.phase2?2:1);
    const phaseStarts={
      1:{x:790,y:735},
      2:{x:GW+120,y:735},
      3:{x:GW+260,y:GH+760}
    };
    const st=phaseStarts[this.activePhase];
    this.player.setPosition(st.x,st.y);this.shadow.setPosition(st.x,st.y+3);this.maskOverlay.setPosition(st.x,st.y);
    this.point=this.phase3?new Phaser.Math.Vector2(GW+1180,GH+610):(this.phase2?new Phaser.Math.Vector2(GW+505,585):new Phaser.Math.Vector2(1230,618));
    this.halo=this.add.ellipse(this.point.x,this.point.y,138,46,0xffd447,.14).setStrokeStyle(5,0xffd447,.95).setDepth(50);
    this.world.add(this.halo);
    this.tweens.add({targets:this.halo,scaleX:1.16,scaleY:1.16,alpha:.34,duration:800,yoyo:true,repeat:-1});

    this.e=txt(this,this.point.x,this.point.y-55,'E',27,'#fff',true).setOrigin(.5).setBackgroundColor('#090c12').setPadding(14,10).setVisible(false).setDepth(200);
    this.prompt=txt(this,this.point.x,this.point.y-103,P.phase3Complete?'TODOS OS SPOTS CONCLUÍDOS':'APERTE E PRA PINTAR',18,'#fff',true).setOrigin(.5).setBackgroundColor('#090c12').setPadding(10,7).setVisible(false).setDepth(200);
    this.world.add([this.e,this.prompt]);

    // fixed HUD on dedicated UI camera
    this.objHud=this.add.container(-470,24);
    const hudBg=this.add.rectangle(230,55,430,102,0x090c12,.84).setStrokeStyle(2,0xffffff,.09);
    const h1=txt(this,35,22,'OBJETIVO',16,'#ffd447',true);
    this.h2=txt(this,35,50,P.phase3Complete?'Três spots dominados!':(this.phase3?'Explore a área sul e encontre o terceiro muro':(this.phase2?'Atravesse para o distrito leste sem ser visto':'Vá até o primeiro ponto de graffiti')),20,'#fff',true);
    this.h3=txt(this,35,78,P.phase3Complete?`ESTILO: ${P.lastScore} pts • ${'★'.repeat(P.lastStars)}${'☆'.repeat(3-P.lastStars)}`:(this.phase3?'FASE 3 • novo setor':(this.phase2?'FASE 2 • dois policiais patrulhando':`TAG: ${P.tag}`)),14,'#b9c2d1');
    this.objHud.add([hudBg,h1,this.h2,this.h3]);this.ui.add(this.objHud);

    this.menuBtn=btn(this,GW-100,GH-48,160,56,'MENU',MID,'#fff',20);
    this.ui.add([this.menuBtn.bg,this.menuBtn.tx]);this.menuBtn.on('pointerdown',()=>this.scene.start('Menu'));

    this.replayBtn=btn(this,GW-285,GH-48,185,56,'REJOGAR FASE',0x26324a,'#fff',15);
    this.ui.add([this.replayBtn.bg,this.replayBtn.tx]);
    this.replayBtn.on('pointerdown',()=>{
      AUDIO.select();
      this.scene.start('Paint',{phase:this.activePhase,replay:true});
    });

    this.resetBtn=btn(this,GW-500,GH-48,200,56,'RESETAR RUN',0x4b2230,'#fff',15);
    this.ui.add([this.resetBtn.bg,this.resetBtn.tx]);
    this.resetBtn.on('pointerdown',()=>this.confirmRunReset());

    this.fsBtn=btn(this,GW-112,105,190,60,'TELA CHEIA',0x202838,'#fff',17);
    this.ui.add([this.fsBtn.bg,this.fsBtn.tx]);
    this.fsBtn.on('pointerdown',async()=>{
      const ok=await requestGameFullscreen();
      if(IS_IOS&&!IS_STANDALONE&&!ok)this.showIOSInstallTip();
    });

    this.dbg=this.add.graphics();this.dbgText=txt(this,24,GH-42,'F2 • MOSTRAR COLISÃO',15,'#ff6f8b',true);
    this.world.add(this.dbg);this.ui.add(this.dbgText);this.debug=false;
    this.input.keyboard.on('keydown-F2',()=>{this.debug=!this.debug;this.drawDebug()});
    this.input.keyboard.on('keydown-E',()=>this.tryPaint());

    const main=this.cameras.main;
    main.setBounds(0,0,this.worldW,this.worldH);main.startFollow(this.player,true,.075,.075);main.setZoom(1.12);
    this.uiCam=this.cameras.add(0,0,GW,GH);this.uiCam.ignore(this.world);main.ignore(this.ui);

    this.createStealthGuards();
    this.createCollectibles();
    this.createMiniMap();

    this.showObjective(true);
    this.time.delayedCall(3200,()=>this.hideObjective());

    if(IS_TOUCH)this.makeMobileControls();
    this.nearLast=false;
  }
  createStealthGuards(){
    this.stealthCaught=0;
    this.guardLayer=this.add.container(0,0).setDepth(120);
    this.world.add(this.guardLayer);

    const makeGuard=(x,y,axis,range,speed,dir=1,tint=0x6f88bb)=>{
      const body=this.add.container(x,y);
      const shadow=this.add.ellipse(0,16,46,14,0x000000,.45);
      const officer=this.add.sprite(0,18,'game_idle_front').setOrigin(.5,.92).setScale(.31).setTint(tint);
      const vest=this.add.rectangle(0,-8,30,25,0x071329,.60).setStrokeStyle(2,0x8aa7dc,.65);
      const badge=this.add.circle(9,-14,3.2,0xffd447,1);
      const belt=this.add.rectangle(0,3,31,5,0x05080e,.85);
      const capBrim=this.add.rectangle(0,-50,29,5,0x08111f,1);
      const capTop=this.add.rectangle(0,-56,21,10,0x0e1a32,1);
      body.add([shadow,officer,vest,badge,belt,capBrim,capTop]);body.officer=officer;
      const cone=this.add.graphics();
      this.guardLayer.add([cone,body]);
      return {body,cone,startX:x,startY:y,axis,range,speed,dir,phase:Math.random()*Math.PI*2};
    };

    if(this.activePhase===1){
      this.guards=[
        makeGuard(1080,540,'x',175,44,1,0x7088b9)
      ];
    }else if(this.activePhase===2){
      this.guards=[
        makeGuard(GW+740,390,'x',245,68,1,0x6a85b8),
        makeGuard(GW+430,690,'y',205,62,-1,0x6f8fbe)
      ];
    }else{
      this.guards=[
        makeGuard(GW+480,GH+460,'x',245,82,1,0x637fb2),
        makeGuard(GW+910,GH+690,'y',220,78,-1,0x7691c4),
        makeGuard(GW+1290,GH+500,'x',210,88,-1,0x5f78a8),
        makeGuard(GW+760,GH+300,'y',170,84,1,0x7898c9)
      ];
    }

    const label=this.activePhase===1?'1 GUARDA • FIQUE FORA DA LUZ':this.activePhase===2?'2 GUARDAS • PATRULHA MAIS RÁPIDA':'4 GUARDAS • DISTRITO EM ALERTA';
    this.stealthHud=txt(this,GW/2,120,label,18,'#ffd447',true).setOrigin(.5).setBackgroundColor('#090c12').setPadding(14,9);
    this.ui.add(this.stealthHud);
  }

  updateStealth(delta){
    if(!this.guards?.length)return;
    const dt=delta/1000;
    let seen=false;
    for(const g of this.guards){
      if(g.axis==='x'){
        g.body.x+=g.dir*g.speed*dt;
        if(Math.abs(g.body.x-g.startX)>g.range)g.dir*=-1;
        if(g.body.officer)g.body.officer.setTexture(g.dir>0?'game_idle_right':'game_idle_left');
      }else{
        g.body.y+=g.dir*g.speed*dt;
        if(Math.abs(g.body.y-g.startY)>g.range)g.dir*=-1;
        if(g.body.officer)g.body.officer.setTexture(g.dir>0?'game_idle_front':'game_idle_back');
      }
      const gx=g.body.x,gy=g.body.y;
      const ang=Math.atan2(this.player.y-gy,this.player.x-gx);
      const facing=g.axis==='x'?(g.dir>0?0:Math.PI/2*2):(g.dir>0?Math.PI/2:-Math.PI/2);
      const len=[165,215,255][this.activePhase-1],spread=[.36,.43,.48][this.activePhase-1];
      g.cone.clear();g.cone.fillStyle(0xfff1a8,.12);
      g.cone.beginPath();g.cone.moveTo(gx,gy-18);
      g.cone.lineTo(gx+Math.cos(facing-spread)*len,gy-18+Math.sin(facing-spread)*len);
      g.cone.lineTo(gx+Math.cos(facing+spread)*len,gy-18+Math.sin(facing+spread)*len);
      g.cone.closePath();g.cone.fillPath();

      const dist=Phaser.Math.Distance.Between(gx,gy,this.player.x,this.player.y);
      let da=Math.atan2(this.player.y-gy,this.player.x-gx)-facing;
      while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
      if(dist<len&&Math.abs(da)<spread*.78)seen=true;
    }

    if(seen){
      this.stealthCaught=Math.min(1,this.stealthCaught+dt*[.92,1.35,1.72][this.activePhase-1]);
      this.stealthHud.setText(this.stealthCaught>.65?'CORRE! ELES ESTÃO TE VENDO!':'VOCÊ FOI VISTO!').setColor('#ff4f77');
    }else{
      this.stealthCaught=Math.max(0,this.stealthCaught-dt*[2.2,1.8,1.45][this.activePhase-1]);
      const label=this.activePhase===1?'1 GUARDA • FIQUE FORA DA LUZ':this.activePhase===2?'2 GUARDAS • PATRULHA MAIS RÁPIDA':'4 GUARDAS • DISTRITO EM ALERTA';
      this.stealthHud.setText(label).setColor('#ffd447');
    }
    if(this.stealthCaught>=1){
      this.stealthCaught=0;AUDIO.siren();
      const starts={1:{x:790,y:735},2:{x:GW+120,y:735},3:{x:GW+260,y:GH+760}};
      const st=starts[this.activePhase];this.player.setPosition(st.x,st.y);this.shadow.setPosition(st.x,st.y+3);
      this.showObjective(true);
      const t=txt(this,GW/2,190,'OS POLICIAIS TE VIRAM — VOLTEI VOCÊ PRO INÍCIO',19,'#ff4f77',true).setOrigin(.5).setBackgroundColor('#090c12').setPadding(12,8);
      this.ui.add(t);this.time.delayedCall(1800,()=>t.destroy());
    }
  }

  showObjective(force=false){
    if(this.objVisible&&!force)return;this.objVisible=true;
    this.tweens.killTweensOf(this.objHud);
    this.tweens.add({targets:this.objHud,x:0,duration:430,ease:'Back.Out'});
  }
  hideObjective(){
    if(!this.objVisible)return;this.objVisible=false;
    this.tweens.killTweensOf(this.objHud);
    this.tweens.add({targets:this.objHud,x:-470,duration:360,ease:'Sine.In'});
  }
  addFinishedGraffiti(){
    const data=P.phase1Art;
    if(!data)return;
    const key='finished_art_v12';
    if(this.textures.exists(key))this.textures.remove(key);
    this.textures.addBase64(key,data);
    this.textures.once(Phaser.Textures.Events.ADD_KEY+key,()=>{
      const g=this.add.image(1245,408,key).setDisplaySize(495,235).setDepth(3);
      this.world.add(g);
    });
  }

  addSecondFinishedGraffiti(){
    const data=P.phase2Art;
    if(!data)return;
    const key='finished_art_v12_phase2';
    if(this.textures.exists(key))this.textures.remove(key);
    this.textures.addBase64(key,data);
    this.textures.once(Phaser.Textures.Events.ADD_KEY+key,()=>{
      const g=this.add.image(470,300,key).setDisplaySize(360,220).setDepth(3).setAngle(-4);
      this.world.add(g);
    });
  }

  addThirdFinishedGraffiti(){
    const data=P.phase3Art;if(!data)return;
    const key='finished_art_v13_phase3';
    if(this.textures.exists(key))this.textures.remove(key);
    this.textures.addBase64(key,data);
    this.textures.once(Phaser.Textures.Events.ADD_KEY+key,()=>{
      const g=this.add.image(GW+1180,GH+360,key).setDisplaySize(475,232).setDepth(3).setAngle(2);
      this.world.add(g);
    });
  }

  createMiniMap(){
    this.mapHud=this.add.container(GW-215,210).setDepth(25000);
    const bg=this.add.rectangle(0,0,310,205,0x070a0f,.9).setStrokeStyle(2,0xffffff,.15);
    const title=txt(this,-138,-88,'MAPA',14,'#ffd447',true);
    this.mmW=270;this.mmH=150;
    const mapBox=this.add.rectangle(0,12,this.mmW,this.mmH,0x141b28,1).setStrokeStyle(2,0x566075,.7);
    // Four reused districts.
    const q1=this.add.rectangle(-67.5,-25.5,132,72,0x1d2738,.9);
    const q2=this.add.rectangle(67.5,-25.5,132,72,0x174c7a,.95);
    const q3=this.add.rectangle(-67.5,49.5,132,72,0x17614d,.95);
    const q4=this.add.rectangle(67.5,49.5,132,72,0x653078,.95);
    this.mmPlayer=this.add.circle(0,0,7,0xffd447,1).setStrokeStyle(2,0xffffff,1);
    this.mmGoal=this.add.circle(0,0,6,0xff2d78,.95).setStrokeStyle(2,0xffffff,.8);
    const legend=txt(this,-138,92,'● VOCÊ   ● SPOT',11,'#c8d0dc',true);
    this.mapHud.add([bg,title,mapBox,q1,q2,q3,q4,this.mmGoal,this.mmPlayer,legend]);this.ui.add(this.mapHud);
    this.updateMiniMap();
  }

  updateMiniMap(){
    if(!this.mmPlayer)return;
    const lx=-this.mmW/2,ty=12-this.mmH/2;
    const px=lx+(this.player.x/this.worldW)*this.mmW,py=ty+(this.player.y/this.worldH)*this.mmH;
    const gx=lx+(this.point.x/this.worldW)*this.mmW,gy=ty+(this.point.y/this.worldH)*this.mmH;
    this.mmPlayer.setPosition(px,py);this.mmGoal.setPosition(gx,gy);
  }

  createCollectibles(){
    this.collectibles=[];
    const addItem=(type,x,y,label,color,shape='can')=>{
      const c=this.add.container(x,y).setDepth(95);
      const glow=this.add.circle(0,0,37,color,.16).setStrokeStyle(4,color,.9);
      let icon;
      if(shape==='bucket'){
        icon=this.add.rectangle(0,3,31,38,color,1).setStrokeStyle(2,0xffffff,.8);
        c.add(this.add.rectangle(0,-19,20,8,0xffffff,.85));
      }else if(shape==='cap'){
        icon=this.add.ellipse(0,0,34,19,color,1).setStrokeStyle(2,0xffffff,.8);
        c.add(this.add.rectangle(0,-12,12,10,0xffffff,.7));
      }else if(shape==='glove'){
        icon=this.add.rectangle(0,0,26,38,color,1).setStrokeStyle(2,0xffffff,.8).setAngle(-12);
      }else{
        icon=this.add.rectangle(0,0,19,50,color,1).setStrokeStyle(2,0xffffff,.85);
        c.add(this.add.rectangle(0,-28,10,7,0xffffff,1));
      }
      const t=txt(this,0,52,label,10,Phaser.Display.Color.IntegerToColor(color).rgba,true).setOrigin(.5);
      c.add([glow,icon,t]);this.world.add(c);
      this.tweens.add({targets:c,y:'-=8',duration:760+Math.random()*220,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.collectibles.push({type,obj:c,x,y});
    };

    if(P.phase1Complete&&!P.bucketUnlocked)addItem('bucket',955,610,'BALDE',0xffd447,'bucket');
    if(P.phase1Complete&&!P.skinnyCapUnlocked)addItem('skinny',1170,760,'CAP FINO',0x19d7e7,'cap');

    if(P.phase2Complete&&!P.fatCapUnlocked)addItem('fat',GW+760,730,'CAP FAT',0xff5b35,'cap');
    if(P.phase2Complete&&!P.legendarySprays.includes('#8c63ff'))addItem('uv',GW+980,600,'UV LENDÁRIA',0x8c63ff,'can');

    if(P.phase3Complete&&!P.glovesUnlocked)addItem('gloves',GW+1180,GH+760,'LUVAS PRO',0xe7e7e7,'glove');
    if(P.phase3Complete&&!P.legendarySprays.includes('#39ff88'))addItem('acid',GW+1390,GH+690,'ACID LENDÁRIA',0x39ff88,'can');
  }

  checkCollectibles(){
    if(!this.collectibles?.length)return;
    for(const c of this.collectibles){
      if(!c.obj.active)continue;
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,c.x,c.y)<70){
        if(c.type==='bucket'){
          P.bucketUnlocked=true;
          this.showPickup('BALDE DE TINTA','Preenche rapidamente uma área conectada da missão.');
        }else if(c.type==='skinny'){
          P.skinnyCapUnlocked=true;
          this.showPickup('CAP FINO','Traços rápidos ficam mais precisos e gastam menos tinta.');
        }else if(c.type==='fat'){
          P.fatCapUnlocked=true;
          this.showPickup('CAP FAT','Traços lentos cobrem mais parede e engrossam mais.');
        }else if(c.type==='uv'){
          if(!P.legendarySprays.includes('#8c63ff'))P.legendarySprays.push('#8c63ff');
          this.showPickup('LATA LENDÁRIA: ULTRAVIOLETA','Cor exclusiva com brilho próprio.');
        }else if(c.type==='gloves'){
          P.glovesUnlocked=true;
          this.showPickup('LUVAS PRO','Demora mais para criar escorridos acidentais.');
        }else if(c.type==='acid'){
          if(!P.legendarySprays.includes('#39ff88'))P.legendarySprays.push('#39ff88');
          this.showPickup('LATA LENDÁRIA: ACID','Verde exclusivo com efeito de brilho.');
        }
        c.obj.destroy();SAVE.set(P);
      }
    }
  }

  showPickup(title,sub){
    AUDIO.select();
    const box=this.add.container(GW/2,-100).setDepth(30000);
    const bg=this.add.rectangle(0,0,610,96,0x090c12,.96).setStrokeStyle(3,0xffd447,.8);
    const t=txt(this,0,-18,title,20,'#ffd447',true).setOrigin(.5);
    const st=txt(this,0,18,sub,14,'#fff').setOrigin(.5);
    box.add([bg,t,st]);this.ui.add(box);
    this.tweens.add({targets:box,y:145,duration:380,ease:'Back.Out',hold:1800,yoyo:true,onComplete:()=>box.destroy()});
  }

  confirmRunReset(){
    if(this.resetOverlay?.active)return;
    this.resetOverlay=this.add.container(GW/2,GH/2).setDepth(40000);
    const shade=this.add.rectangle(0,0,GW,GH,0x000000,.72).setInteractive();
    const box=this.add.rectangle(0,0,590,270,0x0a0d13,.98).setStrokeStyle(3,0xffd447,.55);
    const title=txt(this,0,-88,'RESETAR A CAMPANHA?',26,'#ffd447',true).setOrigin(.5);
    const sub=txt(this,0,-40,'As 3 fases e os graffitis serão zerados.\nSeus itens, cores e máscaras desbloqueadas continuam.',16,'#d6dbe6').setOrigin(.5).setAlign('center');
    const yes=btn(this,-125,75,205,58,'RESETAR',0xff315a,'#fff',16);
    const no=btn(this,125,75,205,58,'CANCELAR',MID,'#fff',16);
    yes.on('pointerdown',()=>{
      P.phase1Complete=false;P.phase2Complete=false;P.phase3Complete=false;
      P.missionComplete=false;P.phase=1;
      P.phase1Art=null;P.phase2Art=null;P.phase3Art=null;
      P.lastScore=0;P.lastStars=0;
      SAVE.set(P);
      this.scene.restart();
    });
    no.on('pointerdown',()=>{this.resetOverlay.destroy();this.resetOverlay=null});
    this.resetOverlay.add([shade,box,title,sub,yes.bg,yes.tx,no.bg,no.tx]);
    this.ui.add(this.resetOverlay);
  }

  blocked(x,y){
    const r=17;
    return this.blockers.some(b=>
      Phaser.Geom.Rectangle.Contains(b,x-r,y-r)||
      Phaser.Geom.Rectangle.Contains(b,x+r,y-r)||
      Phaser.Geom.Rectangle.Contains(b,x-r,y+r)||
      Phaser.Geom.Rectangle.Contains(b,x+r,y+r)
    );
  }
  drawDebug(){
    this.dbg.clear();this.dbgText.setText(this.debug?'F2 • VERMELHO = OBJETO SÓLIDO':'F2 • MOSTRAR COLISÃO');
    if(!this.debug)return;
    this.dbg.lineStyle(3,0xff315a,.95);this.blockers.forEach(b=>this.dbg.strokeRectShape(b));
  }
  tryPaint(){
    const near=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.point.x,this.point.y)<135;
    const done=this.activePhase===1?P.phase1Complete:(this.activePhase===2?P.phase2Complete:P.phase3Complete);
    if(near&&!done){
      if(this.phase2&&this.stealthCaught>.35)return;
      AUDIO.select();this.scene.start('Paint',{phase:this.activePhase});
    }
  }
  updateMask(frameKey){
    if(!P.mask){this.maskOverlay.setVisible(false);return}
    this.maskOverlay.setVisible(true);
    this.maskOverlay.setTexture('maskframe_'+frameKey);
    this.maskOverlay.setTint(P.rareMaskEquipped?0xc56cff:0xffffff);
    this.maskOverlay.setPosition(this.player.x,this.player.y).setScale(this.player.scaleX,this.player.scaleY).setDepth(this.player.y+3);
  }
  update(time,delta){
    let dx=0,dy=0;
    if(this.keys.A.isDown||this.cursors.left.isDown)dx--;
    if(this.keys.D.isDown||this.cursors.right.isDown)dx++;
    if(this.keys.W.isDown||this.cursors.up.isDown)dy--;
    if(this.keys.S.isDown||this.cursors.down.isDown)dy++;
    if(this.joy){dx+=this.joy.x;dy+=this.joy.y}
    const moving=Math.abs(dx)+Math.abs(dy)>.05;
    if(moving){
      const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;const sp=this.speed*delta/1000;
      let nx=Phaser.Math.Clamp(this.player.x+dx*sp,55,this.worldW-55),ny=this.player.y;if(!this.blocked(nx,ny))this.player.x=nx;
      nx=this.player.x;ny=Phaser.Math.Clamp(this.player.y+dy*sp,110,this.worldH-35);if(!this.blocked(nx,ny))this.player.y=ny;
      const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'front':'back');this.last=dir;this.frame=(this.frame+delta*.008)%4;
      const fi=Math.floor(this.frame)+1;this.currentFrame='walk_'+dir+'_'+fi;this.player.setTexture('game_'+this.currentFrame);
      this.cameras.main.zoom=Phaser.Math.Linear(this.cameras.main.zoom,1.18,.085);
      if(time-this.lastStep>300){this.lastStep=time;AUDIO.stepFx()}
    }else{
      this.currentFrame='idle_'+this.last;this.player.setTexture('game_'+this.currentFrame);
      this.cameras.main.zoom=Phaser.Math.Linear(this.cameras.main.zoom,1.13,.065);
    }
    this.shadow.setPosition(this.player.x,this.player.y+3).setDepth(this.player.y-1);this.player.setDepth(this.player.y);this.updateMask(this.currentFrame||'idle_front');

    const near=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.point.x,this.point.y)<135;
    const done=this.activePhase===1?P.phase1Complete:(this.activePhase===2?P.phase2Complete:P.phase3Complete);
    this.e.setVisible(near&&!done);this.prompt.setVisible(near);
    if(near&&!this.nearLast)this.showObjective();
    if(!near&&this.nearLast)this.time.delayedCall(1200,()=>{if(!this.e.visible&&!this.prompt.visible)this.hideObjective()});
    this.nearLast=near;
    this.updateStealth(delta);
    this.checkCollectibles();
    this.updateMiniMap();
  }
}

// ---------- PAINT MISSION ----------
class Paint extends Phaser.Scene{
  constructor(){super('Paint')}
  init(data){this.phase=data?.phase||1;this.replay=!!data?.replay}
  create(){
    AUDIO.setScene('paint');
    addOrientationHint(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>AUDIO.stopTool());

    // neutral dark workshop/background
    this.add.rectangle(GW/2,GH/2,GW,GH,0x0b0d11,1);
    this.add.rectangle(GW/2,GH-80,GW,180,0x11151c,1);
    for(let x=0;x<GW;x+=110)this.add.rectangle(x,GH-138,1,110,0xffffff,.025).setOrigin(0);
    for(let y=120;y<GH-160;y+=90)this.add.rectangle(0,y,GW,1,0xffffff,.018).setOrigin(0);

    // title / TDG detail
    txt(this,40,28,'UNDER PRESSURE',27,'#fff',true);
    txt(this,40,60,'TDG CREW • MISSÃO DE GRAFFITI',14,'#ff2d78',true);
    this.add.image(1550,90,'monkey_sticker').setScale(.07).setAlpha(.45);

    // wall
    if(this.textures.exists('v9_surface'))this.textures.remove('v9_surface');
    if(this.textures.exists('v9_guide'))this.textures.remove('v9_guide');
    if(this.textures.exists('v9_wheel'))this.textures.remove('v9_wheel');

    this.surface=document.createElement('canvas');this.surface.width=1000;this.surface.height=650;this.pg=this.surface.getContext('2d');
    this.drawWall();this.tex=this.textures.addCanvas('v9_surface',this.surface);
    this.wall=this.add.image(1115,500,'v9_surface').setDisplaySize(910,590).setDepth(10);
    this.wallBorder=this.add.rectangle(1115,500,918,598,0x000000,0).setStrokeStyle(3,0xffffff,.08).setDepth(9);

    this.guideCanvas=document.createElement('canvas');this.guideCanvas.width=1000;this.guideCanvas.height=650;this.gg=this.guideCanvas.getContext('2d');
    this.guideTex=this.textures.addCanvas('v9_guide',this.guideCanvas);
    this.guideImg=this.add.image(1115,500,'v9_guide').setDisplaySize(910,590).setDepth(11).setAlpha(.22);
    this.buildStageMasks();

    // character: one art asset, two meaningful poses
    this.painter=this.add.image(410,715,'painter_idle_live').setOrigin(.5,1).setScale(2.18).setDepth(20);
    this.painterMask=this.add.image(444,325,'mask_right').setScale(.028).setDepth(24).setVisible(P.mask).setTint(P.rareMaskEquipped?0xc56cff:0xffffff);
    this.paintActive=false;
    this.recoilTween=null;

    // dynamic spray mist
    this.sprayFx=this.add.graphics().setDepth(22);

    // police spotlight cone: start far away so it does not instantly punish
    this.lightX=1480;this.lightDir=-1;
    this.lightSpeed=[78,102,132][this.phase-1];
    this.cone=this.add.graphics().setDepth(18);
    this.policeWarn=txt(this,1115,157,'',19,'#ff547e',true).setOrigin(.5).setDepth(60).setAlpha(0);
    this.lastWhistle=0;

    // controls panel
    panel(this,165,535,300,690,.97);
    txt(this,38,205,'COR DA TINTA',18,'#ffd447',true);
    this.color=P.spray;this.makeColorWheel();
    this.blackSwatch=this.add.circle(300,285,18,0x050505,1).setStrokeStyle(3,0xffffff,.65).setInteractive({useHandCursor:true});
    this.whiteSwatch=this.add.circle(300,330,18,0xffffff,1).setStrokeStyle(3,0x777777,.9).setInteractive({useHandCursor:true});
    txt(this,326,277,'PRETO',11,'#c8d0dc',true);
    txt(this,326,322,'BRANCO',11,'#c8d0dc',true);
    this.blackSwatch.on('pointerdown',()=>{this.color='#050505';this.swatch.setFillStyle(0x050505);AUDIO.select()});
    this.whiteSwatch.on('pointerdown',()=>{this.color='#ffffff';this.swatch.setFillStyle(0xffffff);AUDIO.select()});
    if(P.legendarySprays?.length){
      txt(this,280,375,'LENDÁRIAS',11,'#ffd447',true);
      P.legendarySprays.forEach((c,i)=>{
        const q=this.add.circle(300+i*48,415,17,hexNum(c),1).setStrokeStyle(3,0xffd447,.9).setInteractive({useHandCursor:true});
        q.on('pointerdown',()=>{this.color=c;this.swatch.setFillStyle(hexNum(c));AUDIO.select()});
      });
    }
    this.neonColors=['#00f7ff','#ff00e6','#7cff00','#ff6b00'];
    if(P.neonUnlocked){
      txt(this,38,408,'NEON RARO',10,'#ffffff',true);
      this.neonColors.forEach((c,i)=>{
        const q=this.add.circle(78+i*49,418,15,hexNum(c),1).setStrokeStyle(3,0xffffff,.95).setInteractive({useHandCursor:true});
        q.on('pointerdown',()=>{this.color=c;this.swatch.setFillStyle(hexNum(c));AUDIO.select()});
      });
    }
    this.neonScreenFx=this.add.rectangle(GW/2,GH/2,GW-16,GH-16,0x000000,0).setStrokeStyle(7,0x00f7ff,0).setDepth(80);

    txt(this,38,445,'FERRAMENTA',18,'#ffd447',true);this.brush='spray';this.toolButtons=[];
    [['spray','SPRAY'],['marker','MARKER'],['drip','DRIP']].forEach((o,i)=>{
      const B=btn(this,75+i*92,516,82,IS_TOUCH?86:70,o[1],i===0?YELLOW:MID,i===0?'#111':'#fff',IS_TOUCH?13:11);
      B.on('pointerdown',()=>{this.brush=o[0];AUDIO.select();this.toolButtons.forEach(q=>{const on=q.key===o[0];q.B.bg.setFillStyle(on?YELLOW:MID);q.B.tx.setColor(on?'#111':'#fff')})});
      this.toolButtons.push({key:o[0],B});
    });
    if(P.bucketUnlocked){
      const B=btn(this,165,575,178,48,'BALDE',0x42546d,'#fff',13);
      B.on('pointerdown',()=>{this.brush='bucket';AUDIO.select();this.toolButtons.forEach(q=>{q.B.bg.setFillStyle(MID);q.B.tx.setColor('#fff')})});
      txt(this,165,603,'preenche uma área do estágio',10,'#9fa9ba').setOrigin(.5);
    }

    txt(this,38,600,'TAMANHO',18,'#ffd447',true);this.size=18;this.sizeButtons=[];
    [10,18,30].forEach((n,i)=>{
      const B=btn(this,75+i*92,665,74,IS_TOUCH?66:52,String(n),n===18?YELLOW:MID,n===18?'#111':'#fff',IS_TOUCH?18:15);
      B.on('pointerdown',()=>{this.size=n;AUDIO.select();this.sizeButtons.forEach(q=>{const on=q.n===n;q.B.bg.setFillStyle(on?YELLOW:MID);q.B.tx.setColor(on?'#111':'#fff')})});
      this.sizeButtons.push({n,B});
    });

    this.shakeBtn=btn(this,165,765,235,IS_TOUCH?72:56,IS_TOUCH?'CHACOALHAR':'CHACOALHAR [ESPAÇO]',0x222a39,'#fff',IS_TOUCH?16:13);
    this.shakeBtn.on('pointerdown',()=>this.shakeCan());
    if(IS_TOUCH)txt(this,165,815,'SEGURE O DEDO NA PAREDE PARA PINTAR',12,'#9fa9ba',true).setOrigin(.5);

    // HUD top
    this.add.rectangle(500,62,325,68,0x090c12,.9);txt(this,365,37,'TINTA',15,'#fff',true);this.ink=100;
    this.inkFill=this.add.rectangle(430,78,185,14,CYAN).setOrigin(0,.5);

    this.add.rectangle(835,62,305,68,0x090c12,.9);txt(this,706,37,'POLÍCIA',15,'#fff',true);this.police=0;
    this.policeFill=this.add.rectangle(774,78,170,14,PINK).setOrigin(0,.5);

    this.add.rectangle(1170,62,315,68,0x090c12,.9);txt(this,1045,37,'TEMPO',15,'#fff',true);
    this.timeLeft=[82,68,56][this.phase-1];
    this.timeText=txt(this,1170,76,this.timeLeft.toFixed(1)+'s',20,'#ffd447',true).setOrigin(.5);

    this.add.rectangle(1500,62,310,68,0x090c12,.9);txt(this,1378,37,'MISSÃO',15,'#fff',true);
    this.stageText=txt(this,1500,76,'PREENCHIMENTO',16,'#fff',true).setOrigin(.5);

    this.stageBarBg=this.add.rectangle(1115,824,520,16,0x202634,1);
    this.stageBar=this.add.rectangle(855,824,0,16,YELLOW,1).setOrigin(0,.5);
    this.stagePct=txt(this,1390,812,'0%',16,'#fff',true);

    const backMap=btn(this,845,875,180,IS_TOUCH?62:46,'← MAPA',0x202838,'#fff',IS_TOUCH?18:14);
    backMap.on('pointerdown',()=>{AUDIO.stopTool();this.scene.start('Map')});
    const undo=btn(this,1040,875,160,IS_TOUCH?62:46,'DESFAZER',MID,'#fff',IS_TOUCH?17:14);undo.on('pointerdown',()=>this.undo());
    const restart=btn(this,1225,875,180,IS_TOUCH?62:46,'RECOMEÇAR',MID,'#fff',IS_TOUCH?17:14);restart.on('pointerdown',()=>this.restartMission());
    this.finishBtn=btn(this,1475,875,245,IS_TOUCH?62:46,'FINALIZAR BÔNUS',YELLOW,'#111',IS_TOUCH?16:14);
    this.finishBtn.bg.setVisible(false);this.finishBtn.tx.setVisible(false);this.finishBtn.on('pointerdown',()=>this.completeMission());

    // state
    this.stageIndex=0;
    this.stages=[
      {name:'PREENCHIMENTO',threshold:.38},
      {name:'SOMBRA',threshold:.18},
      {name:'LUZ',threshold:.055},
      {name:'OUTLINE / DESENHO',threshold:.10}
    ];
    this.stageGrid=new Uint8Array(100*65);this.stageCovered=0;this.stageTargetCount=1;
    this.colorsUsed=[];this.dripPenalty=0;this.drips=[];this.history=[];
    this.down=false;this.last=null;this.current=null;this.stillAnchor=null;this.stillTime=0;this.lastDripAt=0;this.pointerSpeed=0;this.lastPointerStamp=0;this.pressureScale=1;
    this.failed=false;this.completed=false;this.shaking=false;this.shakeCooldown=0;this.bonusTime=10;
    this.setStage(0);

    this.input.on('pointerdown',p=>{
      if(this.failed||this.completed||this.shaking||this.ink<=0)return;
      const q=this.toPaint(p);if(!q)return;
      this.snapshot();this.trackColor(this.color);
      if(this.brush==='bucket'){this.bucketFill(q.x,q.y);return}
      this.down=true;this.last=q;this.current=q;this.stillAnchor={...q};this.stillTime=0;this.pointerSpeed=0;this.lastPointerStamp=performance.now();
      this.startPaintAnim();AUDIO.startTool(this.brush);this.paintAt(q.x,q.y);
    });
    this.input.on('pointermove',p=>{
      if(!this.down||this.failed||this.shaking)return;
      const q=this.toPaint(p);if(!q)return;
      const now=performance.now(),dtp=Math.max(1,now-this.lastPointerStamp);
      const moveDist=this.current?Math.hypot(q.x-this.current.x,q.y-this.current.y):0;
      this.pointerSpeed=(moveDist/dtp)*1000;this.lastPointerStamp=now;this.current=q;
      if(!this.stillAnchor||Math.hypot(q.x-this.stillAnchor.x,q.y-this.stillAnchor.y)>6){this.stillAnchor={...q};this.stillTime=0;}
      this.stroke(q);
    });
    const stop=()=>{this.down=false;this.last=null;this.stillTime=0;this.stopPaintAnim();AUDIO.stopTool()};
    this.input.on('pointerup',stop);this.input.on('pointercancel',stop);
    this.input.keyboard.on('keydown-SPACE',()=>this.shakeCan());
    this.input.keyboard.on('keydown-ENTER',()=>{if(this.stageIndex===3&&!this.failed)this.completeMission()});
    this.input.keyboard.on('keydown-ESC',()=>{AUDIO.stopTool();this.scene.start('Map')});
  }

  drawWall(){this.pg.clearRect(0,0,1000,650);this.pg.drawImage(this.textures.get('brick').getSourceImage(),0,0,1000,650)}
  makeColorWheel(){
    const c=document.createElement('canvas');c.width=220;c.height=220;const x=c.getContext('2d'),cx=110,cy=110;
    for(let a=0;a<360;a++){x.beginPath();x.strokeStyle='hsl('+a+',100%,50%)';x.lineWidth=28;x.arc(cx,cy,86,(a-1)*Math.PI/180,(a+1)*Math.PI/180);x.stroke()}
    const gr=x.createRadialGradient(cx,cy,0,cx,cy,65);gr.addColorStop(0,'#242932');gr.addColorStop(1,'#050609');x.fillStyle=gr;x.beginPath();x.arc(cx,cy,66,0,Math.PI*2);x.fill();
    this.textures.addCanvas('v9_wheel',c);this.wheel=this.add.image(165,335,'v9_wheel').setDisplaySize(210,210).setInteractive({useHandCursor:true});
    this.cursor=this.add.circle(251,335,8,0xffffff,1).setStrokeStyle(3,0x111111);this.swatch=this.add.circle(282,335,22,hexNum(this.color),1).setStrokeStyle(3,0xffffff,.7);
    const pick=p=>{const pt=this.cameras.main.getWorldPoint(p.x,p.y),dx=pt.x-165,dy=pt.y-335,l=Math.hypot(dx,dy);if(l<48||l>112)return;const ang=(Math.atan2(dy,dx)*180/Math.PI+360)%360;this.color=this.hsl(ang,100,50);this.cursor.setPosition(165+Math.cos(ang*Math.PI/180)*86,335+Math.sin(ang*Math.PI/180)*86);this.swatch.setFillStyle(hexNum(this.color))};
    this.wheel.on('pointerdown',pick);this.wheel.on('pointermove',p=>{if(p.isDown)pick(p)});
  }
  hsl(h,s,l){s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return '#'+[r,g,b].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('')}

  buildStageMasks(){
    const make=fn=>{const c=document.createElement('canvas');c.width=1000;c.height=650;const x=c.getContext('2d');fn(x);return x.getImageData(0,0,1000,650).data};
    let sz=260,test=document.createElement('canvas').getContext('2d');
    do{test.font='900 '+sz+'px Impact,Arial Black';sz-=8}while(test.measureText(P.tag).width>760);
    const font='900 '+sz+'px Impact,Arial Black';
    this.fillMask=make(x=>{x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=font;x.fillText(P.tag,515,330)});
    this.shadowMask=make(x=>{x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=font;x.fillText(P.tag,540,355);x.globalCompositeOperation='destination-out';x.fillText(P.tag,515,330)});
    this.lightMask=make(x=>{
      x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=font;x.fillText(P.tag,515,330);
      x.globalCompositeOperation='destination-in';
      x.beginPath();x.moveTo(120,155);x.lineTo(890,155);x.lineTo(760,335);x.lineTo(250,315);x.closePath();x.fill();
    });
    this.outlineMask=make(x=>{x.strokeStyle='#fff';x.lineWidth=24;x.lineJoin='round';x.textAlign='center';x.textBaseline='middle';x.font=font;x.strokeText(P.tag,515,330);x.globalCompositeOperation='destination-out';x.fillStyle='#fff';x.fillText(P.tag,515,330)});
  }
  setStage(index){
    this.stageIndex=index;this.stageGrid.fill(0);this.stageCovered=0;this.stageText.setText(this.stages[index].name);
    this.stageMask=[this.fillMask,this.shadowMask,this.lightMask,this.outlineMask][index];this.stageTargetCount=0;
    for(let gy=0;gy<65;gy++)for(let gx=0;gx<100;gx++){const si=((gy*10+5)*1000+(gx*10+5))*4+3;if(this.stageMask[si]>80)this.stageTargetCount++}
    this.renderGuide();const bonus=index===3;this.finishBtn.bg.setVisible(bonus);this.finishBtn.tx.setVisible(bonus);if(bonus)this.bonusTime=10;
  }
  renderGuide(){
    this.gg.clearRect(0,0,1000,650);const img=this.gg.createImageData(1000,650),d=img.data,colors=[[255,255,255,42],[25,215,231,55],[255,212,71,60],[255,45,120,64]],c=colors[this.stageIndex];
    for(let i=0;i<this.stageMask.length;i+=4)if(this.stageMask[i+3]>80){d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=c[3]}
    this.gg.putImageData(img,0,0);this.guideTex.refresh();
  }
  trackColor(c){if(!this.colorsUsed.some(k=>colorDistance(k,c)<45))this.colorsUsed.push(c)}
  markCoverage(x,y,r=12){
    const minx=Math.max(0,Math.floor((x-r)/10)),maxx=Math.min(99,Math.floor((x+r)/10));
    const miny=Math.max(0,Math.floor((y-r)/10)),maxy=Math.min(64,Math.floor((y+r)/10));
    for(let gy=miny;gy<=maxy;gy++)for(let gx=minx;gx<=maxx;gx++){
      const cx=gx*10+5,cy=gy*10+5;if(Math.hypot(cx-x,cy-y)>r+7)continue;
      const k=gy*100+gx,si=(cy*1000+cx)*4+3;
      if(this.stageMask[si]>80&&!this.stageGrid[k]){this.stageGrid[k]=1;this.stageCovered++}
    }
  }
  stageProgress(){return this.stageTargetCount?this.stageCovered/this.stageTargetCount:0}
  checkStage(){
    if(this.stageProgress()>=this.stages[this.stageIndex].threshold&&this.stageIndex<3){AUDIO.select();this.setStage(this.stageIndex+1)}
  }
  paintAt(x,y){
    if(this.ink<=0||this.shaking)return;
    const g=this.pg,c=this.color;
    const skinny=P.skinnyCapUnlocked?.88:1;
    const fat=P.fatCapUnlocked?(1+Math.min(.28,this.stillTime*.18)):1;
    const speedThin=Phaser.Math.Clamp(1.12-(this.pointerSpeed/900),P.skinnyCapUnlocked?.42:.52,1.12);
    const holdGrow=1+Math.min(P.fatCapUnlocked?1.15:.9,this.stillTime*(P.fatCapUnlocked?.62:.48));
    const special=P.specialSprayUnlocked&&this.brush==='spray'?1.28:1;
    const s=this.size*speedThin*holdGrow*special*skinny*fat;
    const neon=this.neonColors?.includes(c);
    if(neon){
      g.save();g.globalCompositeOperation='screen';g.shadowColor=c;g.shadowBlur=22;g.fillStyle=c;g.globalAlpha=.16;
      g.beginPath();g.arc(x,y,s*1.65,0,Math.PI*2);g.fill();g.restore();
    }
    if(this.brush==='marker'){g.fillStyle=c;g.globalAlpha=.92;g.beginPath();g.arc(x,y,s*.58,0,Math.PI*2);g.fill();g.globalAlpha=1}
    else{
      const n=IS_TOUCH?(this.brush==='drip'?8:Math.max(8,Math.floor(s*.7))):(this.brush==='drip'?20:Math.max(24,s*2));
      for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=Math.pow(Math.random(),1.55)*s*1.65,rr=.8+Math.random()*2.5;g.fillStyle=c;g.globalAlpha=.12+Math.random()*.36;g.beginPath();g.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,rr,0,Math.PI*2);g.fill()}
      g.globalAlpha=1;
    }
    this.markCoverage(x,y,Math.max(10,s*.78));this.checkStage();this.tex.refresh();
  }
  stroke(q){
    const d=Math.hypot(q.x-this.last.x,q.y-this.last.y),steps=Math.max(1,Math.ceil(d/(IS_TOUCH?7:3)));
    for(let i=1;i<=steps;i++){const t=i/steps;this.paintAt(this.last.x+(q.x-this.last.x)*t,this.last.y+(q.y-this.last.y)*t)}
    this.last=q;
  }
  bucketFill(x,y){
    // Photoshop/Paint-like shortcut adapted to the mission mask:
    // fills the connected target area around the clicked cell.
    const gx=Math.floor(x/10),gy=Math.floor(y/10);
    if(gx<0||gy<0||gx>=100||gy>=65)return;
    const start=gy*100+gx;
    const isTarget=(cx,cy)=>{
      if(cx<0||cy<0||cx>=100||cy>=65)return false;
      const si=((cy*10+5)*1000+(cx*10+5))*4+3;
      return this.stageMask[si]>80;
    };
    if(!isTarget(gx,gy))return;
    const q=[[gx,gy]],seen=new Uint8Array(6500),g=this.pg;
    g.fillStyle=this.color;g.globalAlpha=.86;
    let filled=0;
    while(q.length&&filled<1400){
      const [cx,cy]=q.shift(),k=cy*100+cx;
      if(seen[k]||!isTarget(cx,cy))continue;
      seen[k]=1;filled++;
      g.fillRect(cx*10,cy*10,11,11);
      if(!this.stageGrid[k]){this.stageGrid[k]=1;this.stageCovered++}
      q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
    g.globalAlpha=1;
    this.ink=Math.max(0,this.ink-22);
    this.trackColor(this.color);this.tex.refresh();this.checkStage();AUDIO.select();
  }

  spawnDrip(){
    if(!this.current)return;
    const extra=this.brush==='drip'?70:this.brush==='marker'?18:34;
    const target=24+Math.random()*38+extra;
    const width=this.brush==='drip'?4.4:this.brush==='marker'?2.1:3.1;
    if(IS_TOUCH&&this.drips.length>18)this.drips.shift();this.drips.push({x:this.current.x+(Math.random()-.5)*8,y:this.current.y+2,len:0,target,speed:58+Math.random()*38,w:width,c:this.color});
    this.dripPenalty+=this.brush==='drip'?9:this.brush==='marker'?6:12;
    AUDIO.dripFx();
  }

  startPaintAnim(){
    if(this.paintActive||this.shaking)return;this.paintActive=true;
    this.painter.setTexture('painter_spray_live').setScale(1.58).setPosition(455,660).setAngle(0);
    if(P.mask)this.painterMask.setTexture('mask_right').setScale(.026).setPosition(387,497).setTint(P.rareMaskEquipped?0xc56cff:0xffffff).setVisible(true);
    this.recoilTween=this.tweens.add({targets:this.painter,x:'+=5',angle:{from:-.45,to:.75},duration:135,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  }
  stopPaintAnim(){
    this.paintActive=false;if(this.recoilTween){this.recoilTween.stop();this.recoilTween=null}
    this.tweens.killTweensOf(this.painter);
    this.painter.setTexture('painter_idle_live').setScale(2.18).setPosition(410,715).setAngle(0);
    if(P.mask)this.painterMask.setTexture('mask_right').setScale(.028).setPosition(444,325).setTint(P.rareMaskEquipped?0xc56cff:0xffffff).setVisible(true);
    else this.painterMask.setVisible(false);
    this.sprayFx.clear();
  }
  drawSprayFx(){
    this.sprayFx.clear();if(!this.paintActive||!this.current)return;
    const col=hexNum(this.color);this.sprayFx.fillStyle(col,.12);
    for(let i=0;i<28;i++){const x=620+Math.random()*85,y=448+(Math.random()-.5)*75,r=1+Math.random()*3;this.sprayFx.fillCircle(x,y,r)}
  }

  drawPoliceCone(){
    this.cone.clear();
    this.cone.fillStyle(0xfff0b0,.055);this.cone.beginPath();this.cone.moveTo(this.lightX,105);this.cone.lineTo(this.lightX-125,765);this.cone.lineTo(this.lightX+125,765);this.cone.closePath();this.cone.fillPath();
    this.cone.fillStyle(0xffffff,.038);this.cone.beginPath();this.cone.moveTo(this.lightX,120);this.cone.lineTo(this.lightX-56,765);this.cone.lineTo(this.lightX+56,765);this.cone.closePath();this.cone.fillPath();
    this.cone.fillStyle(0xffe698,.07);this.cone.fillEllipse(this.lightX,765,245,42);
  }
  policeHitsPaintPoint(){
    if(!this.down||!this.current)return false;
    const b=this.wall.getBounds();
    const px=b.x+(this.current.x/1000)*b.width;
    const py=b.y+(this.current.y/650)*b.height;
    const top=105,bottom=765;
    const t=Phaser.Math.Clamp((py-top)/(bottom-top),0,1);
    const half=125*t;
    return Math.abs(this.lightX-px)<half;
  }

  shakeCan(){
    if(this.failed||this.completed||this.shaking||this.shakeCooldown>0)return;
    this.down=false;AUDIO.stopTool();this.stopPaintAnim();this.shaking=true;this.shakeCooldown=1.1;AUDIO.shake();
    this.shakeBtn.bg.setFillStyle(YELLOW);this.shakeBtn.tx.setColor('#111').setText('CHACOALHANDO...');
    this.tweens.add({targets:this.painter,x:'+=9',angle:{from:-4,to:4},duration:70,yoyo:true,repeat:5,ease:'Sine.easeInOut'});
    this.time.delayedCall(650,()=>{this.ink=Math.min(100,this.ink+50);this.shaking=false;this.shakeBtn.bg.setFillStyle(0x222a39);this.shakeBtn.tx.setColor('#fff').setText('CHACOALHAR [ESPAÇO]');this.tweens.killTweensOf(this.painter);this.painter.setPosition(410,715).setAngle(0)});
  }

  toPaint(p){const b=this.wall.getBounds();if(!b.contains(p.x,p.y))return null;return{x:(p.x-b.x)/b.width*1000,y:(p.y-b.y)/b.height*650}}
  snapshot(){this.history.push(this.pg.getImageData(0,0,1000,650));if(this.history.length>12)this.history.shift()}
  undo(){const im=this.history.pop();if(im){this.pg.putImageData(im,0,0);this.tex.refresh();AUDIO.click()}}
  restartMission(){AUDIO.stopTool();this.scene.restart({phase:this.phase})}
  failMission(reason){
    if(this.failed||this.completed)return;this.failed=true;this.down=false;AUDIO.stopTool();this.stopPaintAnim();AUDIO.siren();
    this.add.rectangle(GW/2,GH/2,GW,GH,0x000000,.72).setDepth(1000);
    panel(this,GW/2,GH/2,610,330,.98,reason==='PEGARAM VOCÊ!'?0xff2d78:0xffd447).setDepth(1001);
    txt(this,GW/2,385,reason,50,reason==='PEGARAM VOCÊ!'?'#ff2d78':'#ffd447',true).setOrigin(.5).setDepth(1002);
    txt(this,GW/2,453,reason==='PEGARAM VOCÊ!'?'A polícia te pegou. Tenta outra vez.':'O tempo acabou antes do graffiti ficar pronto.',20,'#fff').setOrigin(.5).setDepth(1002);
    const b=btn(this,GW/2,555,260,62,'TENTAR DE NOVO',YELLOW,'#111',20);b.bg.setDepth(1003);b.tx.setDepth(1004);b.on('pointerdown',()=>this.restartMission());
  }
  captureArtwork(){
    const c=document.createElement('canvas');c.width=620;c.height=403;
    const x=c.getContext('2d');x.drawImage(this.surface,0,0,c.width,c.height);
    try{return c.toDataURL('image/webp',.76)}catch(e){return c.toDataURL('image/jpeg',.72)}
  }

  completeMission(){
    if(this.completed||this.failed)return;this.completed=true;this.down=false;AUDIO.stopTool();this.stopPaintAnim();
    const speed=Math.round(this.timeLeft*13),colors=this.colorsUsed.length,paletteBonus=colors<=3?650:Math.max(-500,250-(colors-3)*180),outlineBonus=Math.round(Math.min(1,this.stageProgress())*720),policeBonus=Math.round((100-this.police)*3.2),dripPenalty=Math.round(this.dripPenalty);
    const score=Math.max(0,1500+speed+paletteBonus+outlineBonus+policeBonus-dripPenalty),stars=score>=3400?3:score>=2450?2:1;
    const captured=this.captureArtwork();
    if(this.phase===1){
      P.phase1Complete=true;P.phase1Art=captured;
      if(!this.replay){P.phase=2;P.missionComplete=false}
    }else if(this.phase===2){
      P.phase2Complete=true;P.phase2Art=captured;
      if(!this.replay){P.phase=3;P.missionComplete=false}
    }else{
      P.phase3Complete=true;P.phase3Art=captured;
      P.rareMaskUnlocked=true;P.campaignComplete=true;P.missionComplete=true;
      if(!this.replay)P.phase=3;
    }
    P.lastScore=score;P.lastStars=stars;P.finalColors=(this.colorsUsed.length?this.colorsUsed:[P.spray,'#19d7e7','#ffd447']).slice(0,3);while(P.finalColors.length<3)P.finalColors.push(['#ff2d78','#19d7e7','#ffd447'][P.finalColors.length]);SAVE.set(P);
    this.add.rectangle(GW/2,GH/2,GW,GH,0x000000,.72).setDepth(1000);panel(this,GW/2,GH/2,760,500,.98,0xffd447).setDepth(1001);
    txt(this,GW/2,285,`FASE ${this.phase} CONCLUÍDA!`,48,'#ffd447',true).setOrigin(.5).setDepth(1002);txt(this,GW/2,350,'★'.repeat(stars)+'☆'.repeat(3-stars),50,'#ffd447',true).setOrigin(.5).setDepth(1002);txt(this,GW/2,410,`ESTILO: ${score} PONTOS`,27,'#fff',true).setOrigin(.5).setDepth(1002);
    [`Tempo: +${speed}`,`Paleta (${colors||1} cor${colors===1?'':'es'}): ${paletteBonus>=0?'+':''}${paletteBonus}`,`Outline/desenho: +${outlineBonus}`,`Risco polícia: +${policeBonus}`,`Escorridos: -${dripPenalty}`].forEach((t,i)=>txt(this,GW/2,465+i*28,t,17,i===4?'#ff7b9c':'#c8d0dc').setOrigin(.5).setDepth(1002));
    const reward=this.phase===1?'NOVOS ITENS NO MAPA: BALDE + CAP FINO':(this.phase===2?'NOVOS ITENS: CAP FAT + ULTRAVIOLETA':'RECOMPENSA: MÁSCARA MACACO RARA + ACID + LUVAS');
    txt(this,GW/2,620,reward,15,'#ffd447',true).setOrigin(.5).setDepth(1002);
    if(this.phase===3){
      txt(this,GW/2,646,'EQUIPE A MÁSCARA RARA E REJOGUE PARA LIBERAR AS CORES NEON',12,'#d6a8ff',true).setOrigin(.5).setDepth(1002);
    }
    const replay=btn(this,GW/2-175,680,300,62,'REJOGAR FASE',0x26324a,'#fff',18);
    replay.bg.setDepth(1003);replay.tx.setDepth(1004);
    replay.on('pointerdown',()=>this.scene.restart({phase:this.phase,replay:true}));
    const b=btn(this,GW/2+175,680,300,62,'VOLTAR AO MAPA',YELLOW,'#111',18);
    b.bg.setDepth(1003);b.tx.setDepth(1004);b.on('pointerdown',()=>this.scene.start('Map'));
  }

  update(_,delta){
    if(this.failed||this.completed)return;
    const dt=delta/1000,now=performance.now();
    this.timeLeft=Math.max(0,this.timeLeft-dt);this.timeText.setText(this.timeLeft.toFixed(1)+'s');if(this.timeLeft<=0){this.failMission('TEMPO ESGOTADO');return}
    this.shakeCooldown=Math.max(0,this.shakeCooldown-dt);

    this.lightX+=this.lightDir*this.lightSpeed*dt;if(this.lightX<325){this.lightX=325;this.lightDir=1}if(this.lightX>1510){this.lightX=1510;this.lightDir=-1}
    this.drawPoliceCone();
    const caught=this.policeHitsPaintPoint();
    if(caught)this.police=Math.min(100,this.police+[27,35,44][this.phase-1]*dt);else this.police=Math.max(0,this.police-[7,6,5][this.phase-1]*dt);

    if(this.police>72){
      this.policeWarn.setText(this.police>88?'POLÍCIA MUITO PERTO!':'CUIDADO COM A LUZ!').setAlpha((Math.sin(now/130)+1)/2*.8+.2);
      if(now-this.lastWhistle>(this.police>88?1100:2200)){this.lastWhistle=now;AUDIO.whistle()}
      this.policeFill.setFillStyle(0xff224f);
    }else{
      this.policeWarn.setAlpha(0);this.policeFill.setFillStyle(PINK);
    }
    if(this.police>=100){this.failMission('PEGARAM VOCÊ!');return}

    if(this.down&&!this.shaking&&this.ink>0){
      let drain=(this.brush==='marker'?7:this.brush==='drip'?17:(P.specialSprayUnlocked?10:14));
      if(P.skinnyCapUnlocked&&this.pointerSpeed>420)drain*=.84;
      if(P.fatCapUnlocked&&this.pointerSpeed<180)drain*=1.10;
      this.ink=Math.max(0,this.ink-drain*dt);

      if(this.current&&this.stillAnchor){
        const dist=Math.hypot(this.current.x-this.stillAnchor.x,this.current.y-this.stillAnchor.y);
        if(dist<=6)this.stillTime+=dt;
        else{this.stillAnchor={...this.current};this.stillTime=0}
      }

      const gloveBonus=P.glovesUnlocked?.28:0;
      const delay=(this.brush==='drip'?.22:this.brush==='marker'?1.05:.62)+gloveBonus;
      const cadence=this.brush==='drip'?145:this.brush==='marker'?320:245;
      if(this.stillTime>delay&&now-this.lastDripAt>cadence){
        this.lastDripAt=now;this.spawnDrip();
      }
      this.drawSprayFx();
    }else{
      this.stillTime=0;this.sprayFx.clear();
    }
    if(this.ink<=0&&this.down){this.down=false;AUDIO.stopTool();this.stopPaintAnim()}

    let changed=false;
    for(const d of this.drips){
      if(d.len<d.target){
        const old=d.len;d.len=Math.min(d.target,d.len+d.speed*dt);this.pg.strokeStyle=d.c;this.pg.globalAlpha=.68;this.pg.lineWidth=d.w;this.pg.lineCap='round';this.pg.beginPath();this.pg.moveTo(d.x,d.y+old);this.pg.lineTo(d.x+(Math.random()-.5)*1.3,d.y+d.len);this.pg.stroke();this.pg.globalAlpha=1;this.dripPenalty+=.06*(d.len-old);changed=true;
      }
    }
    if(changed)this.tex.refresh();

    if(this.stageIndex===3){this.bonusTime=Math.max(0,this.bonusTime-dt);this.finishBtn.tx.setText(`FINALIZAR BÔNUS ${this.bonusTime.toFixed(0)}s`);if(this.bonusTime<=0)this.completeMission()}

    const neonOn=this.neonColors?.includes(this.color)&&this.down;
    if(this.neonScreenFx){
      const col=hexNum(this.color||'#00f7ff');
      this.neonScreenFx.setStrokeStyle(7,col,neonOn?(.20+.16*(Math.sin(now/110)+1)/2):0);
    }
    const sp=this.stageProgress();this.stageBar.width=520*Math.min(1,sp/this.stages[this.stageIndex].threshold);this.stagePct.setText(Math.round(Math.min(1,sp/this.stages[this.stageIndex].threshold)*100)+'%');
    this.inkFill.width=185*this.ink/100;this.policeFill.width=170*this.police/100;
    if(!P.mask)this.painterMask.setVisible(false);
  }
}

const config={
  type:Phaser.AUTO,parent:'game',width:GW,height:GH,backgroundColor:'#05070a',
  dom:{createContainer:true},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:GW,height:GH},
  render:{antialias:true,pixelArt:false,roundPixels:false},
  scene:[Boot,Menu,Custom,MapScene,Paint]
};
new Phaser.Game(config);
