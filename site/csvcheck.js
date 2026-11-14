// A completeness check on a real CSV, in the browser: the same report shape as the standard's contract
// (server/factory.ts): rows, unique timestamps, duplicates, missing timestamps on the grid, off-grid rows,
// missing and malformed values. Nothing is uploaded anywhere.

const split = (line) => line.split(',').map((x) => x.trim().replace(/^"|"$/g, ''));
const MISSING = new Set(['', 'nan', 'NaN', 'NAN', 'null', 'NULL', 'Inf', 'Infinity', '-Infinity']);
const zoned = (t) => /(Z|[+-]\d\d:?\d\d)$/.test(t);
// UTC timestamps keep their offset; local ones are read as naive wall-clock time and never shifted (no timezone guessed)
const parseTime = (t, basis) => {
  if (!t) return NaN;
  const iso = t.replace(' ', 'T');
  return basis === 'utc' ? Date.parse(zoned(iso) ? iso : iso + 'Z') : Date.parse(iso.replace(/(Z|[+-]\d\d:?\d\d)$/, '') + 'Z');
};
const numeric = (v) => v !== '' && Number.isFinite(Number(v));

export function sniff(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 3) throw new Error('This file has fewer than three lines.');
  const columns = split(lines[0]);
  const timeColumn = columns.find((c) => /^(time|timestamp|datetime|date|measured_on)$/i.test(c)) || columns.find((c) => /time|date|measured/i.test(c)) || columns[0];
  const ti = columns.indexOf(timeColumn);
  const second = split(lines[1]);
  const unitsRow = Number.isNaN(Date.parse((second[ti] || '').replace(' ', 'T'))) && second.some((v) => v && !numeric(v));
  const first = split(lines[unitsRow ? 2 : 1])[ti] || '';
  const timeBasis = zoned(first.replace(' ', 'T')) ? 'utc' : 'local-unspecified';
  const body = lines.slice(unitsRow ? 2 : 1, (unitsRow ? 2 : 1) + 200).map(split);
  const usable = columns.filter((c, i) => i !== ti && !/^(lat|lon|latitude|longitude|.*_id|id|system_id)$/i.test(c) && body.filter((r) => numeric(r[i]) || MISSING.has(r[i] || '')).length > body.length * .5);
  const valueColumn = usable.find((c) => /^(ac_)?power|value|wind_speed|co2|ch4|flux/i.test(c)) || usable[0] || columns.find((c, i) => i !== ti) || '';
  const times = body.map((r) => parseTime(r[ti], timeBasis)).filter(Number.isFinite);
  const diffs = times.slice(1).map((t, i) => (t - times[i]) / 1000).filter((d) => d > 0).sort((a, b) => a - b);
  const cadenceSeconds = diffs.length ? Math.round(diffs[Math.floor(diffs.length / 2)]) : 60;
  const unit = unitsRow ? split(lines[1])[columns.indexOf(valueColumn)] || '' : '';
  return { columns, timeColumn, valueColumn, unitsRow, timeBasis, cadenceSeconds, unit };
}

export function inspect(text, b) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  const columns = split(lines[0]), ti = columns.indexOf(b.timeColumn), vi = columns.indexOf(b.valueColumn);
  if (ti < 0 || vi < 0) return { ok: false, error: 'Pick a time column and a value column.' };
  const rows = lines.slice(b.unitsRow ? 2 : 1).map(split);
  const seen = new Set(); let duplicates = 0, badTimes = 0, missingValues = 0, badValues = 0;
  for (const r of rows) {
    const t = parseTime(r[ti], b.timeBasis);
    if (!Number.isFinite(t)) { badTimes++; continue; }
    if (seen.has(t)) duplicates++; else seen.add(t);
    const v = (r[vi] ?? '').trim();
    if (MISSING.has(v)) missingValues++; else if (!numeric(v)) badValues++;
  }
  const step = Math.max(1, Math.round(b.cadenceSeconds)) * 1000, ts = [...seen].sort((x, y) => x - y);
  if (!ts.length) return { ok: false, rows: rows.length, error: `None of the ${rows.length.toLocaleString()} rows has a readable time.` };
  const start = ts[0], end = ts.at(-1);
  // the grid runs over whole days when the data looks like a day of samples, otherwise first to last reading
  const dayStart = Math.floor(start / 86400000) * 86400000, gridStart = start - dayStart <= step ? dayStart : start;
  const gridEnd = gridStart === dayStart && end - dayStart < 86400000 ? dayStart + 86400000 - step : end;
  let missing = 0, offGrid = 0;
  for (let t = gridStart; t <= gridEnd; t += step) if (!seen.has(t)) missing++;
  for (const t of ts) if ((t - gridStart) % step !== 0) offGrid++;
  return { ok: badTimes === 0, rows: rows.length, unique: seen.size, duplicates, missing, offGrid, missingValues, badValues, badTimes, cadenceSeconds: step / 1000 };
}
