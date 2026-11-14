export type CompanyId = 'saildrone' | 'palmetto';
export type ReceiveMode = 'off' | 'company' | 'portfolio';
export interface User { id: string; name: string; company: CompanyId; publisher: boolean; exporter: boolean; eligible: boolean; capabilities: string[] }
export interface Company { id: CompanyId; name: string; participating: boolean; peers: CompanyId[]; publishers: string[]; exporters: string[]; receivers: string[]; classes: string[]; evidence: string }
export interface Preference { mode: ReceiveMode; muted: string[] }
export interface Binding { dataset: 'marine' | 'solar'; timeColumn: string; signalColumn: string; skipUnitsRow: boolean; timeBasis: 'utc' | 'local-unspecified'; start: string; end: string; cadenceSeconds: number }
export interface Report { rows: number; uniqueTimestamps: number; duplicateRows: number; missingTimestamps: string[]; outsideGrid: number; finiteValues: number; missingValues: number; malformedValues: number; negativeValues: number; zeroValues: number; physicalValidity: 'not_assessed' }
export interface Check { name: string; passed: boolean; detail?: string }
export interface Artifact { id: string; owner: string; company: CompanyId; name: string; source: string; hash: string; sourceBinding: Binding; bindingHash: string; checks: Check[]; checksHash: string; reviewedHash?: string; reviewedBy?: string; maintainer: string; class: string; capabilities: string[]; provenance: 'reference-template' | 'eve-generated' | 'agent-generated'; createdAt: string }
export interface Grant { id: string; artifactId: string; hash: string; issuer: string; scope: 'company' | 'portfolio'; recipients: string[]; expiresAt: string; revoked: boolean; reshare: false }
export interface Adoption { id: string; userId: string; artifactId: string; hash: string; binding: Binding; bindingHash: string; report: Report; checks: Check[]; createdAt: string }
export interface BuildJob { id: string; owner: string; prompt: string; status: 'building' | 'ready' | 'failed'; tokenHash: string; events: string[]; artifactId?: string; error?: string; createdAt: string; provider: string; sessionId?: string }
