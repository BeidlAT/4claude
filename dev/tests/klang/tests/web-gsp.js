// the web processor alone: plucks (a simple KS string) into its input; per-string levels from the delay lines
const L=require('./dsplib'); const SR=48000; const D=L.loadDsp(SR,L.dspSource());
const C=D.procs['myzel-web'];
function ks(f,dur,amp=0.3,T60=+(process.env.KST||2)){ const n=Math.round(dur*SR), P=Math.round(SR/f), b=new Float32Array(P), o=new Float32Array(n); let s=1234567; for(let i=0;i<P;i++){ s^=s<<13;s^=s>>>17;s^=s<<5; b[i]=amp*(s/2147483648);} const g=Math.pow(10,-3/(T60*f)); let p=0,prev=0; for(let i=0;i<n;i++){ const v=b[p]; o[i]=v; const nv=g*0.5*(v+prev); prev=v; b[p]=nv; p=(p+1)%P; } return o; }
function run(o){ // o: {freqs, prm, rich, events:[[t, f, amp]], dur, msgs:[[t,msg]]}
  const node=new C({processorOptions:{freqs:o.freqs, prm:o.prm||{}, rich:!!o.rich, seed:5}}), n=Math.round(o.dur*SR), inp=new Float32Array(n);
  for (const [t,f,a,len] of o.events||[]) { const x=ks(f,len||Math.min(3,o.dur-t),a); const i0=Math.round(t*SR); for(let i=0;i<x.length&&i0+i<n;i++) inp[i0+i]+=x[i]; }
  const Lo=new Float32Array(n), Ro=new Float32Array(n), N=node.N, str=[]; const msgs=(o.msgs||[]).slice(); const posted=[];
  for (let f0=0; f0<n; f0+=128) {
    while (msgs.length && msgs[0][0]*SR<=f0) node.port.onmessage({data:msgs.shift()[1]});
    const Lb=new Float32Array(128), Rb=new Float32Array(128); node.process([[inp.subarray(f0,f0+128)]],[[Lb,Rb]],{}); Lo.set(Lb.subarray(0,Math.min(128,n-f0)),f0); Ro.set(Rb.subarray(0,Math.min(128,n-f0)),f0);
    while (node.port.out && node.port.out.length) posted.push([f0/SR, node.port.out.shift()]);
    if (f0 % (SR/20|0) < 128) { const e=[]; for(let i=0;i<N;i++){ const b=node.bufs[i]; let s=0; for(let k=0;k<b.length;k++) s+=b[k]*b[k]; e.push(Math.sqrt(s/b.length)); } str.push([f0/SR,e]); }
  }
  return {L:Lo,R:Ro,inp,str,node,posted};
}
module.exports={run,ks,SR,L};
if (require.main===module) {
  const scale=[0,2,4,7,9,12,14,16].map(s=>220*Math.pow(2,s/12));   // major pentatonic from 220
  for (const kop of [0,0.4,1]) {
    const r=run({freqs:scale, prm:{kopplung:kop,nachklang:2}, dur:8, events:[[0.1,220,0.3,3]]});
    const at=(t)=>r.str.find(x=>x[0]>=t)[1];
    const e05=at(0.5), e2=at(2), e6=at(6), e75=at(7.5);
    console.log('kopplung',kop,'@0.5s per string dB (root..):',e05.map(v=>L.db(v).toFixed(0)).join(' '));
    console.log('   @2s', e2.map(v=>L.db(v).toFixed(0)).join(' '), ' @6s', e6.map(v=>L.db(v).toFixed(0)).join(' '));
    const out=(a,b)=>L.db(L.rms(r.L,Math.round(a*SR),Math.round(b*SR))); console.log('   out level 0.3-0.8',out(0.3,0.8).toFixed(1),' 3-3.5',out(3,3.5).toFixed(1),' 5-5.5',out(5,5.5).toFixed(1),' 7-7.5',out(7,7.5).toFixed(1),' input',L.db(L.rms(r.inp,Math.round(0.3*SR),Math.round(0.8*SR))).toFixed(1), 'posted', JSON.stringify(r.posted.map(p=>[+p[0].toFixed(2),p[1]])));
  }
}
