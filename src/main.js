import { $t, pl, lang, locale, setLang, LANGS, brand, brandSlug, recordStatic, applyStatic, missing } from './i18n.js?v=20261020b';
import { circleRuns, area, wallOf, wallSet, baseWalls, wallsOfMask, roomMask, maskKey, innerArea, innerDims, inside, polyFromAbs, absPts, outlinePts, polyArea, dropStraight, hexA, lum, shade, wallCol } from './geometry.js?v=20261020b';
import { nbtEncode, NB, gzipBytes } from './lib/nbt.js?v=20261020b';

recordStatic();

/* ============ data ============ */
const TYPES=[
  ['atrium','Атриум / лифт','Атриум','#8d9396'],
  ['corridor','Коридор','Коридор','#b7bbbd'],
  ['living','Жильё','Комната','#3f9e82'],
  ['events','Ивенты и настолки','Зал ивентов','#7a6bd1'],
  ['storage','Склад','Склад','#d58a2e'],
  ['farm','Ферма','Ферма','#6fa94a'],
  ['autofarm','Авто-ферма','Авто-ферма','#c8503f'],
  ['tech','Техника / редстоун','Тех. зал','#b5487a'],
  ['decor','Парадный зал','Зал','#e4e1d8'],
  ['other','Прочее','Помещение','#4f8ccc'],
];
const TYPE={};TYPES.forEach(([k,l,sh,c])=>TYPE[k]={label:l,short:sh,color:c});
const F=id=>document.getElementById(id);
const uid=p=>p+Math.random().toString(36).slice(2,9);
const mod=(a,n)=>((a%n)+n)%n;
const num=(v,d)=>{const n=parseInt(v,10);return Number.isFinite(n)?n:d};
const clampS=s=>Math.max(.4,Math.min(48,s));
const fmt=n=>String(n).replace('-','−');
function plural(n,f){const a=Math.abs(n)%100,b=a%10;return a>10&&a<20?f[2]:b>1&&b<5?f[1]:b===1?f[0]:f[2];}
const valid=d=>d&&Array.isArray(d.floors)&&d.floors.length>0&&Array.isArray(d.rooms);

function R(fid,name,type,shape,x,z,w,d,notes){return {id:uid('r'),floorId:fid,name,type,shape,x,z,w,d:shape==='circle'?w:d,h:null,wall:1,color:null,notes:notes||''}}
function coreRooms(f){return [R(f,$t('Атриум'),'atrium','circle',-24,-24,49,49,$t('Открытая шахта с кольцевыми балконами')),R(f,$t('Лифт'),'atrium','rect',-2,-2,5,5),
  R(f,$t('Коридор север'),'corridor','rect',-3,-60,7,36),R(f,$t('Коридор юг'),'corridor','rect',-3,25,7,36),
  R(f,$t('Коридор запад'),'corridor','rect',-60,-3,36,7),R(f,$t('Коридор восток'),'corridor','rect',25,-3,36,7)];}
const mkFloors=list=>list.map(([n,y,h])=>({id:uid('f'),name:n,y,height:h,slab:1}));
const slabOf=f=>f.slab==null?1:f.slab;
const inY0=f=>f.y+slabOf(f), inY1=(f,h)=>f.y+slabOf(f)+(h||f.height)-1;
function tplEmpty(){const fl=mkFloors([[$t('Ярус 1'),48,14]]);return {v:1,name:$t('Новая база'),origin:{x:0,z:0},floors:fl,rooms:[R(fl[0].id,$t('Лифт'),'atrium','rect',-2,-2,5,5)],cur:fl[0].id};}
function tplCore(){const fl=mkFloors([[$t('Ярус 1'),48,14],[$t('Ярус 2'),34,14],[$t('Ярус 3'),20,14]]);const rooms=[];fl.forEach(f=>rooms.push(...coreRooms(f.id)));
  return {v:1,name:$t('Атриум и коридоры'),origin:{x:0,z:0},floors:fl,rooms,cur:fl[0].id};}
function tplSample(){
  const fl=mkFloors([[$t('Поверхность · павильон'),64,20],[$t('Ярус 1 · вход'),48,14],[$t('Ярус 2 · жильё'),34,14],[$t('Ярус 3 · ивенты'),20,14],[$t('Ярус 4 · склады'),6,14],[$t('Ярус 5 · фермы'),-8,14],[$t('Ярус 6 · техника'),-22,14]]);
  const rooms=[R(fl[0].id,$t('Павильон'),'decor','rect',-24,-24,49,49,$t('Бруталистский куб: ступенчатая плита крыши, мачты, скошенные контрфорсы по углам')),R(fl[0].id,$t('Лифт'),'atrium','rect',-2,-2,5,5)];
  for(let i=1;i<fl.length;i++)rooms.push(...coreRooms(fl[i].id));
  const add=(i,...a)=>rooms.push(R(fl[i].id,...a));
  add(1,$t('Холл'),'decor','rect',7,-60,28,24);add(1,$t('Галерея'),'decor','rect',-35,-60,28,24);add(1,$t('Портальный зал'),'other','rect',34,-30,26,24);
  add(1,$t('Гостевая'),'living','rect',7,37,28,24);add(1,$t('Карта мира'),'decor','rect',-35,37,28,24);
  add(2,$t('Спальня'),'living','rect',7,-60,28,24);add(2,$t('Гостиная'),'living','rect',34,-30,26,24);add(2,$t('Кухня'),'living','rect',34,7,26,24);add(2,$t('Библиотека'),'decor','rect',-35,-60,28,24);
  add(3,$t('Зал настолок'),'events','rect',-35,-60,28,24,$t('Столы под настолки для ивентов'));add(3,$t('Зал-трансформер'),'events','rect',-60,-30,26,24);add(3,$t('Бар'),'events','rect',7,-60,28,24);
  add(4,$t('Сортировка'),'storage','rect',34,7,26,24);add(4,$t('Шалкер-зал'),'storage','rect',7,37,28,24);
  add(5,$t('Ферма культур'),'farm','rect',-35,37,28,24);add(5,$t('Авто-ферма мобов'),'autofarm','rect',-60,7,26,24);
  add(6,$t('Редстоун-зал'),'tech','rect',7,37,28,24);
  return {v:1,name:$t('Пример: бруталистский комплекс'),origin:{x:0,z:0},floors:fl,rooms,cur:fl[1].id};}
function makePlan(name,tpl){const p=tpl==='sample'?tplSample():tpl==='core'?tplCore():tplEmpty();p.id=uid('p');
  p.stack={auto:true,top:Math.max(...p.floors.map(f=>f.y))};if(name)p.name=name;p.created=p.updated=Date.now();return p;}

/* ============ storage ============ */
const STORE='glubina-plans-v2',OLD='underground-planner-v1';
let storageOK=true;
try{localStorage.setItem('glubina-probe','1');localStorage.removeItem('glubina-probe');}catch(e){storageOK=false;}
let store=(()=>{let st=null;
  try{const t=localStorage.getItem(STORE);if(t)st=JSON.parse(t);}catch(e){}
  if(!st||!Array.isArray(st.plans)){st={v:2,plans:[],last:null};
    try{const o=localStorage.getItem(OLD);if(o){const d=JSON.parse(o);if(valid(d)){d.id=uid('p');d.created=d.updated=Date.now();if(!d.origin)d.origin={x:0,z:0};st.plans.push(d);st.last=d.id;}}}catch(e){}}
  st.plans=st.plans.filter(valid);st.plans.forEach(p=>{if(!p.id)p.id=uid('p');if(!p.origin)p.origin={x:0,z:0};if(!p.updated)p.updated=Date.now();});
  return st;})();
const getPlan=id=>store.plans.find(p=>p.id===id);
let storeT=0;
function writeStore(){clearTimeout(storeT);try{localStorage.setItem(STORE,JSON.stringify(store));storageOK=true;}catch(e){storageOK=false;}updSaveSt();}
function persist(){if(S)S.updated=Date.now();clearTimeout(storeT);F('save-st').textContent=$t('Сохраняю…');F('save-st').classList.remove('bad');storeT=setTimeout(writeStore,250);}
function updSaveSt(){const el=F('save-st');el.classList.toggle('bad',!storageOK);el.textContent=storageOK?$t('Сохранено в браузере'):$t('Браузер не сохраняет — скачай файл');F('store-banner').hidden=storageOK;}

/* ============ geometry & render ============ */
const roomsIn=(P,fid)=>P.rooms.filter(r=>r.floorId===fid);
const roomColor=r=>r.color||TYPE[r.type]?.color||'#888888';
const dims=r=>r.shape==='circle'?`⌀${r.w}`:`${r.w}×${r.d}`;
const isRect=r=>r.shape!=='circle'&&r.shape!=='poly';
/* Сращённые комнаты: стены между смежными комнатами с флагом join не строятся */
const sigOf=r=>r.x+','+r.z+','+maskKey(r)+','+wallOf(r);
function joinPartners(P,r){if(!r.join||!P)return [];const t=wallOf(r);
  return P.rooms.filter(o=>o!==r&&o.join&&o.floorId===r.floorId&&o.x<=r.x+r.w+t&&o.x+o.w>=r.x-t&&o.z<=r.z+r.d+t&&o.z+o.d>=r.z-t);}
const JW=new Map();
function roomWalls(r,P){P=P||S;const t=wallOf(r);if(t<=0)return baseWalls(r);const ps=joinPartners(P,r);if(!ps.length)return baseWalls(r);
  const k=sigOf(r)+'#'+ps.map(sigOf).join('#');let s=JW.get(k);if(s)return s;
  s=wallsOfMask(roomMask(r),t,(i,j)=>ps.some(o=>inside(o,r.x+i,r.z+j)));if(JW.size>400)JW.clear();JW.set(k,s);return s;}
const isWallCell=(r,x,z,P)=>roomWalls(r,P).has((x-r.x)+','+(z-r.z));
function diffRuns(A,B){const out=[];A.forEach(([a,b])=>{let sg=[[a,b]];B.forEach(([c,d])=>{sg=sg.flatMap(([p,q])=>{if(d<=p||c>=q)return[[p,q]];const o=[];if(c>p)o.push([p,c]);if(d<q)o.push([d,q]);return o;});});out.push(...sg);});return out;}
// Где писать название: у многоугольника — по самому широкому отрезку в середине формы
function labelBox(r){if(r.shape!=='poly')return{x:r.x,z:r.z,w:r.w,d:r.d};const m=roomMask(r);let best=null,bs=-1;
  m.rows.forEach((runs,j)=>runs.forEach(([a,b])=>{const sc=(b-a)*(1-Math.abs(j+.5-r.d/2)/r.d);if(sc>bs){bs=sc;best=[a,b,j];}}));
  if(!best)return{x:r.x,z:r.z,w:r.w,d:r.d};const [a,b,j]=best,cx=(a+b)/2;let j0=j,j1=j;
  const cov=jj=>(m.rows[jj]||[]).some(([p,q])=>p<=a&&q>=b);while(j0>0&&cov(j0-1))j0--;while(j1<r.d-1&&cov(j1+1))j1++;
  return{x:r.x+a,z:r.z+j0,w:b-a,d:j1-j0+1};}
function tokens(){const cs=getComputedStyle(document.documentElement),g=n=>cs.getPropertyValue(n).trim();
  return{canvas:g('--canvas'),grid:g('--grid'),chunk:g('--chunk'),accent:g('--accent'),muted:g('--muted'),ink:g('--ink'),raised:g('--raised'),panel:g('--panel'),line:g('--line')};}
function sizeCanvas(c){const b=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1,W=b.width,H=b.height,pw=Math.max(1,Math.round(W*dpr)),ph=Math.max(1,Math.round(H*dpr));
  if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{ctx,W,H};}
function fitV(P,fid,W,H,px=30,py=40){const rs=roomsIn(P,fid);if(!rs.length)return{cx:.5,cz:.5,s:6};
  let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;rs.forEach(r=>{x0=Math.min(x0,r.x);z0=Math.min(z0,r.z);x1=Math.max(x1,r.x+r.w);z1=Math.max(z1,r.z+r.d);});
  return{cx:(x0+x1)/2,cz:(z0+z1)/2,s:clampS(Math.min((W-2*px)/Math.max(1,x1-x0),(H-2*py)/Math.max(1,z1-z0)))};}

let rc=null;
const PX=x=>(x-rc.V.cx)*rc.V.s+rc.W/2, PZ=z=>(z-rc.V.cz)*rc.V.s+rc.H/2;
function seg(x1,z1,x2,z2){rc.ctx.moveTo(PX(x1),PZ(z1));rc.ctx.lineTo(PX(x2),PZ(z2));}
function edgeDiff(run,o,z){if(!o){seg(run[0],z,run[1],z);return;}if(run[0]<o[0])seg(run[0],z,Math.min(run[1],o[0]),z);if(run[1]>o[1])seg(Math.max(run[0],o[1]),z,run[1],z);}
function ellipsize(ctx,t,mw){if(ctx.measureText(t).width<=mw)return t;let s=t;while(s.length>1&&ctx.measureText(s+'…').width>mw)s=s.slice(0,-1);return s.length>1?s+'…':'';}
function drawWall(r,col){const t=wallOf(r);if(t<=0)return;const ctx=rc.ctx,s=rc.V.s;
  ctx.fillStyle=wallCol(col);ctx.beginPath();
  if(isRect(r)&&!joinPartners(rc.P,r).length){const x=PX(r.x),z=PZ(r.z),W=r.w*s,D=r.d*s,T=t*s;
    if(r.w<=2*t||r.d<=2*t)ctx.rect(x,z,W,D);else{ctx.rect(x,z,W,T);ctx.rect(x,z+D-T,W,T);ctx.rect(x,z+T,T,D-2*T);ctx.rect(x+W-T,z+T,T,D-2*T);}}
  else{const Wl=roomWalls(r,rc.P),m=roomMask(r);
    m.rows.forEach((runs,j)=>runs.forEach(([a,b])=>{let i0=-1;for(let i=a;i<=b;i++){const w=i<b&&Wl.has(i+','+j);if(w&&i0<0)i0=i;if(!w&&i0>=0){ctx.rect(PX(r.x+i0),PZ(r.z+j),(i-i0)*s,s);i0=-1;}}}));}
  ctx.fill();}
function drawRoom(r,mode,tk,arrow){
  const ctx=rc.ctx,col=roomColor(r),s=rc.V.s,ghost=mode==='ghost';
  ctx.save();
  const ps=mode==='draft'?[]:joinPartners(rc.P,r);
  if(!isRect(r)||ps.length){const m=roomMask(r);
    // Сращённые комнаты: общий пол рисуем один раз, а линию контура на стыке не рисуем — иначе остаётся «шов».
    const idx=rc.P.rooms.indexOf(r),early=ps.filter(o=>rc.P.rooms.indexOf(o)<idx);
    const pRuns=(list,j)=>{const z=r.z+j,out=[];list.forEach(o=>{const jj=z-o.z;if(jj<0||jj>=o.d)return;roomMask(o).rows[jj].forEach(([a,b])=>out.push([a+o.x-r.x,b+o.x-r.x]));});return out;};
    const inP=(i,j)=>ps.some(o=>inside(o,r.x+i,r.z+j));
    if(!ghost){ctx.beginPath();m.rows.forEach((runs,j)=>diffRuns(runs,early.length?pRuns(early,j):[]).forEach(([a,b])=>ctx.rect(PX(r.x+a),PZ(r.z+j),(b-a)*s,s)));ctx.fillStyle=hexA(col,mode==='draft'?.45:.82);ctx.fill();if(mode==='room')drawWall(r,col);}
    ctx.beginPath();m.rows.forEach((runs,j)=>{const z=r.z+j;runs.forEach(([a,b])=>{if(!inP(a-1,j))seg(r.x+a,z,r.x+a,z+1);if(!inP(b,j))seg(r.x+b,z,r.x+b,z+1);});
      const up=(m.rows[j-1]||[]).concat(ps.length?pRuns(ps,j-1):[]),dn=(m.rows[j+1]||[]).concat(ps.length?pRuns(ps,j+1):[]);
      diffRuns(runs,up).forEach(([a,b])=>seg(r.x+a,z,r.x+b,z));diffRuns(runs,dn).forEach(([a,b])=>seg(r.x+a,z+1,r.x+b,z+1));});
  }else{
    if(!ghost){ctx.fillStyle=hexA(col,mode==='draft'?.45:.82);ctx.fillRect(PX(r.x),PZ(r.z),r.w*s,r.d*s);if(mode==='room')drawWall(r,col);}
    ctx.beginPath();ctx.rect(PX(r.x)+.5,PZ(r.z)+.5,r.w*s-1,r.d*s-1);}
  if(ghost){ctx.setLineDash([5,4]);ctx.strokeStyle=tk.muted;ctx.globalAlpha=.75;ctx.lineWidth=1;}
  else if(mode==='draft'){ctx.setLineDash([6,4]);ctx.strokeStyle=tk.accent;ctx.lineWidth=2;}
  else{ctx.strokeStyle=shade(col,lum(col)>.7?.62:.7);ctx.lineWidth=s>=4?1.5:1;}
  ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  const lb=labelBox(r),bw=lb.w*s,bh=lb.d*s;
  if(bw>34&&bh>16){
    ctx.beginPath();ctx.rect(PX(lb.x),PZ(lb.z),bw,bh);ctx.clip();
    const ink=ghost?tk.muted:mode==='draft'?tk.ink:(lum(col)>.55?'#15181a':'#ffffff');
    const name=ghost?`${arrow||''} ${r.name||''}`.trim():r.name;
    const fs=Math.max(10,Math.min(15,s*1.5)),cx=PX(lb.x)+bw/2,cy=PZ(lb.z)+bh/2,two=bh>fs*2.8&&name;
    ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
    if(ghost)ctx.globalAlpha=.6;
    if(name){ctx.font=`${ghost?500:600} ${fs}px "Golos Text", system-ui, sans-serif`;ctx.fillText(ellipsize(ctx,name,bw-8),cx,two?cy-fs*.6:cy);}
    if(two||!name){ctx.font=`500 ${Math.max(10,fs-2)}px "JetBrains Mono", ui-monospace, monospace`;ctx.globalAlpha=ghost?.5:.85;ctx.fillText(dims(r),cx,name?cy+fs*.75:cy);}
  }
  ctx.restore();
}
function cornerPts(r){const x0=r.x,z0=r.z,x1=r.x+r.w-1,z1=r.z+r.d-1;
  if(r.shape==='poly'){const m=roomMask(r);
    // клетки вокруг угла: [смещение, куда смотрит подпись]
    const C=[[0,0,'nw'],[-1,0,'ne'],[0,-1,'sw'],[-1,-1,'se']],OPP={nw:'se',ne:'sw',sw:'ne',se:'nw'};
    return (r.pts||[]).map(([px,pz],n)=>{const ins=C.filter(([di,dj])=>m.has(px+di,pz+dj));let c=ins[0]||C[0];
      if(ins.length===3){const out=C.find(q=>!ins.includes(q));c=C.find(q=>q[2]===OPP[out[2]]);}
      return [$t('Точка {n}',{n:n+1}),r.x+px+c[0],r.z+pz+c[1],c[2]];});}
  if(r.shape==='circle'){const cx=r.x+Math.floor((r.w-1)/2),cz=r.z+Math.floor((r.d-1)/2);
    return [[$t('Север'),cx,z0,'n'],[$t('Юг'),cx,z1,'s'],[$t('Запад'),x0,cz,'w'],[$t('Восток'),x1,cz,'e'],[$t('Центр'),cx,cz,'c']];}
  return [[$t('Северо-запад'),x0,z0,'nw'],[$t('Северо-восток'),x1,z0,'ne'],[$t('Юго-запад'),x0,z1,'sw'],[$t('Юго-восток'),x1,z1,'se']];}
