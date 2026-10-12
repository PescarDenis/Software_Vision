import type { Client, Data, Entry } from './model';
import { addDays, validateEntry } from './model';

export type ReviewFilters = {
  week: string;
  clientId: string;
  employee: string;
  status: string;
  search: string;
};
export type EntryPatch = Partial<
  Pick<Entry, 'clientId' | 'billable' | 'reviewed'>
>;
export type UndoRecord = { before: Entry[]; after: Entry[] };

export function selectWeek(entries: Entry[], week: string) {
  return entries.filter(
    (entry) => entry.date >= week && entry.date <= addDays(week, 6),
  );
}
export function selectReview(
  entries: Entry[],
  clients: Client[],
  filters: ReviewFilters,
) {
  return selectWeek(entries, filters.week)
    .filter(
      (entry) =>
        (filters.clientId === 'all' || entry.clientId === filters.clientId) &&
        (filters.employee === 'all' || entry.employee === filters.employee) &&
        (filters.status === 'all' ||
          !!entry.reviewed === (filters.status === 'reviewed')) &&
        `${entry.description} ${clients.find((c) => c.id === entry.clientId)?.name ?? ''} ${entry.employee}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.employee.localeCompare(b.employee) ||
        a.id.localeCompare(b.id),
    );
}
export function applyEntryUpdate(previous: Entry, next: Entry): Entry {
  const changed =
    previous.date !== next.date ||
    previous.minutes !== next.minutes ||
    previous.clientId !== next.clientId ||
    previous.billable !== next.billable ||
    previous.description !== next.description ||
    previous.employee !== next.employee;
  return { ...next, reviewed: changed ? false : previous.reviewed };
}
export function saveEntry(
  data: Data,
  entry: Entry,
  client?: Client,
  original?: Entry,
): Data {
  const previous = data.entries.find((e) => e.id === entry.id);
  if (
    original &&
    (!previous || JSON.stringify(previous) !== JSON.stringify(original))
  )
    throw new Error(
      'This entry changed while you were editing. Close and reopen it to use the latest version.',
    );
  const clients = client ? [...data.clients, client] : data.clients;
  validateEntry(entry, clients);
  return {
    ...data,
    clients,
    entries: [
      ...data.entries.filter((e) => e.id !== entry.id),
      previous
        ? applyEntryUpdate(previous, entry)
        : { ...entry, reviewed: false },
    ],
  };
}
export function updateEntries(
  data: Data,
  ids: string[],
  patch: EntryPatch,
): Data {
  const selected = new Set(ids);
  if (ids.some((id) => !data.entries.some((e) => e.id === id)))
    throw new Error('An entry no longer exists. Refresh your selection.');
  return {
    ...data,
    entries: data.entries.map((entry) => {
      if (!selected.has(entry.id)) return entry;
      const merged = { ...entry, ...patch };
      // A meaningful correction needs a fresh review unless the patch sets it.
      if (
        patch.reviewed === undefined &&
        (merged.clientId !== entry.clientId ||
          merged.billable !== entry.billable)
      )
        merged.reviewed = false;
      validateEntry(merged, data.clients);
      return merged;
    }),
  };
}
export function undoRecord(
  before: Data,
  after: Data,
  ids: string[],
): UndoRecord {
  const pick = (data: Data) =>
    data.entries.filter((entry) => ids.includes(entry.id));
  return { before: pick(before), after: pick(after) };
}
export function undoEntries(data: Data, operation: UndoRecord): Data {
  const changedSince = operation.after.some((expected) => {
    const current = data.entries.find((e) => e.id === expected.id);
    return !current || JSON.stringify(current) !== JSON.stringify(expected);
  });
  if (changedSince)
    throw new Error(
      'Cannot undo: one of those entries was changed or removed after the action. Review it manually.',
    );
  const restore = new Map(operation.before.map((e) => [e.id, e]));
  return {
    ...data,
    entries: data.entries.map((e) => restore.get(e.id) ?? e),
  };
}
