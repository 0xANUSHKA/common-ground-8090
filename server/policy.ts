import { createHash } from 'node:crypto';
import type { Store } from './store.js';
import type { Artifact, Company, Grant, Preference, User } from './types.js';
export const hash = (x: unknown) => createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export function qualified(a: Artifact): boolean {
 return a.hash===hash(a.source) && a.bindingHash===hash(a.sourceBinding) && a.checksHash===hash(a.checks) && a.checks.length>=7 && a.checks.every(x=>x.passed) && !!a.maintainer;
}
export function canPublish(s: Store, actor: User, a: Artifact, scope: Grant['scope']): boolean {
 const c=s.get<Company>('company',actor.company);
 return a.owner===actor.id && a.company===actor.company && !!c?.participating && c.publishers.includes(actor.id) && actor.publisher && (scope==='company'||(actor.exporter&&c.exporters.includes(actor.id))) && qualified(a);
}
// Always run BEFORE names, counts, embeddings, preview, bytes, or adaptation are returned.
export function canReceive(s: Store, u: User, a: Artifact, g: Grant, now=Date.now()): boolean {
 const source=s.get<Company>('company',a.company), target=s.get<Company>('company',u.company);
 const p=s.get<Preference>('preference',u.id), issuer=s.get<User>('user',g.issuer);
 const network=s.get<{enabled:boolean;classes:string[]}>('network','demo');
 if (!network?.enabled || !network.classes.includes(a.class) || !source?.participating || !target?.participating || !issuer || !p) return false;
 if (!qualified(a)||a.reviewedHash!==a.hash||a.reviewedBy!==g.issuer||g.hash!==a.hash||g.artifactId!==a.id||g.revoked||Date.parse(g.expiresAt)<=now) return false;
 if (!canPublish(s,issuer,a,g.scope)||!g.recipients.includes(u.id)||!u.eligible||!target.receivers.includes(u.id)) return false;
 if (!source.classes.includes(a.class)||!target.classes.includes(a.class)||p.mode==='off'||p.muted.includes(issuer.id)) return false;
 if (u.company!==a.company && (g.scope!=='portfolio'||p.mode!=='portfolio'||!source.peers.includes(u.company)||!target.peers.includes(a.company))) return false;
 return true;
}
export function fit(u: User, a: Artifact) {
 const shared=a.capabilities.filter(x=>u.capabilities.includes(x));
 return {qualified:shared.length>=2, shared, reason:`Your workflow uses ${shared.join(', ')}. The same completeness logic can be reused; data bindings stay local.`};
}
