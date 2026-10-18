const {run,SR,L}=require('./web-gsp.js');
const scales={penta:[0,2,4,7,9,12,14,16], major:[0,2,4,5,7,9,11,12], chrom:[0,1,2,3,4,5,6,7]};
for (const [nm,sc] of Object.entries(scales)) for (const nk of [0.5,2,8]) for (const kop of [0,0.4,1]) {
  const fr=sc.map(s=>220*Math.pow(2,s/12));
  const dur=Math.max(6, 6*nk);
  const r=run({freqs:fr, prm:{kopplung:kop,nachklang:nk,steg:0.5}, dur, events:[[0.1,220,0.3,0.4],[0.12,fr[2],0.3,0.4],[0.14,fr[3],0.3,0.4]]});
  const lv=(a,b)=>L.db(L.rms(r.L,Math.round(a*SR),Math.round(b*SR)));
  const a=0.8, b=a+Math.min(2*nk,4); const t60=60*(b-a)/Math.max(1e-3,lv(a,a+0.3)-lv(b,b+0.3));
  console.log(nm,'nk',nk,'kop',kop,'T60',t60.toFixed(2),'ratio',(t60/nk).toFixed(2));
}
