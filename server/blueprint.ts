// Blueprint stage: the plan the factory commits to before any code is written.
// Inputs, outputs and the checks that must pass are fixed by the standard; only the summary and notes vary by brief.
import { CHECK_NAMES, REPORT_FIELDS } from './runner.js';
import type { Blueprint } from './types.js';
export const STANDARD = 'Sensor time-series v1';
export const BLUEPRINT_INPUTS = ['time', 'value', 'start', 'end', 'cadenceSeconds', 'timeBasis'];
const DEFAULT_NOTES = [
  'Timestamps are compared on a fixed cadence grid using UTC arithmetic; no timezone is ever inferred.',
  'The window is [start, end), so gaps at either edge count as missing.',
  'Zero and negative readings are valid; blank, NaN and Infinity are missing, other text is malformed.',
];
function subject(brief: string): string {
  const b = brief.toLowerCase();
  if (/\b(wind|marine|ocean|saildrone|noaa|buoy|vessel)\b/.test(b)) return 'marine sensor telemetry';
  if (/\b(solar|pv|pvdaq|inverter|power|energy)\b/.test(b)) return 'solar power readings';
  return 'timestamped sensor readings';
}
/** Fills the parts of a blueprint the standard fixes; `summary` and `notes` come from the caller. */
export function standardBlueprint(summary: string, notes: string[]): Blueprint {
  return { standard: STANDARD, summary, inputs: [...BLUEPRINT_INPUTS], outputs: [...REPORT_FIELDS], mustPass: [...CHECK_NAMES], notes };
}
/** Deterministic blueprint from the contract and brief, used offline and whenever an agent's blueprint is unusable. */
export function deterministicBlueprint(contract: string, brief: string): Blueprint {
  const notes = [...DEFAULT_NOTES];
  // The contract forbids physical-validity judgements; say so when the brief asks for one.
  if (/\b(valid|plausib|physical|outlier|anomal)/i.test(brief) && /physicalValidity/.test(contract)) notes[2] = 'Physical validity is reported as not assessed; the tool counts values but never judges them.';
  return standardBlueprint(`Checks ${subject(brief)} for missing, duplicate and off-grid timestamps and counts missing, malformed, zero and negative values.`, notes);
}
const oneSentence = (x: string, max: number) => {
  const t = x.replace(/\s+/g, ' ').trim();
  const m = t.match(/^.*?[.!?](?=\s|$)/);
  const first = m ? m[0] : t;
  if (first.length <= max) return first;
  // Cut at a word boundary rather than mid-word.
  return first.slice(0, max).replace(/[\s,;:([-]+\S*$/, '').replace(/[,;:]$/, '') + '…';
};
/** Parse an agent's JSON blueprint reply. Returns undefined when it can't be used. */
export function parseBlueprint(reply: string): Blueprint | undefined {
  const fenced = [...reply.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const text = fenced.length ? fenced[fenced.length - 1] : reply;
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return undefined;
  let data: any;
  try { data = JSON.parse(text.slice(start, end + 1)); } catch { return undefined; }
  if (!data || typeof data !== 'object' || typeof data.summary !== 'string') return undefined;
  const summary = oneSentence(data.summary, 200);
  const notes = (Array.isArray(data.notes) ? data.notes : []).filter((n: unknown): n is string => typeof n === 'string' && n.trim().length > 0).map((n: string) => oneSentence(n, 140)).slice(0, 3);
  if (summary.length < 10 || notes.length < 1) return undefined;
  return standardBlueprint(summary, notes);
}