function drawCornerTags(r,P,tk){const ctx=rc.ctx,s=rc.V.s;if(r.w*s<90||r.d*s<60)return;
  ctx.save();ctx.font='500 11px "JetBrains Mono", ui-monospace, monospace';ctx.textBaseline='middle';
  cornerPts(r).forEach(([,x,z,k])=>{if(k==='c')return;
    const t=`${fmt(P.origin.x+x)}, ${fmt(P.origin.z+z)}`,w=ctx.measureText(t).width+10,h=18;
    let px=PX(x)+s/2,pz=PZ(z)+s/2;
    if(k.includes('w'))px=PX(x)-6-w;else if(k.includes('e'))px=PX(x+1)+6;else px-=w/2;
    if(k.includes('n'))pz=PZ(z)-6-h;else if(k.includes('s'))pz=PZ(z+1)+6;else pz-=h/2;
    ctx.fillStyle=tk.panel;ctx.globalAlpha=.94;ctx.fillRect(px,pz,w,h);ctx.globalAlpha=1;ctx.strokeStyle=tk.accent;ctx.lineWidth=1;ctx.strokeRect(px+.5,pz+.5,w-1,h-1);
    ctx.fillStyle=tk.ink;ctx.textAlign='left';ctx.fillText(t,px+5,pz+h/2+.5);});
  ctx.restore();}
function handlesOf(r){const x0=PX(r.x),z0=PZ(r.z),x1=PX(r.x+r.w),z1=PZ(r.z+r.d),xm=(x0+x1)/2,zm=(z0+z1)/2;
  return {nw:[x0,z0],n:[xm,z0],ne:[x1,z0],e:[x1,zm],se:[x1,z1],s:[xm,z1],sw:[x0,z1],w:[x0,zm]};}
function paint(ctx,W,H,V,P,fid,o={}){
  rc={ctx,W,H,V,P};const tk=o.tk||tokens(),s=V.s;
  ctx.fillStyle=tk.canvas;ctx.fillRect(0,0,W,H);
  const a={x:-W/2/s+V.cx,z:-H/2/s+V.cz},b={x:W/2/s+V.cx,z:H/2/s+V.cz};
  if(s>=5){ctx.beginPath();for(let x=Math.floor(a.x);x<=b.x;x++){const p=Math.round(PX(x))+.5;ctx.moveTo(p,0);ctx.lineTo(p,H);}
    for(let z=Math.floor(a.z);z<=b.z;z++){const p=Math.round(PZ(z))+.5;ctx.moveTo(0,p);ctx.lineTo(W,p);}ctx.strokeStyle=tk.grid;ctx.lineWidth=1;ctx.stroke();}
  if(s*16>=6){const ox=mod(-P.origin.x,16),oz=mod(-P.origin.z,16);ctx.beginPath();
    for(let x=Math.floor((a.x-ox)/16)*16+ox;x<=b.x;x+=16){const p=Math.round(PX(x))+.5;ctx.moveTo(p,0);ctx.lineTo(p,H);}
    for(let z=Math.floor((a.z-oz)/16)*16+oz;z<=b.z;z+=16){const p=Math.round(PZ(z))+.5;ctx.moveTo(0,p);ctx.lineTo(W,p);}
    ctx.strokeStyle=tk.chunk;ctx.lineWidth=1;ctx.stroke();}
  ctx.beginPath();ctx.moveTo(PX(.5),0);ctx.lineTo(PX(.5),H);ctx.moveTo(0,PZ(.5));ctx.lineTo(W,PZ(.5));
  ctx.setLineDash([2,6]);ctx.strokeStyle=tk.accent;ctx.globalAlpha=.7;ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  if(o.ghostId)roomsIn(P,o.ghostId).forEach(r=>drawRoom(r,'ghost',tk,o.ghostArrow));
  roomsIn(P,fid).forEach(r=>drawRoom(r,'room',tk));
  (P.doors||[]).forEach(d=>{if(d.floorId!==fid)return;const x=PX(d.x),z=PZ(d.z),w=d.w*s,h=d.d*s,sel=o.selDoor===d.id;
    ctx.fillStyle=tk.raised;ctx.globalAlpha=.95;ctx.fillRect(x,z,w,h);ctx.globalAlpha=1;ctx.strokeStyle=tk.accent;ctx.lineWidth=sel?3:1.5;ctx.strokeRect(x+.75,z+.75,w-1.5,h-1.5);
    if(s>=6){ctx.beginPath();if(d.axis==='x'){ctx.moveTo(x+3,z+h/2);ctx.lineTo(x+w-3,z+h/2);}else{ctx.moveTo(x+w/2,z+3);ctx.lineTo(x+w/2,z+h-3);}ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);}});
  if(o.draft)drawRoom(o.draft,'draft',tk);
  if(o.polyDraft&&o.polyDraft.pts.length){const pd=o.polyDraft.pts,hv=o.polyDraft.hover;
    if(pd.length>=3){const pr=polyFromAbs(pd);if(pr.pts.length>=3)drawRoom({...pr,shape:'poly',type:ui.lastType,color:null,name:''},'draft',tk);}
    ctx.save();ctx.strokeStyle=tk.accent;ctx.lineWidth=2;ctx.beginPath();pd.forEach(([x,z],k)=>k?ctx.lineTo(PX(x),PZ(z)):ctx.moveTo(PX(x),PZ(z)));
    if(hv)ctx.lineTo(PX(hv[0]),PZ(hv[1]));ctx.stroke();
    if(pd.length>=3){ctx.setLineDash([4,4]);ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(PX((hv||pd[pd.length-1])[0]),PZ((hv||pd[pd.length-1])[1]));ctx.lineTo(PX(pd[0][0]),PZ(pd[0][1]));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
    pd.forEach(([x,z],k)=>{ctx.fillStyle=k===0?tk.accent:tk.raised;ctx.fillRect(PX(x)-4,PZ(z)-4,8,8);ctx.strokeRect(PX(x)-4,PZ(z)-4,8,8);});ctx.restore();}
  const r=o.sel;
  if(r&&r.shape==='poly'){const ap=absPts(r);ctx.strokeStyle=tk.accent;ctx.lineWidth=2;ctx.beginPath();ap.forEach(([x,z],k)=>k?ctx.lineTo(PX(x),PZ(z)):ctx.moveTo(PX(x),PZ(z)));ctx.closePath();ctx.stroke();
    ap.forEach(([x,z],k)=>{const [x2,z2]=ap[(k+1)%ap.length],mx=PX((x+x2)/2),mz=PZ((z+z2)/2);ctx.beginPath();ctx.arc(mx,mz,4,0,Math.PI*2);ctx.fillStyle=tk.accent;ctx.fill();});
    ap.forEach(([x,z])=>{ctx.fillStyle=tk.raised;ctx.fillRect(PX(x)-4,PZ(z)-4,8,8);ctx.strokeRect(PX(x)-4,PZ(z)-4,8,8);});
    if(o.tags)drawCornerTags(r,P,tk);}
  else if(r){ctx.strokeStyle=tk.accent;ctx.lineWidth=2;ctx.setLineDash(r.shape==='circle'?[6,4]:[]);ctx.strokeRect(PX(r.x)-1,PZ(r.z)-1,r.w*s+2,r.d*s+2);ctx.setLineDash([]);
    Object.values(handlesOf(r)).forEach(([hx,hz])=>{ctx.fillStyle=tk.raised;ctx.fillRect(hx-4,hz-4,8,8);ctx.strokeRect(hx-4,hz-4,8,8);});
    if(o.tags)drawCornerTags(r,P,tk);}
  const eh=o.edgeHover;if(r&&eh){const ap=eh.ap,[x1,z1]=ap[eh.i],[x2,z2]=ap[(eh.i+1)%ap.length];ctx.save();
    if(r.shape==='poly'){ctx.strokeStyle=tk.accent;ctx.lineWidth=7;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(PX(x1),PZ(z1));ctx.lineTo(PX(x2),PZ(z2));ctx.stroke();ctx.globalAlpha=1;}
    const qx=PX(eh.q[0]),qz=PZ(eh.q[1]);ctx.lineWidth=1.5;ctx.strokeStyle=tk.accent;ctx.fillStyle=tk.canvas;ctx.setLineDash([2,2]);ctx.fillRect(qx-4,qz-4,8,8);ctx.strokeRect(qx-4,qz-4,8,8);ctx.restore();}
  if(o.ruler)drawRuler(o.ruler,tk);
}
function rulerTag(ctx,t,x,y,tk,strong){ctx.font=`${strong?600:500} 12px "JetBrains Mono", ui-monospace, monospace`;const w=ctx.measureText(t).width+10;
  ctx.fillStyle=strong?tk.accent:tk.raised;ctx.globalAlpha=strong?1:.92;ctx.fillRect(x-w/2,y-10,w,20);ctx.globalAlpha=1;
  ctx.strokeStyle=tk.accent;ctx.lineWidth=1;ctx.strokeRect(x-w/2+.5,y-9.5,w-1,19);ctx.fillStyle=strong?'#15181a':tk.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y+.5);}
function drawRuler(R0,tk){const ctx=rc.ctx,q=rulerInfo(R0),[ax,az]=R0.a,[bx,bz]=R0.b,x1=PX(ax),z1=PZ(az),x2=PX(bx),z2=PZ(bz);ctx.save();
  if(q.ax&&q.az){ctx.setLineDash([4,4]);ctx.strokeStyle=tk.accent;ctx.globalAlpha=.7;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x1,z1);ctx.lineTo(x2,z1);ctx.lineTo(x2,z2);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    rulerTag(ctx,String(q.ax),(x1+x2)/2,z1+(z2>z1?-14:14),tk,false);rulerTag(ctx,String(q.az),x2+(x1<x2?1:-1)*(String(q.az).length*4+20),(z1+z2)/2,tk,false);}
  ctx.strokeStyle=tk.accent;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x1,z1);ctx.lineTo(x2,z2);ctx.stroke();
  // засечки на концах — поперёк линии
  const L=Math.hypot(x2-x1,z2-z1)||1,nx=-(z2-z1)/L*7,nz=(x2-x1)/L*7;ctx.lineWidth=2;ctx.beginPath();
  [[x1,z1],[x2,z2]].forEach(([x,z])=>{ctx.moveTo(x-nx,z-nz);ctx.lineTo(x+nx,z+nz);});ctx.stroke();
  [[x1,z1],[x2,z2]].forEach(([x,z])=>{ctx.fillStyle=tk.raised;ctx.fillRect(x-3,z-3,6,6);ctx.strokeRect(x-3,z-3,6,6);});
  if(q.len>0)rulerTag(ctx,$t('{l} бл.',{l:fmtLen(q.len)}),(x1+x2)/2+nx*2.4,(z1+z2)/2+nz*2.4,tk,true);
  ctx.restore();}

/* ============ landing ============ */
let HERO=tplSample();
function drawHero(){if(F('v-home').hidden)return;const {ctx,W,H}=sizeCanvas(F('hero-cv'));if(W<10)return;
  const V=fitV(HERO,HERO.floors[1].id,W,H,22,22);paint(ctx,W,H,V,HERO,HERO.floors[1].id,{ghostId:HERO.floors[2].id,ghostArrow:'↓'});}

/* ============ plans page ============ */
const dateFmt=()=>new Intl.DateTimeFormat(locale(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
function armed(btn,label,action){btn.addEventListener('click',()=>{
  if(btn.dataset.armed){clearTimeout(btn._t);delete btn.dataset.armed;btn.textContent=btn.dataset.label;action();}
  else{btn.dataset.label=btn.textContent;btn.dataset.armed='1';btn.textContent=$t(label);btn._t=setTimeout(()=>{delete btn.dataset.armed;btn.textContent=btn.dataset.label;},3000);}});}
function renderPlans(){
  const grid=F('plan-grid');grid.innerHTML='';const list=[...store.plans].sort((a,b)=>(b.updated||0)-(a.updated||0));
  F('plans-count').textContent=list.length?$t('{n} {plans} в этом браузере',{n:list.length,plans:pl(list.length,'plan')}):'';
  updSaveSt();
  if(!list.length){const e=document.createElement('div');e.className='empty';e.style.gridColumn='1/-1';
    e.innerHTML='<span class="mark" aria-hidden="true"></span><h2 class="word"></h2><p></p>';e.querySelector('h2').textContent=$t('Пока ни одного плана');e.querySelector('p').textContent=$t('Создай первый план из шаблона или загрузи файл .json, который тебе прислали.');
    const b=document.createElement('button');b.className='primary';b.textContent=$t('Создать план');b.onclick=openNew;e.appendChild(b);grid.appendChild(e);return;}
  list.forEach(p=>{
    const card=document.createElement('article');card.className='pcard';
    const th=document.createElement('button');th.className='thumb';th.setAttribute('aria-label',$t('Открыть план «{name}»',{name:p.name}));
    const c=document.createElement('canvas');th.appendChild(c);th.onclick=()=>openPlan(p.id);card.appendChild(th);
    const body=document.createElement('div');body.className='pc-body';
    const h=document.createElement('h3');h.textContent=p.name||$t('Без названия');body.appendChild(h);
    const rooms=p.rooms.filter(r=>r.type!=='corridor'&&r.type!=='atrium').length;
    const m=document.createElement('p');m.className='meta mono';m.textContent=`${p.floors.length} ${pl(p.floors.length,'floor')} · ${rooms} ${pl(rooms,'hall')}`;body.appendChild(m);
    const d=document.createElement('p');d.className='meta';d.textContent=$t('Изменён {date}',{date:dateFmt().format(new Date(p.updated||Date.now()))});body.appendChild(d);
    const bs=document.createElement('div');bs.className='btns';
    const bo=document.createElement('button');bo.textContent=$t('Открыть');bo.onclick=()=>openPlan(p.id);
    const bc=document.createElement('button');bc.textContent=$t('Копия');bc.onclick=()=>{const n=JSON.parse(JSON.stringify(p));n.id=uid('p');n.name=$t('{name} (копия)',{name:p.name||$t('План')});n.created=n.updated=Date.now();store.plans.push(n);writeStore();renderPlans();};
    const bd=document.createElement('button');bd.className='danger';bd.textContent=$t('Удалить');
    armed(bd,'Точно удалить?',()=>{store.plans=store.plans.filter(x=>x.id!==p.id);if(store.last===p.id)store.last=null;writeStore();renderPlans();});
    bs.append(bo,bc,bd);body.appendChild(bs);card.appendChild(body);grid.appendChild(card);
    card._paint=()=>{const {ctx,W,H}=sizeCanvas(c);if(W<10)return;const fid=p.floors.find(f=>f.id===p.cur)?p.cur:p.floors[0].id;paint(ctx,W,H,fitV(p,fid,W,H,12,12),p,fid);};
  });
  requestAnimationFrame(paintThumbs);
}
function paintThumbs(){if(F('v-plans').hidden)return;document.querySelectorAll('.pcard').forEach(c=>c._paint&&c._paint());}
function openNew(){F('newplan').hidden=false;F('np-name').value=$t('Новая база');F('np-name').focus();F('np-name').select();}
F('new-plan').onclick=openNew;
F('np-cancel').onclick=()=>{F('newplan').hidden=true;};
F('newplan').addEventListener('submit',e=>{e.preventDefault();const tpl=(document.querySelector('input[name=tpl]:checked')||{}).value||'core';
  const p=makePlan(F('np-name').value.trim()||$t('Новая база'),tpl);store.plans.push(p);F('newplan').hidden=true;openPlan(p.id);});
function openPlan(id){store.last=id;writeStore();if(location.hash==='#edit')route();else location.hash='edit';}

/* ============ editor state ============ */
let S=null,V={cx:.5,cz:.5,s:6},EW=0,EH=0;
const ui={tool:'select',sel:null,ghost:'below',lastType:'living'};
let undoS=[],redoS=[],editSnap=false,clip=null,hoverCell=null;
function setS(o){const i=store.plans.findIndex(p=>p.id===o.id);if(i>=0)store.plans[i]=o;S=o;}
function snap(){undoS.push(JSON.stringify(S));if(undoS.length>150)undoS.shift();redoS=[];updUndo();}
function doUndo(){if(!undoS.length)return;redoS.push(JSON.stringify(S));setS(JSON.parse(undoS.pop()));afterLoad();}
function doRedo(){if(!redoS.length)return;undoS.push(JSON.stringify(S));setS(JSON.parse(redoS.pop()));afterLoad();}
function updUndo(){F('undo').disabled=!undoS.length;F('redo').disabled=!redoS.length;}
function afterLoad(){if(!S.floors.find(f=>f.id===S.cur))S.cur=sorted()[0].id;if(ui.sel&&!S.rooms.find(r=>r.id===ui.sel))ui.sel=null;persist();renderAll();}
const sorted=()=>[...S.floors].sort((a,b)=>b.y-a.y);
function stackOf(){if(!S.stack)S.stack={auto:false,top:sorted()[0].y};return S.stack;}
function restack(){const st=S.stack;if(!st||!st.auto)return;let prev=null;
  sorted().forEach((f,i)=>{f.y=i===0?st.top:prev-f.height-slabOf(f);prev=f.y;});}
const floor=id=>S.floors.find(f=>f.id===id);
const roomsOf=fid=>roomsIn(S,fid);
const selRoom=()=>S&&S.rooms.find(r=>r.id===ui.sel);
function ghostFloor(){if(ui.ghost==='none')return null;const s=sorted(),i=s.findIndex(f=>f.id===S.cur);return s[ui.ghost==='below'?i+1:i-1]||null;}
function maxNum(base){let m=0;const re=new RegExp('^'+base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*(\\d+)$');
  S.rooms.forEach(r=>{const n=(r.name||'').trim();if(n===base)m=Math.max(m,1);else{const k=n.match(re);if(k)m=Math.max(m,+k[1]);}});return m;}
function nextName(name){const t=(name||'').trim();if(!t)return '';const k=t.match(/^(.*?)(\s*)(\d+)$/);
  const base=k&&k[1]?k[1]:t,sep=k&&k[1]?(k[2]||' '):' ';return base+sep+(maxNum(base)+1);}

/* ============ editor canvas ============ */
const cv=F('cv');
const EX=x=>(x-V.cx)*V.s+EW/2, EZ=z=>(z-V.cz)*V.s+EH/2;
const toW=(px,py)=>({x:(px-EW/2)/V.s+V.cx,z:(py-EH/2)/V.s+V.cz});
let raf=0;const req=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;draw();});};
let act=null,pinch=null,spaceDown=false;const ptrs=new Map();
function draw(){if(F('v-edit').hidden||!S)return;const o=sizeCanvas(cv);EW=o.W;EH=o.H;
  if(ui.view==='section'){drawSection(o.ctx,EW,EH);return;}const g=ghostFloor(),r=selRoom();
  paint(o.ctx,EW,EH,V,S,S.cur,{ghostId:g&&g.id,ghostArrow:ui.ghost==='below'?'↓':'↑',
    draft:act&&act.type==='draw'&&act.draft?{...act.draft,type:ui.lastType,color:null,name:''}:null,sel:r&&r.floorId===S.cur?r:null,tags:true,selDoor:ui.sel?null:ui.selDoor,polyDraft:ui.tool==='poly'&&ui.pd?{pts:ui.pd,hover:ui.pdHover}:null,edgeHover:ui.tool==='select'&&!act?ui.eh:null,ruler:ui.ruler});}
