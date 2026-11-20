// ===== 《金陵未眠：1937》引擎：舞台渲染 / 剧情解释器 / 系统 =====
(function(){
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('stage'), ctx=canvas.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){ DPR=Math.min(devicePixelRatio||1,2); W=innerWidth; H=innerHeight; canvas.width=W*DPR; canvas.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0); }
addEventListener('resize',resize); resize();

// ---------- 设置 ----------
let settings=Object.assign({speed:26,fs:1,auto:false,difficulty:'standard'}, JSON.parse(localStorage.getItem('jinling_settings')||'{}'));
function saveSettings(){ localStorage.setItem('jinling_settings',JSON.stringify(settings)); document.documentElement.style.setProperty('--fs',settings.fs); }
saveSettings();

// ---------- 游戏状态 ----------
function freshState(){ return {
  stats:{hp:100,sta:80,hunger:15,stress:10,will:50,repair:55,med:5,exp:0,record:20},
  res:{food:2,water:1,bandage:1,med:0,money:5,parts:1},
  rel:{mother:0,xiaoman:0,zhiyuan:0,qinghe:0,xushan:0,chenbo:0,wenying:0},
  flags:{evidence:0,familySafety:0,sisterClues:0,medicalContribution:0,rescueNetwork:0},
  items:['wrench','handkerchief','photo'],
  names:[], letter:[], docsRead:[],
  fate:{mother:'在南京家中',sister:'在南京家中',zhiyuan:'在南京',chenbo:'在修理铺',qinghe:'在救护站',xushan:'在守军'},
  role:'修车铺学徒', chapter:'序章', date:'1937年11月14日', loc:'秦淮河边',
  startAt:Date.now(), log:[]
};}
let G=freshState();
let ptr=0, currentIdx=0, mode='menu'; // menu | play | ending
let pendingSay=null, typing=null, autoTimer=null;
const LABELS={}; STORY.forEach((n,i)=>{ if(n.lb) LABELS[n.lb]=i; });

// ---------- 舞台 ----------
let stage={bg:'menu',weather:'dusk',chars:new Map(),speaker:null};
const SLOTS=[0.13,0.3,0.5,0.7,0.87];
let walkers=[], cyclist=null, lastSpawn=0;
const AMBIENT=new Set(['menu','street_day','street_dusk','river_dawn','shelter','street_ruin']);
function figH(){ return Math.max(140, Math.min(H*0.37, 360)); }
function groundY(){ return H*0.875; }
function addChar(id,slot,fromX){ const ch=CHARACTERS[id]; if(!ch||!ch.fig) return; stage.chars.set(id,{id,x:fromX!==undefined?fromX:SLOTS[slot],tx:SLOTS[slot],slot,phase:Math.random()*6,walk:0,face:1,scale:ch.scale||1}); }
function removeChar(id){ const c=stage.chars.get(id); if(c){ c.leaving=true; c.tx=c.x<0.5?-0.12:1.12; } }

let lastT=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(0.05,(now-lastT)/1000); lastT=now; const t=now/1000;
  // 背景
  const painter=SC.painters[stage.bg]||SC.painters.menu; painter(ctx,W,H,t);
  if(stage.weather==='rain') SC.rainFx(ctx,W,H,t,.5);
  if(stage.weather==='snow' && SC.snowFx) SC.snowFx(ctx,W,H,t);
  // 背景行人
  if(AMBIENT.has(stage.bg) && now-lastSpawn>4200 && walkers.length<3){ lastSpawn=now; const dir=Math.random()>0.5?1:-1; walkers.push({x:dir>0?-0.08:1.08,dir,speed:0.025+Math.random()*0.02,phase:Math.random()*6,s:0.72+Math.random()*0.15}); }
  walkers=walkers.filter(w=>w.x>-0.15&&w.x<1.15);
  for(const w of walkers){ w.x+=w.dir*w.speed*dt; w.phase+=dt*8; SC.walker(ctx,w.x*W,groundY()-H*0.055,figH()*w.s,w.phase,w.dir,0.5); }
  // 骑行者（菜单与河边）
  if((stage.bg==='menu'||stage.bg==='river_dawn')){ if(!cyclist && Math.random()<dt*0.05) cyclist={x:-0.1,dir:1,speed:0.11}; }
  if(cyclist){ cyclist.x+=cyclist.dir*cyclist.speed*dt; SC.cyclist(ctx,cyclist.x*W,groundY()-6,Math.max(.8,figH()/300),cyclist.dir); if(cyclist.x>1.15) cyclist=null; }
  // 角色
  let anyWalking=false;
  const sorted=[...stage.chars.values()].sort((a,b)=>a.slot-b.slot);
  for(const c of sorted){
    const dx=c.tx-c.x;
    if(Math.abs(dx)>0.004){ anyWalking=true; const step=Math.sign(dx)*Math.min(Math.abs(dx), dt*0.5); c.x+=step; c.face=step>=0?1:-1; c.walk=Math.min(1,c.walk+dt*7); c.phase+=dt*10.5; }
    else { c.walk=Math.max(0,c.walk-dt*7); c.phase+=dt*1.6; if(c.leaving){ stage.chars.delete(c.id); continue; } }
    const ch=CHARACTERS[c.id];
    const isSpeak=stage.speaker===c.id;
    if(isSpeak){ ctx.fillStyle='rgba(255,214,140,.16)'; ctx.beginPath(); ctx.ellipse(c.x*W,groundY()+4,figH()*0.24,9,0,0,6.29); ctx.fill(); }
    SC.drawFigure(ctx,c.x*W,groundY(),figH()*c.scale,ch.fig,c.phase,{walk:c.walk,face:c.face,dim:stage.speaker&&!isSpeak,speak:isSpeak});
    if(isSpeak){ ctx.fillStyle='rgba(244,233,205,.92)'; ctx.font='600 12.5px "PingFang SC",sans-serif'; ctx.textAlign='center'; ctx.fillText(ch.name,c.x*W,groundY()-figH()*c.scale-10); }
  }
  if(anyWalking) stage._walking=true; else if(stage._walking){ stage._walking=false; if(waitingWalk){ waitingWalk=false; step(); } }
}
requestAnimationFrame(loop);

