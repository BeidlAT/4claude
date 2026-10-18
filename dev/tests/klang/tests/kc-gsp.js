const L=require('./dsplib'); const SR=48000; const D=L.loadDsp(SR,L.dspSource()); const C=D.procs['myzel-web'];
const scales={penta:[0,2,4,7,9,12,14,16], chrom:[0,1,2,3,4,5,6,7], harm:null, bass:[0,2,4,7,9,12,14,16]};
let t0=Date.now(), nc=0;
for (const [nm,sc] of Object.entries(scales)) for (const nk of [0.5,2,8]) for (const lite of [0,1]) {
  const base = nm==='bass'?41.2:220;
  const fr= sc ? sc.map(s=>base*Math.pow(2,s/12)) : [1,2,3,4,5,6,8,10].map(h=>110*h);
  const w=new C({processorOptions:{freqs:fr, prm:{kopplung:1,nachklang:nk}, seed:5}}); nc++;
  const N=lite?6:w.N, kc=lite?w.kcL:w.kc, hb=w.hb;
  let worst=0, at=0; const steps=200000;
  for (let s=0;s<steps;s++){ const f=1*Math.pow(6000,s/steps), x=2*Math.PI*f/SR; let re=0,im=0; for(let i=0;i<N;i++){const h=w.resp(i,x,false); re+=h[0]; im+=h[1];}
    const c1=Math.cos(x),s1=Math.sin(x),c2=Math.cos(2*x),s2=Math.sin(2*x); const hp=Math.hypot(hb[0]+hb[1]*c1+hb[2]*c2, -hb[1]*s1-hb[2]*s2)/Math.hypot(1+hb[3]*c1+hb[4]*c2, -hb[3]*s1-hb[4]*s2);
    const m=hp*Math.hypot(re,im); if(m>worst){worst=m;at=f;} }
  console.log(nm,'nk',nk,'lite',lite,'max loop gain at kop 1 (dense):',(0.95*kc/N*worst).toFixed(3),'at',at.toFixed(1),'Hz');
}
const t1=Date.now(); const w=new C({processorOptions:{freqs:[0,2,4,7,9,12,14,16,19,21,24,26].map(s=>220*Math.pow(2,s/12)), rich:true, prm:{kopplung:1,nachklang:2}, seed:5}});
let t2=process.hrtime.bigint(); for(let i=0;i<20;i++){ w.ck=''; w.coef(); } console.log('coef() 12 strings:', (Number(process.hrtime.bigint()-t2)/20/1e6).toFixed(2),'ms');
