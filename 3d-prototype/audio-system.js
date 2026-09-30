(()=>{
  let ctx=null,musicGain=null,sfxGain=null,master=null;
  let running=false,timer=null,step=0;
  const state={music:.55,sfx:.75};

  function ensure(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    ctx=new AC();
    master=ctx.createGain();master.gain.value=.75;master.connect(ctx.destination);
    musicGain=ctx.createGain();musicGain.gain.value=state.music*.42;musicGain.connect(master);
    sfxGain=ctx.createGain();sfxGain.gain.value=state.sfx*.72;sfxGain.connect(master);
    return ctx;
  }
  function osc(type,freq,dur,vol=.2,dest=null,when=0){
    if(!ensure())return;
    const t=ctx.currentTime+when;
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(dest||sfxGain);o.start(t);o.stop(t+dur+.02);
  }
  function noise(dur=.08,vol=.12,dest=null,when=0,highpass=120){
    if(!ensure())return;
    const len=Math.max(1,Math.floor(ctx.sampleRate*dur));
    const b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=b;filter.type='highpass';filter.frequency.value=highpass;
    const t=ctx.currentTime+when;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(filter);filter.connect(g);g.connect(dest||sfxGain);src.start(t);
  }

  // Original instrumental loop: boom-bap / Brazilian street-rap mood, no sampled copyrighted music.
  function beatStep(){
    if(!running||!ctx)return;
    const beat=.125; // 120 BPM, 16th notes
    const now=ctx.currentTime+.04;
    const s=step%16;
    if(s===0||s===8){
      osc('sine',58,.18,.33,musicGain,.04);
      osc('sine',42,.22,.16,musicGain,.04);
    }
    if(s===4||s===12){
      noise(.12,.16,musicGain,.04,800);
      osc('triangle',180,.07,.08,musicGain,.04);
    }
    if(s%2===0) noise(.035,.038,musicGain,.04,5200);
    if([0,3,6,8,11,14].includes(s)){
      const notes=[110,130.81,146.83,98];
      osc('triangle',notes[(Math.floor(step/16)+s)%notes.length],.10,.045,musicGain,.04);
    }
    step++;
  }
  function startMusic(){
    ensure();
    if(!ctx||running)return;
    ctx.resume?.();
    running=true;
    step=0;
    beatStep();
    timer=setInterval(beatStep,125);
  }
  function stopMusic(){
    running=false;
    clearInterval(timer);timer=null;
  }
  function sfx(name){
    ensure();ctx?.resume?.();
    if(name==='punch'){noise(.055,.14,sfxGain,0,500);osc('sine',92,.08,.14,sfxGain);}
    else if(name==='heavy'){noise(.09,.23,sfxGain,0,250);osc('sawtooth',68,.13,.13,sfxGain);}
    else if(name==='roll'){noise(.14,.10,sfxGain,0,1600);osc('triangle',72,.10,.07,sfxGain);}
    else if(name==='hurt'){noise(.10,.18,sfxGain,0,350);osc('square',76,.10,.08,sfxGain);}
    else if(name==='pickup'){osc('sine',660,.08,.12,sfxGain);osc('sine',880,.11,.09,sfxGain,.07);}
    else if(name==='mission'){[440,554,659,880].forEach((f,i)=>osc('triangle',f,.22,.09,sfxGain,i*.11));}
    else if(name==='ui'){osc('square',220,.035,.035,sfxGain);}
  }
  function setMusic(v){state.music=Number(v);if(musicGain)musicGain.gain.value=state.music*.42;}
  function setSfx(v){state.sfx=Number(v);if(sfxGain)sfxGain.gain.value=state.sfx*.72;}

  window.UP_AUDIO={ensure,startMusic,stopMusic,sfx,setMusic,setSfx,state};
})();