function handles(r){const x0=EX(r.x),z0=EZ(r.z),x1=EX(r.x+r.w),z1=EZ(r.z+r.d),xm=(x0+x1)/2,zm=(z0+z1)/2;
  return {nw:[x0,z0],n:[xm,z0],ne:[x1,z0],e:[x1,zm],se:[x1,z1],s:[xm,z1],sw:[x0,z1],w:[x0,zm]};}
const pos=e=>{const b=cv.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top}};
const cellAt=p=>{const w=toW(p.x,p.y);return{x:Math.floor(w.x),z:Math.floor(w.z)}};
function hitRoom(c){const rs=roomsOf(S.cur);for(let i=rs.length-1;i>=0;i--)if(inside(rs[i],c.x,c.z))return rs[i];return null;}
function hitHandle(r,p,tol){const hs=handles(r);for(const k in hs){const [hx,hz]=hs[k];if(Math.abs(p.x-hx)<=tol&&Math.abs(p.y-hz)<=tol)return k;}return null;}
const cornerAt=p=>{const w=toW(p.x,p.y);return{x:Math.round(w.x),z:Math.round(w.z)}};
// Многоугольник: попадание в вершину или в середину стороны (экранные пиксели)
function polyHit(r,p,tol){const ap=absPts(r);
  for(let i=0;i<ap.length;i++){const [x,z]=ap[i];if(Math.abs(EX(x)-p.x)<=tol&&Math.abs(EZ(z)-p.y)<=tol)return{k:'v',i};}
  for(let i=0;i<ap.length;i++){const [x1,z1]=ap[i],[x2,z2]=ap[(i+1)%ap.length];if(Math.hypot(EX((x1+x2)/2)-p.x,EZ((z1+z2)/2)-p.y)<=tol)return{k:'e',i};}
  return null;}
// Контур для правки: у многоугольника — его точки, у прямоугольника — 4 угла, у круга — «лесенка».
function editAbs(r){if(r.shape==='poly')return absPts(r);if(r.shape==='circle')return outlinePts(r).map(([x,z])=>[x+r.x,z+r.z]);
  return [[r.x,r.z],[r.x+r.w,r.z],[r.x+r.w,r.z+r.d],[r.x,r.z+r.d]];}
// Ближайший угол блока на стороне i (для ровной стороны — строго на ней)
function edgePoint(ap,i,p){const [x1,z1]=ap[i],[x2,z2]=ap[(i+1)%ap.length],w=toW(p.x,p.y);
  if(z1===z2)return[Math.max(Math.min(x1,x2),Math.min(Math.max(x1,x2),Math.round(w.x))),z1];
  if(x1===x2)return[x1,Math.max(Math.min(z1,z2),Math.min(Math.max(z1,z2),Math.round(w.z)))];
  return[Math.round(w.x),Math.round(w.z)];}
function nearEdge(r,p,tol){return nearEdgeA(editAbs(r),p,tol);}
function nearEdgeA(ap,p,tol){let best=-1,bd=tol;
  for(let i=0;i<ap.length;i++){const [x1,z1]=ap[i],[x2,z2]=ap[(i+1)%ap.length],ax=EX(x1),az=EZ(z1),bx=EX(x2),bz=EZ(z2);
    const L=(bx-ax)**2+(bz-az)**2||1,t=Math.max(0,Math.min(1,((p.x-ax)*(bx-ax)+(p.y-az)*(bz-az))/L)),dd=Math.hypot(ax+t*(bx-ax)-p.x,az+t*(bz-az)-p.y);
    if(dd<=bd){bd=dd;best=i;}}
  return best;}
function straight(last,k){const dx=k.x-last[0],dz=k.z-last[1];if(Math.abs(dx)>2*Math.abs(dz))return[k.x,last[1]];if(Math.abs(dz)>2*Math.abs(dx))return[last[0],k.z];
  const m=Math.max(Math.abs(dx),Math.abs(dz));return[last[0]+Math.sign(dx)*m,last[1]+Math.sign(dz)*m];}
function finishPoly(){const pd=ui.pd;ui.pd=null;ui.pdHover=null;F('readout').textContent=readoutBase;if(!pd||pd.length<3){req();return;}
  const pr=polyFromAbs(pd);if(pr.pts.length<3||Math.abs(polyArea(pr.pts))<1){req();return;}
  snap();const t=ui.lastType,sh=$t(TYPE[t].short),r=R(S.cur,`${sh} ${maxNum(sh)+1}`,t,'poly',pr.x,pr.z,pr.w,pr.d);r.pts=pr.pts;
  S.rooms.push(r);ui.sel=r.id;persist();setTool('select');renderAll();}
const CUR={nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize'};
function setCursor(){if(ui.view==='section'){cv.style.cursor='grab';return;}cv.style.cursor=ui.tool==='hand'||spaceDown?'grab':(ui.tool==='select'?'default':'crosshair');}
function cancelAct(){if(!act)return;if((act.type==='move'||act.type==='resize'||act.type==='dmove'||act.type==='vmove'||act.type==='emove')&&act.snapped){setS(JSON.parse(undoS.pop()));updUndo();}act=null;}

cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  if(!S)return;cv.setPointerCapture(e.pointerId);const p=pos(e);ptrs.set(e.pointerId,p);ui.eh=null;
  if(ui.view==='section'){if(ptrs.size>1){act=null;return;}
    if(inInset(p)){act={type:'inset'};setCutFromInset(p);return;}
    const hit=secHit(p);if(hit){ui.sel=hit.id;if(S.cur!==hit.floorId)S.cur=hit.floorId;renderFloors();renderInspector();renderRoomList();renderClip();}
    act={type:'span',p0:p,v0:{...SV},moved:false};cv.style.cursor='grabbing';req();return;}
  if(ptrs.size===2){cancelAct();const [a,b]=[...ptrs.values()],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};pinch={d0:Math.hypot(a.x-b.x,a.y-b.y)||1,s0:V.s,w0:toW(m.x,m.y)};req();return;}
  if(ptrs.size>2)return;
  const c=cellAt(p);
  if(e.button===1||e.button===2||ui.tool==='hand'||spaceDown){act={type:'pan',p0:p,v0:{...V}};cv.style.cursor='grabbing';return;}
  if(ui.tool==='door'){const dh=hitDoor(c);if(dh){ui.selDoor=dh.id;ui.sel=null;renderInspector();renderRoomList();req();return;}placeDoor(c);return;}
  if(ui.tool==='select'){
    const dh=hitDoor(c);if(dh){ui.selDoor=dh.id;ui.sel=null;act={type:'dmove',id:dh.id,c0:c,o:{x:dh.x,z:dh.z},snapped:false};renderInspector();renderRoomList();req();return;}
    const r=selRoom(),tol=e.pointerType==='touch'?16:7;
    if(r&&r.floorId===S.cur&&r.shape==='poly'){const ph=polyHit(r,p,tol),ei=ph?-1:nearEdge(r,p,tol-1);
      if(ph||ei>=0){act={type:ph&&ph.k==='v'?'vmove':'emove',i:ph?ph.i:ei,id:r.id,o:{abs:absPts(r)},c0:cornerAt(p),snapped:false};ui.eh=null;return;}}
    else if(r&&r.floorId===S.cur){const h=hitHandle(r,p,tol);if(h){act={type:'resize',h,id:r.id,o:{x:r.x,z:r.z,w:r.w,d:r.d},snapped:false};return;}}
    const hit=hitRoom(c);
    if(hit&&e.altKey){snap();const cp={...hit,id:uid('r'),name:nextName(hit.name)};S.rooms.push(cp);ui.sel=cp.id;act={type:'move',id:cp.id,c0:c,o:{x:cp.x,z:cp.z},snapped:true};renderAll();return;}
    if(hit){ui.sel=hit.id;act={type:'move',id:hit.id,c0:c,o:{x:hit.x,z:hit.z},snapped:false};renderInspector();renderRoomList();req();return;}
    ui.sel=null;renderInspector();renderRoomList();act={type:'pan',p0:p,v0:{...V}};req();return;}
  if(ui.tool==='ruler'){const k=cornerAt(p);ui.ruler={a:[k.x,k.z],b:[k.x,k.z]};act={type:'ruler'};rulerReadout();req();return;}
  if(ui.tool==='poly'){const k=cornerAt(p),pd=ui.pd||(ui.pd=[]);
    if(pd.length>=3&&Math.hypot(EX(pd[0][0])-p.x,EZ(pd[0][1])-p.y)<=10){finishPoly();return;}
    const last=pd[pd.length-1],q=e.shiftKey&&last?straight(last,k):[k.x,k.z];
    if(!last||last[0]!==q[0]||last[1]!==q[1])pd.push(q);polyReadout();req();return;}
  if(ui.tool!=='rect'&&ui.tool!=='circle')return;
  act={type:'draw',shape:ui.tool,c0:c,draft:null};updDraft(c);req();
});
// Линейка: длина в блоках между углами блоков
function rulerInfo(R0){const dx=R0.b[0]-R0.a[0],dz=R0.b[1]-R0.a[1];return{dx,dz,ax:Math.abs(dx),az:Math.abs(dz),len:Math.hypot(dx,dz)};}
const fmtLen=v=>Number.isInteger(v)?String(v):v.toFixed(1);
function rulerReadout(){if(!ui.ruler)return;const q=rulerInfo(ui.ruler);
  F('readout').textContent=(q.ax&&q.az?$t('по X {x} · по Z {z} · по прямой {l} бл.',{x:q.ax,z:q.az,l:fmtLen(q.len)}):$t('{l} бл.',{l:fmtLen(q.len)}))+' · '+`X ${fmt(ui.ruler.a[0])} Z ${fmt(ui.ruler.a[1])} → X ${fmt(ui.ruler.b[0])} Z ${fmt(ui.ruler.b[1])}`;}
function polyReadout(){const pd=ui.pd||[],h=ui.pdHover;if(!pd.length){return;}const last=pd[pd.length-1];
  const len=h?Math.round(Math.hypot(h[0]-last[0],h[1]-last[1])*10)/10:0;
  F('readout').textContent=$t('точек: {n}',{n:pd.length})+(h?' · '+$t('отрезок {l} бл.',{l:len}):'')+' · '+$t('Enter — готово, Esc — отмена');}
function updDraft(c){const a=act.c0;
  if(act.shape==='rect')act.draft={shape:'rect',x:Math.min(a.x,c.x),z:Math.min(a.z,c.z),w:Math.abs(c.x-a.x)+1,d:Math.abs(c.z-a.z)+1};
  else{const rad=Math.max(Math.abs(c.x-a.x),Math.abs(c.z-a.z)),d=2*rad+1;act.draft={shape:'circle',x:a.x-rad,z:a.z-rad,w:d,d};}
  F('readout').textContent=(act.shape==='circle'?$t('диаметр {d} блоков',{d:act.draft.w}):$t('{w} × {d} блоков',{w:act.draft.w,d:act.draft.d}))+' · '+$t('{n} блоков пола',{n:area(act.draft)});}
