// A live coding agent for the factory with no extra keys: Claude Code in headless mode (`claude -p`) on this machine.
// It writes the inspector from the brief and the contract; the factory then runs the same seven sandboxed checks on
// whatever it returns, and on failure hands the failing checks back for a repair, up to three attempts.
import { spawn } from 'node:child_process';
import { deterministicBlueprint, parseBlueprint, STANDARD } from './blueprint.js';
import type { Blueprint } from './types.js';

function ask(prompt: string, timeoutMs = 240000): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.env.CLAUDE_BIN || 'claude', ['-p', '--output-format', 'text', '--max-turns', '1', '--tools', ''], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('The coding agent took too long.')); }, timeoutMs);
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => { clearTimeout(t); reject(new Error(`Couldn’t start Claude Code: ${e.message}`)); });
    p.on('close', (code) => { clearTimeout(t); code === 0 ? resolve(out) : reject(new Error(`Claude Code exited ${code}: ${err.slice(-300)}`)); });
    p.stdin.end(prompt);
  });
}
// pull the JavaScript out of the reply: the last fenced block, or the whole reply if there's no fence
export function extractSource(reply: string): string {
  const blocks = [...reply.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  return (blocks.length ? blocks[blocks.length - 1] : reply).trim();
}
export async function claudeWrite(contract: string, brief: string, feedback = '', blueprint?: Blueprint): Promise<string> {
  const plan = blueprint ? `\nApproved blueprint (follow it; every mustPass check is run against your code):\n${JSON.stringify(blueprint, null, 2)}\n` : '';
  const prompt = `${contract}\n\nUser brief: ${brief}\n${plan}${feedback ? `\nYour previous attempt failed these independent checks; fix them:\n${feedback}\n` : ''}\nReply with only the complete JavaScript source of function inspect(rows,binding) in one fenced code block. No explanation.`;
  return extractSource(await ask(prompt));
}
// Blueprint stage: Claude Code plans the tool (summary + design notes) before writing code. The standard fixes inputs,
// outputs and the seven checks. Any unusable reply or failure falls back to the deterministic blueprint.
export async function claudeBlueprint(contract: string, brief: string, onFallback?: (reason: string) => void): Promise<Blueprint> {
  const prompt = `You are planning a tool before any code is written. Standard: ${STANDARD}.\n\nContract:\n${contract}\n\nUser brief: ${brief}\n\nReply with JSON only, no prose and no code fence, exactly this shape:\n{"summary": "<one plain sentence, at most 25 words, saying what this tool does for this brief>", "notes": ["<1 to 3 short design decisions, each one sentence of at most 15 words>"]}`;
  try {
    const parsed = parseBlueprint(await ask(prompt, 120000));
    if (parsed) return parsed;
    onFallback?.('Claude Code’s blueprint reply was not usable JSON');
  } catch (e) {
    onFallback?.(e instanceof Error ? e.message : 'Claude Code blueprint failed');
  }
  return deterministicBlueprint(contract, brief);
}
