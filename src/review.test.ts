import { describe, expect, it } from 'vitest';
import { csv, totals } from './model';
import type { Data, Entry } from './model';
import {
  saveEntry,
  selectReview,
  undoEntries,
  undoRecord,
  updateEntries,
} from './review';
const clients = [
  { id: 'a', name: 'Acme', color: '#987abc' },
  { id: 'b', name: 'Birch', color: '#416e83' },
];
const base: Entry = {
  id: 'e1',
  date: '2026-09-29',
  minutes: 60,
  clientId: 'a',
  billable: false,
  description: 'Weekly team planning',
  employee: 'Alex Morgan',
  reviewed: true,
};
const data = (): Data => ({
  version: 1,
  clients,
  entries: [
    base,
    { ...base, id: 'e2', clientId: 'b', billable: true, minutes: 30 },
    { ...base, id: 'e3', date: '2026-10-20' },
  ],
});
const filters = {
  week: '2026-09-28',
  clientId: 'all',
  employee: 'all',
  status: 'all',
  search: '',
};
describe('editing', () => {
  it('keeps review when nothing changed', () => {
    const saved = saveEntry(data(), { ...base }, undefined, base);
    expect(saved.entries.find((e) => e.id === 'e1')?.reviewed).toBe(true);
  });
  it('requires review again after a real change', () => {
    const saved = saveEntry(data(), { ...base, description: 'New' });
    expect(saved.entries.find((e) => e.id === 'e1')?.reviewed).toBe(false);
  });
});
describe('review actions', () => {
  it('clears review when client or billability really changes', () => {
    const out = updateEntries(data(), ['e1', 'e2'], { clientId: 'b' });
    expect(out.entries.find((e) => e.id === 'e1')?.reviewed).toBe(false);
    expect(out.entries.find((e) => e.id === 'e2')?.reviewed).toBe(true);
    const b = updateEntries(data(), ['e1'], { billable: true });
    expect(b.entries[0].reviewed).toBe(false);
  });
  it('lets an explicit reviewed patch win', () => {
    const out = updateEntries(data(), ['e1'], { reviewed: false });
    expect(out.entries[0].reviewed).toBe(false);
  });
});
describe('undo', () => {
  it('restores only affected entries and keeps independent work', () => {
    const before = data();
    const after = updateEntries(before, ['e1'], { clientId: 'b' });
    const op = undoRecord(before, after, ['e1']);
    const later: Data = {
      ...after,
      entries: after.entries.map((e) =>
        e.id === 'e2' ? { ...e, description: 'edited later' } : e,
      ),
    };
    const undone = undoEntries(later, op);
    expect(undone.entries.find((e) => e.id === 'e1')).toEqual(base);
    expect(undone.entries.find((e) => e.id === 'e2')?.description).toBe(
      'edited later',
    );
  });
  it('declines when an affected entry changed afterwards', () => {
    const before = data();
    const after = updateEntries(before, ['e1'], { clientId: 'b' });
    const op = undoRecord(before, after, ['e1']);
    const later: Data = {
      ...after,
      entries: after.entries.map((e) =>
        e.id === 'e1' ? { ...e, minutes: 5 } : e,
      ),
    };
    expect(() => undoEntries(later, op)).toThrow(/Cannot undo/);
  });
});
describe('review view', () => {
  it('totals and export use the same filtered rows', () => {
    const rows = selectReview(data().entries, clients, {
      ...filters,
      clientId: 'b',
    });
    expect(rows.map((e) => e.id)).toEqual(['e2']);
    expect(totals(rows).total).toBe(30);
    expect(csv(rows, clients).split('\r\n')).toHaveLength(2);
  });
});
