import { localParts } from './dates';
import type { BloodPressureReading } from './types';
import type { Summary } from './stats';
import { roundTo } from './stats';

function csvCell(value: string | number | null): string {
  if (value == null) return '';
  const text = String(value);
  // Neutralise spreadsheet formula injection from free-text notes.
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value === 'string' ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export const CSV_HEADER = [
  'date',
  'time',
  'systolic_mmHg',
  'diastolic_mmHg',
  'pulse_bpm',
  'context',
  'arm',
  'position',
  'notes',
  'measured_at_utc',
  'utc_offset_minutes',
] as const;

/** UTF-8 CSV (with BOM so spreadsheet apps read Urdu notes correctly). */
export function buildCsv(readings: readonly BloodPressureReading[]): string {
  const rows = readings.map((r) => {
    const p = localParts(r.measuredAtUtc, r.timezoneOffsetMinutes);
    return [
      `${p.year}-${pad(p.month)}-${pad(p.day)}`,
      `${pad(p.hour)}:${pad(p.minute)}`,
      r.systolic,
      r.diastolic,
      r.pulseBpm,
      r.context,
      r.arm,
      r.position,
      r.notes,
      r.measuredAtUtc,
      r.timezoneOffsetMinutes,
    ]
      .map(csvCell)
      .join(',');
  });
  return `﻿${[CSV_HEADER.join(','), ...rows].join('\r\n')}\r\n`;
}

export interface BackupFile {
  app: 'bp-journey';
  version: 1;
  exportedAtUtc: string;
  readings: BloodPressureReading[];
}

export function buildBackupJson(readings: readonly BloodPressureReading[], now: Date): string {
  const payload: BackupFile = {
    app: 'bp-journey',
    version: 1,
    exportedAtUtc: now.toISOString(),
    readings: [...readings],
  };
  return JSON.stringify(payload, null, 2);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReportLabels {
  title: string;
  period: string;
  generated: string;
  summary: string;
  readingsCount: string;
  avgSystolic: string;
  avgDiastolic: string;
  avgPulse: string;
  range: string;
  date: string;
  time: string;
  systolic: string;
  diastolic: string;
  pulse: string;
  context: string;
  arm: string;
  notes: string;
  disclaimer: string;
  none: string;
  truncated: string;
}

export interface ReportInput {
  labels: ReportLabels;
  rtl: boolean;
  periodText: string;
  generatedText: string;
  summary: Summary;
  rows: {
    date: string;
    time: string;
    systolic: number;
    diastolic: number;
    pulse: number | null;
    context: string;
    arm: string;
    notes: string | null;
  }[];
  totalRows: number;
}

export const REPORT_MAX_ROWS = 400;

const fmt = (v: number | null, d = 0): string => (v == null ? '–' : String(roundTo(v, d)));

export function buildReportHtml(input: ReportInput): string {
  const { labels: L, summary: s } = input;
  const dir = input.rtl ? 'rtl' : 'ltr';
  const rows = input.rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.time)}</td><td class="n">${r.systolic}</td><td class="n">${r.diastolic}</td><td class="n">${r.pulse ?? '–'}</td><td>${escapeHtml(r.context)}</td><td>${escapeHtml(r.arm)}</td><td>${escapeHtml(r.notes ?? '')}</td></tr>`,
    )
    .join('');
  const truncated =
    input.totalRows > input.rows.length
      ? `<p class="muted">${escapeHtml(L.truncated)} (${input.rows.length}/${input.totalRows})</p>`
      : '';
  return `<!doctype html>
<html dir="${dir}"><head><meta charset="utf-8"/>
<style>
body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#14243a;padding:24px;font-size:12px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:20px 0 8px}
.muted{color:#5b6b80}table{width:100%;border-collapse:collapse}
th,td{border:1px solid #d5deea;padding:5px 7px;text-align:start}th{background:#eaf2ff}
td.n{text-align:center}.grid{display:flex;gap:12px;flex-wrap:wrap}
.box{border:1px solid #d5deea;border-radius:8px;padding:8px 12px;min-width:120px}
.box b{display:block;font-size:18px}
</style></head><body>
<h1>${escapeHtml(L.title)}</h1>
<div class="muted">${escapeHtml(L.period)}: ${escapeHtml(input.periodText)} · ${escapeHtml(L.generated)}: ${escapeHtml(input.generatedText)}</div>
<h2>${escapeHtml(L.summary)}</h2>
<div class="grid">
<div class="box">${escapeHtml(L.readingsCount)}<b>${s.count}</b></div>
<div class="box">${escapeHtml(L.avgSystolic)}<b>${fmt(s.avgSystolic)}</b></div>
<div class="box">${escapeHtml(L.avgDiastolic)}<b>${fmt(s.avgDiastolic)}</b></div>
<div class="box">${escapeHtml(L.avgPulse)}<b>${fmt(s.avgPulse)}</b></div>
<div class="box">${escapeHtml(L.range)}<b>${s.minSystolic ?? '–'}–${s.maxSystolic ?? '–'} / ${s.minDiastolic ?? '–'}–${s.maxDiastolic ?? '–'}</b></div>
</div>
<h2>${escapeHtml(L.title)}</h2>
${
  input.rows.length === 0
    ? `<p class="muted">${escapeHtml(L.none)}</p>`
    : `<table><thead><tr><th>${escapeHtml(L.date)}</th><th>${escapeHtml(L.time)}</th><th>${escapeHtml(L.systolic)}</th><th>${escapeHtml(L.diastolic)}</th><th>${escapeHtml(L.pulse)}</th><th>${escapeHtml(L.context)}</th><th>${escapeHtml(L.arm)}</th><th>${escapeHtml(L.notes)}</th></tr></thead><tbody>${rows}</tbody></table>`
}
${truncated}
<p class="muted" style="margin-top:18px">${escapeHtml(L.disclaimer)}</p>
</body></html>`;
}
