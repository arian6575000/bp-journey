/**
 * @jest-environment node
 */
// Runs the real migrations and query builder against SQLite (node:sqlite) to catch SQL mistakes.
import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS } from '../src/db/schema';
import { buildReadingsQuery } from '../src/db/readingsQuery';

function migrate(db: DatabaseSync, upTo = Infinity) {
  db.exec('PRAGMA foreign_keys = ON');
  for (const m of MIGRATIONS) {
    if (m.version > upTo) break;
    for (const s of m.statements) db.exec(s);
  }
}

const insert = `INSERT INTO readings (id, profile_id, systolic, diastolic, pulse_bpm, measured_at_utc, timezone_offset_minutes, arm, position, context, notes, source, created_at_utc, updated_at_utc, deleted_at_utc)
 VALUES (?, 'local-profile', ?, ?, ?, ?, 0, ?, 'sitting', ?, NULL, 'manual', ?, ?, ?)`;

describe('database schema and queries', () => {
  it('applies all migrations on a fresh database', () => {
    const db = new DatabaseSync(':memory:');
    migrate(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(tables).toEqual(expect.arrayContaining(['readings', 'settings', 'reminders', 'profiles']));
    expect(() =>
      db
        .prepare(insert)
        .run('a', 120, 80, null, '2026-10-01T08:00:00.000Z', 'left', 'afternoon', 'c', 'c', null),
    ).not.toThrow();
    expect(() =>
      db.prepare(insert).run('b', 120, 80, null, '2026-10-01T08:00:00.000Z', 'left', 'bogus', 'c', 'c', null),
    ).toThrow();
  });

  it('migrates v1 data to v2, mapping the old "resting" context', () => {
    const db = new DatabaseSync(':memory:');
    migrate(db, 1);
    db.exec(
      `INSERT INTO readings VALUES ('old','local-profile',120,80,NULL,'2026-10-01T08:00:00.000Z',0,'left','sitting','resting',NULL,'manual','c','c',NULL)`,
    );
    for (const s of MIGRATIONS[1]!.statements) db.exec(s);
    const row = db.prepare("SELECT context FROM readings WHERE id='old'").get() as { context: string };
    expect(row.context).toBe('other');
  });

  it('filters, orders stably and paginates on real rows', () => {
    const db = new DatabaseSync(':memory:');
    migrate(db);
    const add = (
      id: string,
      s: number,
      utc: string,
      ctx: string,
      pulse: number | null,
      arm: string,
      deleted: string | null = null,
    ) => db.prepare(insert).run(id, s, 80, pulse, utc, arm, ctx, `c-${id}`, `c-${id}`, deleted);
    add('1', 120, '2026-10-01T08:00:00.000Z', 'morning', 70, 'left');
    add('2', 125, '2026-10-02T08:00:00.000Z', 'evening', null, 'right');
    add('3', 130, '2026-10-02T08:00:00.000Z', 'morning', 72, 'left'); // same timestamp as 2
    add('4', 135, '2026-10-03T08:00:00.000Z', 'morning', 75, 'left', '2026-10-04T00:00:00.000Z'); // deleted

    const run = (f: Parameters<typeof buildReadingsQuery>[0]) => {
      const { sql, params } = buildReadingsQuery(f);
      return (db.prepare(sql).all(...params) as { id: string }[]).map((r) => r.id);
    };
    expect(run({ order: 'desc' })).toEqual(['3', '2', '1']); // stable and excludes deleted
    expect(run({ order: 'asc' })).toEqual(['1', '2', '3']);
    expect(run({ contexts: ['morning'] })).toEqual(['3', '1']);
    expect(run({ arm: 'right' })).toEqual(['2']);
    expect(run({ pulse: 'without' })).toEqual(['2']);
    expect(run({ pulse: 'with' })).toEqual(['3', '1']);
    expect(
      run({ from: new Date('2026-10-02T00:00:00.000Z'), to: new Date('2026-10-03T00:00:00.000Z') }),
    ).toEqual(['3', '2']);
    expect(run({ order: 'desc', limit: 1, offset: 1 })).toEqual(['2']);

    const count = buildReadingsQuery({ contexts: ['morning'] }, 'COUNT(*) AS c');
    expect((db.prepare(count.sql).get(...count.params) as { c: number }).c).toBe(2);
  });
});
