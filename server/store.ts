import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export class Store {
  db: DatabaseSync;
  constructor(path = '.local/common-ground.sqlite') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(kind,id));');
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(kind,id) as {value:string}|undefined;
    return row ? JSON.parse(row.value) : undefined;
  }
  all<T>(kind: string): T[] { return (this.db.prepare('SELECT value FROM records WHERE kind=? ORDER BY rowid').all(kind) as {value:string}[]).map(x=>JSON.parse(x.value)); }
  put<T>(kind: string, id: string, value: T) { this.db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind,id,JSON.stringify(value)); return value; }
  close() { this.db.close(); }
}
