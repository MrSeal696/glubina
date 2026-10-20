// Геометрия комнат в блоках. Любая комната сводится к маске: по каждому ряду клеток — отрезки [a, b).
// Формы: rect — прямоугольник, circle — круг (нечётный диаметр), poly — многоугольник по точкам.
// Точки многоугольника лежат на углах блоков, в локальных координатах (от r.x, r.z).

export function circleRuns(r){const c=r.x+(r.w-1)/2,cz=r.z+(r.w-1)/2,R2=(r.w/2)**2,out=[];
  for(let j=0;j<r.w;j++){const dz=r.z+j-cz,q=R2-dz*dz;if(q<=0){out.push(null);continue;}
    const sq=Math.sqrt(q),a=Math.ceil(c-sq+1e-9),b=Math.floor(c+sq-1e-9);out.push(b>=a?[a,b+1]:null);}return out;}
export const wallOf=r=>r.wall==null?1:r.wall;

const ptsKey=p=>(p||[]).map(q=>q[0]+','+q[1]).join(';');
export const maskKey=r=>r.shape==='poly'?'p|'+r.w+'|'+r.d+'|'+ptsKey(r.pts):r.shape==='circle'?'c|'+r.w:'r|'+r.w+'|'+r.d;

// Клетка внутри многоугольника, если внутри её центр (правило чёт-нечет).
function polyRows(pts,w,d){const rows=[],n=pts.length;
  for(let j=0;j<d;j++){const y=j+.5,xs=[];
    for(let k=0;k<n;k++){const [x1,z1]=pts[k],[x2,z2]=pts[(k+1)%n];if((z1<=y)!==(z2<=y))xs.push(x1+(y-z1)*(x2-x1)/(z2-z1));}
    xs.sort((a,b)=>a-b);const runs=[];
    for(let k=0;k+1<xs.length;k+=2){const a=Math.max(0,Math.floor(xs[k]-.5)+1),b=Math.min(w,Math.ceil(xs[k+1]-.5));if(b>a)runs.push([a,b]);}
    rows.push(runs);}
  return rows;}

const MC=new Map();
export function roomMask(r){const k=maskKey(r);let m=MC.get(k);if(m)return m;
  let rows;
  if(r.shape==='circle')rows=circleRuns({x:0,z:0,w:r.w}).map(run=>run?[run]:[]);
  else if(r.shape==='poly')rows=polyRows(r.pts||[],r.w,r.d);
  else rows=Array.from({length:r.d},()=>[[0,r.w]]);
  let n=0;rows.forEach(rs=>rs.forEach(([a,b])=>n+=b-a));
  m={w:r.w,d:r.d,rows,area:n,has(i,j){if(j<0||j>=this.d)return false;for(const [a,b] of this.rows[j])if(i>=a&&i<b)return true;return false;}};
  if(MC.size>800)MC.clear();MC.set(k,m);return m;}

export function area(r){return roomMask(r).area;}
export function inside(r,bx,bz){if(bx<r.x||bx>=r.x+r.w||bz<r.z||bz>=r.z+r.d)return false;return roomMask(r).has(bx-r.x,bz-r.z);}

// Стены: клетки маски, у которых в квадрате радиуса t есть клетка снаружи. ext(i,j) — «снаружи не считать» (для сращённых комнат).
export function wallsOfMask(m,t,ext){const out=new Set();if(t<=0)return out;
  const isIn=(i,j)=>m.has(i,j)||(ext?ext(i,j):false);
  m.rows.forEach((runs,j)=>runs.forEach(([a,b])=>{for(let i=a;i<b;i++){let wall=false;
    for(let dj=-t;dj<=t&&!wall;dj++)for(let di=-t;di<=t;di++){if(!isIn(i+di,j+dj)){wall=true;break;}}
    if(wall)out.add(i+','+j);}}));
  return out;}
