// the Rhizom net alone: cascade sizes over y for a p formula (16 nodes = mpent over 3 octaves, struck node 7)
const semis=[];for(let o=0;o<3;o++)for(const s of [0,2,4,7,9])semis.push(o*12+s);semis.push(36);
const n=semis.length, fu=new Array(n).fill(-1), fd=new Array(n).fill(-1);
for(let j=0;j<n;j++)for(let k=j+1;k<n;k++){if(semis[k]-semis[j]===7){fu[j]=k;fd[k]=j;break;}}
function run(y, P){ // P: {a,b,two,ton,boost,vel}
  const refr=new Float64Array(n), q=[]; let fired=0;
  const fire=(at,j,strike)=>{ refr[j]=at+0.6; fired++; if(fired>=40||at>=2.5)return;
    let p=P.reiz*(P.a+P.b*y); p=strike?Math.min(0.85,p*(P.boost)):Math.min(0.8,p);
    const pt=Math.min(0.2,P.ton*p);
    const go=(k,pk,dm)=>{ if(k<0||k>=n||!(Math.random()<pk*(1+0.3*(Math.random()-0.5))))return; q.push([at+0.04*dm*(1+0.21*(2*Math.random()-1)),k]); };
    go(j-1,p,1);go(j+1,p,1);go(j-2,p/P.two,1.6);go(j+2,p/P.two,1.6);go(j-5,pt,2.2);go(j+5,pt,2.2);go(fu[j],pt,1.8);go(fd[j],pt,1.8);
  };
  fire(0,7,true);
  while(q.length){ q.sort((a,b)=>a[0]-b[0]); const [at,j]=q.shift(); if(at<refr[j])continue; if(fired>=40||at>2.5)continue; fire(at,j,false); }
  return fired;
}
const variants={ cur:{reiz:0.5,a:0.5,b:1,two:3,ton:0.25,boost:1.25},
  A:{reiz:0.5,a:0.3,b:1,two:4,ton:0.2,boost:1.05},
  B:{reiz:0.5,a:0.35,b:1.05,two:3.5,ton:0.18,boost:1.1},
  C:{reiz:0.5,a:0.3,b:1.1,two:3.5,ton:0.2,boost:1.1} };
for(const [nm,P] of Object.entries(variants)){ console.log('==',nm,JSON.stringify(P));
 for(const y of [0,0.25,0.5,0.75,1]){ const sz=[];for(let r=0;r<3000;r++)sz.push(run(y,P)); const m=sz.reduce((a,b)=>a+b,0)/sz.length;
  const fr=(f)=>(sz.filter(f).length/sz.length*100).toFixed(0)+'%';
  console.log(' y',y,'mean',m.toFixed(1),'single',fr(x=>x===1),'2-3',fr(x=>x>=2&&x<=3),'4-8',fr(x=>x>=4&&x<=8),'9-15',fr(x=>x>=9&&x<=15),'whole(≥16)',fr(x=>x>=16)); } }
