// Геометрия комнат в блоках: круги, стены, площади. Чистые функции без DOM.
export function circleRuns(r){const c=r.x+(r.w-1)/2,cz=r.z+(r.w-1)/2,R2=(r.w/2)**2,out=[];
  for(let j=0;j<r.w;j++){const dz=r.z+j-cz,q=R2-dz*dz;if(q<=0){out.push(null);continue;}
    const sq=Math.sqrt(q),a=Math.ceil(c-sq+1e-9),b=Math.floor(c+sq-1e-9);out.push(b>=a?[a,b+1]:null);}return out;}
export function area(r){if(r.shape!=='circle')return r.w*r.d;let n=0;circleRuns(r).forEach(x=>{if(x)n+=x[1]-x[0]});return n;}
export const wallOf=r=>r.wall==null?1:r.wall;
const WC=new Map();
export function circleWall(w,t){const key=w+':'+t;if(WC.has(key))return WC.get(key);
  const runs=circleRuns({x:0,z:0,w,d:w}),inC=(i,j)=>{if(j<0||j>=w)return false;const run=runs[j];return !!run&&i>=run[0]&&i<run[1];};
  const out=[];for(let j=0;j<w;j++){const run=runs[j];if(!run)continue;
    for(let i=run[0];i<run[1];i++){let wall=false;for(let dj=-t;dj<=t&&!wall;dj++)for(let di=-t;di<=t;di++){if(!inC(i+di,j+dj)){wall=true;break;}}if(wall)out.push([i,j]);}}
  WC.set(key,out);return out;}
const WSET=new Map();
export function wallSet(w,t){const k=w+':'+t;if(!WSET.has(k))WSET.set(k,new Set(circleWall(w,t).map(([i,j])=>i+','+j)));return WSET.get(k);}
export function innerArea(r){const t=wallOf(r);if(t<=0)return area(r);if(r.shape==='circle')return Math.max(0,area(r)-circleWall(r.w,t).length);return Math.max(0,r.w-2*t)*Math.max(0,r.d-2*t);}
export function innerDims(r){const t=wallOf(r);return r.shape==='circle'?`⌀${Math.max(0,r.w-2*t)}`:`${Math.max(0,r.w-2*t)}×${Math.max(0,r.d-2*t)}`;}
export function inside(r,bx,bz){if(bx<r.x||bx>=r.x+r.w||bz<r.z||bz>=r.z+r.d)return false;if(r.shape!=='circle')return true;const run=circleRuns(r)[bz-r.z];return !!run&&bx>=run[0]&&bx<run[1];}

// Цвета
export function hexA(h,a){const n=parseInt(h.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
export function lum(h){const n=parseInt(h.slice(1),16);return((n>>16&255)*.299+(n>>8&255)*.587+(n&255)*.114)/255}
export function shade(h,k){const n=parseInt(h.slice(1),16),f=v=>Math.round(v*k);return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`}
export function wallCol(col){const n=parseInt(col.slice(1),16),k=.6;return `rgba(${Math.round((n>>16&255)*k)},${Math.round((n>>8&255)*k)},${Math.round((n&255)*k)},.95)`;}
