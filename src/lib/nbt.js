// Минимальный NBT-кодировщик и gzip — всё, что нужно для файла .litematic.
export function nbtEncode(root){let buf=new Uint8Array(1<<20),dv=new DataView(buf.buffer),n=0;const te=new TextEncoder();
  const need=k=>{if(n+k<=buf.length)return;let s=buf.length*2;while(s<n+k)s*=2;const nb=new Uint8Array(s);nb.set(buf.subarray(0,n));buf=nb;dv=new DataView(buf.buffer);};
  const u8=v=>{need(1);buf[n++]=v;},u16=v=>{need(2);dv.setUint16(n,v);n+=2;},i32=v=>{need(4);dv.setInt32(n,v);n+=4;},u32=v=>{need(4);dv.setUint32(n,v);n+=4;};
  const str=s=>{const e=te.encode(s);u16(e.length);need(e.length);buf.set(e,n);n+=e.length;};
  const pay=g=>{switch(g.t){
    case 3:i32(g.v);break;
    case 4:u32(Math.floor(g.v/4294967296));u32(g.v>>>0);break;
    case 8:str(g.v);break;
    case 9:u8(g.v.length?g.v[0].t:g.et);i32(g.v.length);g.v.forEach(pay);break;
    case 10:for(const [k,v] of Object.entries(g.v)){u8(v.t);str(k);pay(v);}u8(0);break;
    case 12:{const u=g.v,nl=u.length/2;i32(nl);need(nl*8);for(let i=0;i<nl;i++){dv.setUint32(n,u[2*i+1]);dv.setUint32(n+4,u[2*i]);n+=8;}break;}}};
  u8(10);str('');pay(root);return buf.slice(0,n);}
export const NB={i:v=>({t:3,v}),l:v=>({t:4,v}),s:v=>({t:8,v}),list:(et,v)=>({t:9,et,v}),c:v=>({t:10,v}),la:v=>({t:12,v})};
export async function gzipBytes(u8){const s=new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'));return new Uint8Array(await new Response(s).arrayBuffer());}