// ---------- 工具 ----------
function toast(msg){ const d=document.createElement('div'); d.className='toastItem'; d.textContent=msg; $('toast').appendChild(d); setTimeout(()=>{ d.style.opacity='0'; d.style.transition='opacity .4s'; setTimeout(()=>d.remove(),420); },2100); while($('toast').children.length>4) $('toast').firstChild.remove(); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function evalCond(c){ if(!c) return true;
  if(c.all) return c.all.every(evalCond); if(c.any) return c.any.some(evalCond);
  if(c.notFlag!==undefined) return !G.flags[c.notFlag];
  if(c.flag!==undefined){ const v=G.flags[c.flag]; if(c.gte!==undefined) return (v||0)>=c.gte; if(c.eq!==undefined) return v===c.eq; return !!v; }
  if(c.stat) return (G.stats[c.stat]||0)>=(c.gte||0);
  if(c.res) return (G.res[c.res]||0)>=(c.gte||0);
  if(c.item) return G.items.includes(c.item);
  if(c.rel) return (G.rel[c.rel[0]]||0)>=c.rel[1];
  if(c.route) return G.flags.route_choice===c.route;
  return true;
}
function needMet(need){ if(!need) return {ok:true};
  if(need.resKey!==undefined) return (G.res[need.resKey]||0)>=need.v? {ok:true}:{ok:false,msg:need.msg||'资源不足'};
  if(need.statKey!==undefined) return (G.stats[need.statKey]||0)>=need.v? {ok:true}:{ok:false,msg:need.msg||'状态不足'};
  if(need.flag!==undefined) return G.flags[need.flag]? {ok:true}:{ok:false,msg:need.msg||'条件未满足'};
  if(need.item!==undefined) return G.items.includes(need.item)? {ok:true}:{ok:false,msg:need.msg||'缺少物品'};
  return {ok:true};
}
const STATNAMES={hp:'生命',sta:'体力',hunger:'饥饿',stress:'压力',will:'意志',repair:'维修',med:'医疗',exp:'战地经验',record:'记录'};
const RESNAMES={food:'干粮',water:'清水',bandage:'绷带',med:'药品',money:'银钱',parts:'零件'};
function applyFx(fx){ if(!fx) return; const notes=[]; const diff=settings.difficulty==='story'?0.5:1;
  if(fx.stat) for(const k in fx.stat){ let d=fx.stat[k]; if(d<0&&(k==='hp'||k==='sta'||k==='stress')) d=Math.round(d*diff)||d; G.stats[k]=clamp((G.stats[k]||0)+d,0,100); notes.push(STATNAMES[k]+(d>=0?'+':'')+d); }
  if(fx.res) for(const k in fx.res){ G.res[k]=Math.max(0,(G.res[k]||0)+fx.res[k]); notes.push(RESNAMES[k]+(fx.res[k]>=0?'+':'')+fx.res[k]); }
  if(fx.rel) for(const k in fx.rel){ G.rel[k]=clamp((G.rel[k]||0)+fx.rel[k],-5,10); if(CHARACTERS[k]) notes.push(CHARACTERS[k].name+' 好感 '+(fx.rel[k]>=0?'+':'')+fx.rel[k]); }
  if(fx.flag) for(const k in fx.flag) G.flags[k]=fx.flag[k];
  if(fx.flagAdd) for(const k in fx.flagAdd) G.flags[k]=(G.flags[k]||0)+fx.flagAdd[k];
  if(fx.namesAdd) for(const n of fx.namesAdd){ if(!G.names.includes(n)){ G.names.push(n); notes.push('记下姓名：'+n.split('，')[0]); } }
  if(fx.item && !G.items.includes(fx.item)){ G.items.push(fx.item); notes.push('获得：'+(ITEMS[fx.item]?ITEMS[fx.item].name:fx.item)); }
  if(fx.itemRemove){ G.items=G.items.filter(i=>i!==fx.itemRemove); }
  if(fx.role){ G.role=fx.role; notes.push('身份：'+fx.role); }
  if(fx.fate) for(const k in fx.fate) G.fate[k]=fx.fate[k];
  notes.slice(0,3).forEach((n,i)=>setTimeout(()=>toast(n),i*160));
  updateHUD();
  if(G.stats.hp<=0 && mode==='play' && !G.flags.collapsed){ G.flags.collapsed=true; if(G.chapter==='第十二章'||G.flags.finalChoice) G.flags.rescueDeath=true; setTimeout(()=>doEnding(),600); }
  if(fx.autosave) saveGame('auto');
  if(fx.doc) setTimeout(()=>openDoc(fx.doc,null),350);
}

// ---------- HUD ----------
function updateHUD(){ $('hpFill').style.width=G.stats.hp+'%'; $('hpVal').textContent=G.stats.hp; $('staFill').style.width=G.stats.sta+'%'; $('staVal').textContent=G.stats.sta; $('hudChapter').textContent=G.chapter; $('hudDate').textContent=G.date; }

// ---------- 对话 ----------
function showSay(who,text,done){
  pendingSay={who,text,done};
  const dlg=$('dialogue'); dlg.classList.remove('hidden');
  const sp=$('speaker');
  const FACEIDS=['huaian','mother','xiaoman','zhiyuan','qinghe','xushan','chenbo','wenying'];
  const faceEl=document.getElementById('faceImg');
  if(who==='n'){ sp.textContent='旁白'; sp.className='narr'; stage.speaker=null; if(faceEl){ faceEl.style.display='none'; dlg.classList.remove('withFace'); } }
  else { const ch=CHARACTERS[who]; sp.textContent=ch?ch.name:who; sp.className=''; sp.style.background=''; stage.speaker=who;
    if(faceEl && FACEIDS.includes(who)){ faceEl.src='assets/face_'+who+'.jpg'; faceEl.style.display='block'; dlg.classList.add('withFace'); }
    else if(faceEl){ faceEl.style.display='none'; dlg.classList.remove('withFace'); } }
  const el=$('dlgText'); el.textContent='';
  let i=0; const full=text;
  if(typing) clearInterval(typing);
  typing=setInterval(()=>{ i++; el.textContent=full.slice(0,i); if(i>=full.length){ clearInterval(typing); typing=null; if(settings.auto){ autoTimer=setTimeout(()=>advanceSay(),1500); } } }, Math.max(6, 34-settings.speed));
  G.log.push({who,text}); if(G.log.length>120) G.log.shift();
}
function advanceSay(){ if(!pendingSay) return;
  if(typing){ clearInterval(typing); typing=null; $('dlgText').textContent=pendingSay.text; if(settings.auto){ autoTimer=setTimeout(()=>advanceSay(),1200); } return; }
  if(autoTimer){ clearTimeout(autoTimer); autoTimer=null; }
  const d=pendingSay.done; pendingSay=null; stage.speaker=null; if(d) d();
}
$('dialogue').addEventListener('click',e=>{ if(e.target.closest('.dtools')) return; advanceSay(); });

// ---------- 选择 ----------
function showChoices(options,invMode){
  const box=$('choices'); box.innerHTML=''; box.classList.remove('hidden');
  options.forEach(opt=>{
    if(opt.if && !evalCond(opt.if)) return;
    if(opt.ifNot && evalCond(opt.ifNot)) return;
    const nm=needMet(opt.need);
    const b=document.createElement('button'); b.className='choiceBtn'; b.disabled=!nm.ok;
    b.innerHTML=opt.t+(opt.sub?'<small>'+opt.sub+'</small>':'')+(!nm.ok?'<small>⚠ '+(opt.need.msg||'条件不足')+'</small>':'');
    b.addEventListener('click',()=>{
      box.classList.add('hidden'); box.innerHTML='';
      applyFx(opt.fx);
      if(invMode){ showSay('n',opt.txt,()=>{ if(opt.go){ ptr=LABELS[opt.go]; } step(); }); }
      else { if(opt.go) ptr=LABELS[opt.go]; step(); }
    });
    box.appendChild(b);
  });
  if(!box.children.length){ box.classList.add('hidden'); step(); }
}

// ---------- 解释器 ----------
let waitingWalk=false;
function step(){
  if(mode!=='play') return;
  while(ptr<STORY.length){
    const node=STORY[ptr]; currentIdx=ptr; ptr++;
    if(node.lb) continue;
    if(node.sc){ doScene(node); return; }
    if(node.ch){ doChapter(node); return; }
    if(node.en){ const from=node.from==='l'?-0.1:node.from==='r'?1.1:undefined; addChar(node.en,node.s||2,from); continue; }
    if(node.ex){ removeChar(node.ex); continue; }
    if(node.mv){ const c=stage.chars.get(node.mv); if(c){ c.tx=SLOTS[node.s||2]; c.slot=node.s||2; } continue; }
    if(node.fx){ applyFx(node.fx); if(mode!=='play') return; continue; }
    if(node.fate){ for(const k in node.fate) G.fate[k]=node.fate[k]; continue; }
    if(node.role){ G.role=node.role; continue; }
    if(node.cnd){ if(evalCond(node.cnd)){ ptr=LABELS[node.go]; } else if(node.el){ ptr=LABELS[node.el]; } continue; }
    if(node.go){ ptr=LABELS[node.go]; continue; }
    if(node.say){ // 等人物走完再说话
      if([...stage.chars.values()].some(c=>Math.abs(c.tx-c.x)>0.01)){ waitingWalk=true; ptr--; return; }
      showSay(node.say,node.t,()=>step()); return;
    }
    if(node.chc){ showChoices(node.chc,false); return; }
    if(node.inv){ showChoices(node.inv.map(o=>({t:o.t,txt:o.txt,fx:o.fx,go:o.go,if:o.if})),true); return; }
    if(node.doc){ openDoc(node.doc,()=>step()); return; }
    if(node.game){ openGame(node.game,fx=>{ applyFx(fx); step(); }); return; }
    if(node.end){ doEnding(); return; }
  }
  doEnding();
}
function doScene(node){
  const fade=$('fade'); fade.style.opacity='1';
  setTimeout(()=>{
    stage.bg=node.sc; stage.weather=node.w||'clear'; stage.chars.clear(); stage.speaker=null;
    if(node.date) G.date=node.date; if(node.loc) G.loc=node.loc;
    updateHUD(); fade.style.opacity='0';
    setTimeout(()=>step(),650);
  },520);
  saveGame('auto');
}
function doChapter(node){
  G.chapter=node.ch;
  const unl=JSON.parse(localStorage.getItem('jinling_chapters')||'[]');
  const meta=CHAPTERS.find(c=>c.name===node.ch);
  if(meta&&!unl.includes(meta.id)){ unl.push(meta.id); localStorage.setItem('jinling_chapters',JSON.stringify(unl)); }
  $('ccChapter').textContent=node.ch; $('ccTitle').textContent=node.ti; $('ccDate').textContent=node.dt||'';
  $('chapterCard').classList.remove('hidden'); updateHUD(); saveGame('auto');
}
$('chapterCard').addEventListener('click',()=>{ $('chapterCard').classList.add('hidden'); step(); });

// ---------- 结局 ----------
function doEnding(){
  if(mode==='ending') return; mode='ending';
  const end=resolveEnding(G);
  const unl=JSON.parse(localStorage.getItem('jinling_endings')||'[]');
  if(!unl.includes(end.code)){ unl.push(end.code); localStorage.setItem('jinling_endings',JSON.stringify(unl)); }
  localStorage.removeItem('jinling_save_auto');
  $('dialogue').classList.add('hidden'); $('choices').classList.add('hidden'); $('hud').classList.add('hidden');
  $('endCode').textContent='结局 '+end.code+' · 已解锁 '+unl.length+' / 24';
  $('endTitle').textContent=end.title;
  const mins=Math.max(1,Math.round((Date.now()-G.startAt)/60000));
  $('endBody').innerHTML=end.paras.map(p=>'<p style="margin-bottom:10px">'+p+'</p>').join('')+
    '<p style="color:#a99e83;font-size:13px;margin-top:14px">本局用时约 '+mins+' 分钟 · 记下姓名 '+G.names.length+' 个 · 读过文书 '+G.docsRead.length+' 份 · 身份：'+G.role+'<br>母亲：'+G.fate.mother+' · 妹妹：'+G.fate.sister+' · 志远：'+G.fate.zhiyuan+' · 陈伯：'+G.fate.chenbo+'</p>';
  setTimeout(()=>$('endingCard').classList.remove('hidden'),700);
}
$('btnEndMenu').addEventListener('click',()=>{ $('endingCard').classList.add('hidden'); toMenu(); });
$('btnEndGallery').addEventListener('click',()=>{ openArchive('endings'); });

// ---------- 存档 ----------
function saveGame(slot){
  if(mode!=='play') return;
  const data={ptr:currentIdx,G:JSON.parse(JSON.stringify(G)),stage:{bg:stage.bg,weather:stage.weather,chars:[...stage.chars.values()].map(c=>({id:c.id,slot:c.slot}))},at:Date.now()};
  localStorage.setItem('jinling_save_'+slot,JSON.stringify(data));
  if(slot!=='auto') toast('已保存到存档位 '+slot);
}
function loadGame(slot){
  const raw=localStorage.getItem('jinling_save_'+slot); if(!raw) return false;
  const data=JSON.parse(raw); G=Object.assign(freshState(),data.G); G.stats=Object.assign(freshState().stats,data.G.stats); G.flags=Object.assign(freshState().flags,data.G.flags);
  ptr=data.ptr; stage.bg=data.stage.bg; stage.weather=data.stage.weather; stage.chars.clear();
  for(const c of data.stage.chars) addChar(c.id,c.slot,SLOTS[c.slot]);
  mode='play'; $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); $('endingCard').classList.add('hidden');
  updateHUD(); toast('已读取进度'); step(); return true;
}
function refreshMenu(){
  const auto=localStorage.getItem('jinling_save_auto');
  $('btnContinue').disabled=!auto; $('continueInfo').textContent=auto?'有自动存档，可以继续':'暂无进度';
  const unl=JSON.parse(localStorage.getItem('jinling_chapters')||'[]');
  $('chapterInfo').textContent=unl.length?('已解锁 '+unl.length+' / 14 章'):'尚未解锁章节';
  $('btnChapters').disabled=!unl.length;
}
function toMenu(){ mode='menu'; stage.bg='menu'; stage.chars.clear(); stage.speaker=null; $('menu').classList.remove('hidden'); $('hud').classList.add('hidden'); $('dialogue').classList.add('hidden'); refreshMenu(); }
function newGame(fromLabel){
  G=freshState(); ptr=LABELS[fromLabel||'L_PRO']; stage.chars.clear();
  mode='play'; $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); $('endingCard').classList.add('hidden');
  updateHUD(); step();
}
$('btnNew').addEventListener('click',()=>{ if(localStorage.getItem('jinling_save_auto')&&!confirm('开始新游戏将覆盖自动存档，继续吗？')) return; localStorage.removeItem('jinling_save_auto'); newGame(); });
$('btnContinue').addEventListener('click',()=>loadGame('auto'));
$('btnMenu2').addEventListener('click',()=>{ saveGame('auto'); toMenu(); });

