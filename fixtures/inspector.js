// Hand-authored offline reference template. Live mode replaces this with generated code.
function inspect(rows, binding) {
  const start = Date.parse(binding.start.endsWith('Z') ? binding.start : binding.start+'Z');
  const end = Date.parse(binding.end.endsWith('Z') ? binding.end : binding.end+'Z');
  const step = binding.cadenceSeconds*1000;
  const counts = new Map();
  let finiteValues=0, missingValues=0, malformedValues=0, negativeValues=0, zeroValues=0;
  for (const r of rows) {
    const t = Date.parse(r.time.endsWith('Z') ? r.time : r.time+'Z');
    if (!Number.isFinite(t)) throw new Error('Invalid timestamp');
    counts.set(t,(counts.get(t)||0)+1);
    const raw = String(r.value ?? '').trim();
    if (!raw || /^(nan|[+-]?inf(inity)?)$/i.test(raw)) { missingValues++; continue; }
    const value = Number(raw);
    if (!Number.isFinite(value)) { malformedValues++; continue; }
    finiteValues++; if(value<0)negativeValues++; if(value===0)zeroValues++;
  }
  const expected=new Set(), missingTimestamps=[];
  for(let t=start;t<end;t+=step) {
    expected.add(t);
    if (!counts.has(t)) missingTimestamps.push(new Date(t).toISOString().replace('.000Z',binding.timeBasis==='utc'?'Z':''));
  }
  return {rows:rows.length,uniqueTimestamps:counts.size,duplicateRows:rows.length-counts.size,missingTimestamps,
    outsideGrid:[...counts.keys()].filter(t=>!expected.has(t)).length,
    finiteValues,missingValues,malformedValues,negativeValues,zeroValues,physicalValidity:'not_assessed'};
}
