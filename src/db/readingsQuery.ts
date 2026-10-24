import type { Arm, MeasurementContext } from '../domain/types';

export interface ReadingFilters {
  from?: Date;
  to?: Date; // exclusive
  contexts?: MeasurementContext[];
  arm?: Arm;
  pulse?: 'with' | 'without';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BuiltQuery {
  sql: string;
  params: (string | number)[];
}

/** Builds a parameterised query. All filtering happens in SQL on persisted rows. */
export function buildReadingsQuery(filters: ReadingFilters, select = '*'): BuiltQuery {
  const where: string[] = ['deleted_at_utc IS NULL'];
  const params: (string | number)[] = [];

  if (filters.from) {
    where.push('measured_at_utc >= ?');
    params.push(filters.from.toISOString());
  }
  if (filters.to) {
    where.push('measured_at_utc < ?');
    params.push(filters.to.toISOString());
  }
  if (filters.contexts && filters.contexts.length > 0) {
    where.push(`context IN (${filters.contexts.map(() => '?').join(',')})`);
    params.push(...filters.contexts);
  }
  if (filters.arm) {
    where.push('arm = ?');
    params.push(filters.arm);
  }
  if (filters.pulse === 'with') where.push('pulse_bpm IS NOT NULL');
  if (filters.pulse === 'without') where.push('pulse_bpm IS NULL');

  const dir = filters.order === 'asc' ? 'ASC' : 'DESC';
  let sql = `SELECT ${select} FROM readings WHERE ${where.join(' AND ')}`;
  if (select === '*') {
    // Stable ordering when several measurements share a timestamp.
    sql += ` ORDER BY measured_at_utc ${dir}, created_at_utc ${dir}, id ${dir}`;
    if (filters.limit != null) {
      sql += ' LIMIT ?';
      params.push(Math.max(1, Math.floor(filters.limit)));
      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(Math.max(0, Math.floor(filters.offset)));
      }
    }
  }
  return { sql, params };
}
