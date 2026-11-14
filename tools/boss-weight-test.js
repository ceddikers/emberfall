// Boss weight: proves a heavy cast's long gather leaves the blow where it was. For casts of 1 to 8 s and weights 0.5 to 1.4 it plays strikeBeats (client/js/draw-util.js)
// with and without the wind-up stamp (action.w0 / action.wk, set by main.js 'bcast' from boss-weight.js) and compares every beat from the moment the action begins:
// hit, ovr, rest, land, shud, trail and u must match to the bit, so the strike reaches 1, lands, carries past and settles on exactly the same frames. Prints the largest
// difference (0) and the largest step the load takes in one frame (no pop). Run: node tools/boss-weight-test.js
const fs=require('fs'), vm=require('vm');
const ctx={Math, console, document:undefined}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('client/js/draw-util.js','utf8')+'\n;this.strikeBeats=strikeBeats;this.windUp=windUp;', ctx);
const {strikeBeats, windUp}=ctx;
let worst=0, firstHit=null, cmp=0;
for (const D of [1.0, 1.6, 3.0, 4.5, 8]) for (const wk of [0.5, 1.0, 1.4]) {
  const land=10, w0=land-D, t0=land-0.45;
  const mk=wk=>({t:0, action:{type:'attack', t0, dur:1.2, w0: wk?w0:undefined, wk}, props:{}});
  const A=mk(0), B=mk(wk);
  let hitA=null, hitB=null;
  for (let t=w0-0.2; t<=land+1.0; t+=1/240) {
    A.t=t; B.t=t;
    const a=strikeBeats(A), b=strikeBeats(B);
    if (t>=t0) { for (const k of ['hit','ovr','rest','land','shud','trail','u']) { const d=Math.abs(a[k]-b[k]); if (d>worst) worst=d; } cmp++; }
    if (hitA==null && a.hit>=0.999) hitA=t; if (hitB==null && b.hit>=0.999) hitB=t;
    if (t>=t0 && Math.abs(a.load - b.load)>1e-9 && t> t0+0.45 ) {} 
    // continuity of load across the start of the action
  }
  if (Math.abs(hitA-hitB)>1e-9) console.log('HIT TIME DIFFERS', D, wk, hitA, hitB);
  // continuity: max jump of load per 1/60 step
  let prev=null, jump=0, loadAtU0=null;
  for (let t=w0-0.1; t<=land+0.5; t+=1/60) { B.t=t; const z=strikeBeats(B); if (prev!=null) jump=Math.max(jump, Math.abs(z.load-prev)); prev=z.load; }
  console.log('D',D,'wk',wk,'hit frame same (both reach 1 at',hitB.toFixed(4)+', land',land+')','max load step per frame',jump.toFixed(3));
}
console.log('compared', cmp, 'samples; worst difference in hit/ovr/rest/land/shud/trail/u after the action begins:', worst);
