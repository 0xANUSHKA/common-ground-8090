function run(input){
 const n=(v,label,positive=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||(positive&&v===0))throw new Error('Invalid '+label);return v;};
 n(input.dailyTokens,'token demand');n(input.maxP95Ms,'latency target',true);n(input.dailyBudgetUSD,'budget');n(input.utilization,'utilization',true);if(input.utilization>1)throw new Error('Utilization cannot exceed 1');
 if(!Array.isArray(input.hardware)||input.hardware.length>50)throw new Error('Expected bounded hardware options');
 const ids=new Set();const rows=[],eligible=[];
 for(const h of input.hardware){if(!h.name||ids.has(h.name))throw new Error('Hardware names must be unique');ids.add(h.name);n(h.tokensPerSecond,'throughput',true);n(h.p95Ms,'p95 latency');n(h.hourlyUSD,'hourly price');n(h.powerW,'power');
  const units=Math.ceil(input.dailyTokens/(h.tokensPerSecond*86400*input.utilization));const cost=units*h.hourlyUSD*24;const energy=units*h.powerW*24/1000;const reasons=[];
  if(h.p95Ms>input.maxP95Ms)reasons.push('Latency exceeds target');if(cost>input.dailyBudgetUSD)reasons.push('Over budget');if(!reasons.length)eligible.push({name:h.name,units,cost,energy});
  rows.push([h.name,units,Math.round(cost*100)/100,h.p95Ms,Math.round(energy*100)/100,reasons.join('; ')||'Meets supplied constraints']);
 }
 eligible.sort((a,b)=>a.cost-b.cost||a.energy-b.energy||a.name.localeCompare(b.name));const best=eligible[0];
 return {title:'Inference capacity plan',summary:best?'Lowest-cost eligible option: '+best.name+' with '+best.units+' units.':'No option meets both latency and budget requirements.',metrics:[{label:'Eligible configurations',value:eligible.length},{label:'Selected units',value:best?.units||0},{label:'Selected daily USD',value:best?Math.round(best.cost*100)/100:0}],columns:['Configuration','Units','USD/day','Measured p95 ms','Estimated kWh/day','Finding'],rows,notes:['Synthetic benchmark and cost assumptions, not vendor prices or measured production performance. Linear capacity scaling is an estimate; latency under increased load needs benchmarking.']};
}