// ---------- 弹窗通用 ----------
function openPanel(html){ const root=$('modalRoot'); root.innerHTML='<div class="modal"><div class="panel">'+html+'</div></div>'; return root.firstChild; }
function closePanel(){ $('modalRoot').innerHTML=''; }
$('modalRoot').addEventListener('click',e=>{ if(e.target.classList.contains('modal')) closePanel(); });

// ---------- 文书 ----------
function openDoc(id,done){
  const d=DOCS[id]; if(!d){ if(done)done(); return; }
  if(!G.docsRead.includes(id)) G.docsRead.push(id);
  const m=openPanel('<h2>'+d.title+'</h2><p><span class="tag '+(d.kind==='史实'?'fact':'fic')+'">'+d.kind+'</span></p><p style="margin-top:10px">'+d.text+'</p><div class="closeRow"><button class="pbtn main" id="docClose">收好</button></div>');
  m.querySelector('#docClose').addEventListener('click',()=>{ closePanel(); if(done)done(); });
}

// ---------- 状态 / 背包 / 存档 / 档案 / 设置 ----------
$('btnStatus').addEventListener('click',()=>{
  const s=G.stats;
  const relNames={mother:'母亲',xiaoman:'妹妹',zhiyuan:'周志远',qinghe:'沈清禾',xushan:'许正山',chenbo:'陈伯',wenying:'苏文英'};
  openPanel('<h2>林怀安 · 状态</h2><p>身份：'+G.role+'<br>地点：'+G.loc+' · '+G.date+'</p>'+
   '<div class="statGrid">'+Object.keys(STATNAMES).map(k=>'<div class="statRow"><span>'+STATNAMES[k]+'</span><b>'+s[k]+'</b></div>').join('')+'</div>'+
   '<h3>资源</h3><div class="statGrid">'+Object.keys(RESNAMES).map(k=>'<div class="statRow"><span>'+RESNAMES[k]+'</span><b>'+G.res[k]+'</b></div>').join('')+'</div>'+
   '<h3>关系与下落</h3>'+Object.keys(relNames).map(k=>'<div class="relRow"><span>'+relNames[k]+'</span><span class="hearts">'+'●'.repeat(Math.max(0,G.rel[k]))+'○'.repeat(Math.max(0,5-Math.max(0,G.rel[k])))+'</span></div>').join('')+
   '<p style="margin-top:8px;font-size:13px;color:#a99e83">母亲：'+G.fate.mother+'<br>妹妹：'+G.fate.sister+'<br>志远：'+G.fate.zhiyuan+'<br>陈伯：'+G.fate.chenbo+'</p>'+
   '<h3>记下的姓名（'+G.names.length+'）</h3><p style="font-size:13.5px">'+(G.names.length?G.names.join('<br>'):'还没有记录。')+'</p>'+
   '<div class="closeRow"><button class="pbtn main" onclick="document.getElementById(\'modalRoot\').innerHTML=\'\'">关闭</button></div>');
});
$('btnBag').addEventListener('click',()=>{
  const useBtn=(k,label)=> G.res[k]>0? '<button class="pbtn" data-use="'+k+'" style="flex:0 0 auto;padding:6px 12px">'+label+'</button>':'';
  openPanel('<h2>背包</h2><p>资源：'+Object.keys(RESNAMES).map(k=>RESNAMES[k]+' '+G.res[k]).join(' · ')+'</p>'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">'+useBtn('food','吃干粮（体力+15）')+useBtn('water','喝水（体力+6）')+useBtn('bandage','用绷带（生命+18）')+useBtn('med','用药品（生命+30）')+'</div>'+
   G.items.map(id=>{ const it=ITEMS[id]; if(!it) return ''; return '<div class="itemRow"><div class="ic">'+it.icon+'</div><div><div class="nm">'+it.name+'</div><div class="ds">'+it.desc+'</div></div></div>'; }).join('')+
   (G.letter.length?'<div class="itemRow"><div class="ic">💌</div><div><div class="nm">家书（亲笔）</div><div class="ds">「'+G.letter.join('')+'」</div></div></div>':'')+
   '<div class="closeRow"><button class="pbtn main" id="bagClose">关闭</button></div>');
  $('modalRoot').querySelector('#bagClose').addEventListener('click',closePanel);
  $('modalRoot').querySelectorAll('[data-use]').forEach(b=>b.addEventListener('click',()=>{
    const k=b.dataset.use; if(G.res[k]<=0) return; G.res[k]--;
    if(k==='food'){ G.stats.sta=clamp(G.stats.sta+15,0,100); G.stats.hunger=clamp(G.stats.hunger-20,0,100); }
    if(k==='water'){ G.stats.sta=clamp(G.stats.sta+6,0,100); }
    if(k==='bandage'){ G.stats.hp=clamp(G.stats.hp+18,0,100); }
    if(k==='med'){ G.stats.hp=clamp(G.stats.hp+30,0,100); G.stats.stress=clamp(G.stats.stress-5,0,100); }
    updateHUD(); toast('已使用'+RESNAMES[k]); closePanel();
  }));
});
$('btnSave').addEventListener('click',()=>{
  const rows=['auto','1','2','3'].map(s=>{
    const raw=localStorage.getItem('jinling_save_'+s); let info='（空）';
    if(raw){ const d=JSON.parse(raw); info=d.G.chapter+' · '+d.G.date+' · '+new Date(d.at).toLocaleString(); }
    return '<div class="slotRow"><div class="info"><b style="color:#f0dfae">'+(s==='auto'?'自动存档':'存档位 '+s)+'</b><br>'+info+'</div><div style="display:flex;gap:6px">'+(s!=='auto'?'<button class="pbtn" data-save="'+s+'" style="flex:0 0 auto;padding:7px 13px">保存</button>':'')+(raw?'<button class="pbtn" data-load="'+s+'" style="flex:0 0 auto;padding:7px 13px">读取</button>':'')+'</div></div>';
  }).join('');
  openPanel('<h2>存档</h2>'+rows+'<div class="closeRow"><button class="pbtn main" id="svClose">关闭</button></div>');
  $('modalRoot').querySelector('#svClose').addEventListener('click',closePanel);
  $('modalRoot').querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>{ saveGame(b.dataset.save); closePanel(); }));
  $('modalRoot').querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>{ closePanel(); loadGame(b.dataset.load); }));
});
function openArchive(tab){
  const chars=Object.values(CHARACTERS).filter(Boolean).map(c=>'<div class="docItem"><b style="color:#f0dfae">'+c.name+'</b><span class="tag fic">'+c.title+'</span><small>'+c.profile+'</small></div>').join('');
  const npc='<p style="font-size:13.5px;line-height:1.9">'+NPC_LIST.map(n=>n[0]+'（'+n[1]+'）').join(' · ')+'</p>';
  const docs=Object.keys(DOCS).map(id=>{ const d=DOCS[id]; const read=G.docsRead.includes(id)||mode==='menu'&&false; const unlocked=JSON.parse(localStorage.getItem('jinling_alldocs')||'[]'); const show=G.docsRead.includes(id)||unlocked.includes(id);
    return '<div class="docItem">'+(show?'<a href="#" data-doc="'+id+'" style="color:#f0dfae;text-decoration:none">'+d.title+'</a><span class="tag '+(d.kind==='史实'?'fact':'fic')+'">'+d.kind+'</span>':'<span style="opacity:.55">？？？（尚未获得）</span>')+'</div>'; }).join('');
  const unl=JSON.parse(localStorage.getItem('jinling_endings')||'[]');
  const ends=ENDING_LIST.map(e=>'<div class="endItem '+(unl.includes(e[0])?'':'locked')+'">'+e[0]+' · '+(unl.includes(e[0])?e[1]:'？？？')+'<small>'+e[2]+'</small></div>').join('');
  openPanel('<h2>历史档案</h2><h3>主要人物</h3>'+chars+'<h3>次要人物（'+NPC_LIST.length+'）</h3>'+npc+'<h3>文书与史实卡（已获得 '+G.docsRead.length+' / '+Object.keys(DOCS).length+'）</h3>'+docs+'<h3>结局图鉴（'+unl.length+' / 24）</h3>'+ends+'<div class="closeRow"><button class="pbtn main" id="arClose">关闭</button></div>');
  $('modalRoot').querySelector('#arClose').addEventListener('click',closePanel);
  $('modalRoot').querySelectorAll('[data-doc]').forEach(a=>a.addEventListener('click',e=>{ e.preventDefault(); const id=a.dataset.doc; const all=JSON.parse(localStorage.getItem('jinling_alldocs')||'[]'); if(!all.includes(id)){ all.push(id); localStorage.setItem('jinling_alldocs',JSON.stringify(all)); } openDoc(id,null); }));
}
$('btnArchive').addEventListener('click',()=>openArchive());
$('btnEndGallery').addEventListener('click',()=>openArchive('endings'));
$('btnChapters').addEventListener('click',()=>{
  const unl=JSON.parse(localStorage.getItem('jinling_chapters')||'[]');
  openPanel('<h2>章节选择</h2><p style="font-size:13px;color:#a99e83">从章节开始将使用初始状态游玩该章（主线进度请用「继续游戏」）。</p>'+CHAPTERS.map(c=>'<div class="slotRow"><div class="info"><b style="color:#f0dfae">'+c.name+' · '+c.title+'</b><br>'+c.date+'</div>'+(unl.includes(c.id)?'<button class="pbtn" data-ch="'+c.label+'" style="flex:0 0 auto;padding:7px 14px">开始</button>':'<span style="opacity:.5;font-size:13px">未解锁</span>')+'</div>').join('')+'<div class="closeRow"><button class="pbtn main" id="chClose">关闭</button></div>');
  $('modalRoot').querySelector('#chClose').addEventListener('click',closePanel);
  $('modalRoot').querySelectorAll('[data-ch]').forEach(b=>b.addEventListener('click',()=>{ closePanel(); newGame(b.dataset.ch); }));
});
$('btnSettings').addEventListener('click',()=>{
  openPanel('<h2>游戏设置</h2>'+
   '<div class="statRow"><span>文字速度</span><input type="range" id="setSpeed" min="4" max="30" value="'+settings.speed+'"></div>'+
   '<div class="statRow"><span>字号</span><select id="setFs"><option value="0.92"'+(settings.fs==0.92?' selected':'')+'>小</option><option value="1"'+(settings.fs==1?' selected':'')+'>标准</option><option value="1.14"'+(settings.fs==1.14?' selected':'')+'>大</option></select></div>'+
   '<div class="statRow"><span>剧情难度</span><select id="setDiff"><option value="story"'+(settings.difficulty==='story'?' selected':'')+'>剧情（惩罚减半）</option><option value="standard"'+(settings.difficulty==='standard'?' selected':'')+'>标准</option></select></div>'+
   '<div class="statRow"><span>自动播放</span><select id="setAuto"><option value="0"'+(!settings.auto?' selected':'')+'>关</option><option value="1"'+(settings.auto?' selected':'')+'>开</option></select></div>'+
   '<div class="closeRow"><button class="pbtn" id="wipeBtn">清除全部存档</button><button class="pbtn main" id="setClose">完成</button></div>');
  $('modalRoot').querySelector('#setSpeed').addEventListener('input',e=>{ settings.speed=+e.target.value; saveSettings(); });
  $('modalRoot').querySelector('#setFs').addEventListener('change',e=>{ settings.fs=+e.target.value; saveSettings(); });
  $('modalRoot').querySelector('#setDiff').addEventListener('change',e=>{ settings.difficulty=e.target.value; saveSettings(); });
  $('modalRoot').querySelector('#setAuto').addEventListener('change',e=>{ settings.auto=e.target.value==='1'; saveSettings(); });
  $('modalRoot').querySelector('#setClose').addEventListener('click',closePanel);
  $('modalRoot').querySelector('#wipeBtn').addEventListener('click',()=>{ if(confirm('确定清除全部存档、图鉴与章节解锁吗？')){ Object.keys(localStorage).filter(k=>k.startsWith('jinling_')).forEach(k=>localStorage.removeItem(k)); closePanel(); refreshMenu(); toast('已清除'); } });
});
$('btnCredits').addEventListener('click',()=>{
  openPanel('<h2>制作说明 · 史实与虚构</h2><p>《金陵未眠：1937》是一部历史题材互动叙事游戏。</p><h3>真实的部分</h3><p>1937年南京保卫战、12月12日撤退命令、12月13日南京沦陷、日军在南京实施的大规模屠杀与暴行、南京安全区的存在、中国人民坚持抗战直至1945年胜利——这些历史事实不容改变，游戏中以【史实】标注。</p><h3>虚构的部分</h3><p>林怀安一家、陈记修车铺、游戏中的基层小队与全部具体情节均为艺术虚构，不对应真实人物与部队番号；虚构文书均标注为【虚构文书】，不冒充历史档案。</p><h3>创作原则</h3><p>不以猎奇方式呈现苦难；不把受害者当作积分与资源；人物的命运由玩家的选择与历史的洪流共同决定。「我只是想活下去。后来，我发现还有一些事，比活着更难，也更不能放弃。」</p><p style="margin-top:10px;color:#a99e83;font-size:13px">版本 V1.0 · 画面与人物动画均为程序实时绘制 · 建议使用声音游玩（落子声、环境音为合成音效）</p><div class="closeRow"><button class="pbtn main" id="crClose">关闭</button></div>');
  $('modalRoot').querySelector('#crClose').addEventListener('click',closePanel);
});
$('btnAuto').addEventListener('click',e=>{ settings.auto=!settings.auto; saveSettings(); e.target.classList.toggle('on',settings.auto); toast('自动播放 '+(settings.auto?'开':'关')); });
$('btnLog').addEventListener('click',()=>{ openPanel('<h2>回想</h2>'+G.log.slice(-40).map(l=>'<p style="margin-bottom:7px"><b style="color:#c9a86a">'+(l.who==='n'?'旁白':(CHARACTERS[l.who]?CHARACTERS[l.who].name:l.who))+'：</b>'+l.text+'</p>').join('')+'<div class="closeRow"><button class="pbtn main" id="logClose">关闭</button></div>'); $('modalRoot').querySelector('#logClose').addEventListener('click',closePanel); });
$('btnHide').addEventListener('click',()=>{ $('dialogue').classList.add('hidden'); $('hud').classList.add('hidden'); toast('点画面恢复界面'); canvas.addEventListener('click',function h(){ $('dialogue').classList.remove('hidden'); if(mode==='play') $('hud').classList.remove('hidden'); canvas.removeEventListener('click',h); }); });
addEventListener('keydown',e=>{ if(e.code==='Space'||e.code==='Enter'){ if(mode==='play'&&pendingSay){ e.preventDefault(); advanceSay(); } } if(e.code==='Escape') closePanel(); });

