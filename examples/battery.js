function run(input){
 const n=(v,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw new Error('Invalid '+label);return v;};
 const t=input.spec;n(t.maxTempC,'temperature limit');n(t.maxSpreadMv,'spread limit');n(t.minCapacityAh,'capacity requirement');
 if(!Array.isArray(input.packs)||input.packs.length>1000)throw new Error('Expected bounded pack tests');
 const ids=new Set();let passed=0,needsReview=0;const rows=[];
 for(const p of input.packs){if(!p.id||ids.has(p.id))throw new Error('Pack IDs must be unique');ids.add(p.id);const reasons=[];
  if(!Array.isArray(p.cellMv)||p.cellMv.length<2||p.cellMv.length>256)throw new Error('At least two cell readings required');
  p.cellMv.forEach(v=>n(v,'cell voltage'));n(p.peakTempC,'temperature');n(p.capacityAh,'capacity');
  const spread=Math.max(...p.cellMv)-Math.min(...p.cellMv);
  if(p.peakTempC>t.maxTempC)reasons.push('Temperature above spec');if(spread>t.maxSpreadMv)reasons.push('Cell imbalance');if(p.capacityAh<t.minCapacityAh)reasons.push('Capacity below spec');
  reasons.length?needsReview++:passed++;
  rows.push([p.id,reasons.length?'Review':'Within supplied spec',spread,p.peakTempC,p.capacityAh,reasons.join('; ')||'All supplied limits met']);
 }
 return {title:'Battery bench review',summary:needsReview+' of '+input.packs.length+' packs require engineering review against this specification.',metrics:[{label:'Within supplied spec',value:passed},{label:'Require review',value:needsReview},{label:'Packs tested',value:input.packs.length}],columns:['Pack','Disposition','Cell spread mV','Peak °C','Capacity Ah','Reason'],rows,notes:['Synthetic bench tests with illustrative thresholds. Not a safety certification or authorization to operate a battery.']};
}
