import { buildBackupJson, buildCsv, buildReportHtml, escapeHtml } from '../src/domain/exportData';
import type { ReportLabels } from '../src/domain/exportData';
import { summarize } from '../src/domain/stats';
import type { BloodPressureReading } from '../src/domain/types';

const reading: BloodPressureReading = {
  id: 'x',
  profileId: 'local-profile',
  systolic: 120,
  diastolic: 80,
  pulseBpm: null,
  measuredAtUtc: '2026-10-23T03:30:00.000Z',
  timezoneOffsetMinutes: -300,
  arm: 'left',
  position: 'sitting',
  context: 'morning',
  notes: '=cmd|"x", y',
  source: 'manual',
  createdAtUtc: '2026-10-23T03:30:00.000Z',
  updatedAtUtc: '2026-10-23T03:30:00.000Z',
};

describe('exports', () => {
  it('builds CSV with local date/time, quoting and formula-injection protection', () => {
    const csv = buildCsv([reading]);
    expect(csv.startsWith('﻿date,time,')).toBe(true);
    expect(csv).toContain('2026-10-23,08:30,120,80,,morning,left,sitting,');
    expect(csv).toContain(`"'=cmd|""x"", y"`);
  });

  it('builds a JSON backup', () => {
    const parsed = JSON.parse(buildBackupJson([reading], new Date('2026-10-24T00:00:00Z')));
    expect(parsed.app).toBe('bp-journey');
    expect(parsed.readings).toHaveLength(1);
  });

  it('escapes HTML in the report', () => {
    expect(escapeHtml('<b>"&\'')).toBe('&lt;b&gt;&quot;&amp;&#39;');
    const labels = Object.fromEntries(
      [
        'title',
        'period',
        'generated',
        'summary',
        'readingsCount',
        'avgSystolic',
        'avgDiastolic',
        'avgPulse',
        'range',
        'date',
        'time',
        'systolic',
        'diastolic',
        'pulse',
        'context',
        'arm',
        'notes',
        'disclaimer',
        'none',
        'truncated',
      ].map((k) => [k, k]),
    ) as unknown as ReportLabels;
    const html = buildReportHtml({
      labels,
      rtl: true,
      periodText: 'p',
      generatedText: 'g',
      summary: summarize([reading]),
      rows: [
        {
          date: 'd',
          time: 't',
          systolic: 120,
          diastolic: 80,
          pulse: null,
          context: 'c',
          arm: 'a',
          notes: '<script>alert(1)</script>',
        },
      ],
      totalRows: 1,
    });
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