const WC=new Map();
export function baseWalls(r){const t=wallOf(r),k=maskKey(r)+'#'+t;let s=WC.get(k);if(s)return s;
  s=wallsOfMask(roomMask(r),t);if(WC.size>800)WC.clear();WC.set(k,s);return s;}
// Совместимость со старым кодом круглых комнат
export function wallSet(w,t){return baseWalls({shape:'circle',w,d:w,wall:t});}
export function innerArea(r){return Math.max(0,area(r)-baseWalls(r).size);}
export function innerDims(r){const t=wallOf(r);if(r.shape==='circle')return `⌀${Math.max(0,r.w-2*t)}`;return `${Math.max(0,r.w-2*t)}×${Math.max(0,r.d-2*t)}`;}

// Многоугольник: из абсолютных точек — комната с x, z, w, d и локальными точками. Убирает повторы и точки на прямой.
// full=false: убирает повторы и «шипы» (возврат назад по той же линии), точки на прямой оставляет — их ставит сам игрок.
// full=true: убирает и все точки, лежащие на прямой.
export function cleanPts(pts,full=false){let p=pts.slice();let changed=true;
  while(changed&&p.length>3){changed=false;
    for(let k=0;k<p.length;k++){const a=p[(k-1+p.length)%p.length],b=p[k],c=p[(k+1)%p.length];
      const ux=b[0]-a[0],uz=b[1]-a[1],vx=c[0]-b[0],vz=c[1]-b[1];
      const dup=vx===0&&vz===0,cross=ux*vz-uz*vx,dot=ux*vx+uz*vz;
      if(dup||(cross===0&&(full||dot<=0))){p.splice(k,1);changed=true;break;}}}
  return p;}
// Убрать конкретные точки, если они оказались на прямой (после выдавливания стены)
export function dropStraight(p,idx){const kill=new Set();idx.forEach(k=>{const n=p.length,a=p[(k-1+n)%n],b=p[k],c=p[(k+1)%n];
  if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])===0)kill.add(k);});return p.filter((_,k)=>!kill.has(k));}
export function polyFromAbs(abs,full=false){const p=cleanPts(abs,full);let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;
  p.forEach(([x,z])=>{x0=Math.min(x0,x);z0=Math.min(z0,z);x1=Math.max(x1,x);z1=Math.max(z1,z);});
  return {x:x0,z:z0,w:Math.max(1,x1-x0),d:Math.max(1,z1-z0),pts:p.map(([x,z])=>[x-x0,z-z0])};}
export const absPts=r=>(r.pts||[]).map(([x,z])=>[x+r.x,z+r.z]);
// Контур маски с одним отрезком в ряду (прямоугольник, круг) — в точки многоугольника.
export function outlinePts(r){const m=roomMask(r),right=[],left=[];
  m.rows.forEach((runs,j)=>{if(!runs.length)return;const a=runs[0][0],b=runs[runs.length-1][1];right.push([b,j],[b,j+1]);left.unshift([a,j+1],[a,j]);});
  return cleanPts(right.concat(left),true);}
// Площадь многоугольника со знаком (для проверки, что форма не схлопнулась)
export function polyArea(p){let s=0;for(let k=0;k<p.length;k++){const [x1,z1]=p[k],[x2,z2]=p[(k+1)%p.length];s+=x1*z2-x2*z1;}return s/2;}

// Цвета
export function hexA(h,a){const n=parseInt(h.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
export function lum(h){const n=parseInt(h.slice(1),16);return((n>>16&255)*.299+(n>>8&255)*.587+(n&255)*.114)/255}
export function shade(h,k){const n=parseInt(h.slice(1),16),f=v=>Math.round(v*k);return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`}
export function wallCol(col){const n=parseInt(col.slice(1),16),k=.6;return `rgba(${Math.round((n>>16&255)*k)},${Math.round((n>>8&255)*k)},${Math.round((n&255)*k)},.95)`;}