cv.addEventListener('pointermove',e=>{
  if(!S)return;const p=pos(e);if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,p);
  if(ui.view==='section'){
    if(act&&act.type==='inset'){setCutFromInset(p);return;}
    if(act&&act.type==='span'){SV.cx=act.v0.cx-(p.x-act.p0.x)/SV.s;SV.cy=act.v0.cy+(p.y-act.p0.y)/SV.s;req();return;}
    secReadout(p);cv.style.cursor=inInset(p)?'crosshair':(secHit(p)?'pointer':'grab');return;}
  if(pinch&&ptrs.size>=2){const [a,b]=[...ptrs.values()],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const s=clampS(pinch.s0*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d0);
    V.s=s;V.cx=pinch.w0.x-(m.x-EW/2)/s;V.cz=pinch.w0.z-(m.y-EH/2)/s;req();return;}
  const c=cellAt(p);hoverCell=c;
  if(!act){
    if(ui.tool==='poly'&&ui.pd&&ui.pd.length){const k=cornerAt(p),last=ui.pd[ui.pd.length-1];ui.pdHover=e.shiftKey?straight(last,k):[k.x,k.z];polyReadout();req();return;}
    showReadout(c);if(ui.tool==='select'&&!spaceDown){const r=selRoom(),here=r&&r.floorId===S.cur;
      const ph=here&&r.shape==='poly'?polyHit(r,p,7):null,h=here&&(r.shape==='poly'?(ph?'ph':null):hitHandle(r,p,7));
      let eh=null;if(here&&(!ph||ph.k==='e')&&!(h&&h!=='ph')){const ap=editAbs(r),ei=nearEdgeA(ap,p,6);if(ei>=0){const q=edgePoint(ap,ei,p);eh={i:ei,q,ap};}}
      const was=ui.eh;ui.eh=eh;if((was&&!eh)||(eh&&(!was||was.i!==eh.i||was.q[0]!==eh.q[0]||was.q[1]!==eh.q[1])))req();
      if(eh)F('readout').textContent=`X ${fmt(eh.q[0])} · Z ${fmt(eh.q[1])} · `+$t('двойной клик — точка на стене');
      const [a,b]=eh?[eh.ap[eh.i],eh.ap[(eh.i+1)%eh.ap.length]]:[[0,0],[0,0]],side=a[1]===b[1]?'ns-resize':a[0]===b[0]?'ew-resize':'move';
      cv.style.cursor=h==='ph'?'grab':h?CUR[h]:eh?(r.shape==='poly'?side:'copy'):(hitRoom(c)?'move':'default');}return;}
  if(act.type==='vmove'||act.type==='emove'){const k=cornerAt(p),dx=k.x-act.c0.x,dz=k.z-act.c0.z,rr=S.rooms.find(x=>x.id===act.id);if(!rr)return;
    if(!act.snapped&&!dx&&!dz)return;
    const abs=act.o.abs.map(q=>q.slice());let np;
    if(act.type==='vmove'){abs[act.i]=[abs[act.i][0]+dx,abs[act.i][1]+dz];np=abs;}
    else{const i=act.i,j=(i+1)%abs.length,A=abs[i],B=abs[j],hor=A[1]===B[1],ver=A[0]===B[0];
      if(hor||ver){const mx=hor?0:dx,mz=hor?dz:0;if(!mx&&!mz)return;const A2=[A[0]+mx,A[1]+mz],B2=[B[0]+mx,B[1]+mz];
        np=j===0?abs.concat([A2,B2]):abs.slice(0,i+1).concat([A2,B2],abs.slice(j));
        const ia=i,ib=j===0?0:i+3;np=dropStraight(np,[ia,ib]);}
      else{abs[i]=[A[0]+dx,A[1]+dz];abs[j]=[B[0]+dx,B[1]+dz];np=abs;}}
    const pr=polyFromAbs(np);if(pr.pts.length<3||Math.abs(polyArea(pr.pts))<1)return;
    if(!act.snapped){snap();act.snapped=true;}Object.assign(rr,pr);renderInspector();req();return;}
  if(act.type==='ruler'){const k=cornerAt(p),a=ui.ruler.a;ui.ruler.b=e.shiftKey?straight(a,k):[k.x,k.z];rulerReadout();req();return;}
  if(act.type==='pan'){V.cx=act.v0.cx-(p.x-act.p0.x)/V.s;V.cz=act.v0.cz-(p.y-act.p0.y)/V.s;req();return;}
  if(act.type==='draw'){updDraft(c);req();return;}
  if(act.type==='dmove'){const dx=c.x-act.c0.x,dz=c.z-act.c0.z;if(!act.snapped&&(dx||dz)){snap();act.snapped=true;}if(!act.snapped)return;
    const dd=doorById(act.id);if(dd){dd.x=act.o.x+dx;dd.z=act.o.z+dz;}renderInspector();req();return;}
  const r=S.rooms.find(x=>x.id===act.id);if(!r)return;
  if(act.type==='move'){const dx=c.x-act.c0.x,dz=c.z-act.c0.z;if(!act.snapped&&(dx||dz)){snap();act.snapped=true;}if(!act.snapped)return;
    const rr=S.rooms.find(x=>x.id===act.id);rr.x=act.o.x+dx;rr.z=act.o.z+dz;}
  else{const o=act.o,h=act.h;let x0=o.x,z0=o.z,x1=o.x+o.w-1,z1=o.z+o.d-1;
    if(h.includes('w'))x0=Math.min(c.x,x1);if(h.includes('e'))x1=Math.max(c.x,x0);
    if(h.includes('n'))z0=Math.min(c.z,z1);if(h.includes('s'))z1=Math.max(c.z,z0);
    let nx=x0,nz=z0,nw=x1-x0+1,nd=z1-z0+1;
    if(r.shape==='circle'){const sz=h.length===2?Math.max(nw,nd):(h==='e'||h==='w'?nw:nd);
      nx=h.includes('w')?o.x+o.w-sz:h.includes('e')?o.x:o.x+Math.round((o.w-sz)/2);
      nz=h.includes('n')?o.z+o.d-sz:h.includes('s')?o.z:o.z+Math.round((o.d-sz)/2);nw=nd=sz;}
    if(nx===r.x&&nz===r.z&&nw===r.w&&nd===r.d)return;
    if(!act.snapped){snap();act.snapped=true;}const rr=S.rooms.find(x=>x.id===act.id);rr.x=nx;rr.z=nz;rr.w=nw;rr.d=nd;}
  renderInspector();req();
});
function endPtr(e){
  ptrs.delete(e.pointerId);
  if(pinch){if(ptrs.size<2)pinch=null;return;}
  if(!act||!S)return;
  if(act.type==='span'||act.type==='inset'){act=null;setCursor();return;}
  if(act.type==='ruler'){act=null;const R0=ui.ruler;if(R0&&R0.a[0]===R0.b[0]&&R0.a[1]===R0.b[1])ui.ruler=null;req();return;}
  if(act.type==='draw'&&act.draft){const d=act.draft;
    if((d.shape==='rect'&&d.w*d.d>1)||(d.shape==='circle'&&d.w>=3)){snap();const t=ui.lastType;
      const sh=$t(TYPE[t].short),r=R(S.cur,`${sh} ${maxNum(sh)+1}`,t,d.shape,d.x,d.z,d.w,d.d);S.rooms.push(r);ui.sel=r.id;}}
  const changed=act.type==='draw'||act.snapped;act=null;setCursor();if(changed)persist();renderAll();
}
cv.addEventListener('pointerup',endPtr);
cv.addEventListener('pointercancel',e=>{cancelAct();ptrs.delete(e.pointerId);pinch=null;if(S)renderAll();});
cv.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e);
  if(ui.view==='section'){const h=SV.cx+(p.x-EW/2)/SV.s,Y=SV.cy-(p.y-EH/2)/SV.s,s=clampS(SV.s*Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)));
    SV.s=s;SV.cx=h-(p.x-EW/2)/s;SV.cy=Y+(p.y-EH/2)/s;req();return;}
  const w=toW(p.x,p.y);const s=clampS(V.s*Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)));
  V.s=s;V.cx=w.x-(p.x-EW/2)/s;V.cz=w.z-(p.y-EH/2)/s;req();},{passive:false});
let readoutBase='X 0 · Z 0';
cv.addEventListener('pointerleave',()=>{hoverCell=null;if(ui.eh){ui.eh=null;req();}if(!act)F('readout').textContent=readoutBase;});
function showReadout(c){const wx=S.origin.x+c.x,wz=S.origin.z+c.z,o=S.origin.x||S.origin.z;
  readoutBase=`X ${fmt(c.x)} · Z ${fmt(c.z)}`+(o?' · '+$t('мир {x} {z}',{x:fmt(wx),z:fmt(wz)}):'')+' · '+$t('чанк {x}, {z}',{x:fmt(Math.floor(wx/16)),z:fmt(Math.floor(wz/16))});
  F('readout').textContent=readoutBase;}
function zoomBy(k){if(ui.view==='section')SV.s=clampS(SV.s*k);else V.s=clampS(V.s*k);req();}
function fitView(){if(!S)return;if(ui.view==='section'){secFit();return;}const o=sizeCanvas(cv);EW=o.W;EH=o.H;V=fitV(S,S.cur,EW,EH,30,40);req();}
function centerOn(r){V.cx=r.x+r.w/2;V.cz=r.z+r.d/2;req();}

/* ============ section view ============ */
let SV={cx:0,cy:0,s:6},secInset=null;
ui.view='plan';ui.secBack=true;
function cutOf(){if(!S.cut)S.cut={dir:'s',x:0,z:0};return S.cut;}
const axisOf=d=>(d==='s'||d==='n')?'x':'z';
const mOf=d=>(d==='s'||d==='w')?1:-1;
const DIRN={s:'с юга',n:'с севера',w:'с запада',e:'с востока'};
function cutSpan(r,pos,ax){const m=roomMask(r),W=roomWalls(r),out=[];
  if(ax==='x'){const j=pos-r.z;if(j<0||j>=r.d)return out;
    m.rows[j].forEach(([a,b])=>{const walls=[];for(let i=a;i<b;i++)if(W.has(i+','+j))walls.push(r.x+i);out.push({a:r.x+a,b:r.x+b,walls});});return out;}
  const i=pos-r.x;if(i<0||i>=r.w)return out;let s=-1;
  for(let j=0;j<=r.d;j++){const inn=j<r.d&&m.has(i,j);if(inn&&s<0)s=j;
    if(!inn&&s>=0){const walls=[];for(let q=s;q<j;q++)if(W.has(i+','+q))walls.push(r.z+q);out.push({a:r.z+s,b:r.z+j,walls});s=-1;}}
  return out;}
function isBehind(r,d,pos){return d==='s'?r.z+r.d-1<pos:d==='n'?r.z>pos:d==='w'?r.x>pos:r.x+r.w-1<pos;}
function secItems(){const c=cutOf(),ax=axisOf(c.dir),pos=ax==='x'?c.z:c.x,fl=sorted(),cut=[],back=[];
  fl.forEach((f,fi)=>roomsOf(f.id).forEach(r=>{const sps=cutSpan(r,pos,ax),y0=inY0(f),y1=y0+(r.h||f.height);
    if(sps.length)sps.forEach(sp=>cut.push({r,f,fi,a:sp.a,b:sp.b,walls:sp.walls,y0,y1,open:false,merged:false}));
    else if(isBehind(r,c.dir,pos))back.push({a:ax==='x'?r.x:r.z,b:ax==='x'?r.x+r.w:r.z+r.d,y0,y1});}));
  cut.forEach(it=>{if(it.r.type!=='atrium'||!fl[it.fi+1])return;const lo=fl[it.fi+1];
    const cov=o=>o.f===lo&&o.r.type==='atrium'&&o.a<=it.a&&o.b>=it.b&&o.y1===it.f.y;
    const same=cut.find(o=>cov(o)&&o.r.name===it.r.name),any=same||cut.find(cov);
    if(any){it.open=true;if(same){same.merged=true;it.lower=same;}}});
  return {cut,back,ax,pos,m:mOf(c.dir),dir:c.dir};}
function secFitV(W,H,inset){const {cut,m}=secItems(),fl=sorted();let h0=1e9,h1=-1e9;
  cut.forEach(it=>{const a=m===1?it.a:-it.b,b=m===1?it.b:-it.a;h0=Math.min(h0,a);h1=Math.max(h1,b);});
  if(!cut.length){h0=-30;h1=30;}
  const y0=fl[fl.length-1].y,y1=inY1(fl[0])+1,L=130,Rr=inset&&W>=600?200:20,T=inset?60:24,B=30;
  const s=clampS(Math.min((W-L-Rr)/Math.max(1,h1-h0),(H-T-B)/Math.max(1,y1-y0)));
  const sx=L+(W-L-Rr)/2,sy=T+(H-T-B)/2;return {cx:(h0+h1)/2-(sx-W/2)/s,cy:(y0+y1)/2+(sy-H/2)/s,s};}
