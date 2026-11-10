(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = 960, H = 540, GRAVITY = 0.58;
  const ui = {
    title: document.getElementById('titleScreen'), pause: document.getElementById('pauseScreen'), end: document.getElementById('endScreen'),
    start: document.getElementById('startButton'), resume: document.getElementById('resumeButton'), pauseBtn: document.getElementById('pauseButton'),
    chapter: document.getElementById('chapterName'), objective: document.getElementById('objective'), progress: document.getElementById('progressText'), bar: document.getElementById('progressBar'),
    endTitle: document.getElementById('endTitle'), endText: document.getElementById('endText'), endEyebrow: document.getElementById('endEyebrow'), continue: document.getElementById('continueButton'), endMenu: document.getElementById('endMenuButton'),
    frame: document.querySelector('.game-frame'), sound: document.getElementById('soundToggle')
  };
  const palettes = [
    {sky:'#71817d', far:'#58665f', near:'#39453d', ground:'#4d5446', top:'#909076', shade:'#343a32', accent:'#c9ae78', name:'THE QUIET VALLEY', objective:'Find the old road. Keep moving.'},
    {sky:'#626f76', far:'#4b5960', near:'#313e41', ground:'#3c4947', top:'#86918a', shade:'#283432', accent:'#9bb8c2', name:'THE DROWNED MARCH', objective:'Cross the marsh. Watch the gaps.'},
    {sky:'#766f6a', far:'#594f4b', near:'#3a3532', ground:'#47413c', top:'#a28d72', shade:'#302a29', accent:'#d29a6d', name:'THE CINDER PASS', objective:'The old gate is close now.'}
  ];
  const levels = [
    {width:3040, pits:[[610,695],[1160,1260],[1760,1860],[2410,2520]], platforms:[[220,400,270],[485,250,330],[760,340,270],[1010,235,290],[1320,340,300],[1580,245,275],[1900,345,300],[2170,245,280],[2550,335,300],[2790,235,220]], enemies:[430,900,1440,2050,2660], pickups:[[335,'fire'],[1080,'water'],[1980,'leaf'],[2630,'fire']]},
    {width:3220, pits:[[520,620],[1080,1200],[1690,1790],[2350,2470],[2860,2960]], platforms:[[175,345,260],[400,235,280],[680,330,300],[920,225,290],[1230,340,300],[1490,240,290],[1820,340,300],[2080,235,300],[2500,340,290],[2730,240,280],[3020,340,160]], enemies:[340,780,1370,1980,2600,3000], pickups:[[255,'water'],[990,'fire'],[1850,'leaf'],[2525,'water']]},
    {width:3380, pits:[[500,610],[1070,1185],[1630,1750],[2200,2310],[2810,2925]], platforms:[[180,340,280],[390,230,300],[660,335,300],[910,225,280],[1200,340,290],[1460,230,310],[1780,335,300],[2060,225,280],[2370,340,300],[2630,230,300],[2940,340,290],[3170,235,200]], enemies:[320,790,1350,1940,2490,3000], pickups:[[280,'fire'],[955,'water'],[1540,'leaf'],[2270,'water'],[2800,'fire']],boss:true}
  ];
  const input = {left:false,right:false,jump:false,fire:false};
  let state='title', stage=0, camera=0, last=0, elapsed=0, score=0, lives=3, audioOn=true, audioCtx=null, world=[], player, shots=[], effects=[], boss=null;
  const powerColors={fire:'#e2634e',water:'#65b4d2',leaf:'#91bb6a'};
  const rand=(a,b)=>a+Math.random()*(b-a);
  function makePlayer(){return {x:62,y:384,w:25,h:40,vx:0,vy:0,ground:false,facing:1,power:'',powerTime:0,invuln:0,anim:0,checkpoint:62,coyote:0,jumpBuffer:0};}
  function buildStage(index){
    stage=index; const def=levels[stage]; const pal=palettes[stage]; player=makePlayer(); camera=0; shots=[]; effects=[]; boss=null;
    world={width:def.width, platforms:[], enemies:[], pickups:[], coins:[], goal:def.width-90, pits:def.pits, bossStage:!!def.boss};
    let x=0; for(const [a,b] of def.pits){if(a>x)world.platforms.push({x,y:445,w:a-x,h:95,ground:true});x=b;} if(x<def.width)world.platforms.push({x,y:445,w:def.width-x,h:95,ground:true});
    for(const [px,py,pw] of def.platforms)world.platforms.push({x:px,y:py,w:pw,h:18});
    for(const ex of def.enemies)world.enemies.push({x:ex,y:412,w:27,h:28,vx:Math.random()>.5?0.75:-0.75,alive:true});
    for(const [px,type] of def.pickups)world.pickups.push({x:px,y:350,w:22,h:25,type,alive:true,phase:rand(0,6)});
    for(let i=0;i<24;i++){let cx=150+i*125;if(!def.pits.some(([a,b])=>cx>a-20&&cx<b+20))world.coins.push({x:cx,y:i%2?388:402,alive:true,phase:i});}
    if(def.boss)boss={x:def.width-340,y:327,w:70,h:90,hp:6,max:6,dir:-1,phase:0,active:false,flash:0};
    ui.chapter.textContent=pal.name; ui.objective.textContent=pal.objective;ui.progress.textContent=`0${stage+1} / 03`;ui.bar.style.width='0%';
  }
  function startGame(){score=0;lives=5;buildStage(0);state='playing';ui.title.classList.add('hidden');ui.end.classList.add('hidden');ui.frame.classList.add('playing');sound('start');}
  function togglePause(){if(state==='playing'){state='paused';ui.pause.classList.remove('hidden');}else if(state==='paused'){state='playing';ui.pause.classList.add('hidden');last=performance.now();}}
  function setEnd(title,text,eyebrow,button='CONTINUE'){state='interlude';ui.endTitle.textContent=title;ui.endText.textContent=text;ui.endEyebrow.textContent=eyebrow;ui.continue.innerHTML=`${button} <span>→</span>`;ui.end.classList.remove('hidden');}
  function nextStage(){ui.end.classList.add('hidden');if(stage<2){buildStage(stage+1);state='playing';sound('gate');}else{state='won';ui.endTitle.textContent='THE LIGHT RETURNS';ui.endText.textContent='The valley remembers. And so will you.';ui.endEyebrow.textContent='THE ROAD WAS NEVER EMPTY';ui.continue.innerHTML='PLAY AGAIN <span>→</span>';ui.end.classList.remove('hidden');}}
  function sound(kind){if(!audioOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.connect(gain);gain.connect(audioCtx.destination);const notes={jump:420,pickup:760,fire:260,hit:120,gate:560,start:330,boss:95};osc.frequency.value=notes[kind]||300;osc.type=kind==='pickup'?'sine':'triangle';gain.gain.setValueAtTime(.055,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.12);osc.start();osc.stop(audioCtx.currentTime+.13);}catch(e){}}
  function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
  function update(dt){
    if(state!=='playing')return; const step=Math.min(dt/16.67,2);elapsed+=step;
    const accel=.68*step, max=3.45; player.anim+=step*(Math.abs(player.vx)>.2?1:0.25);
    if(input.left){player.vx-=accel;player.facing=-1;}if(input.right){player.vx+=accel;player.facing=1;}
    if(!input.left&&!input.right)player.vx*=Math.pow(.78,step);player.vx=Math.max(-max,Math.min(max,player.vx));
    player.coyote=player.ground?8:Math.max(0,player.coyote-step);
    if(input.jump)player.jumpBuffer=8;else player.jumpBuffer=Math.max(0,player.jumpBuffer-step);
    if(player.jumpBuffer>0&&(player.ground||player.coyote>0)){player.vy=-12.2;player.ground=false;player.coyote=0;player.jumpBuffer=0;sound('jump');}
    player.vy=Math.min(12,player.vy+GRAVITY*step);
    player.x+=player.vx*step;player.x=Math.max(0,Math.min(world.width-player.w,player.x));
    for(const p of world.platforms){if(p.ground)continue;if(player.x<p.x+p.w&&player.x+player.w>p.x){if(player.vy>=0&&player.y+player.h<=p.y+10&&player.y+player.h+player.vy*step>=p.y){player.y=p.y-player.h;player.vy=0;player.ground=true;}else if(player.vy<0&&player.y>=p.y+p.h-5&&player.y+player.vy*step<p.y+p.h){player.y=p.y+p.h;player.vy=0;}}}
    player.y+=player.vy*step;player.ground=false;
    for(const p of world.platforms){if(p.ground&&player.x<p.x+p.w&&player.x+player.w>p.x&&player.vy>=0&&player.y+player.h<=p.y+14&&player.y+player.h+player.vy*step>=p.y){player.y=p.y-player.h;player.vy=0;player.ground=true;}}
    // Recheck floating platforms after vertical movement.
    for(const p of world.platforms){if(!p.ground&&player.x<p.x+p.w&&player.x+player.w>p.x&&player.vy>=0&&player.y+player.h<=p.y+14&&player.y+player.h+player.vy*step>=p.y){player.y=p.y-player.h;player.vy=0;player.ground=true;}}
    if(player.y>H+100){hurt(true);}
    if(player.ground&&!world.pits.some(([a,b])=>player.x+player.w>a-30&&player.x<b+30))player.checkpoint=Math.max(player.checkpoint,player.x-70);
    if(player.invuln>0)player.invuln-=step;if(player.powerTime>0){player.powerTime-=step;if(player.powerTime<=0){player.power='';player.powerTime=0;}}
    for(const e of world.enemies){if(!e.alive)continue;e.x+=e.vx*step;if(e.x<80||e.x>world.width-80)e.vx*=-1;for(const pit of world.pits){if(Math.abs(e.x+e.w/2-(pit[0]+pit[1])/2)<Math.abs(e.vx*step)+4)e.vx*=-1;}if(overlap(player,e)){if(player.vy>1&&player.y+player.h-e.y<18){e.alive=false;player.vy=-7;score+=100;spark(e.x+e.w/2,e.y,'#d7c38c',8);sound('hit');}else hurt(false);}}
    for(const c of world.coins){if(c.alive&&Math.abs(player.x+12-c.x)<22&&Math.abs(player.y+18-c.y)<25){c.alive=false;score+=10;spark(c.x,c.y,'#e0c47f',5);sound('pickup');}}
    for(const p of world.pickups){p.phase+=.08*step;if(p.alive&&overlap(player,{x:p.x,y:p.y+Math.sin(p.phase)*5,w:p.w,h:p.h})){p.alive=false;player.power=p.type;player.powerTime=660;score+=50;spark(p.x,p.y,powerColors[p.type],14);sound('pickup');ui.objective.textContent=`${p.type.toUpperCase()} SHARD — power fades in ${Math.ceil(player.powerTime/60)}s`;}}
    if(input.fire&&player.power&&elapsed-(player.lastShot||0)>20){shots.push({x:player.x+(player.facing>0?player.w:0),y:player.y+7,w:12,h:9,vx:player.facing*6,type:player.power,life:80});player.lastShot=elapsed;sound('fire');}
    for(const s of shots){s.x+=s.vx*step;s.life-=step;for(const e of world.enemies){if(e.alive&&overlap(s,e)){e.alive=false;s.life=0;score+=100;spark(e.x,e.y,powerColors[s.type],9);}}if(boss&&boss.active&&boss.hp>0&&overlap(s,boss)){boss.hp--;boss.flash=12;s.life=0;spark(boss.x+boss.w/2,boss.y+30,powerColors[s.type],12);sound('hit');}}
    shots=shots.filter(s=>s.life>0&&s.x>-40&&s.x<world.width+40);
    if(boss){if(player.x>boss.x-300)boss.active=true;if(boss.active&&boss.hp>0){boss.phase+=step;boss.x+=boss.dir*.5*step;if(boss.x<world.width-420||boss.x>world.width-150)boss.dir*=-1;if(boss.flash>0)boss.flash-=step;if(Math.floor(boss.phase/90)!==Math.floor((boss.phase-step)/90)){effects.push({x:boss.x+boss.w/2,y:boss.y+50,vx:-2.4,vy:-2.5,life:150,color:'#8b7381',hostile:true});sound('boss');}if(overlap(player,boss)){if(player.vy>1&&player.y+player.h-boss.y<20){boss.hp--;boss.flash=12;player.vy=-9;spark(boss.x+boss.w/2,boss.y,'#e2c597',15);sound('hit');}else hurt(false);}}}
    for(const fx of effects){fx.x+=fx.vx*step;fx.y+=fx.vy*step;fx.life-=step;if(fx.hostile&&overlap(player,{x:fx.x-8,y:fx.y-8,w:16,h:16})) {fx.life=0;hurt(false);}}
    effects=effects.filter(f=>f.life>0);
    camera=Math.max(0,Math.min(world.width-W,player.x-W*.38));
    const pct=Math.min(100,player.x/world.width*100);ui.bar.style.width=`${pct}%`;
    if(boss&&boss.active&&boss.hp>0)ui.objective.textContent=`THE HOLLOW KING  ·  ${boss.hp} / ${boss.max} HEARTS`;
    else if(player.power)ui.objective.textContent=`${player.power.toUpperCase()} SHARD  ·  ${Math.ceil(player.powerTime/60)}s REMAINING`;
    if(player.x>world.goal&&(!boss||boss.hp<=0)){if(stage<2){state='interlude';setEnd(stage===0?'THE MARSH AWAITS':'THE CINDER PASS',stage===0?'A lantern still burns beyond the water.':'The old gate stands at the end of the road.','CHAPTER COMPLETE');}else{state='won';ui.endTitle.textContent='THE LIGHT RETURNS';ui.endText.textContent='The valley remembers. And so will you.';ui.endEyebrow.textContent='THE ROAD WAS NEVER EMPTY';ui.continue.innerHTML='PLAY AGAIN <span>→</span>';ui.end.classList.remove('hidden');}}
  }
  function hurt(fall){if(player.invuln>0)return;lives--;player.invuln=105;player.vy=-6;player.x=Math.max(player.checkpoint,player.x-85);player.y=330;player.power='';player.powerTime=0;sound('hit');spark(player.x+12,player.y+18,'#d28e76',11);if(lives<=0){state='lost';ui.endTitle.textContent='THE ROAD GOES QUIET';ui.endText.textContent='The old places will wait for you.';ui.endEyebrow.textContent='NO JOURNEY ENDS HERE';ui.continue.innerHTML='TRY AGAIN <span>→</span>';ui.end.classList.remove('hidden');}}
  function spark(x,y,color,n){for(let i=0;i<n;i++)effects.push({x:x+rand(-4,4),y:y+rand(-4,4),vx:rand(-2.2,2.2),vy:rand(-3,1),life:rand(16,35),color});}
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function drawBackground(){
    const pal=palettes[stage]||palettes[0];ctx.fillStyle=pal.sky;ctx.fillRect(0,0,W,H);
    // muted sun and distant silhouettes
    ctx.fillStyle='#d5c9a2';ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(755-camera*.045,106,42,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    for(let i=0;i<8;i++){const x=((i*183-camera*.14)%(W+250)+W+250)%(W+250)-120;const y=108+(i%3)*26;rect(x,y,58,8,'#c7c9b2');rect(x+15,y-5,30,7,'#c7c9b2');}
    for(let layer=0;layer<3;layer++){const off=camera*(.12+layer*.12),base=315+layer*39,col=layer===0?pal.far:layer===1?pal.near:'#303833';ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,H);for(let x=-100;x<=W+100;x+=80){const wx=x+off;const peak=base-35-(Math.sin(wx*.008+layer)*23);ctx.lineTo(x,peak);ctx.lineTo(x+42,base+8);}ctx.lineTo(W,H);ctx.closePath();ctx.fill();}
    // worn towers and bare trees in parallax
    for(let i=0;i<12;i++){const x=((i*247-camera*.38)%(W+180)+W+180)%(W+180)-80;const h=60+(i*37%85);rect(x,366-h,14,h,'#303a35');rect(x-9,366-h+13,32,8,'#303a35');rect(x+4,366-h-8,6,12,'#303a35');if(i%2===0){rect(x-12,366-h-35,3,36,'#303a35');rect(x-22,366-h-36,22,3,'#303a35');}}
    // foreground haze
    ctx.fillStyle='#b9b19a';ctx.globalAlpha=.06;ctx.fillRect(0,380,W,70);ctx.globalAlpha=1;
  }
  function drawWorld(){
    const pal=palettes[stage]||palettes[0];drawBackground();
    // depth marks and little wild grasses
    for(let i=0;i<world.platforms.length;i++){const p=world.platforms[i],x=p.x-camera;if(x+p.w<0||x>W)continue;rect(x,p.y,p.w,p.h,p.ground?pal.ground:'#606a5c');rect(x,p.y,p.w,5,pal.top);rect(x,p.y+5,p.w,p.ground?3:2,pal.shade);
      if(p.ground){for(let gx=Math.floor(p.x/75)*75;gx<p.x+p.w;gx+=75){let sx=gx-camera;if(sx>-15&&sx<W+5){rect(sx,p.y-4,2,4,pal.top);rect(sx+4,p.y-2,2,2,pal.top);}}for(let bx=p.x+23;bx<p.x+p.w-25;bx+=119){const xx=bx-camera;if(xx>0&&xx<W){rect(xx,p.y+22,7,12,pal.shade);rect(xx-4,p.y+29,15,4,pal.shade);rect(xx+3,p.y+35,3,3,'#62634e');}}}
      else{rect(x+8,p.y+p.h,p.w-16,6,pal.shade);for(let k=14;k<p.w-12;k+=35)rect(x+k,p.y+p.h+6,3,6,pal.shade);}}
    // path coins
    for(const c of world.coins){if(!c.alive)continue;const x=c.x-camera;if(x< -20||x>W+20)continue;const pulse=Math.sin(elapsed*.11+c.phase)*2;rect(x-4, c.y-7+pulse,8,14,'#bda76e');rect(x-2,c.y-4+pulse,4,8,'#e1cb89');}
    for(const p of world.pickups){if(!p.alive)continue;const x=p.x-camera,y=p.y+Math.sin(p.phase)*5;ctx.fillStyle=powerColors[p.type];ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(x+11,y+12,21,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;rect(x+4,y,14,24,'#202622');rect(x+7,y-3,8,5,powerColors[p.type]);rect(x+7,y+5,8,9,powerColors[p.type]);rect(x+5,y+14,12,5,'#e5e2d4');rect(x+9,y+7,4,5,'#f3edda');}
    for(const e of world.enemies){if(!e.alive)continue;const x=e.x-camera;rect(x+3,e.y+5,21,18,'#292c2b');rect(x,e.y+12,27,11,'#3e4240');rect(x+4,e.y+21,7,7,'#202421');rect(x+17,e.y+21,7,7,'#202421');rect(x+5,e.y+10,5,4,'#d3c59f');rect(x+18,e.y+10,5,4,'#d3c59f');rect(x+7,e.y+11,2,3,'#222');rect(x+20,e.y+11,2,3,'#222');}
    // gate remains sealed while the Hollow King lives
    const gateX=world.goal-camera;rect(gateX,322,10,123,'#262d29');rect(gateX+9,337,49,108,'#3c443c');rect(gateX+15,345,35,100,'#222a27');rect(gateX+19,354,27,91,(boss&&boss.hp>0)?'#161d1b':'#c6a66f');rect(gateX+25,368,15,77,(boss&&boss.hp>0)?'#161d1b':'#e2cb92');rect(gateX-7,316,64,8,'#a39470');
    if(boss){const x=boss.x-camera;if(x>-100&&x<W+100){const body=boss.flash>0?'#d7c6a0':'#282624';rect(x+10,boss.y+15,50,67,body);rect(x,boss.y+38,70,34,body);rect(x+7,boss.y+74,19,17,'#171a19');rect(x+43,boss.y+74,19,17,'#171a19');rect(x+14,boss.y,42,33,'#171a19');rect(x+8,boss.y+7,11,15,'#a58b69');rect(x+50,boss.y+7,11,15,'#a58b69');rect(x+17,boss.y+17,10,7,'#d95643');rect(x+43,boss.y+17,10,7,'#d95643');rect(x+20,boss.y+19,4,4,'#ffe7bd');rect(x+46,boss.y+19,4,4,'#ffe7bd');rect(x+27,boss.y+36,16,5,'#786859');if(boss.active&&boss.hp>0){rect(x+2,boss.y-18,66,6,'#191d1b');rect(x+3,boss.y-17,64*boss.hp/boss.max,4,'#b86051');}}}
    for(const fx of effects){const x=fx.x-camera;if(fx.hostile){rect(x-6,fx.y-5,12,10,fx.color);rect(x-3,fx.y-8,6,16,'#c9a7af');}else rect(x,fx.y,4,4,fx.color);}
    for(const s of shots){const x=s.x-camera;rect(x-4,s.y-4,12,9,powerColors[s.type]);rect(x+2,s.y-2,5,4,'#f4e8c7');}
    drawPlayer();drawHud();
  }
  function drawPlayer(){if(!player)return;if(player.invuln>0&&Math.floor(player.invuln/6)%2===0)return;const x=Math.round(player.x-camera),y=Math.round(player.y),walk=Math.sin(player.anim*.8)*3;const powered=player.power&&player.powerTime>0;
    if(powered){ctx.globalAlpha=.14+Math.sin(elapsed*.16)*.05;ctx.fillStyle=powerColors[player.power];ctx.beginPath();ctx.arc(x+12,y+20,29,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    // distinct monochrome traveler: hood, pale tunic, dark split coat and boots
    rect(x+7,y+1,13,5,'#171c1a');rect(x+5,y+5,17,14,'#e7e5d7');rect(x+3,y+8,5,10,'#202522');rect(x+19,y+8,4,8,'#b5aa91');rect(x+15,y+12,2,2,'#262a26');rect(x+4,y+18,18,4,'#1c211f');
    rect(x+2,y+22,22,15,powered?powerColors[player.power]:'#e4e3d8');rect(x+2,y+22,8,15,'#252b28');rect(x+13,y+22,3,15,powered?powerColors[player.power]:'#b8b8ac');rect(x+20,y+23,6,11,'#272d29');rect(x+3,y+37,8,3,'#181d1b');
    const legShift=player.ground?walk:0;rect(x+4,y+38,8,2,'#171c1a');rect(x+4+legShift,y+39,8,5,'#111614');rect(x+15-legShift,y+38,8,2,'#171c1a');rect(x+15-legShift,y+39,8,5,'#111614');rect(x+2,y+42,11,3,'#111614');rect(x+14,y+42,11,3,'#111614');
    // pale scarf and little trailing end
    rect(x+3,y+19,19,4,powered?'#f0e5c7':'#bca980');rect(x+(player.facing>0?-4:20),y+20,8,3,powered?powerColors[player.power]:'#bca980');
  }
  function drawHud(){
    rect(17,15,240,54,'#151b19');rect(17,15,3,54,palettes[stage].accent);rect(29,23,20,20,'#d8d6ca');rect(33,27,12,12,'#262b28');rect(37,30,4,6,'#e4e1d3');ctx.fillStyle='#e7e5da';ctx.font='bold 14px "DM Mono", monospace';ctx.fillText(String(score).padStart(5,'0'),58,38);ctx.fillStyle='#a1a99e';ctx.font='10px "DM Mono", monospace';ctx.fillText('SCORE',58,56);ctx.fillStyle='#c9a66c';ctx.fillText('♥'.repeat(Math.max(0,lives)),176,37);ctx.fillStyle='#798078';ctx.fillText('LIFE',176,55);
    if(player.power){rect(W-187,15,170,47,'#151b19');rect(W-187,15,3,47,powerColors[player.power]);rect(W-174,26,12,17,powerColors[player.power]);ctx.fillStyle='#e4e4d7';ctx.font='10px "DM Mono", monospace';ctx.fillText(player.power.toUpperCase(),W-153,35);ctx.fillStyle='#4b544d';ctx.fillRect(W-153,44,118,4);ctx.fillStyle=powerColors[player.power];ctx.fillRect(W-153,44,118*Math.min(1,player.powerTime/660),4);}
    if(boss&&boss.active&&boss.hp>0){rect(W/2-120,18,240,37,'#171d1b');ctx.fillStyle='#d5d0bf';ctx.font='10px "DM Mono", monospace';ctx.textAlign='center';ctx.fillText('THE HOLLOW KING',W/2,31);ctx.fillStyle='#4b5048';ctx.fillRect(W/2-104,39,208,5);ctx.fillStyle='#b45c4d';ctx.fillRect(W/2-104,39,208*boss.hp/boss.max,5);ctx.textAlign='left';}
  }
  function frame(now){const dt=last?Math.min(now-last,40):16;last=now;update(dt);drawWorld();requestAnimationFrame(frame);}
  function keyControl(event,down){const k=event.key.toLowerCase();if(['arrowleft','arrowright','arrowup',' ','a','d','w','x','escape'].includes(k))event.preventDefault();if(k==='arrowleft'||k==='a')input.left=down;if(k==='arrowright'||k==='d')input.right=down;if(k==='arrowup'||k==='w'||k===' ')input.jump=down;if(k==='x'&&down)input.fire=true;if(k==='escape'&&down)togglePause();}
  window.addEventListener('keydown',e=>keyControl(e,true));window.addEventListener('keyup',e=>keyControl(e,false));
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control=button.dataset.control;
    const press=e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);if(control==='left'||control==='right')input[control]=true;else if(control==='jump')input.jump=true;else input.fire=true;};
    const release=e=>{e.preventDefault();if(control==='left'||control==='right')input[control]=false;if(control==='jump')input.jump=false;if(control==='fire')input.fire=false;};
    button.addEventListener('pointerdown',press);button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  ui.start.addEventListener('click',startGame);ui.pauseBtn.addEventListener('click',togglePause);ui.resume.addEventListener('click',togglePause);
  document.getElementById('restartPause').addEventListener('click',startGame);
  ui.continue.addEventListener('click',()=>{if(state==='interlude')nextStage();else startGame();});
  ui.endMenu.addEventListener('click',()=>{state='title';ui.end.classList.add('hidden');ui.pause.classList.add('hidden');ui.title.classList.remove('hidden');ui.frame.classList.remove('playing');});
  ui.sound.addEventListener('click',()=>{audioOn=!audioOn;ui.sound.innerHTML=`${audioOn?'♫':'♪'} <span>Sound ${audioOn?'on':'off'}</span>`;if(audioOn)sound('pickup');});
  buildStage(0);requestAnimationFrame(frame);
})();
