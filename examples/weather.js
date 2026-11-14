function run(input) {
  const number = (v, label) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new Error('Invalid ' + label); return v; };
  const wind = number(input.maxWindMps, 'wind threshold'), rain = number(input.maxRainMm, 'rain threshold');
  if (!Number.isInteger(input.minimumHours) || input.minimumHours < 1 || input.minimumHours > 24) throw new Error('Minimum hours must be 1–24');
  if (!Array.isArray(input.hours) || input.hours.length > 168) throw new Error('Expected up to 168 hourly observations');
  let previous = -Infinity, segment = [], windows = [], rejected = [];
  const flush = () => { if (segment.length >= input.minimumHours) windows.push([segment[0].time, new Date(Date.parse(segment.at(-1).time)+3600000).toISOString(), segment.length, Math.max(...segment.map(r=>r.windMps))]); segment = []; };
  for (const row of input.hours) {
    const time = Date.parse(row.time);
    if (!/Z$/.test(row.time) || !Number.isFinite(time) || time <= previous) throw new Error('Use unique ascending UTC timestamps');
    number(row.windMps, 'wind measurement'); number(row.rainMm, 'rain measurement');
    if (time-previous !== 3600000) flush();
    previous=time;
    const reasons=[]; if(row.windMps>wind)reasons.push('Wind exceeds limit');if(row.rainMm>rain)reasons.push('Rain exceeds limit');
    if(reasons.length){flush();rejected.push([row.time,reasons.join('; ')]);}else segment.push(row);
  }
  flush();
  const usable=windows.reduce((n,w)=>n+w[2],0);
  return {title:'Weather window plan',summary:windows.length?windows.length+' candidate work windows meet the supplied limits.':'No window meets the supplied limits.',metrics:[{label:'Candidate windows',value:windows.length},{label:'Usable hours',value:usable},{label:'Excluded hours',value:rejected.length}],columns:['Start (UTC)','End (exclusive, UTC)','Hours','Peak wind (m/s)'],rows:windows,notes:['Planning illustration using synthetic observations and user-supplied limits; not operational safety clearance.',...rejected.map(r=>r.join(': '))]};
}