function secFit(){const o=sizeCanvas(cv);EW=o.W;EH=o.H;SV=secFitV(EW,EH,true);req();}
function drawSection(ctx,W,H,opt={}){
  const tk=opt.tk||tokens(),V=opt.V||SV,s=V.s,{cut,back,m,ax,pos,dir}=secItems(),fl=sorted();
  const SX=h=>(h-V.cx)*s+W/2,SY=Y=>(V.cy-Y)*s+H/2,hs=(a,b)=>m===1?[a,b]:[-b,-a];
  ctx.fillStyle=tk.canvas;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.setLineDash([2,6]);ctx.strokeStyle=tk.chunk;ctx.lineWidth=1;
  fl.forEach(f=>{const y=Math.round(SY(f.y))+.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();});ctx.restore();
  if(ui.secBack){ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle=tk.muted;ctx.globalAlpha=.4;ctx.lineWidth=1;
    back.forEach(it=>{const [h0,h1]=hs(it.a,it.b);ctx.strokeRect(SX(h0)+.5,SY(it.y1)+.5,(h1-h0)*s-1,(it.y1-it.y0)*s-1);});ctx.restore();}
  cut.forEach(it=>{const col=roomColor(it.r),[h0,h1]=hs(it.a,it.b),x0=SX(h0),x1=SX(h1),top=SY(it.y1),bot=SY(it.open?it.f.y:it.y0);
    ctx.fillStyle=hexA(col,.85);ctx.fillRect(x0,top,x1-x0,bot-top);
    if(it.walls.length){ctx.fillStyle=wallCol(col);it.walls.forEach(u=>{const [c0]=hs(u,u+1);ctx.fillRect(SX(c0),top,s,bot-top);});}
    const sl=slabOf(it.f);if(!it.open&&sl>0){ctx.fillStyle=tk.muted;ctx.globalAlpha=.75;ctx.fillRect(x0,SY(it.f.y+sl),x1-x0,sl*s);ctx.globalAlpha=1;}
    ctx.strokeStyle=shade(col,lum(col)>.7?.62:.7);ctx.lineWidth=1;ctx.beginPath();
    ctx.moveTo(x0+.5,top);ctx.lineTo(x0+.5,bot);ctx.moveTo(x1-.5,top);ctx.lineTo(x1-.5,bot);
    if(!it.merged){ctx.moveTo(x0,top+.5);ctx.lineTo(x1,top+.5);}if(!it.open){ctx.moveTo(x0,bot-.5);ctx.lineTo(x1,bot-.5);}ctx.stroke();});
  (S.doors||[]).forEach(d=>{const f=floor(d.floorId);if(!f)return;let a,b;
    if(ax==='x'){if(pos<d.z||pos>=d.z+d.d)return;a=d.x;b=d.x+d.w;}else{if(pos<d.x||pos>=d.x+d.w)return;a=d.z;b=d.z+d.d;}
    const [h0,h1]=hs(a,b),y0=inY0(f);ctx.fillStyle=tk.raised;ctx.globalAlpha=.92;ctx.fillRect(SX(h0),SY(y0+d.h),(h1-h0)*s,d.h*s);ctx.globalAlpha=1;
    ctx.strokeStyle=tk.accent;ctx.lineWidth=1.5;ctx.strokeRect(SX(h0)+.75,SY(y0+d.h)+.75,(h1-h0)*s-1.5,d.h*s-1.5);});
  ctx.fillStyle=tk.muted;ctx.globalAlpha=.75;
  cut.forEach(it=>{const up=fl[it.fi-1],ct=Math.max(1,slabOf(it.f));let cov=[];
    if(up&&up.y===it.y1)cov=cut.filter(o=>o.f===up).map(o=>[o.a,o.b]);
    let u=it.a;while(u<it.b){const isC=cov.some(([a,b])=>u>=a&&u<b);let v=u+1;while(v<it.b&&cov.some(([a,b])=>v>=a&&v<b)===isC)v++;
      if(!isC){const [h0,h1]=hs(u,v);ctx.fillRect(SX(h0),SY(it.y1+ct),(h1-h0)*s,ct*s);}u=v;}});
  ctx.globalAlpha=1;
  cut.forEach(it=>{if(it.r.id!==ui.sel)return;const [h0,h1]=hs(it.a,it.b);ctx.strokeStyle=tk.accent;ctx.lineWidth=2;
    ctx.strokeRect(SX(h0)-1,SY(it.y1)-1,(h1-h0)*s+2,(it.y1-(it.open?it.f.y:it.y0))*s+2);});
  const taken=[];// сращённые комнаты в разрезе накладываются: подпись получает самая широкая
  cut.slice().sort((p,q)=>(q.b-q.a)-(p.b-p.a)).forEach(it=>{if(it.merged)return;const col=roomColor(it.r),[h0,h1]=hs(it.a,it.b),x0=SX(h0),bw=(h1-h0)*s,top=SY(it.y1),bh=SY(it.open?it.f.y:it.y0)-top;
    if(bw<54||bh<18)return;if(taken.some(o=>o.f===it.f&&o.y1===it.y1&&it.a<o.b&&it.b>o.a))return;taken.push(it);ctx.save();ctx.beginPath();ctx.rect(x0,top,bw,bh);ctx.clip();
    ctx.fillStyle=lum(col)>.55?'#15181a':'#ffffff';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.font='600 12px "Golos Text", system-ui, sans-serif';ctx.fillText(ellipsize(ctx,it.r.name||'',bw-12),x0+6+(it.walls.length&&it.walls[0]===it.a?s:0),top+5);
    if(bh>=34){ctx.globalAlpha=.85;ctx.font='500 11px "JetBrains Mono", ui-monospace, monospace';let lo=it;while(lo.lower)lo=lo.lower;
      ctx.fillText(ellipsize(ctx,$t('{n} бл. · пол→{f} потолок {c}',{n:it.b-it.a,f:fmt(lo.y0),c:fmt(it.y1-1)}),bw-12),x0+6+(it.walls.length&&it.walls[0]===it.a?s:0),top+21);}
    ctx.restore();});
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';let lastY=-1e9;
  fl.forEach(f=>{const cy=SY(inY0(f)+f.height/2);if(cy<-20||cy>H+20||Math.abs(cy-lastY)<30)return;lastY=cy;
    const cur=f.id===S.cur;ctx.font=`${cur?600:500} 12px "Golos Text", system-ui, sans-serif`;const n=ellipsize(ctx,f.name,110);
    ctx.font='500 11px "JetBrains Mono", monospace';const yl=`Y ${fmt(f.y)}`;ctx.font=`${cur?600:500} 12px "Golos Text", system-ui, sans-serif`;
    const w=Math.max(ctx.measureText(n).width,60)+14;ctx.fillStyle=tk.panel;ctx.globalAlpha=.92;ctx.fillRect(8,cy-17,w,34);ctx.globalAlpha=1;
    ctx.fillStyle=cur?tk.accent:tk.line;ctx.fillRect(8,cy-17,2,34);
    ctx.fillStyle=cur?tk.ink:tk.muted;ctx.fillText(n,16,cy-6);ctx.font='500 11px "JetBrains Mono", monospace';ctx.fillText(yl,16,cy+8);});
  ctx.restore();
  if(!cut.length){ctx.fillStyle=tk.muted;ctx.font='500 14px "Golos Text", system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText($t('Линия разреза не задевает ни одной комнаты. Передвинь её на мини-плане.'),W/2,H/2);}
  secInset=null;if(opt.noInset)return;
  const sz=W<600?120:170,ix=W-sz-10,iy=W<600?H-sz-40:10;
  ctx.save();ctx.translate(ix,iy);ctx.beginPath();ctx.rect(0,0,sz,sz);ctx.clip();const Vm=fitV(S,S.cur,sz,sz,10,10);paint(ctx,sz,sz,Vm,S,S.cur,{tk});
  const L=v=>(v+.5-(ax==='x'?Vm.cz:Vm.cx))*Vm.s+sz/2;ctx.strokeStyle=tk.accent;ctx.lineWidth=2;ctx.setLineDash([6,3]);ctx.beginPath();
  if(ax==='x'){ctx.moveTo(0,L(pos));ctx.lineTo(sz,L(pos));}else{ctx.moveTo(L(pos),0);ctx.lineTo(L(pos),sz);}ctx.stroke();ctx.setLineDash([]);
  const vec={s:[0,-1],n:[0,1],w:[1,0],e:[-1,0]}[dir];ctx.fillStyle=tk.accent;
  [[10],[sz-10]].forEach(([t])=>{const bx=ax==='x'?t:L(pos),by=ax==='x'?L(pos):t,[dx,dy]=vec;ctx.beginPath();
    ctx.moveTo(bx+dx*11,by+dy*11);ctx.lineTo(bx-dy*6,by+dx*6);ctx.lineTo(bx+dy*6,by-dx*6);ctx.closePath();ctx.fill();});
  ctx.restore();ctx.strokeStyle=tk.line;ctx.lineWidth=1;ctx.strokeRect(ix+.5,iy+.5,sz-1,sz-1);
  ctx.fillStyle=tk.muted;ctx.font='500 11px "Golos Text", system-ui, sans-serif';ctx.textAlign='right';ctx.textBaseline='top';
  ctx.fillText($t('тяни по плану — линия разреза'),ix+sz,iy+sz+5);ctx.textAlign='left';
  secInset={x:ix,y:iy,sz,V:Vm};
}
function inInset(p){const i=secInset;return i&&p.x>=i.x&&p.x<=i.x+i.sz&&p.y>=i.y&&p.y<=i.y+i.sz;}
function setCutFromInset(p){const i=secInset;if(!i)return;const c=cutOf(),ax=axisOf(c.dir);
  const wx=Math.floor(i.V.cx+(p.x-i.x-i.sz/2)/i.V.s),wz=Math.floor(i.V.cz+(p.y-i.y-i.sz/2)/i.V.s);
  if(ax==='x'){if(c.z===wz)return;c.z=wz;}else{if(c.x===wx)return;c.x=wx;}persist();renderSecBar();req();}
function secHit(p){const {cut,m}=secItems(),s=SV.s,SX=h=>(h-SV.cx)*s+EW/2,SY=Y=>(SV.cy-Y)*s+EH/2;let hit=null;
  cut.forEach(it=>{const h0=m===1?it.a:-it.b,h1=m===1?it.b:-it.a,top=SY(it.y1),bot=SY(it.open?it.f.y:it.y0);
    if(p.x>=SX(h0)&&p.x<SX(h1)&&p.y>=top&&p.y<bot)hit=it.r;});return hit;}
function secReadout(p){const c=cutOf(),ax=axisOf(c.dir),m=mOf(c.dir),h=SV.cx+(p.x-EW/2)/SV.s,u=m===1?Math.floor(h):-Math.floor(h)-1,Y=Math.floor(SV.cy-(p.y-EH/2)/SV.s);
  const o=ax==='x'?S.origin.x:S.origin.z;F('readout').textContent=`${ax==='x'?'X':'Z'} ${fmt(o+u)} · Y ${fmt(Y)}`;}
function renderSecBar(){const sec=ui.view==='section';F('secbar').hidden=!sec;
  document.querySelectorAll('#view-seg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===ui.view));
  if(!S)return;const c=cutOf(),ax=axisOf(c.dir),pos=ax==='x'?c.z:c.x,o=ax==='x'?S.origin.z:S.origin.x;
  document.querySelectorAll('#sec-dir button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.dir===c.dir));
  F('sec-pos-l').textContent=ax==='x'?$t('Линия Z'):$t('Линия X');setVal('sec-pos',pos);
  F('sec-world').textContent=(S.origin.x||S.origin.z)?$t('в мире {a} {v}',{a:ax==='x'?'Z':'X',v:fmt(o+pos)}):'';F('sec-back').checked=ui.secBack;}
function setView(v){ui.view=v;const sec=v==='section';
  F('floor-badge').hidden=sec;F('hint').hidden=sec;F('scale').hidden=sec;
  document.querySelectorAll('[data-tool]').forEach(b=>{b.disabled=sec&&b.dataset.tool!=='select';});
  act=null;renderSecBar();setCursor();if(sec)requestAnimationFrame(secFit);else req();}
document.querySelectorAll('#view-seg button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('#sec-dir button').forEach(b=>b.addEventListener('click',()=>{cutOf().dir=b.dataset.dir;persist();renderSecBar();secFit();}));
F('sec-pos').addEventListener('input',()=>{if(!S)return;const c=cutOf(),n=num(F('sec-pos').value,null);if(n===null)return;if(axisOf(c.dir)==='x')c.z=n;else c.x=n;persist();renderSecBar();req();});
F('sec-sel').onclick=()=>{const r=selRoom();if(!r){F('sec-world').textContent=$t('сначала выбери комнату');return;}const c=cutOf();
  c.z=r.z+Math.floor((r.d-1)/2);c.x=r.x+Math.floor((r.w-1)/2);persist();renderSecBar();req();};
F('sec-back').onchange=e=>{ui.secBack=e.target.checked;req();};

/* ============ editor panels ============ */
function setVal(id,v){const el=F(id);if(document.activeElement===el)return;el.value=v;}
function renderProject(){setVal('p-name',S.name||'');setVal('p-ox',S.origin.x);setVal('p-oz',S.origin.z);F('p-ghost').value=ui.ghost;}
function renderFloors(){
  restack();const st=stackOf();
  F('st-auto').checked=st.auto;F('st-box').hidden=!st.auto;setVal('st-top',st.top);
  F('f-y').disabled=st.auto;F('f-y').title=st.auto?$t('Считается автоматически'):'';
  {const fl=sorted(),top=inY1(fl[0]),bot=fl[fl.length-1].y,el=F('st-sum');
   const tall=top-bot+1;let t=$t('Комплекс от Y {a} до Y {b} · {n} {blocks} в высоту',{a:fmt(bot),b:fmt(top),n:tall,blocks:pl(tall,'block')});
   const w=[];if(bot<-64)w.push($t('нижний этаж ниже бедрока (Y −64)'));if(top>319)w.push($t('верх выше лимита мира (Y 319)'));
   if(w.length)t+=' · '+w.join(', ');el.textContent=t;el.classList.toggle('warn',w.length>0);}
  const ul=F('floors');ul.innerHTML='';
  sorted().forEach(f=>{const li=document.createElement('li'),b=document.createElement('button');
    b.innerHTML=`<span class="y">Y ${fmt(f.y)}</span><span class="n"></span><span class="c">${roomsOf(f.id).length}</span>`;
    b.querySelector('.n').textContent=f.name;b.setAttribute('aria-current',f.id===S.cur);
    b.addEventListener('click',()=>{if(S.cur===f.id)return;S.cur=f.id;ui.sel=null;persist();renderAll();});li.appendChild(b);ul.appendChild(li);});
  const f=floor(S.cur);setVal('f-name',f.name);setVal('f-y',f.y);setVal('f-h',f.height);setVal('f-slab',slabOf(f));F('f-del').disabled=S.floors.length<2;
  const sl=slabOf(f);F('f-range').textContent=(sl?$t('плита пола Y {y}',{y:fmt(f.y)+(sl>1?'…'+fmt(f.y+sl-1):'')}):$t('без пола'))+' · '+$t('стоишь на Y {a} · потолок Y {b}',{a:fmt(inY0(f)),b:fmt(inY1(f))});
  const g=ghostFloor(),bd=F('floor-badge');bd.innerHTML='';bd.append(f.name,' ');const sm=document.createElement('small');
  sm.textContent=$t('пол {a} · стоишь {b} · потолок {c}',{a:fmt(f.y),b:fmt(inY0(f)),c:fmt(inY1(f))})+(g?' · '+$t('подложка: {name}',{name:g.name}):'');bd.appendChild(sm);renderMats();}
function renderTypes(){const box=F('types');box.innerHTML='';
  TYPES.forEach(([k,l])=>{const b=document.createElement('button');b.innerHTML=`<span class="sw" style="background:${TYPE[k].color}"></span>`;b.append($t(l));
    b.setAttribute('aria-pressed',ui.lastType===k);b.addEventListener('click',()=>{ui.lastType=k;renderTypes();if(ui.tool==='select'||ui.tool==='hand')setTool('rect');});box.appendChild(b);});}
function renderInspector(){
  if(ui.sel)ui.selDoor=null;const dr=!ui.sel&&ui.selDoor?doorById(ui.selDoor):null;if(ui.selDoor&&!dr)ui.selDoor=null;
  const nd=!dr&&!ui.sel&&ui.tool==='door'&&ui.view!=='section';
  F('dinsp').hidden=!dr;F('dnew').hidden=!nd;F('insp-title').textContent=dr?$t('Дверь'):nd?$t('Новая дверь'):$t('Комната');
  if(dr){F('insp').hidden=true;F('insp-empty').hidden=true;renderDoor(dr);return;}
  if(nd){F('insp').hidden=true;F('insp-empty').hidden=true;F('r-area').textContent='';return;}
  const r=selRoom();F('insp').hidden=!r;F('insp-empty').hidden=!!r;F('r-area').textContent=r?$t('внутри {d} · {n} бл. пола',{d:innerDims(r),n:innerArea(r)}):'';if(!r)return;setVal('r-wall',wallOf(r));
  const f=floor(r.floorId);
  setVal('r-name',r.name);setVal('r-type',r.type);setVal('r-shape',r.shape);setVal('r-x',r.x);setVal('r-z',r.z);setVal('r-w',r.w);setVal('r-d',r.d);
  setVal('r-h',r.h??'');F('r-h').placeholder=f.height;setVal('r-color',roomColor(r));setVal('r-notes',r.notes||'');
  F('r-d').disabled=r.shape==='circle'||r.shape==='poly';F('r-w').disabled=r.shape==='poly';F('r-join').checked=!!r.join;F('r-polyhelp').hidden=r.shape!=='poly';F('l-w').textContent=r.shape==='circle'?$t('Диаметр'):$t('Ширина (X)');F('r-color-reset').hidden=!r.color;
  const sel=F('r-floor');if(document.activeElement!==sel){sel.innerHTML='';sorted().forEach(fl=>{const o=document.createElement('option');o.value=fl.id;o.textContent=fl.name;sel.appendChild(o);});sel.value=r.floorId;}
  const wx=S.origin.x,wz=S.origin.z,o=wx||wz;
  F('r-range').textContent=`X ${fmt(r.x)}…${fmt(r.x+r.w-1)} · Z ${fmt(r.z)}…${fmt(r.z+r.d-1)}`+(o?' · '+$t('в мире X {x}, Z {z}',{x:`${fmt(wx+r.x)}…${fmt(wx+r.x+r.w-1)}`,z:`${fmt(wz+r.z)}…${fmt(wz+r.z+r.d-1)}`}):'')+' · '+$t('стоишь Y {a} · потолок Y {b}',{a:fmt(inY0(f)),b:fmt(inY1(f,r.h))});
  renderCorners(r,f);renderMats();}
function renderCorners(r,f){const box=F('r-corners'),o=S.origin,bound=o.x||o.z,y=inY0(f);box.innerHTML='';
  F('r-corners-h').textContent=bound?$t('Углы в мире · стоишь на Y {a}, потолок Y {b}',{a:fmt(y),b:fmt(inY1(f,r.h))}):$t('Углы от центра. Впиши «Центр в мире» в карточке «План», чтобы видеть координаты сервера.');
  cornerPts(r).forEach(([label,x,z])=>{const wx=o.x+x,wz=o.z+z;
    const k=document.createElement('span');k.className='k';k.textContent=label;
    const v=document.createElement('span');v.className='v';v.textContent=`X ${fmt(wx)} · Z ${fmt(wz)}`;
    const b=document.createElement('button');b.textContent='/tp';b.title=$t('Скопировать: {cmd}',{cmd:`/tp @s ${wx} ${y} ${wz}`});
    b.onclick=()=>copyTp(`/tp @s ${wx} ${y} ${wz}`,b);box.append(k,v,b);});}
function copyTp(t,btn){const ok=()=>{btn.textContent='✓';setTimeout(()=>{btn.textContent='/tp';},1200);},fb=()=>status($t('Команда: ')+t);
  try{navigator.clipboard.writeText(t).then(ok,fb);}catch(e){fb();}}
function renderRoomList(){const ul=F('rooms');ul.innerHTML='';const rs=roomsOf(S.cur);
  rs.forEach(r=>{const li=document.createElement('li'),b=document.createElement('button');
    b.innerHTML=`<span class="sw" style="background:${roomColor(r)}"></span><span class="n"></span><span class="d">${dims(r)}</span>`;
    b.querySelector('.n').textContent=r.name||$t('Без названия');b.setAttribute('aria-current',r.id===ui.sel);
    b.addEventListener('click',()=>{ui.sel=r.id;if(ui.tool!=='select')setTool('select');centerOn(r);renderInspector();renderRoomList();});li.appendChild(b);ul.appendChild(li);});
  if(!rs.length){const li=document.createElement('li');li.className='meta';li.textContent=$t('Пока пусто. Нарисуй первую комнату на плане.');ul.appendChild(li);}
  F('rooms-sum').textContent=$t('{n} · {b} бл.',{n:rs.length,b:rs.filter(r=>r.type!=='corridor'&&r.type!=='atrium').reduce((a,r)=>a+innerArea(r),0)});}
function renderClip(){F('clip').hidden=!clip;if(!clip)return;
  F('clip-name').textContent=$t('В буфере: {name}',{name:clip.name||$t('комната')})+' · '+dims(clip)+(clip.floorId!==S.cur?' · '+$t('встанет на те же X и Z'):'');}
function renderAll(){if(!S)return;renderProject();renderFloors();renderTypes();renderInspector();renderRoomList();renderClip();renderSecBar();updUndo();setCursor();req();}

const HINTS={ruler:'Тяни от точки до точки — покажет расстояние в блоках. Shift — ровно по прямой или под 45°. Esc убирает замер.',poly:'Кликай по углам блоков, чтобы ставить точки. Shift — ровные линии. Клик по первой точке, двойной клик или Enter — готово. Backspace убирает последнюю точку.',door:'Кликни по стене, чтобы прорезать проём. Размер новой двери задаётся справа. Проём пройдёт и через двойные стены соседних комнат.',select:'Клик выбирает, перетаскивание двигает, ручки меняют размер. Alt + перетаскивание копирует. Двойной клик внутри комнаты — схема по блокам, по стене — новая точка: потом тяни кусок стены рядом с ней. Двойной клик по точке удаляет её.',rect:'Тяни от угла до угла.',circle:'Тяни от центра наружу: диаметр всегда нечётный.',hand:'Тяни, чтобы двигать план. Колесо меняет масштаб.'};
function setTool(t){if(t!=='ruler'&&ui.ruler){ui.ruler=null;req();}if(t!=='poly'&&ui.pd){ui.pd=null;ui.pdHover=null;F('readout').textContent=readoutBase;}ui.tool=t;document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));F('hint').textContent=HINTS[t]?$t(HINTS[t]):'';setCursor();
  if(t==='door'&&S){ui.sel=null;ui.selDoor=null;renderRoomList();req();}if(S)renderInspector();}
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
F('zin').onclick=()=>zoomBy(1.25);F('zout').onclick=()=>zoomBy(.8);F('zfit').onclick=fitView;
F('undo').onclick=doUndo;F('redo').onclick=doRedo;
function buildTypeOptions(){const s=F('r-type'),v=s.value;s.innerHTML='';TYPES.forEach(([k,l])=>{const o=document.createElement('option');o.value=k;o.textContent=$t(l);s.appendChild(o);});if(v)s.value=v;}
buildTypeOptions();

function bind(id,fn,after){const el=F(id);
  el.addEventListener('input',()=>{if(!S)return;if(!editSnap){snap();editSnap=true;}fn(el.value);persist();(after||(()=>{renderFloors();renderRoomList();renderInspector();}))();req();});
  el.addEventListener('change',()=>{editSnap=false;if(S&&el.tagName!=='SELECT'){setVal(id,el.value);}req();});el.addEventListener('blur',()=>{editSnap=false;});}
const withRoom=fn=>v=>{const r=selRoom();if(r)fn(r,v);};
bind('r-name',withRoom((r,v)=>r.name=v));
bind('r-type',withRoom((r,v)=>{r.type=v;r.color=null;}));
bind('r-shape',withRoom((r,v)=>{if(v===(r.shape||'rect'))return;
  if(v==='poly'){const pr=polyFromAbs(outlinePts(r).map(([x,z])=>[x+r.x,z+r.z]),true);Object.assign(r,pr);r.shape='poly';return;}
  delete r.pts;r.shape=v;if(v==='circle'){let s=Math.max(r.w,r.d);if(s%2===0)s++;r.w=r.d=s;}}));
bind('r-x',withRoom((r,v)=>r.x=num(v,r.x)));bind('r-z',withRoom((r,v)=>r.z=num(v,r.z)));
bind('r-w',withRoom((r,v)=>{if(r.shape==='poly')return;r.w=Math.max(1,Math.min(1000,num(v,r.w)));if(r.shape==='circle')r.d=r.w;}));
bind('r-d',withRoom((r,v)=>{if(r.shape==='poly'||r.shape==='circle')return;r.d=Math.max(1,Math.min(1000,num(v,r.d)));}));
F('r-join').addEventListener('change',e=>{const r=selRoom();if(!r)return;snap();if(e.target.checked)r.join=true;else delete r.join;persist();renderAll();});
bind('r-wall',withRoom((r,v)=>{r.wall=Math.max(0,Math.min(8,num(v,1)));}));
bind('r-h',withRoom((r,v)=>{const n=num(v,null);r.h=n&&n>0?n:null;}));
bind('r-color',withRoom((r,v)=>r.color=v.toLowerCase()===TYPE[r.type].color.toLowerCase()?null:v));
bind('r-notes',withRoom((r,v)=>r.notes=v),()=>{});
bind('r-floor',withRoom((r,v)=>{r.floorId=v;S.cur=v;}),renderAll);
F('r-color-reset').onclick=()=>{const r=selRoom();if(!r)return;snap();r.color=null;persist();renderAll();};
F('r-dup').onclick=()=>{const r=selRoom();if(!r)return;snap();const c={...r,id:uid('r'),x:r.x+r.w+1,name:nextName(r.name)};S.rooms.push(c);ui.sel=c.id;persist();renderAll();};
function delSel(){if(!ui.sel&&ui.selDoor){delDoor();return;}const r=selRoom();if(!r)return;snap();S.rooms=S.rooms.filter(x=>x.id!==r.id);ui.sel=null;persist();renderAll();}
F('r-del').onclick=delSel;
function status(t){const el=F('r-status');el.textContent=t;clearTimeout(status._t);status._t=setTimeout(()=>{el.textContent='';},2800);}
function copySel(){const r=selRoom();if(!r)return;clip={...r};renderClip();status($t('«{name}» в буфере. Ctrl+V вставит под курсор или на другой этаж.',{name:r.name||$t('Комната')}));}
function pasteClip(atCursor){if(!clip)return;snap();const c={...clip,id:uid('r'),floorId:S.cur,name:nextName(clip.name)};
  if(clip.floorId===S.cur){if(atCursor&&hoverCell){c.x=hoverCell.x-Math.floor(c.w/2);c.z=hoverCell.z-Math.floor(c.d/2);}else c.x=clip.x+clip.w+1;}
  S.rooms.push(c);clip={...clip,x:c.x,z:c.z,floorId:S.cur};ui.sel=c.id;if(ui.tool!=='select')setTool('select');persist();renderAll();}
F('r-copy').onclick=copySel;F('clip-paste').onclick=()=>pasteClip(false);
F('r-all').onclick=()=>{const r=selRoom();if(!r)return;snap();let n=0;
  S.floors.forEach(f=>{if(f.id===r.floorId)return;if(S.rooms.some(x=>x.floorId===f.id&&x.shape===r.shape&&x.x===r.x&&x.z===r.z&&x.w===r.w&&x.d===r.d))return;
    S.rooms.push({...r,id:uid('r'),floorId:f.id});n++;});
  if(!n){undoS.pop();updUndo();status($t('Она уже есть на всех этажах.'));return;}
  persist();renderAll();status($t('Добавлено на этажей: {n}. Ctrl+Z отменит.',{n}));};
bind('f-name',v=>floor(S.cur).name=v,()=>renderFloors());
bind('f-y',v=>{const f=floor(S.cur);f.y=num(v,f.y);},()=>renderFloors());
bind('f-h',v=>{const f=floor(S.cur);f.height=Math.max(1,num(v,f.height));},()=>{renderFloors();renderInspector();});
bind('p-name',v=>S.name=v,()=>{});
bind('p-ox',v=>S.origin.x=num(v,0),()=>{renderInspector();req();});bind('p-oz',v=>S.origin.z=num(v,0),()=>{renderInspector();req();});
F('p-ghost').onchange=e=>{ui.ghost=e.target.value;renderFloors();req();};
function fillApplyAll(){const h=S.floors.map(f=>f.height),s=S.floors.map(slabOf);
  F('st-h').value=h.every(x=>x===h[0])?h[0]:10;F('st-slab').value=s.every(x=>x===s[0])?s[0]:1;}
F('st-auto').addEventListener('change',e=>{if(!S)return;snap();const st=stackOf();st.auto=e.target.checked;if(st.auto)st.top=sorted()[0].y;persist();renderAll();});
bind('st-top',v=>{const st=stackOf();st.top=num(v,st.top);},()=>{renderFloors();renderInspector();});
F('st-apply').onclick=()=>{if(!S)return;const h=Math.max(1,Math.min(384,num(F('st-h').value,10))),sl=Math.max(0,Math.min(32,num(F('st-slab').value,1)));
  F('st-h').value=h;F('st-slab').value=sl;snap();S.floors.forEach(f=>{f.height=h;f.slab=sl;});persist();renderAll();};
['st-h','st-slab'].forEach(id=>F(id).addEventListener('keydown',e=>{if(e.key==='Enter')F('st-apply').click();}));
bind('f-slab',v=>{const f=floor(S.cur);f.slab=Math.max(0,Math.min(32,num(v,1)));},()=>{renderFloors();renderInspector();});
function addFloor(dir,copy){const cur=floor(S.cur),s=sorted(),top=s[0],low=s[s.length-1];snap();
  const step=cur.height+slabOf(cur);
  const nf={id:uid('f'),name:copy?$t('{name} (копия)',{name:cur.name}):$t('Ярус {n}',{n:S.floors.length+1}),y:copy?cur.y-step:(dir==='above'?top.y+slabOf(top)+top.height:low.y-step),height:cur.height,slab:slabOf(cur)};
  if(copy)S.floors.filter(f=>f.y<=nf.y&&f.id!==cur.id).forEach(f=>f.y-=step);
  S.floors.push(nf);
  if(!copy&&dir==='above'&&S.stack&&S.stack.auto)S.stack.top=nf.y;
  if(copy){roomsOf(cur.id).forEach(r=>S.rooms.push({...r,id:uid('r'),floorId:nf.id}));
    if(S.doors)S.doors.filter(d=>d.floorId===cur.id).forEach(d=>S.doors.push({...d,id:uid('d'),floorId:nf.id}));}
  else S.rooms.push(R(nf.id,$t('Лифт'),'atrium','rect',-2,-2,5,5));
  S.cur=nf.id;ui.sel=null;persist();renderAll();}
F('f-above').onclick=()=>addFloor('above');F('f-below').onclick=()=>addFloor('below');F('f-dup').onclick=()=>addFloor('below',true);
armed(F('f-del'),'Точно удалить с комнатами?',()=>{if(S.floors.length<2)return;snap();const id=S.cur,sf=sorted();if(S.stack&&S.stack.auto&&sf[0].id===id&&sf[1])S.stack.top=sf[1].y;S.floors=S.floors.filter(f=>f.id!==id);S.rooms=S.rooms.filter(r=>r.floorId!==id);if(S.doors)S.doors=S.doors.filter(d=>d.floorId!==id);S.cur=sorted()[0].id;ui.sel=null;persist();renderAll();});

/* ============ export / import ============ */
const LEGEND_RU='Вид сверху, единица = 1 блок. X растёт на восток, Z на юг (как в Minecraft). x_from/x_to и z_from/z_to включительные, отсчёт от центрального блока лифта (0,0). Круг задан описанным квадратом, диаметр = x_to−x_from+1. y_floor — Y нижнего блока плиты пола, floor_thickness — толщина плиты, stand_y = y_floor + floor_thickness — Y, на котором стоишь (первый блок воздуха), height — высота помещения внутри, ceiling_y — последний блок воздуха под потолком. Размеры и координаты наружные, вместе со стенами; wall — толщина стены в блоках внутри этих границ, inner_size — свободное место внутри.';
const legend=()=>$t(LEGEND_RU);
function exportData(){const o=S.origin,hasO=o.x||o.z;
  const st=stackOf();
  const own=x=>x&&x.mat&&(x.mat.wall||x.mat.floor||x.mat.ceil)?{wall:x.mat.wall||'',floor:x.mat.floor||'',ceil:x.mat.ceil||''}:undefined;
  const doorsOf=f=>(S.doors||[]).filter(d=>d.floorId===f.id).map(d=>({x_from:d.x,x_to:d.x+d.w-1,z_from:d.z,z_to:d.z+d.d-1,axis:d.axis,height:d.h,y_from:inY0(f),y_to:inY0(f)+d.h-1}));
  return {format:'underground-plan/1',project:S.name,units:'blocks',legend:legend(),origin_world:{x:o.x,z:o.z},auto_y:st.auto?{top_floor_y:st.top}:null,
    materials:{wall:shortB(matOf(null,null,'wall')),floor:shortB(matOf(null,null,'floor')),ceil:shortB(matOf(null,null,'ceil'))},
    floors:sorted().map(f=>({name:f.name,y_floor:f.y,floor_thickness:slabOf(f),stand_y:inY0(f),height:f.height,ceiling_y:inY1(f),interior_y:[inY0(f),inY1(f)],materials:own(f),doors:doorsOf(f),rooms:roomsOf(f.id).map(r=>{
      const e={name:r.name,type:r.type,type_label:$t(TYPE[r.type].label),shape:r.shape||'rect',size:dims(r).replace('⌀','diameter '),x_from:r.x,x_to:r.x+r.w-1,z_from:r.z,z_to:r.z+r.d-1,wall:wallOf(r),inner_size:innerDims(r).replace('⌀','diameter '),height:r.h||f.height,ceiling_y:inY1(f,r.h),wall_block:shortB(matOf(r,f,'wall')),floor_block:shortB(matOf(r,f,'floor')),ceiling_block:shortB(matOf(r,f,'ceil')),materials:own(r),floor_blocks:innerArea(r),color:roomColor(r)};
      if(hasO)e.world={x_from:o.x+r.x,x_to:o.x+r.x+r.w-1,z_from:o.z+r.z,z_to:o.z+r.z+r.d-1};if(r.shape==='poly')e.points=absPts(r);if(r.join)e.join=true;if(r.notes)e.notes=r.notes;return e;})}))};}
function exportText(){const d=exportData(),L=[$t('Проект: {name}',{name:d.project}),legend(),$t('Центр (лифт) в мире: X {x}, Z {z}',{x:d.origin_world.x,z:d.origin_world.z}),''];
  d.floors.forEach(f=>{L.push($t('== {name} (плита пола Y {y}, толщина {t}, стоишь на Y {s}, потолок Y {c}, высота {h}) ==',{name:f.name,y:f.y_floor,t:f.floor_thickness,s:f.stand_y,c:f.ceiling_y,h:f.height}));if(!f.rooms.length)L.push($t('  пусто'));
    f.rooms.forEach(r=>L.push(`- ${r.name} [${r.type_label}] `+(r.shape==='circle'?$t('круг ⌀{d}',{d:r.x_to-r.x_from+1}):r.shape==='poly'?$t('многоугольник {w}×{d}, точек: {n}',{w:r.x_to-r.x_from+1,d:r.z_to-r.z_from+1,n:(r.points||[]).length}):$t('прямоугольник {w}×{d}',{w:r.x_to-r.x_from+1,d:r.z_to-r.z_from+1}))+', '+$t('X {x0}…{x1}, Z {z0}…{z1}, стена {w} (внутри {i}), высота {h}, потолок Y {c}',{x0:r.x_from,x1:r.x_to,z0:r.z_from,z1:r.z_to,w:r.wall,i:r.inner_size.replace('diameter ','⌀'),h:r.height,c:r.ceiling_y})+(r.notes?' — '+r.notes:'')));L.push('');});
  return L.join('\n');}
const TR={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',і:'i',ї:'yi',є:'ye',ґ:'g'};
const slug=t=>([...(t||'plan').toLowerCase()].map(c=>TR[c]??c).join('').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'plan');
const canSave=()=>true;
function saveFile(name,data){
  return new Promise((res,rej)=>{try{const blob=data instanceof Blob?data:new Blob([data],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(u);},5000);res();}catch(e){rej({code:'unavailable'});}});}
function updDlUI(){F('dl-json').hidden=!canSave();}
updDlUI();
function dlErr(e){const c=e&&e.code;F('dl-status').textContent=c==='declined'?$t('Скачивание отменено.'):c==='rate_limited'?$t('Окно сохранения уже открыто.'):$t('Не получилось скачать. Скопируй текст ниже.');}
F('dl-json').onclick=()=>{if(!canSave())return;saveFile(`${brandSlug()}-${slug(S.name)}.json`,JSON.stringify(exportData(),null,1)).then(()=>{F('dl-status').textContent=$t('Файл плана скачан.');},dlErr);};
function floorPNG(){
  const rs=roomsOf(S.cur);let x0=-16,z0=-16,x1=16,z1=16;
  if(rs.length){x0=z0=1e9;x1=z1=-1e9;rs.forEach(r=>{x0=Math.min(x0,r.x);z0=Math.min(z0,r.z);x1=Math.max(x1,r.x+r.w);z1=Math.max(z1,r.z+r.d);});}
  const dim=Math.max(x1-x0,z1-z0),s=Math.max(4,Math.min(16,1400/dim)),pad=40,head=70;
  const W=Math.round((x1-x0)*s+pad*2),H=Math.round((z1-z0)*s+pad*2+head);
  const c=document.createElement('canvas');c.width=W*2;c.height=H*2;const ctx=c.getContext('2d');ctx.scale(2,2);
  const tk=tokens(),Vp={cx:(x0+x1)/2,cz:(z0+z1)/2-head/(2*s),s};
  paint(ctx,W,H,Vp,S,S.cur,{tk});
  const f=floor(S.cur);ctx.fillStyle=tk.panel;ctx.fillRect(0,0,W,head);ctx.fillStyle=tk.line;ctx.fillRect(0,head-1,W,1);
  ctx.fillStyle=tk.ink;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='700 20px "Golos Text", system-ui, sans-serif';ctx.fillText(S.name||$t('План'),20,32);
  ctx.font='500 13px "JetBrains Mono", monospace';ctx.fillStyle=tk.muted;
  ctx.fillText(`${f.name} · Y ${f.y}…${f.y+f.height-1} · `+$t('1 клетка = 1 блок')+(S.origin.x||S.origin.z?' · '+$t('центр в мире {x}, {z}',{x:S.origin.x,z:S.origin.z}):''),20,54);
  ctx.textAlign='right';ctx.fillText(brand(),W-20,32);
  return new Promise(res=>c.toBlob(res,'image/png'));}
function sectionPNG(){const W=1800,H=1100,head=70,c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d'),tk=tokens();
  const V=secFitV(W,H-head,false);ctx.save();ctx.translate(0,head);drawSection(ctx,W,H-head,{V,noInset:true,tk});ctx.restore();
  const cc=cutOf(),ax=axisOf(cc.dir),p=ax==='x'?cc.z:cc.x,o=ax==='x'?S.origin.z:S.origin.x;
  ctx.fillStyle=tk.panel;ctx.fillRect(0,0,W,head);ctx.fillStyle=tk.line;ctx.fillRect(0,head-1,W,1);
  ctx.fillStyle=tk.ink;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='700 22px "Golos Text", system-ui, sans-serif';ctx.fillText(S.name||$t('План'),24,34);
  ctx.font='500 14px "JetBrains Mono", monospace';ctx.fillStyle=tk.muted;ctx.fillText($t('Разрез {dir} · линия {a} {v}',{dir:$t(DIRN[cc.dir]),a:ax==='x'?'Z':'X',v:o+p})+' · '+$t('1 клетка = 1 блок'),24,56);
  ctx.textAlign='right';ctx.fillText(brand(),W-24,34);return new Promise(res=>c.toBlob(res,'image/png'));}
F('dl-png').onclick=async()=>{const sec=ui.view==='section',blob=await(sec?sectionPNG():floorPNG());if(!blob){F('dl-status').textContent=$t('Не получилось нарисовать картинку.');return;}
  const f=floor(S.cur),name=sec?`${brandSlug()}-${slug(S.name)}-${$t('razrez')}-${cutOf().dir}.png`:`${brandSlug()}-${slug(S.name)}-${slug(f.name)}.png`;
  if(canSave()){saveFile(name,blob).then(()=>{F('dl-status').textContent=$t('Картинка этажа скачана.');},e=>{dlErr(e);showPng(blob);});}else showPng(blob);};
let pngURL=null;
function showPng(blob){if(pngURL)URL.revokeObjectURL(pngURL);pngURL=URL.createObjectURL(blob);F('png-img').src=pngURL;F('png-prev').hidden=false;}
let exMode='json';
function fillExport(){F('ex-text').value=exMode==='json'?JSON.stringify(exportData(),null,1):exportText();
  document.querySelectorAll('[data-ex]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ex===exMode));F('ex-status').textContent='';}
document.querySelectorAll('[data-ex]').forEach(b=>b.addEventListener('click',()=>{exMode=b.dataset.ex;fillExport();}));
F('open-export').onclick=()=>{updLmInfo();F('dl-png').textContent=ui.view==='section'?$t('Картинка разреза .png'):$t('Картинка этажа .png');fillExport();F('dl-status').textContent='';F('png-prev').hidden=true;updDlUI();F('m-export').hidden=false;(canSave()?F('dl-json'):F('dl-png')).focus();};
F('ex-close').onclick=()=>F('m-export').hidden=true;
F('ex-copy').onclick=()=>{const ta=F('ex-text'),st=F('ex-status');const fb=()=>{ta.focus();ta.select();st.textContent=$t('Текст выделен: нажми Ctrl+C.');};
  try{navigator.clipboard.writeText(ta.value).then(()=>{st.textContent=$t('Скопировано.');},fb);}catch(err){fb();}};
F('open-import').onclick=()=>{F('im-err').textContent='';F('m-import').hidden=false;F('im-file').focus();};
F('im-close').onclick=()=>F('m-import').hidden=true;
F('im-file').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{F('im-text').value=rd.result;F('im-err').textContent='';};rd.readAsText(f);};
F('im-text').addEventListener('input',()=>F('im-err').textContent='');
function fromExport(d){
  if(d&&typeof d.format==='string'&&d.format.startsWith('underground-plan')){
    const floors=[],rooms=[];
    const rmat=m=>m&&typeof m==='object'&&(m.wall||m.floor||m.ceil)?{wall:String(m.wall||''),floor:String(m.floor||''),ceil:String(m.ceil||'')}:undefined,doors=[];
    (d.floors||[]).forEach(f=>{const id=uid('f'),fh=Math.max(1,num(f.height,14));floors.push({id,name:String(f.name||$t('Этаж')),y:num(f.y_floor,0),height:fh,slab:Math.max(0,Math.min(32,num(f.floor_thickness,1))),mat:rmat(f.materials)});
      (Array.isArray(f.doors)?f.doors:[]).forEach(o=>{const x=num(o.x_from,0),z=num(o.z_from,0);doors.push({id:uid('d'),floorId:id,x,z,w:Math.max(1,num(o.x_to,x)-x+1),d:Math.max(1,num(o.z_to,z)-z+1),axis:o.axis==='z'?'z':'x',h:Math.max(1,Math.min(64,num(o.height,3)))});});
      (f.rooms||[]).forEach(r=>{const type=TYPE[r.type]?r.type:'other',isPoly=r.shape==='poly'&&Array.isArray(r.points)&&r.points.length>=3,shape=r.shape==='circle'?'circle':isPoly?'poly':'rect',x=num(r.x_from,0),z=num(r.z_from,0);
        const w=Math.max(1,num(r.x_to,x)-x+1);let dd=Math.max(1,num(r.z_to,z)-z+1);if(shape==='circle')dd=w;
        const col=typeof r.color==='string'&&/^#[0-9a-f]{6}$/i.test(r.color)&&r.color.toLowerCase()!==TYPE[type].color.toLowerCase()?r.color:null;
        const h=num(r.height,null);
        const nr={id:uid('r'),floorId:id,name:String(r.name??$t('Комната')),type,shape,x,z,w,d:dd,h:h&&h!==fh?h:null,wall:Math.max(0,Math.min(8,num(r.wall,1))),mat:rmat(r.materials),color:col,notes:String(r.notes||'')};
        if(isPoly)Object.assign(nr,polyFromAbs(r.points.map(q=>[num(q&&q[0],0),num(q&&q[1],0)])));if(r.join)nr.join=true;rooms.push(nr);});});
    if(!floors.length)throw new Error($t('В плане нет ни одного этажа.'));
    const ay=d.auto_y&&typeof d.auto_y==='object'?{auto:true,top:num(d.auto_y.top_floor_y,Math.max(...floors.map(f=>f.y)))}:{auto:false,top:Math.max(...floors.map(f=>f.y))};
    return {v:1,name:String(d.project||$t('Без названия')),origin:{x:num(d.origin_world&&d.origin_world.x,0),z:num(d.origin_world&&d.origin_world.z,0)},stack:ay,mat:rmat(d.materials),floors,rooms,doors,cur:floors[0].id};}
  if(valid(d)){const c=JSON.parse(JSON.stringify(d));if(!c.origin)c.origin={x:0,z:0};if(!c.floors.find(f=>f.id===c.cur))c.cur=c.floors[0].id;return c;}
  throw new Error($t('Это не похоже на план из {brand}: нет поля format или списка этажей.'));}
F('im-go').onclick=()=>{const t=F('im-text').value.trim();if(!t){F('im-err').textContent=$t('Выбери файл или вставь текст плана.');return;}
  let d;try{d=JSON.parse(t);}catch(e){F('im-err').textContent=$t('Не получилось прочитать JSON. Проверь, что скопирован весь текст от { до }.');return;}
  try{const n=fromExport(d);n.id=uid('p');n.created=n.updated=Date.now();store.plans.push(n);F('m-import').hidden=true;F('im-text').value='';F('im-file').value='';openPlan(n.id);}
  catch(e){F('im-err').textContent=e.message;}};

/* ============ doors ============ */
const doorById=id=>(S&&S.doors||[]).find(d=>d.id===id);
function hitDoor(c){const ds=(S.doors||[]).filter(d=>d.floorId===S.cur);for(let i=ds.length-1;i>=0;i--){const d=ds[i];if(c.x>=d.x&&c.x<d.x+d.w&&c.z>=d.z&&c.z<d.z+d.d)return d;}return null;}
function cellIsWall(r,x,z){return isWallCell(r,x,z);}
function wallAt(fid,x,z){return roomsOf(fid).some(r=>inside(r,x,z)&&cellIsWall(r,x,z));}
function placeDoor(c){const fid=S.cur,W=(x,z)=>wallAt(fid,x,z);
  if(!W(c.x,c.z)){F('hint').textContent=$t('Сюда нельзя: кликни именно по стене комнаты (тёмная полоса по краю).');return;}
  const run=(dx,dz)=>{let n=0,x=c.x+dx,z=c.z+dz;while(n<16&&W(x,z)){n++;x+=dx;z+=dz;}return n;};
  const dZ=run(0,-1)+run(0,1)+1,dX=run(-1,0)+run(1,0)+1,alongX=dZ<=dX;
  const w=Math.max(1,Math.min(32,num(F('dn-w').value,3))),hh=Math.max(1,Math.min(64,num(F('dn-h').value,3))),off=Math.floor((w-1)/2);
  const d=alongX?{x:c.x-off,z:c.z-run(0,-1),w,d:dZ,axis:'x'}:{x:c.x-run(-1,0),z:c.z-off,w:dX,d:w,axis:'z'};
  snap();if(!S.doors)S.doors=[];const nd={id:uid('d'),floorId:fid,...d,h:hh};S.doors.push(nd);
  ui.sel=null;ui.selDoor=nd.id;F('hint').textContent=$t(HINTS.door);persist();renderAll();}
function renderDoor(d){const f=floor(d.floorId),o=S.origin,wide=d.axis==='x'?d.w:d.d,deep=d.axis==='x'?d.d:d.w,y=inY0(f);
  F('r-area').textContent=$t('{w}×{h} · стена {d} бл.',{w:wide,h:d.h,d:deep});setVal('d-w',wide);setVal('d-h',d.h);
  F('d-info').textContent=`X ${fmt(o.x+d.x)}…${fmt(o.x+d.x+d.w-1)} · Z ${fmt(o.z+d.z)}…${fmt(o.z+d.z+d.d-1)} · Y ${fmt(y)}…${fmt(y+d.h-1)}${o.x||o.z?$t(' (мир)'):''}`;}
function bindDoor(id,fn){const el=F(id);el.addEventListener('input',()=>{const d=!ui.sel&&doorById(ui.selDoor);if(!d)return;if(!editSnap){snap();editSnap=true;}fn(d,el.value);persist();renderDoor(d);req();});
  el.addEventListener('change',()=>{editSnap=false;});el.addEventListener('blur',()=>{editSnap=false;});}
bindDoor('d-w',(d,v)=>{const n=Math.max(1,Math.min(32,num(v,3)));
  if(d.axis==='x'){const c=d.x+Math.floor((d.w-1)/2);d.w=n;d.x=c-Math.floor((n-1)/2);}else{const c=d.z+Math.floor((d.d-1)/2);d.d=n;d.z=c-Math.floor((n-1)/2);}});
bindDoor('d-h',(d,v)=>{d.h=Math.max(1,Math.min(64,num(v,3)));});
function delDoor(){const d=doorById(ui.selDoor);if(!d)return;snap();S.doors=S.doors.filter(x=>x.id!==d.id);ui.selDoor=null;persist();renderAll();}
F('d-del').onclick=delDoor;
F('d-all').onclick=()=>{const d=doorById(ui.selDoor);if(!d)return;snap();let n=0;
  S.floors.forEach(f=>{if(f.id===d.floorId||S.doors.some(o=>o.floorId===f.id&&o.x===d.x&&o.z===d.z&&o.w===d.w&&o.d===d.d))return;S.doors.push({...d,id:uid('d'),floorId:f.id});n++;});
  if(!n){undoS.pop();updUndo();}persist();renderAll();F('d-info').textContent+=' · '+(n?$t('добавлено на этажей: {n}',{n}):$t('уже есть на всех этажах'));};

/* ============ materials ============ */
const BLOCKS=[['gray_concrete','Серый бетон'],['light_gray_concrete','Светло-серый бетон'],['white_concrete','Белый бетон'],['black_concrete','Чёрный бетон'],
  ['smooth_stone','Гладкий камень'],['stone','Камень'],['stone_bricks','Каменные кирпичи'],['polished_andesite','Полированный андезит'],['polished_diorite','Полированный диорит'],
  ['polished_deepslate','Полированный глубинный сланец'],['deepslate_tiles','Глубинносланцевая плитка'],['deepslate_bricks','Глубинносланцевые кирпичи'],['cobbled_deepslate','Глубинный булыжник'],
  ['tuff_bricks','Туфовые кирпичи'],['polished_tuff','Полированный туф'],['calcite','Кальцит'],['terracotta','Терракота'],['white_terracotta','Белая терракота'],
  ['light_gray_terracotta','Светло-серая терракота'],['quartz_block','Кварцевый блок'],['smooth_quartz','Гладкий кварц'],['mud_bricks','Кирпичи из грязи'],['bricks','Кирпичи'],
  ['polished_blackstone_bricks','Кирпичи из полированного чернита'],['glass','Стекло'],['sea_lantern','Морской фонарь'],['oak_planks','Дубовые доски'],['spruce_planks','Еловые доски'],['dark_oak_planks','Доски тёмного дуба']];
const BNAME=Object.fromEntries(BLOCKS);
function buildBlockList(){F('blocklist').innerHTML=BLOCKS.map(([id,l])=>`<option value="${id}">${$t(l)}</option>`).join('');}
buildBlockList();
const DEFMAT={wall:'gray_concrete',floor:'smooth_stone'};
function normBlock(v){v=String(v||'').trim().toLowerCase().replace(/\s+/g,'_');if(!v)return '';if(!v.includes(':'))v='minecraft:'+v;return /^[a-z0-9_.-]+:[a-z0-9_.\/-]+$/.test(v)?v:'';}
const shortB=v=>String(v).replace(/^minecraft:/,'');
const blockLabel=v=>BNAME[shortB(v)]?$t(BNAME[shortB(v)]):shortB(v);
function matOf(r,f,kind){for(const o of [r,f,S]){const n=normBlock(o&&o.mat&&o.mat[kind]);if(n)return n;}return kind==='ceil'?matOf(r,f,'floor'):'minecraft:'+DEFMAT[kind];}
function setMatField(id,own,inherited){const el=F(id);if(document.activeElement!==el)el.value=own||'';el.placeholder=inherited;el.classList.toggle('bad',!!(el.value.trim())&&!normBlock(el.value));
  el.title=el.value.trim()&&normBlock(el.value)?blockLabel(normBlock(el.value)):'';}
function renderMats(){if(!S)return;
  setMatField('p-mwall',S.mat&&S.mat.wall,blockLabel('minecraft:'+DEFMAT.wall));setMatField('p-mfloor',S.mat&&S.mat.floor,blockLabel('minecraft:'+DEFMAT.floor));
  setMatField('p-mceil',S.mat&&S.mat.ceil,$t('как пол: ')+blockLabel(matOf(null,null,'floor')));
  const f=floor(S.cur);setMatField('f-mwall',f.mat&&f.mat.wall,$t('как в проекте: ')+blockLabel(matOf(null,null,'wall')));setMatField('f-mfloor',f.mat&&f.mat.floor,$t('как в проекте: ')+blockLabel(matOf(null,null,'floor')));
  setMatField('f-mceil',f.mat&&f.mat.ceil,$t('как в проекте: ')+blockLabel(matOf(null,null,'ceil')));
  const r=selRoom();if(r){const rf=floor(r.floorId);setMatField('r-mwall',r.mat&&r.mat.wall,$t('как на этаже: ')+blockLabel(matOf(null,rf,'wall')));setMatField('r-mfloor',r.mat&&r.mat.floor,$t('как на этаже: ')+blockLabel(matOf(null,rf,'floor')));
    setMatField('r-mceil',r.mat&&r.mat.ceil,$t('как на этаже: ')+blockLabel(matOf(null,rf,'ceil')));}}
function bindMat(id,target,kind){const el=F(id);
  el.addEventListener('input',()=>{const o=target();if(!o)return;if(!editSnap){snap();editSnap=true;}o.mat=Object.assign({},o.mat,{[kind]:el.value.trim()});persist();renderMats();});
  el.addEventListener('change',()=>{editSnap=false;const n=normBlock(el.value);if(n&&el.value!==shortB(n)){const o=target();if(o){o.mat=Object.assign({},o.mat,{[kind]:shortB(n)});el.value=shortB(n);persist();}}renderMats();});
  el.addEventListener('blur',()=>{editSnap=false;});}
bindMat('p-mwall',()=>S,'wall');bindMat('p-mfloor',()=>S,'floor');
bindMat('f-mwall',()=>S&&floor(S.cur),'wall');bindMat('f-mfloor',()=>S&&floor(S.cur),'floor');
bindMat('r-mwall',()=>selRoom(),'wall');bindMat('r-mfloor',()=>selRoom(),'floor');
bindMat('p-mceil',()=>S,'ceil');bindMat('f-mceil',()=>S&&floor(S.cur),'ceil');bindMat('r-mceil',()=>selRoom(),'ceil');
armed(F('f-mreset'),'Точно сбросить?',()=>{snap();roomsOf(S.cur).forEach(r=>{delete r.mat;});persist();renderMats();});
armed(F('p-mreset'),'Точно сбросить всё?',()=>{snap();S.floors.forEach(f=>{delete f.mat;});S.rooms.forEach(r=>{delete r.mat;});persist();renderMats();});

/* ============ litematica ============ */
function lmFloors(scope){return scope==='floor'?[floor(S.cur)]:sorted();}
function floorCells(f){const all=sorted(),fx=all.findIndex(q=>q.id===f.id),lower=all[fx+1],upper=all[fx-1],cells=new Map();
  roomsOf(f.id).slice().sort((a,b)=>area(b)-area(a)).forEach(r=>{const m=roomMask(r),W=roomWalls(r);
    const q=r.type==='atrium'&&lower?roomsOf(lower.id).find(o=>o.type==='atrium'&&o.name===r.name&&inY1(lower,o.h)===f.y-1):null;
    m.rows.forEach((runs,j)=>runs.forEach(([a,b])=>{for(let i=a;i<b;i++){const x=r.x+i,z=r.z+j,k=x+','+z,wall=W.has(i+','+j),prev=cells.get(k);
      // сращённые комнаты: если клетка уже воздух соседней сращённой комнаты, не превращаем её в стену
      if(prev&&r.join&&prev.r&&prev.r.join&&!prev.wall&&wall)continue;
      cells.set(k,{r,wall,open:!!(q&&inside(q,x,z)),top:inY1(f,r.h),door:0});}}));});
  (S.doors||[]).filter(d=>d.floorId===f.id).forEach(d=>{for(let z=d.z;z<d.z+d.d;z++)for(let x=d.x;x<d.x+d.w;x++){const k=x+','+z;let c=cells.get(k);
    if(!c){c={r:null,wall:false,open:false,top:inY0(f)+d.h-1,door:0};cells.set(k,c);}c.door=Math.max(c.door,d.h);}});
  const ct=Math.max(1,slabOf(f)),ur=upper?roomsOf(upper.id):[];
  cells.forEach((c,k)=>{const [x,z]=k.split(',').map(Number);c.ceil=(upper&&upper.y===c.top+1&&ur.some(o=>inside(o,x,z)))?0:ct;});
  return cells;}
function lmPreview(scope){let mx=1e9,my=1e9,mz=1e9,n=0;lmFloors(scope).forEach(f=>roomsOf(f.id).forEach(r=>{n++;mx=Math.min(mx,r.x);mz=Math.min(mz,r.z);my=Math.min(my,f.y);}));
  return n?{x:S.origin.x+mx,y:my,z:S.origin.z+mz}:null;}
async function buildLitematic(scope){
  const regions=[];let mnX=1e9,mnY=1e9,mnZ=1e9,mxX=-1e9,mxY=-1e9,mxZ=-1e9,total=0,vol=0;const all=sorted();
  lmFloors(scope).forEach(f=>{const cells=floorCells(f);if(!cells.size)return;const sl=slabOf(f),fi=all.findIndex(q=>q.id===f.id)+1,byZ=new Map();
    cells.forEach((c,k)=>{const [x,z]=k.split(',').map(Number);if(!byZ.has(z))byZ.set(z,[]);byZ.get(z).push(x);});
    let open=new Map();const boxes=[];
    const tk=c=>c.top+'|'+c.ceil;
    [...byZ.keys()].sort((a,b)=>a-b).forEach(z=>{const xs=byZ.get(z).sort((a,b)=>a-b),runs=[];let a=xs[0],p=xs[0],tp=tk(cells.get(a+','+z));
      for(let i=1;i<=xs.length;i++){const x=xs[i],t=i<xs.length?tk(cells.get(x+','+z)):null;if(i<xs.length&&x===p+1&&t===tp){p=x;continue;}runs.push([a,p+1,tp]);if(i<xs.length){a=x;p=x;tp=t;}}
      const next=new Map();runs.forEach(([a,b,t])=>{const k=a+','+b+','+t,bx=open.get(k);if(bx&&bx.z1===z-1){bx.z1=z;next.set(k,bx);}else{const c0=cells.get(a+','+z),nb={a,b,top:c0.top+c0.ceil,z0:z,z1:z};boxes.push(nb);next.set(k,nb);}});open=next;});
    const sy0=inY0(f);
    boxes.forEach((bx,bi)=>{const sx=bx.b-bx.a,sz=bx.z1-bx.z0+1,y0=f.y,sy=bx.top-y0+1,n=sx*sy*sz,vals=new Uint16Array(n),pal=['minecraft:air'],pm=new Map([['minecraft:air',0]]);
      const P=s=>{let i=pm.get(s);if(i===undefined){i=pal.length;pal.push(s);pm.set(s,i);}return i;};
      for(let z=bx.z0;z<=bx.z1;z++)for(let x=bx.a;x<bx.b;x++){const c=cells.get(x+','+z),W=P(matOf(c.r,f,'wall')),Fl=P(matOf(c.r,f,'floor')),Ce=P(matOf(c.r,f,'ceil'));
        for(let y=y0;y<=bx.top;y++){let v;
          if(y<y0+sl)v=c.open?(c.wall?(c.door?Fl:W):0):Fl;
          else if(y<=c.top)v=(c.wall&&!(c.door&&y<sy0+c.door))?W:0;
          else v=Ce;
          if(v){vals[((y-y0)*sz+(z-bx.z0))*sx+(x-bx.a)]=v;total++;}}}
      const bits=Math.max(2,32-Math.clz32(pal.length-1)),nl=Math.ceil(n*bits/64),u=new Uint32Array(nl*2);
      for(let i=0;i<n;i++){const v=vals[i];if(!v)continue;const bp=i*bits;for(let k=0;k<bits;k++)if((v>>k)&1){const q=bp+k;u[q>>>5]|=1<<(q&31);}}
      regions.push({name:`${fi}. ${f.name} · ${String(bi+1).padStart(2,'0')}`,x:bx.a,y:y0,z:bx.z0,sx,sy,sz,pal,u});vol+=n;
      mnX=Math.min(mnX,bx.a);mnY=Math.min(mnY,y0);mnZ=Math.min(mnZ,bx.z0);mxX=Math.max(mxX,bx.b);mxY=Math.max(mxY,bx.top+1);mxZ=Math.max(mxZ,bx.z1+1);});});
  if(!regions.length)return null;
  const now=Date.now(),{i,l,s,list,c,la}=NB;
  const root=c({MinecraftDataVersion:i(3955),Version:i(6),SubVersion:i(1),
    Metadata:c({Name:s(S.name||brand()),Author:s(brand()),Description:s($t('План из планировщика {brand}')),RegionCount:i(regions.length),TimeCreated:l(now),TimeModified:l(now),
      TotalBlocks:i(total),TotalVolume:i(vol),EnclosingSize:c({x:i(mxX-mnX),y:i(mxY-mnY),z:i(mxZ-mnZ)})}),
    Regions:c(Object.fromEntries(regions.map(g=>[g.name,c({Position:c({x:i(g.x-mnX),y:i(g.y-mnY),z:i(g.z-mnZ)}),Size:c({x:i(g.sx),y:i(g.sy),z:i(g.sz)}),
      BlockStatePalette:list(10,g.pal.map(b=>c({Name:s(b)}))),BlockStates:la(g.u),TileEntities:list(10,[]),Entities:list(10,[]),PendingBlockTicks:list(10,[]),PendingFluidTicks:list(10,[])})])))});
  return {bytes:await gzipBytes(nbtEncode(root)),regions:regions.length,total,ox:S.origin.x+mnX,oy:mnY,oz:S.origin.z+mnZ};}
function updLmInfo(){const p=lmPreview(F('lm-scope').value);F('lm-info').textContent=p?$t('Origin в Litematica: X {x} · Y {y} · Z {z}',{x:p.x,y:p.y,z:p.z}):$t('На выбранных этажах нет комнат.');}
F('lm-scope').onchange=updLmInfo;
F('dl-lm').onclick=async()=>{const st=F('lm-info'),scope=F('lm-scope').value;
  if(typeof CompressionStream==='undefined'){st.textContent=$t('Этот браузер не умеет сжимать файлы. Открой сайт в свежем Chrome, Edge или Firefox.');return;}
  if(!canSave()){st.textContent=$t('Скачивание файлов здесь недоступно. Открой сайт в обычном браузере.');return;}
  st.textContent=$t('Собираю схему…');
  try{const res=await buildLitematic(scope);if(!res){st.textContent=$t('На выбранных этажах нет комнат.');return;}
    const base=`${brandSlug()}-${slug(S.name)}${scope==='floor'?'-'+slug(floor(S.cur).name):''}`;
    await saveFile(base+'.litematic',new Blob([res.bytes],{type:'application/octet-stream'}));
    st.textContent=$t('Скачано: {r} рег., {b} блоков. Origin в Litematica: X {x} · Y {y} · Z {z}',{r:res.regions,b:res.total,x:res.ox,y:res.oy,z:res.oz});}
  catch(e){st.textContent=e&&e.code==='declined'?$t('Скачивание отменено.'):$t('Не получилось собрать схему: ')+((e&&e.message)||e);}};

/* ============ block grid ============ */
const GR={id:null,part:'q',coord:'world',lay:null};
function grRoom(){return S&&S.rooms.find(r=>r.id===GR.id);}
function grModel(r){const t=wallOf(r),m=roomMask(r),W=roomWalls(r);
  const isIn=(i,j)=>m.has(i,j);
  const isWall=(i,j)=>W.has(i+','+j);
  const ci=Math.floor((r.w-1)/2),cj=Math.floor((r.d-1)/2),odd=r.w%2===1&&r.d%2===1,q=GR.part==='q'&&odd&&r.shape==='circle';
  return {t,isIn,isWall,ci,cj,odd,i0:q?ci:0,i1:r.w-1,j0:0,j1:q?cj:r.d-1,q};}
function grX(r,m,i){return GR.coord==='world'?S.origin.x+r.x+i:i-m.ci;}
function grZ(r,m,j){return GR.coord==='world'?S.origin.z+r.z+j:j-m.cj;}
const sgn=v=>v>0?'+'+v:fmt(v);
function grRows(r,m){const out=[];for(let j=m.j0;j<=m.j1;j++){let a=null,b=null;for(let i=m.i0;i<=m.i1;i++)if(m.isIn(i,j)){if(a===null)a=i;b=i;}out.push({j,a,b});}return out;}
function drawGrid(){const r=grRoom();if(!r)return;const m=grModel(r),tk=tokens(),col=roomColor(r),cv=F('gr-cv'),wrap=F('gr-wrap');
  const cols=m.i1-m.i0+1,rows=m.j1-m.j0+1,LW=GR.coord==='world'?62:42,RW=GR.coord==='world'?56:36,LX=m.q?0:RW,HD=24;
  const cs=Math.max(8,Math.min(22,Math.floor((wrap.clientWidth-LW-LX-RW-16)/cols)));
  const W=LW+LX+cols*cs+RW+8,H=HD+rows*cs+8,dpr=window.devicePixelRatio||1;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
  const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=tk.canvas;ctx.fillRect(0,0,W,H);
  const gx=LW+LX,gy=HD;GR.lay={gx,gy,cs,m,r};
  for(let j=m.j0;j<=m.j1;j++)for(let i=m.i0;i<=m.i1;i++){if(!m.isIn(i,j))continue;const x=gx+(i-m.i0)*cs,y=gy+(j-m.j0)*cs;
    ctx.fillStyle=(i===m.ci&&j===m.cj&&m.odd)?tk.accent:m.isWall(i,j)?wallCol(col):hexA(col,.22);ctx.fillRect(x,y,cs,cs);}
  ctx.beginPath();for(let i=0;i<=cols;i++){const x=Math.round(gx+i*cs)+.5;ctx.moveTo(x,gy);ctx.lineTo(x,gy+rows*cs);}
  for(let j=0;j<=rows;j++){const y=Math.round(gy+j*cs)+.5;ctx.moveTo(gx,y);ctx.lineTo(gx+cols*cs,y);}ctx.strokeStyle=tk.grid;ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();for(let i=m.i0;i<=m.i1+1;i++)if((i-m.ci)%8===0){const x=Math.round(gx+(i-m.i0)*cs)+.5;ctx.moveTo(x,gy);ctx.lineTo(x,gy+rows*cs);}
  for(let j=m.j0;j<=m.j1+1;j++)if((j-m.cj)%8===0){const y=Math.round(gy+(j-m.j0)*cs)+.5;ctx.moveTo(gx,y);ctx.lineTo(gx+cols*cs,y);}ctx.strokeStyle=tk.chunk;ctx.stroke();
  const fs=cs>=13?11:10,step=cs>=12?1:2;ctx.font=`500 ${fs}px "JetBrains Mono", ui-monospace, monospace`;ctx.textBaseline='middle';
  grRows(r,m).forEach(({j,a,b},k)=>{if(a===null||((j-m.cj)%step))return;const y=gy+(j-m.j0)*cs+cs/2;
    ctx.fillStyle=tk.muted;ctx.textAlign='right';ctx.fillText(GR.coord==='world'?String(grZ(r,m,j)):sgn(grZ(r,m,j)),LW-6,y);
    ctx.fillStyle=tk.ink;ctx.textAlign='left';const xb=grX(r,m,b);ctx.fillText(GR.coord==='world'?String(xb):sgn(xb),gx+(b-m.i0+1)*cs+5,y);
    if(!m.q){ctx.textAlign='right';const xa=grX(r,m,a);ctx.fillText(GR.coord==='world'?String(xa):sgn(xa),gx+(a-m.i0)*cs-5,y);}});
  const kx=Math.max(1,Math.ceil((GR.coord==='world'?44:26)/cs));ctx.fillStyle=tk.muted;ctx.textAlign='center';
  for(let i=m.i0;i<=m.i1;i++){if((i-m.ci)%kx)continue;const v=grX(r,m,i);ctx.fillText(GR.coord==='world'?String(v):sgn(v),gx+(i-m.i0)*cs+cs/2,HD/2);}
  ctx.textAlign='left';
  const rr=grRows(r,m).filter(o=>o.a!==null);
  F('gr-sub').textContent=`${r.name||$t('Комната')} · ${dims(r)} · `+$t('стена {t}',{t:m.t})+' · '+(m.q?$t('северо-восточная четверть, остальные зеркально'):$t('целиком'))+' · '+$t('север сверху')+(GR.coord==='world'&&!(S.origin.x||S.origin.z)?' · '+$t('центр в мире не задан, впиши его в карточке «План»'):'');
  return rr;}
function openGrid(r){if(!r)return;GR.id=r.id;if(r.shape!=='circle')GR.part='full';
  document.querySelectorAll('#gr-part button').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.part===GR.part);b.disabled=r.shape!=='circle'&&b.dataset.part==='q';});
  document.querySelectorAll('#gr-coord button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===GR.coord));
  F('gr-status').textContent='';F('gr-hover').textContent=$t('Наведи на клетку, чтобы увидеть её координаты.');F('m-grid').hidden=false;requestAnimationFrame(drawGrid);F('gr-close').focus();}
document.querySelectorAll('#gr-part button').forEach(b=>b.addEventListener('click',()=>{GR.part=b.dataset.part;openGrid(grRoom());}));
document.querySelectorAll('#gr-coord button').forEach(b=>b.addEventListener('click',()=>{GR.coord=b.dataset.c;openGrid(grRoom());}));
F('gr-close').onclick=()=>{F('m-grid').hidden=true;};
F('r-grid').onclick=()=>openGrid(selRoom());
F('gr-cv').addEventListener('mousemove',e=>{const L=GR.lay;if(!L)return;const b=F('gr-cv').getBoundingClientRect(),i=L.m.i0+Math.floor((e.clientX-b.left-L.gx)/L.cs),j=L.m.j0+Math.floor((e.clientY-b.top-L.gy)/L.cs);
  if(i<L.m.i0||i>L.m.i1||j<L.m.j0||j>L.m.j1){return;}const r=L.r,m=L.m,wx=S.origin.x+r.x+i,wz=S.origin.z+r.z+j;
  const kind=!m.isIn(i,j)?$t('снаружи (порода)'):(i===m.ci&&j===m.cj&&m.odd)?$t('центр'):m.isWall(i,j)?$t('стена'):$t('внутри');
  F('gr-hover').textContent=`X ${fmt(wx)} · Z ${fmt(wz)} · `+$t('от центра {a}, {b}',{a:sgn(i-m.ci),b:sgn(j-m.cj)})+' · '+kind;});
F('gr-copy').onclick=()=>{const r=grRoom();if(!r)return;const m=grModel(r),W=GR.coord==='world';
  const lines=[`${r.name} · ${dims(r)} · `+(W?$t('координаты мира'):$t('от центра комнаты'))+(m.q?' · '+$t('северо-восточная четверть'):'')];
  grRows(r,m).forEach(({j,a,b})=>{if(a===null)return;const z=W?grZ(r,m,j):sgn(grZ(r,m,j)),xa=W?grX(r,m,a):sgn(grX(r,m,a)),xb=W?grX(r,m,b):sgn(grX(r,m,b));lines.push(`Z ${z}: X ${xa} … ${xb}`);});
  const t=lines.join('\n'),st=F('gr-status');try{navigator.clipboard.writeText(t).then(()=>{st.textContent=$t('Скопировано.');},()=>{st.textContent=$t('Не получилось скопировать.');});}catch(e){st.textContent=$t('Не получилось скопировать.');}};
cv.addEventListener('dblclick',e=>{if(!S||ui.view!=='plan')return;const p=pos(e);
  if(ui.tool==='poly'){if(ui.pd&&ui.pd.length>=3)finishPoly();return;}
  const r=selRoom();
  if(ui.tool==='select'&&r&&r.floorId===S.cur){
    const ph=r.shape==='poly'?polyHit(r,p,8):null;
    if(ph&&ph.k==='v'){if(r.pts.length<=3){status($t('У формы должно быть хотя бы 3 точки.'));return;}
      const abs=absPts(r);abs.splice(ph.i,1);const pr=polyFromAbs(abs);if(pr.pts.length<3||Math.abs(polyArea(pr.pts))<1)return;snap();Object.assign(r,pr);persist();renderAll();return;}
    const abs=editAbs(r),ei=nearEdgeA(abs,p,8);if(ei>=0){const k=edgePoint(abs,ei,p);if(abs.some(q=>q[0]===k[0]&&q[1]===k[1]))return;
      abs.splice(ei+1,0,k);const pr=polyFromAbs(abs);if(pr.pts.length<3)return;snap();r.shape='poly';Object.assign(r,pr);ui.eh=null;persist();renderAll();
      status($t('Точка стоит. Теперь тяни кусок стены рядом с ней.'));return;}}
  const h=hitRoom(cellAt(p));if(h){ui.sel=h.id;renderInspector();renderRoomList();req();openGrid(h);}});

/* ============ keyboard ============ */
addEventListener('keydown',e=>{
  const modalOpen=!F('m-export').hidden||!F('m-import').hidden||!F('m-grid').hidden;
  if(e.key==='Escape'){if(modalOpen){F('m-export').hidden=F('m-import').hidden=F('m-grid').hidden=true;return;}
    if(F('v-edit').hidden||!S)return;if(ui.pd){ui.pd=null;ui.pdHover=null;F('readout').textContent=readoutBase;req();return;}if(ui.ruler){ui.ruler=null;act=act&&act.type==='ruler'?null:act;F('readout').textContent=readoutBase;req();return;}if(act&&act.type==='draw'){act=null;req();return;}ui.sel=null;renderInspector();renderRoomList();req();return;}
  if(F('v-edit').hidden||!S||modalOpen)return;
  const typing=e.target.matches('input:not([type=checkbox]),textarea,select'),mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(mod&&!typing&&(k==='z'||k==='я')){e.preventDefault();e.shiftKey?doRedo():doUndo();return;}
  if(mod&&!typing&&(k==='y'||k==='н')){e.preventDefault();doRedo();return;}
  if(mod&&!typing&&(k==='d'||k==='в')){e.preventDefault();F('r-dup').click();return;}
  if(mod&&!typing&&(k==='c'||k==='с')){if(selRoom()){e.preventDefault();copySel();}return;}
  if(mod&&!typing&&(k==='v'||k==='м')){if(clip){e.preventDefault();pasteClip(true);}return;}
  if(typing||mod)return;
  if(k==='s'||k==='ы'){setView(ui.view==='section'?'plan':'section');return;}
  const tools={v:'select','м':'select',r:'rect','к':'rect',c:'circle','с':'circle',p:'poly','з':'poly',h:'hand','р':'hand',d:'door','в':'door',l:'ruler','д':'ruler'};
  if(tools[k]){if(ui.view!=='section')setTool(tools[k]);return;}
  if(k==='f'||k==='а'){fitView();return;}
  if(ui.pd&&ui.pd.length){if(e.key==='Enter'){e.preventDefault();finishPoly();return;}if(e.key==='Backspace'){e.preventDefault();ui.pd.pop();if(!ui.pd.length){ui.pd=null;F('readout').textContent=readoutBase;}else polyReadout();req();return;}}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();delSel();return;}
  if(e.key===' '){e.preventDefault();if(!spaceDown){spaceDown=true;setCursor();}return;}
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(arrows[e.key]&&!ui.sel&&ui.selDoor){const d=doorById(ui.selDoor);if(!d)return;e.preventDefault();const st=e.shiftKey?8:1;snap();d.x+=arrows[e.key][0]*st;d.z+=arrows[e.key][1]*st;persist();renderInspector();req();return;}
  if(arrows[e.key]){const r=selRoom();if(!r)return;e.preventDefault();const st=e.shiftKey?8:1;snap();r.x+=arrows[e.key][0]*st;r.z+=arrows[e.key][1]*st;persist();renderInspector();req();}
});
addEventListener('keyup',e=>{if(e.key===' '){spaceDown=false;setCursor();}});