// ---------- 小游戏 ----------
function openGame(kind,done){
  if(kind==='repair') return gameRepair(done);
  if(kind==='letter') return gameLetter(done);
  if(kind==='clue') return gameClue(done);
  if(kind==='evidence') return gameEvidence(done);
  if(kind==='triage') return gameTriage(done);
  done({});
}
function gameRepair(done){
  const faults=[
    {name:'故障一：链条断成两截',q:'用什么工具接链条？',opts:['链条钳','补胎胶','锉刀'],right:0,tip:'接链条，要用链条钳对准链销。'},
    {name:'故障二：内胎有个小孔，慢慢撒气',q:'怎么处理？',opts:['换整条新胎','找到漏点，贴补胎胶','多打点气凑合'],right:1,tip:'小孔不用换胎，找到漏点贴上补胎胶就行。'},
    {name:'故障三：刹车皮磨秃了，一捏刹车直滑',q:'怎么办？',opts:['上点油就不滑了','换一副新刹车皮','把刹车线剪短'],right:1,tip:'刹车关乎人命，磨秃了必须换新。'}
  ];
  let idx=0, wrongs=0;
  function render(){
    if(idx>=faults.length){ closePanel(); toast(wrongs===0?'修车：一次成功，手艺精湛':'修车完成'); done(wrongs===0?{stat:{repair:8},flag:{repairPerfect:true}}:{stat:{repair:4}}); return; }
    const f=faults[idx];
    const m=openPanel('<h2>🔧 修车</h2><p>'+f.name+'</p><p style="color:#a99e83;font-size:13.5px">沈清禾的车是送药用的——修稳妥，别赶工。</p><h3>'+f.q+'</h3>'+f.opts.map((o,i)=>'<button class="gameOpt" data-o="'+i+'">'+o+'</button>').join(''));
    m.querySelectorAll('[data-o]').forEach(b=>b.addEventListener('click',()=>{
      if(+b.dataset.o===f.right){ b.classList.add('right'); setTimeout(()=>{ idx++; render(); },450); }
      else { b.classList.add('wrong'); wrongs++; toast(f.tip); }
    }));
  }
  render();
}
function gameLetter(done){
  const groups=[
    {name:'开头',opts:['娘，我在外头一切都好，别惦记。','娘，儿子不孝，这些日子让您操心了。','娘，铺子里的活儿您别干，等我回来。']},
    {name:'中间',opts:['等战事过去，我还要回家开店，招牌都想好了。','如果小满问起来，就说我没忘记答应她的自行车。','志远和我在一起，我们互相照应着。']},
    {name:'结尾',opts:['天冷了，您把那件棉袄穿上，别省着。','布袋我天天带着，就像您在跟前一样。','等我回来，咱们还在一张桌上吃饭。']}
  ];
  const pick=[-1,-1,-1];
  function render(){
    const m=openPanel('<h2>✉️ 写给家里的信</h2><p style="font-size:13.5px;color:#a99e83">每段选一句，组成你的家书。这封信会被保存到故事的最后。</p>'+
      groups.map((g,gi)=>'<h3>'+g.name+'</h3>'+g.opts.map((o,oi)=>'<button class="gameOpt '+(pick[gi]===oi?'sel':'')+'" data-g="'+gi+'" data-o="'+oi+'">'+o+'</button>').join('')).join('')+
      '<div class="letterPaper">'+(pick.every(p=>p>=0)? groups.map((g,gi)=>g.opts[pick[gi]]).join('') : '（选好三句，这里会拼出你的信）')+'</div>'+
      '<div class="closeRow"><button class="pbtn main" id="ltOk" '+(pick.every(p=>p>=0)?'':'disabled')+'>折好，放进布袋</button></div>');
    m.querySelectorAll('[data-g]').forEach(b=>b.addEventListener('click',()=>{ pick[+b.dataset.g]=+b.dataset.o; render(); }));
    const ok=m.querySelector('#ltOk'); if(ok) ok.addEventListener('click',()=>{ G.letter=groups.map((g,gi)=>g.opts[pick[gi]]); closePanel(); done({rel:{mother:1},flag:{letter_written:true}}); });
  }
  render();
}
function gameClue(done){
  const qs=[
    {q:'线索一：登记表上说，有个穿红棉袄的女孩被送到了收容所。先核对什么？',opts:['直接去收容所挨个屋子找','先核对收容所的儿童登记名单','先问门口卖茶的小贩'],right:1},
    {q:'线索二：名单上有两个穿红棉袄的女孩，年纪都对得上。怎么区分？',opts:['让母亲凭感觉认','核对细节：王小丫左眉有痣，随身带一块蓝手帕','两个都登记为「已找到」'],right:1},
    {q:'线索三：细节对上了一个，但孩子受惊不说话。最后怎么确认？',opts:['让母亲说出只有母女俩知道的事来印证','看长得像不像就行','先带走，错了再送回来'],right:0}
  ];
  let idx=0, score=0;
  function render(){
    if(idx>=qs.length){ closePanel(); if(score>=2){ toast('线索核对完成：王小丫已确认'); done({stat:{record:6},flag:{clue_solved:true},flagAdd:{evidence:5},namesAdd:['王小丫，女，九岁，已确认在收容所，与母亲团聚']}); } else { toast('线索没有完全对上，还需继续核对'); done({flag:{clue_partial:true}}); } return; }
    const f=qs[idx];
    const m=openPanel('<h2>🔎 线索核对（'+(idx+1)+' / 3）</h2><p>'+f.q+'</p>'+f.opts.map((o,i)=>'<button class="gameOpt" data-o="'+i+'">'+o+'</button>').join(''));
    m.querySelectorAll('[data-o]').forEach(b=>b.addEventListener('click',()=>{ if(+b.dataset.o===f.right){ score++; b.classList.add('right'); } else b.classList.add('wrong'); setTimeout(()=>{ idx++; render(); },420); }));
  }
  render();
}
function gameEvidence(done){
  const recs=[
    {t:'记录甲：讲述人签名、日期、地点俱全，所述与另一独立记录吻合。',right:0},
    {t:'记录乙：转述邻居的话，无签名，日期只写了「月中」。',right:1},
    {t:'记录丙：地点写了两个，日期前后矛盾，讲述人也记不清。',right:1},
    {t:'记录丁：两人分开讲述同一件事，细节互相印证。',right:0}
  ];
  let idx=0, score=0;
  function render(){
    if(idx>=recs.length){ closePanel(); toast('证据整理完成：核对对了 '+score+' / 4'); done({flagAdd:{evidence:score*8},stat:{record:score*2},flag:{evidence_sorted:true}}); return; }
    const r=recs[idx];
    const m=openPanel('<h2>🗂️ 证据整理（'+(idx+1)+' / 4）</h2><p>'+r.t+'</p><p style="font-size:13.5px;color:#a99e83">苏文英的规矩：亲历与传闻分开；宁可少记，不可乱记。</p><button class="gameOpt" data-o="0">判定：已核实</button><button class="gameOpt" data-o="1">判定：待核实</button>');
    m.querySelectorAll('[data-o]').forEach(b=>b.addEventListener('click',()=>{ if(+b.dataset.o===r.right){ score++; b.classList.add('right'); } else b.classList.add('wrong'); setTimeout(()=>{ idx++; render(); },420); }));
  }
  render();
}
function gameTriage(done){
  const order=['大出血的伤员（先止血）','呼吸困难的伤员（先通气）','手臂骨折的伤员（固定即可）'];
  const shuffled=[order[2],order[0],order[1]];
  let expect=0, mistakes=0; const picked=[];
  function render(){
    const m=openPanel('<h2>⛑️ 战地救护排序</h2><p>三名伤员同时送到。按何医生教的顺序处理：先看呼吸与大出血，再处理骨折。依次点击你的处理顺序。</p>'+
      shuffled.map((o,i)=>'<button class="gameOpt" data-o="'+i+'" '+(picked.includes(i)?'disabled style="opacity:.4"':'')+'>'+o+'</button>').join('')+
      '<p style="font-size:13.5px;color:#a99e83">已选顺序：'+picked.map(i=>shuffled[i].split('（')[0]).join(' → ')+'</p>');
    m.querySelectorAll('[data-o]').forEach(b=>b.addEventListener('click',()=>{
      const i=+b.dataset.o;
      if(shuffled[i]===order[expect]){ picked.push(i); expect++; if(expect>=3){ closePanel(); toast(mistakes===0?'分诊准确，一条命都没耽误':'分诊完成'); done(mistakes===0?{stat:{med:6},flag:{triage_good:true}}:{stat:{med:3}}); return; } render(); }
      else { mistakes++; b.classList.add('wrong'); toast('顺序不对——先救命，再治伤'); }
    }));
  }
  render();
}

// ---------- 启动 ----------
$('fade').style.opacity='1';
setTimeout(()=>{ $('fade').style.opacity='0'; },150);
refreshMenu();
})();
