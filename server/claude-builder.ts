// A live coding agent for the factory with no extra keys: Claude Code in headless mode (`claude -p`) on this machine.
// It writes the inspector from the brief and the contract; the factory then runs the same seven sandboxed checks on
// whatever it returns, and on failure hands the failing checks back for a repair, up to three attempts.
import { spawn } from 'node:child_process';

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
export async function claudeWrite(contract: string, brief: string, feedback = ''): Promise<string> {
  const prompt = `${contract}\n\nUser brief: ${brief}\n${feedback ? `\nYour previous attempt failed these independent checks; fix them:\n${feedback}\n` : ''}\nReply with only the complete JavaScript source of function inspect(rows,binding) in one fenced code block. No explanation.`;
  return extractSource(await ask(prompt));
}