/* ============ router ============ */
function show(v){['home','plans','edit'].forEach(n=>F('v-'+n).hidden=n!==v);document.documentElement.classList.toggle('edit-mode',v==='edit');}
function route(){
  const h=location.hash.slice(1);
  if(h==='edit'&&store.last&&getPlan(store.last)){
    show('edit');S=getPlan(store.last);undoS=[];redoS=[];ui.sel=null;act=null;
    if(!S.floors.find(f=>f.id===S.cur))S.cur=sorted()[0].id;
    setTool(ui.tool);renderAll();fillApplyAll();updSaveSt();setView(ui.view);requestAnimationFrame(fitView);return;}
  S=null;
  if(h==='plans'||h==='edit'){show('plans');F('newplan').hidden=true;renderPlans();window.scrollTo(0,0);return;}
  show('home');requestAnimationFrame(drawHero);
  const t=h&&h!=='home'&&document.getElementById(h);if(t)t.scrollIntoView();else window.scrollTo(0,0);
}
addEventListener('hashchange',route);

/* ============ boot ============ */
const redrawAll=()=>{drawHero();paintThumbs();req();};
new ResizeObserver(()=>req()).observe(F('stage'));
new ResizeObserver(()=>drawHero()).observe(F('hero-cv'));
new ResizeObserver(()=>paintThumbs()).observe(F('plan-grid'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',redrawAll);
new MutationObserver(redrawAll).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(redrawAll);
try{if(!localStorage.getItem(STORE))writeStore();}catch(e){}

/* ============ language ============ */
function applyLang(){
  applyStatic();
  document.querySelectorAll('select.lang').forEach(s=>{s.value=lang;});
  buildTypeOptions();buildBlockList();HERO=tplSample();
  if(S&&!F('v-edit').hidden){setTool(ui.tool);renderAll();fillApplyAll();updSaveSt();}else route();
}
document.querySelectorAll('select.lang').forEach(s=>s.addEventListener('change',()=>{setLang(s.value);applyLang();}));
window.__i18n={missing,setLang:l=>{setLang(l);applyLang();}};
applyLang();
