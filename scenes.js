// ===== 场景绘制：程序化2D电影式场景 + 人物动画 =====
// 所有场景按相对坐标绘制，任意宽高比（竖屏/横屏/折叠展开/iPad/PC）自适应。
window.SC = (function(){
  function lerp(a,b,k){return a+(b-a)*k}
  function grad(ctx,x0,y0,x1,y1,stops){ const g=ctx.createLinearGradient(x0,y0,x1,y1); for(const [o,c] of stops) g.addColorStop(o,c); return g; }
  // 确定性伪随机（同一场景构图稳定）
  function rng(seed){ let s=seed*9301+49297; return function(){ s=(s*9301+49297)%233280; return s/233280; }; }

  function skyline(ctx,W,H,baseY,seed,color,jitter){
    const r=rng(seed); ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,baseY);
    let x=0;
    while(x<W){ const bw=W*(0.05+r()*0.09), bh=H*(0.05+r()*jitter);
      ctx.lineTo(x,baseY-bh);
      // 屋顶坡面
      ctx.lineTo(x+bw*0.18,baseY-bh-H*0.018); ctx.lineTo(x+bw*0.5,baseY-bh-H*0.03); ctx.lineTo(x+bw*0.82,baseY-bh-H*0.018); ctx.lineTo(x+bw,baseY-bh);
      ctx.lineTo(x+bw,baseY); x+=bw+W*0.004;
    }
    ctx.lineTo(W,baseY); ctx.closePath(); ctx.fill();
  }
  function windows(ctx,W,H,baseY,seed,alpha){
    const r=rng(seed+7); ctx.fillStyle='rgba(255,196,110,'+alpha+')';
    for(let i=0;i<26;i++){ const x=r()*W, y=baseY-H*(0.03+r()*0.16), w=3+r()*3; if(r()>0.45) ctx.fillRect(x,y,w,w*0.8); }
  }
  function lampPost(ctx,x,gy,h,on){
    ctx.strokeStyle='rgba(20,16,12,.9)'; ctx.lineWidth=Math.max(2,h*0.045);
    ctx.beginPath(); ctx.moveTo(x,gy); ctx.lineTo(x,gy-h); ctx.lineTo(x+h*0.22,gy-h); ctx.stroke();
    if(on){ const g=ctx.createRadialGradient(x+h*0.24,gy-h+2,1,x+h*0.24,gy-h+2,h*0.5); g.addColorStop(0,'rgba(255,205,120,.85)'); g.addColorStop(1,'rgba(255,205,120,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x+h*0.24,gy-h+2,h*0.5,0,6.29); ctx.fill(); ctx.fillStyle='#ffd98f'; ctx.beginPath(); ctx.arc(x+h*0.24,gy-h+2,3.2,0,6.29); ctx.fill(); }
  }
  function riverBand(ctx,W,H,y0,y1,t,skyTop,skyBot){
    ctx.fillStyle=grad(ctx,0,y0,0,y1,[[0,skyTop],[1,skyBot]]); ctx.fillRect(0,y0,W,y1-y0);
    ctx.strokeStyle='rgba(255,240,200,.28)'; ctx.lineWidth=1.2;
    for(let i=0;i<14;i++){ const y=y0+(y1-y0)*((i*0.37+ (t*0.008*(1+i%3)))%1); const len=W*(0.03+((i*53)%40)/300); const x=((i*197)%100)/100*W; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+len,y); ctx.stroke(); }
  }
  function smokeColumns(ctx,W,H,baseY,t,seed,n,alpha){
    const r=rng(seed);
    for(let i=0;i<n;i++){ const bx=r()*W, bw=W*(0.02+r()*0.03);
      for(let k=0;k<5;k++){ const yy=baseY-H*0.12-k*H*0.055 - ((t*6+k*17)%30)*0.4; const rad=bw*(0.7+k*0.35); const xx=bx+Math.sin(t*0.4+k+i)*6+k*4;
        const g=ctx.createRadialGradient(xx,yy,1,xx,yy,rad); g.addColorStop(0,'rgba(52,48,46,'+alpha+')'); g.addColorStop(1,'rgba(52,48,46,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(xx,yy,rad,0,6.29); ctx.fill(); }
    }
  }
  function rain(ctx,W,H,t,alpha){
    ctx.strokeStyle='rgba(200,215,230,'+alpha+')'; ctx.lineWidth=1.1; ctx.beginPath();
    for(let i=0;i<70;i++){ const x=((i*89 + t*420)% (W+80))-40, y=((i*61 + t*640)%(H+40))-20; ctx.moveTo(x,y); ctx.lineTo(x-4,y+13); }
    ctx.stroke();
  }
  function embers(ctx,W,H,t){
    ctx.fillStyle='rgba(255,150,70,.5)';
    for(let i=0;i<22;i++){ const x=((i*173)%100)/100*W + Math.sin(t+i)*8, y=H*0.9 - ((t*14*(1+i%4)+i*47)%(H*0.55)); ctx.fillRect(x,y,2.2,2.2); }
  }
  function ground(ctx,W,H,gy,color){ ctx.fillStyle=color; ctx.fillRect(0,gy,W,H-gy); }

  const painters={
    menu(c,W,H,t){ // 黄昏秦淮河畔街道
      c.fillStyle=grad(c,0,0,0,H,[[0,'#2e3a55'],[0.45,'#7a5a44'],[0.72,'#c98d54'],[1,'#3a2c20']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(255,214,150,.9)'; c.beginPath(); c.arc(W*0.78,H*0.2,H*0.045,0,6.29); c.fill();
      c.fillStyle='rgba(255,214,150,.18)'; c.beginPath(); c.arc(W*0.78,H*0.2,H*0.11,0,6.29); c.fill();
      skyline(c,W,H,H*0.62,3,'rgba(38,32,30,.85)',0.14); windows(c,W,H,H*0.62,3,.5);
      riverBand(c,W,H,H*0.62,H*0.8,t,'#8a6248','#4a3a30');
      ground(c,W,H,H*0.8,'#33281e');
      lampPost(c,W*0.12,H*0.97,H*0.17,true); lampPost(c,W*0.88,H*0.97,H*0.17,true);
      // 远处城墙
      c.fillStyle='rgba(30,28,30,.55)'; c.fillRect(0,H*0.5,W*0.3,H*0.06); for(let i=0;i<8;i++) c.fillRect(i*W*0.04,H*0.478,W*0.02,H*0.024);
    },
    river_dawn(c,W,H,t){
      c.fillStyle=grad(c,0,0,0,H,[[0,'#5a6f8e'],[0.5,'#c7a06b'],[0.75,'#e8c88f'],[1,'#4a3b2c']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(255,226,160,.95)'; c.beginPath(); c.arc(W*0.24,H*0.3,H*0.04,0,6.29); c.fill();
      skyline(c,W,H,H*0.6,11,'rgba(52,44,40,.8)',0.13); windows(c,W,H,H*0.6,11,.35);
      riverBand(c,W,H,H*0.6,H*0.82,t,'#a87f52','#54402e');
      // 小船
      const bx=W*(0.62+0.05*Math.sin(t*0.11)), by=H*0.7;
      c.fillStyle='rgba(28,22,18,.92)'; c.beginPath(); c.moveTo(bx-34,by); c.lineTo(bx+34,by); c.lineTo(bx+24,by+9); c.lineTo(bx-24,by+9); c.closePath(); c.fill();
      c.strokeStyle='rgba(28,22,18,.92)'; c.lineWidth=2.4; c.beginPath(); c.moveTo(bx+8,by); c.lineTo(bx+20,by-16); c.stroke();
      ground(c,W,H,H*0.82,'#3d2f22'); lampPost(c,W*0.9,H*0.99,H*0.16,true);
    },
    shop(c,W,H,t){ // 修理铺内景，暖光
      c.fillStyle=grad(c,0,0,0,H,[[0,'#4a3826'],[1,'#2a1f14']]); c.fillRect(0,0,W,H);
      c.fillStyle='#5d4630'; c.fillRect(W*0.06,H*0.1,W*0.4,H*0.52); // 工具墙
      c.strokeStyle='rgba(230,200,140,.5)'; c.lineWidth=2;
      for(let i=0;i<4;i++){ c.beginPath(); c.moveTo(W*(0.1+i*0.09),H*0.18); c.lineTo(W*(0.1+i*0.09),H*0.3); c.stroke(); c.beginPath(); c.arc(W*(0.1+i*0.09),H*0.33,4,0,6.29); c.stroke(); }
      // 窗
      c.fillStyle='rgba(214,178,120,.34)'; c.fillRect(W*0.62,H*0.12,W*0.28,H*0.4);
      c.strokeStyle='#20180f'; c.lineWidth=5; c.strokeRect(W*0.62,H*0.12,W*0.28,H*0.4);
      c.beginPath(); c.moveTo(W*0.76,H*0.12); c.lineTo(W*0.76,H*0.52); c.moveTo(W*0.62,H*0.32); c.lineTo(W*0.9,H*0.32); c.stroke();
      // 悬挂的自行车轮
      c.strokeStyle='rgba(215,185,130,.65)'; c.lineWidth=3; c.beginPath(); c.arc(W*0.53,H*0.24,H*0.07,0,6.29); c.stroke(); c.beginPath(); c.arc(W*0.53,H*0.24,H*0.045,0,6.29); c.stroke();
      ground(c,W,H,H*0.78,'#241a10');
      // 工作台
      c.fillStyle='#3a2a18'; c.fillRect(W*0.05,H*0.66,W*0.34,H*0.035); c.fillRect(W*0.07,H*0.7,W*0.03,H*0.12); c.fillRect(W*0.33,H*0.7,W*0.03,H*0.12);
      const gl=c.createRadialGradient(W*0.5,H*0.3,10,W*0.5,H*0.4,H*0.55); gl.addColorStop(0,'rgba(255,196,110,.16)'); gl.addColorStop(1,'rgba(255,196,110,0)'); c.fillStyle=gl; c.fillRect(0,0,W,H);
    },
    street_day(c,W,H,t){
      c.fillStyle=grad(c,0,0,0,H,[[0,'#7d94ad'],[0.55,'#b6a98e'],[1,'#57493a']]); c.fillRect(0,0,W,H);
      skyline(c,W,H,H*0.64,21,'rgba(66,58,50,.85)',0.15); windows(c,W,H,H*0.64,21,.16);
      // 店铺招牌色块
      const r=rng(31); for(let i=0;i<6;i++){ c.fillStyle=['rgba(142,59,47,.75)','rgba(60,80,90,.75)','rgba(120,95,50,.75)'][i%3]; const x=W*(0.06+i*0.155); c.fillRect(x,H*0.5,W*0.075,H*0.11); }
      ground(c,W,H,H*0.8,'#4c4034');
      c.strokeStyle='rgba(240,230,200,.14)'; c.lineWidth=2; c.beginPath(); c.moveTo(0,H*0.885); c.lineTo(W,H*0.885); c.stroke();
      lampPost(c,W*0.06,H*0.98,H*0.15,false); lampPost(c,W*0.94,H*0.98,H*0.15,false);
    },
    street_dusk(c,W,H,t){
      c.fillStyle=grad(c,0,0,0,H,[[0,'#3c3a4e'],[0.55,'#8a5f45'],[1,'#3c2d20']]); c.fillRect(0,0,W,H);
      skyline(c,W,H,H*0.64,41,'rgba(40,34,32,.9)',0.14); windows(c,W,H,H*0.64,41,.55);
      ground(c,W,H,H*0.8,'#35281d'); lampPost(c,W*0.1,H*0.98,H*0.16,true); lampPost(c,W*0.9,H*0.98,H*0.16,true);
    },
    home(c,W,H,t){ // 家中内景，油灯
      c.fillStyle=grad(c,0,0,0,H,[[0,'#43331f'],[1,'#241a10']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(140,160,190,.28)'; c.fillRect(W*0.66,H*0.1,W*0.24,H*0.38); // 窗外夜色
      c.strokeStyle='#1c1409'; c.lineWidth=5; c.strokeRect(W*0.66,H*0.1,W*0.24,H*0.38);
      c.fillStyle='rgba(230,235,240,.75)'; c.beginPath(); c.arc(W*0.82,H*0.17,H*0.02,0,6.29); c.fill(); // 月
      // 桌
      c.fillStyle='#4a3319'; c.fillRect(W*0.3,H*0.62,W*0.42,H*0.04); c.fillRect(W*0.33,H*0.66,W*0.035,H*0.16); c.fillRect(W*0.64,H*0.66,W*0.035,H*0.16);
      // 碗（白点高光）
      c.fillStyle='#ddd6c4'; c.beginPath(); c.ellipse(W*0.44,H*0.615,W*0.02,H*0.012,0,0,6.29); c.fill(); c.beginPath(); c.ellipse(W*0.56,H*0.615,W*0.02,H*0.012,0,0,6.29); c.fill();
      // 油灯光晕
      const flick=0.9+0.1*Math.sin(t*9)+0.04*Math.sin(t*23);
      const gl=c.createRadialGradient(W*0.5,H*0.56,4,W*0.5,H*0.56,H*0.34*flick); gl.addColorStop(0,'rgba(255,190,100,.4)'); gl.addColorStop(1,'rgba(255,190,100,0)'); c.fillStyle=gl; c.fillRect(0,0,W,H);
      c.fillStyle='#ffca7a'; c.beginPath(); c.ellipse(W*0.5,H*0.565,3.4,6.4,0,0,6.29); c.fill();
      ground(c,W,H,H*0.8,'#20160c');
    },
    roof_night(c,W,H,t){
      c.fillStyle=grad(c,0,0,0,H,[[0,'#141a2c'],[0.6,'#2c3048'],[1,'#1c1a20']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(235,238,240,.85)'; c.beginPath(); c.arc(W*0.16,H*0.15,H*0.026,0,6.29); c.fill();
      const r=rng(99); c.fillStyle='rgba(255,255,255,.6)'; for(let i=0;i<40;i++) c.fillRect(r()*W,r()*H*0.4,1.4,1.4);
      skyline(c,W,H,H*0.7,51,'rgba(16,15,20,.95)',0.12); windows(c,W,H,H*0.7,51,.4);
      smokeColumns(c,W,H,H*0.62,t,77,2,.16);
      // 屋顶瓦面
      c.fillStyle='#26202a'; c.beginPath(); c.moveTo(0,H); c.lineTo(0,H*0.82); c.lineTo(W,H*0.76); c.lineTo(W,H); c.closePath(); c.fill();
      c.strokeStyle='rgba(200,190,210,.13)'; for(let i=0;i<7;i++){ c.beginPath(); c.moveTo(0,H*(0.84+i*0.024)); c.lineTo(W,H*(0.78+i*0.024)); c.stroke(); }
      // 远处火光
      const fg=c.createRadialGradient(W*0.86,H*0.66,4,W*0.86,H*0.66,H*0.14); fg.addColorStop(0,'rgba(255,130,60,.5)'); fg.addColorStop(1,'rgba(255,130,60,0)'); c.fillStyle=fg; c.fillRect(W*0.66,H*0.45,W*0.4,H*0.4);
    },
    road(c,W,H,t){ // 城外道路与难民
      c.fillStyle=grad(c,0,0,0,H,[[0,'#6d7683'],[0.55,'#a39a86'],[1,'#57503f']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(90,92,80,.7)'; c.beginPath(); c.moveTo(0,H*0.58); c.quadraticCurveTo(W*0.3,H*0.44,W*0.62,H*0.56); c.quadraticCurveTo(W*0.85,H*0.64,W,H*0.55); c.lineTo(W,H*0.66); c.lineTo(0,H*0.66); c.closePath(); c.fill(); // 远山
      smokeColumns(c,W,H,H*0.55,t,55,3,.2);
      ground(c,W,H,H*0.78,'#5c5142');
      c.fillStyle='#6e6152'; c.beginPath(); c.moveTo(W*0.32,H); c.lineTo(W*0.47,H*0.78); c.lineTo(W*0.56,H*0.78); c.lineTo(W*0.78,H); c.closePath(); c.fill(); // 路面透视
      // 枯树
      c.strokeStyle='rgba(30,26,20,.85)'; c.lineWidth=4; c.beginPath(); c.moveTo(W*0.14,H*0.8); c.lineTo(W*0.15,H*0.6); c.lineTo(W*0.11,H*0.52); c.moveTo(W*0.15,H*0.62); c.lineTo(W*0.2,H*0.54); c.stroke();
    },
    gate(c,W,H,t){ // 城墙城门
      c.fillStyle=grad(c,0,0,0,H,[[0,'#565d6e'],[0.5,'#97907e'],[1,'#4c4438']]); c.fillRect(0,0,W,H);
      c.fillStyle='#4e463c'; c.fillRect(W*0.04,H*0.3,W*0.92,H*0.42); // 墙体
      c.fillStyle='rgba(0,0,0,.16)'; for(let i=0;i<5;i++) c.fillRect(W*0.04,H*(0.36+i*0.07),W*0.92,2);
      for(let i=0;i<16;i++) c.fillRect(W*(0.05+i*0.058),H*0.262,W*0.032,H*0.04); // 垛口
      c.fillStyle='#2c2620'; c.beginPath(); c.moveTo(W*0.42,H*0.72); c.lineTo(W*0.42,H*0.52); c.quadraticCurveTo(W*0.5,H*0.42,W*0.58,H*0.52); c.lineTo(W*0.58,H*0.72); c.closePath(); c.fill(); // 门洞
      c.fillStyle='#5d5344'; c.fillRect(W*0.36,H*0.2,W*0.28,H*0.1); // 门楼基座
      c.fillStyle='#3f382e'; c.beginPath(); c.moveTo(W*0.33,H*0.2); c.lineTo(W*0.5,H*0.13); c.lineTo(W*0.67,H*0.2); c.closePath(); c.fill();
      ground(c,W,H,H*0.8,'#554a3a');
      smokeColumns(c,W,H,H*0.3,t,66,2,.14);
    },
    camp(c,W,H,t){ // 军营黄昏
      c.fillStyle=grad(c,0,0,0,H,[[0,'#4a4258'],[0.55,'#a06a44'],[1,'#4a3826']]); c.fillRect(0,0,W,H);
      skyline(c,W,H,H*0.6,61,'rgba(52,44,40,.75)',0.1);
      // 帐篷
      for(const fx of [0.1,0.62]){ c.fillStyle='#6b6248'; c.beginPath(); c.moveTo(W*fx,H*0.76); c.lineTo(W*(fx+0.13),H*0.56); c.lineTo(W*(fx+0.26),H*0.76); c.closePath(); c.fill(); c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.moveTo(W*(fx+0.1),H*0.76); c.lineTo(W*(fx+0.13),H*0.63); c.lineTo(W*(fx+0.16),H*0.76); c.closePath(); c.fill(); }
      // 物资箱
      c.fillStyle='#5d4630'; c.fillRect(W*0.42,H*0.68,W*0.09,H*0.07); c.fillRect(W*0.43,H*0.615,W*0.07,H*0.06);
      ground(c,W,H,H*0.8,'#453723');
      // 篝火
      const fl=0.85+0.15*Math.sin(t*11)+0.08*Math.sin(t*27);
      const fg=c.createRadialGradient(W*0.52,H*0.82,2,W*0.52,H*0.82,H*0.09*fl); fg.addColorStop(0,'rgba(255,170,80,.75)'); fg.addColorStop(1,'rgba(255,170,80,0)'); c.fillStyle=fg; c.fillRect(W*0.4,H*0.68,W*0.24,H*0.26);
    },
    hospital(c,W,H,t){ // 救护站内景
      c.fillStyle=grad(c,0,0,0,H,[[0,'#6d6a5e'],[1,'#3d3a32']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(220,222,210,.2)'; c.fillRect(W*0.05,H*0.08,W*0.9,H*0.5);
      // 床位
      for(const fx of [0.08,0.62]){ c.fillStyle='#8b8578'; c.fillRect(W*fx,H*0.62,W*0.3,H*0.045); c.fillStyle='#cfc9ba'; c.fillRect(W*fx,H*0.585,W*0.3,H*0.04); c.fillStyle='#e8e4da'; c.fillRect(W*(fx+0.01),H*0.575,W*0.07,H*0.035); }
      // 红十字布幔
      c.fillStyle='#ded9cc'; c.fillRect(W*0.44,H*0.1,W*0.12,H*0.2); c.fillStyle='#a03a30'; c.fillRect(W*0.485,H*0.13,W*0.03,H*0.14); c.fillRect(W*0.455,H*0.185,W*0.09,H*0.03);
      ground(c,W,H,H*0.78,'#33302a');
      const gl=c.createRadialGradient(W*0.5,H*0.25,10,W*0.5,H*0.3,H*0.5); gl.addColorStop(0,'rgba(255,240,200,.14)'); gl.addColorStop(1,'rgba(255,240,200,0)'); c.fillStyle=gl; c.fillRect(0,0,W,H);
    },
    ruin(c,W,H,t){ // 战后街道：灰、烟、沉默（不作猎奇表现）
      c.fillStyle=grad(c,0,0,0,H,[[0,'#4c4c4e'],[0.55,'#6d675f'],[1,'#33302c']]); c.fillRect(0,0,W,H);
      skyline(c,W,H,H*0.62,71,'rgba(38,36,36,.92)',0.2);
      smokeColumns(c,W,H,H*0.6,t,88,4,.22);
      ground(c,W,H,H*0.8,'#3a3631');
      // 瓦砾
      const r=rng(15); c.fillStyle='rgba(24,22,20,.8)';
      for(let i=0;i<12;i++){ const x=r()*W, y=H*(0.8+r()*0.14), s=W*(0.015+r()*0.03); c.beginPath(); c.moveTo(x,y); c.lineTo(x+s,y-s*0.5); c.lineTo(x+s*1.8,y); c.closePath(); c.fill(); }
      // 倒下的木牌
      c.save(); c.translate(W*0.3,H*0.87); c.rotate(-0.1); c.fillStyle='#4a3a26'; c.fillRect(-34,-9,68,18); c.strokeStyle='rgba(230,205,150,.6)'; c.strokeRect(-34,-9,68,18); c.restore();
      embers(c,W,H,t);
    },
    river_night(c,W,H,t){ // 江边夜
      c.fillStyle=grad(c,0,0,0,H,[[0,'#101623'],[0.55,'#27324a'],[1,'#14161c']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(235,238,240,.8)'; c.beginPath(); c.arc(W*0.84,H*0.13,H*0.022,0,6.29); c.fill();
      const r=rng(7); c.fillStyle='rgba(255,255,255,.5)'; for(let i=0;i<30;i++) c.fillRect(r()*W,r()*H*0.34,1.3,1.3);
      c.fillStyle='rgba(12,14,18,.95)'; c.beginPath(); c.moveTo(0,H*0.56); c.quadraticCurveTo(W*0.4,H*0.48,W,H*0.54); c.lineTo(W,H*0.62); c.lineTo(0,H*0.62); c.closePath(); c.fill(); // 对岸
      riverBand(c,W,H,H*0.62,H*0.84,t,'#232f47','#12151d');
      // 船影
      const bx=W*0.3+Math.sin(t*0.07)*8; c.fillStyle='rgba(8,9,12,.96)'; c.beginPath(); c.moveTo(bx-52,H*0.7); c.lineTo(bx+52,H*0.7); c.lineTo(bx+38,H*0.725); c.lineTo(bx-38,H*0.725); c.closePath(); c.fill(); c.fillRect(bx-14,H*0.655,28,H*0.045);
      ground(c,W,H,H*0.84,'#191a1c');
    },
    shelter(c,W,H,t){ // 安全区收容院落
      c.fillStyle=grad(c,0,0,0,H,[[0,'#77808c'],[0.55,'#a89a83'],[1,'#57503f']]); c.fillRect(0,0,W,H);
      skyline(c,W,H,H*0.58,81,'rgba(70,62,52,.85)',0.11);
      c.fillStyle='#7a6a4e'; c.fillRect(W*0.06,H*0.44,W*0.88,H*0.05); // 院墙檐
      // 白布幔（收容标记）
      c.fillStyle='rgba(228,224,212,.88)'; c.fillRect(W*0.42,H*0.2,W*0.16,H*0.24); c.fillStyle='#a03a30'; c.fillRect(W*0.485,H*0.24,W*0.03,H*0.16); c.fillRect(W*0.445,H*0.305,W*0.11,H*0.03);
      ground(c,W,H,H*0.8,'#5a5041');
      // 粥锅蒸汽
      c.fillStyle='#2e2a24'; c.fillRect(W*0.78,H*0.7,W*0.1,H*0.06);
      for(let k=0;k<3;k++){ const yy=H*0.68-k*H*0.045-((t*9+k*13)%22)*0.5; const g=c.createRadialGradient(W*0.83,yy,1,W*0.83,yy,13+k*5); g.addColorStop(0,'rgba(230,230,225,.28)'); g.addColorStop(1,'rgba(230,230,225,0)'); c.fillStyle=g; c.beginPath(); c.arc(W*0.83,yy,13+k*5,0,6.29); c.fill(); }
    },
    record_room(c,W,H,t){
      c.fillStyle=grad(c,0,0,0,H,[[0,'#3e3222'],[1,'#211910']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(150,170,200,.22)'; c.fillRect(W*0.7,H*0.09,W*0.22,H*0.36);
      c.strokeStyle='#170f06'; c.lineWidth=5; c.strokeRect(W*0.7,H*0.09,W*0.22,H*0.36);
      // 书架与纸堆
      c.fillStyle='#4c3a24'; c.fillRect(W*0.05,H*0.14,W*0.3,H*0.46);
      const r=rng(23); for(let i=0;i<16;i++){ c.fillStyle=['#7a6a4a','#6d5840','#83744f'][i%3]; c.fillRect(W*(0.07+(i%8)*0.034),H*(0.17+Math.floor(i/8)*0.2),W*0.024,H*0.17); }
      c.fillStyle='#5d4630'; c.fillRect(W*0.34,H*0.64,W*0.44,H*0.04);
      c.fillStyle='#e6ddc6'; c.fillRect(W*0.44,H*0.6,W*0.1,H*0.045); c.fillRect(W*0.58,H*0.605,W*0.09,H*0.04);
      const gl=c.createRadialGradient(W*0.56,H*0.5,4,W*0.56,H*0.52,H*0.3); gl.addColorStop(0,'rgba(255,196,110,.3)'); gl.addColorStop(1,'rgba(255,196,110,0)'); c.fillStyle=gl; c.fillRect(0,0,W,H);
      ground(c,W,H,H*0.8,'#1d150c');
    },
    winter(c,W,H,t){ // 冬日街道，落雪
      c.fillStyle=grad(c,0,0,0,H,[[0,'#5d6672'],[0.55,'#8f9296'],[1,'#4a4a4c']]); c.fillRect(0,0,W,H);
      skyline(c,W,H,H*0.63,91,'rgba(52,52,56,.9)',0.14); windows(c,W,H,H*0.63,91,.3);
      ground(c,W,H,H*0.8,'#6f7072');
      c.fillStyle='rgba(240,242,244,.35)'; c.fillRect(0,H*0.8,W,H*0.02);
      c.fillStyle='rgba(255,255,255,.75)';
      for(let i=0;i<60;i++){ const x=((i*67 + t*22*(1+i%3))%(W+20))-10, y=((i*41 + t*36*(1+i%2))%(H)); c.beginPath(); c.arc(x,y,1.6,0,6.29); c.fill(); }
      smokeColumns(c,W,H,H*0.6,t,33,2,.15);
    },
    road_spring(c,W,H,t){ // 城外春路
      c.fillStyle=grad(c,0,0,0,H,[[0,'#7d9bb5'],[0.55,'#c2b490'],[1,'#5c5a42']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(110,125,90,.75)'; c.beginPath(); c.moveTo(0,H*0.6); c.quadraticCurveTo(W*0.35,H*0.48,W*0.7,H*0.58); c.quadraticCurveTo(W*0.9,H*0.63,W,H*0.58); c.lineTo(W,H*0.68); c.lineTo(0,H*0.68); c.closePath(); c.fill();
      ground(c,W,H,H*0.78,'#6a6a4c');
      c.fillStyle='#7d7458'; c.beginPath(); c.moveTo(W*0.36,H); c.lineTo(W*0.48,H*0.78); c.lineTo(W*0.55,H*0.78); c.lineTo(W*0.74,H); c.closePath(); c.fill();
      // 新绿的树
      for(const fx of [0.12,0.88]){ c.strokeStyle='#4a3a26'; c.lineWidth=5; c.beginPath(); c.moveTo(W*fx,H*0.8); c.lineTo(W*fx,H*0.62); c.stroke(); c.fillStyle='rgba(110,150,80,.85)'; c.beginPath(); c.arc(W*fx,H*0.57,H*0.05,0,6.29); c.arc(W*fx-W*0.03,H*0.6,H*0.036,0,6.29); c.arc(W*fx+W*0.03,H*0.6,H*0.036,0,6.29); c.fill(); }
    },
    dawn_return(c,W,H,t){ // 战后清晨，城墙远景
      c.fillStyle=grad(c,0,0,0,H,[[0,'#5d7694'],[0.5,'#d9b078'],[0.75,'#f0d09a'],[1,'#5a4c38']]); c.fillRect(0,0,W,H);
      c.fillStyle='rgba(255,230,170,.95)'; c.beginPath(); c.arc(W*0.5,H*0.34,H*0.05,0,6.29); c.fill();
      c.fillStyle='rgba(255,230,170,.16)'; c.beginPath(); c.arc(W*0.5,H*0.34,H*0.12,0,6.29); c.fill();
      c.fillStyle='rgba(62,56,50,.8)'; c.fillRect(W*0.08,H*0.52,W*0.84,H*0.13);
      for(let i=0;i<14;i++) c.fillRect(W*(0.09+i*0.06),H*0.49,W*0.032,H*0.032);
      skyline(c,W,H,H*0.68,101,'rgba(72,62,52,.8)',0.1); windows(c,W,H,H*0.68,101,.2);
      ground(c,W,H,H*0.82,'#57493a');
    }
  };

  // ===== 人物绘制（带走路动画的程式化人物） =====
  // style: {coat,pants,skin,hair,hairStyle:'short|bun|cap|hat|long|bald',dress,soldier,nurse,child,scarf}
  function drawFigure(c,x,gy,h,st,phase,opt){
    opt=opt||{}; const walk=opt.walk||0; const face=opt.face||1;
    const sw=Math.sin(phase)*walk; const bob=Math.abs(Math.sin(phase))*walk*h*0.02 + Math.sin(phase*0.5)*h*0.004;
    const legL=h*0.4, torsoH=h*0.34, headR=h*0.105;
    const hipY=gy-legL+bob, shY=hipY-torsoH;
    c.save(); c.translate(x,0); if(opt.dim) c.globalAlpha=0.82;
    c.lineCap='round';
    // 腿
    c.strokeStyle=st.pants; c.lineWidth=h*0.075;
    const f1x=sw*h*0.16, f2x=-sw*h*0.16;
    c.beginPath(); c.moveTo(0,hipY); c.lineTo(f1x,gy-Math.max(0,sw)*h*0.05); c.stroke();
    c.beginPath(); c.moveTo(0,hipY); c.lineTo(f2x,gy-Math.max(0,-sw)*h*0.05); c.stroke();
    // 鞋
    c.strokeStyle='#241c14'; c.lineWidth=h*0.06;
    c.beginPath(); c.moveTo(f1x,gy-Math.max(0,sw)*h*0.05); c.lineTo(f1x+face*h*0.05,gy-Math.max(0,sw)*h*0.05); c.stroke();
    c.beginPath(); c.moveTo(f2x,gy-Math.max(0,-sw)*h*0.05); c.lineTo(f2x+face*h*0.05,gy-Math.max(0,-sw)*h*0.05); c.stroke();
    // 身体（大衣/裙装）
    c.fillStyle=st.coat;
    if(st.dress){ c.beginPath(); c.moveTo(-h*0.085,shY); c.lineTo(h*0.085,shY); c.lineTo(h*0.15,hipY+h*0.05); c.lineTo(-h*0.15,hipY+h*0.05); c.closePath(); c.fill(); }
    else { roundRect(c,-h*0.095,shY,h*0.19,torsoH+h*0.04,h*0.05); c.fill(); }
    // 衣襟线
    c.strokeStyle='rgba(0,0,0,.22)'; c.lineWidth=1.4; c.beginPath(); c.moveTo(0,shY+3); c.lineTo(0,hipY); c.stroke();
    if(st.scarf){ c.fillStyle=st.scarf; c.fillRect(-h*0.09,shY+1,h*0.18,h*0.045); }
    if(st.nurse){ c.fillStyle='#a03a30'; const nx=face*h*0.045; c.fillRect(nx-1.5,shY+torsoH*0.34,3,torsoH*0.3); c.fillRect(nx-5,shY+torsoH*0.42,13,3); }
    // 手臂（与腿反相摆动）
    c.strokeStyle=st.coat; c.lineWidth=h*0.062;
    const a1= -sw*h*0.13, a2= sw*h*0.13;
    c.beginPath(); c.moveTo(face*h*0.07,shY+h*0.05); c.lineTo(face*h*0.1+a1,hipY+h*0.03); c.stroke();
    c.beginPath(); c.moveTo(-face*h*0.07,shY+h*0.05); c.lineTo(-face*h*0.1+a2,hipY+h*0.03); c.stroke();
    // 手
    c.fillStyle=st.skin; c.beginPath(); c.arc(face*h*0.1+a1,hipY+h*0.045,h*0.028,0,6.29); c.arc(-face*h*0.1+a2,hipY+h*0.045,h*0.028,0,6.29); c.fill();
    // 头
    const headY=shY-headR*1.15;
    c.fillStyle=st.skin; c.beginPath(); c.arc(0,headY,headR,0,6.29); c.fill();
    // 头发/帽
    c.fillStyle=st.hair;
    if(st.hairStyle==='bun'){ c.beginPath(); c.arc(0,headY-headR*0.42,headR*1.02,3.35,6.1); c.fill(); c.beginPath(); c.arc(-face*headR*0.8,headY-headR*0.72,headR*0.42,0,6.29); c.fill(); }
    else if(st.hairStyle==='long'){ c.beginPath(); c.arc(0,headY-headR*0.35,headR*1.04,3.3,6.15); c.fill(); c.fillRect(-headR*1.02,headY-headR*0.3,headR*0.5,headR*1.7); c.fillRect(headR*0.52,headY-headR*0.3,headR*0.5,headR*1.2); }
    else if(st.hairStyle==='cap'||st.soldier){ c.beginPath(); c.arc(0,headY-headR*0.25,headR*1.05,3.14,6.28); c.fill(); c.fillRect(-headR*1.05,headY-headR*0.28,headR*2.1,headR*0.22); c.fillRect(face>0?0:-headR*1.5,headY-headR*0.28,headR*1.5,headR*0.16); }
    else if(st.hairStyle==='hat'){ c.beginPath(); c.arc(0,headY-headR*0.3,headR*0.98,3.14,6.28); c.fill(); c.fillRect(-headR*1.45,headY-headR*0.32,headR*2.9,headR*0.2); }
    else if(st.hairStyle==='bald'){ c.beginPath(); c.arc(0,headY-headR*0.5,headR*0.96,3.5,5.9); c.fill(); }
    else if(st.hairStyle==='nurseCap'){ c.beginPath(); c.arc(0,headY-headR*0.35,headR*1.02,3.35,6.1); c.fill(); c.fillStyle='#e8e2d2'; c.fillRect(-headR*0.8,headY-headR*1.12,headR*1.6,headR*0.42); c.fillStyle='#a03a30'; c.fillRect(-1.2,headY-headR*1.08,2.4,headR*0.34); c.fillRect(-headR*0.26,headY-headR*0.97,headR*0.52,2.2); }
    else { c.beginPath(); c.arc(0,headY-headR*0.38,headR*1.03,3.3,6.15); c.fill(); }
    // 说话时的微光
    if(opt.speak){ c.strokeStyle='rgba(255,220,150,.0)'; }
    c.restore();
    // 脚下影
    c.fillStyle='rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x,gy+3,h*0.16,4.5,0,0,6.29); c.fill();
  }
  function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  // 路人剪影（背景行人，带走动）
  function walker(c,x,gy,h,phase,dir,alpha){
    c.save(); c.globalAlpha=alpha;
    drawFigure(c,x,gy,h,{coat:'#3a3630',pants:'#2c2824',skin:'#8a6f52',hair:'#201c18',hairStyle:'short'},phase,{walk:1,face:dir,dim:true});
    c.restore();
  }
  // 骑行者剪影
  function cyclist(c,x,gy,s,dir){
    c.save(); c.translate(x,gy); c.scale(dir*s,s);
    c.strokeStyle='rgba(24,20,16,.92)'; c.lineWidth=3;
    c.beginPath(); c.arc(-26,0,13,0,6.29); c.stroke(); c.beginPath(); c.arc(26,0,13,0,6.29); c.stroke();
    c.beginPath(); c.moveTo(-26,0); c.lineTo(-4,-20); c.lineTo(20,-18); c.lineTo(26,0); c.moveTo(-4,-20); c.lineTo(2,0); c.lineTo(-26,0); c.moveTo(-4,-20); c.lineTo(-8,-30); c.moveTo(20,-18); c.lineTo(16,-30); c.stroke();
    c.fillStyle='rgba(24,20,16,.92)';
    c.beginPath(); c.arc(6,-48,7.5,0,6.29); c.fill(); // 头
    c.strokeStyle='rgba(24,20,16,.92)'; c.lineWidth=6; c.lineCap='round';
    c.beginPath(); c.moveTo(4,-40); c.lineTo(-2,-24); c.stroke();
    c.lineWidth=5; c.beginPath(); c.moveTo(-2,-24); c.lineTo(-14,-6); c.stroke(); c.beginPath(); c.moveTo(-2,-24); c.lineTo(8,-4); c.stroke();
    c.beginPath(); c.moveTo(4,-38); c.lineTo(15,-30); c.stroke();
    c.restore();
  }
  return {painters, drawFigure, walker, cyclist, rainFx:rain};
})();
