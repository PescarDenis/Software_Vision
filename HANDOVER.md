# Release handover

## Changed

Fixed the three reports in Weekly review, plus one workflow improvement.

- **Alex:** the edit form always reset Billable to on. It now starts from the entry's value (`EntryForm.tsx`).
- **Sofia, numbers:** totals and **Export view** used the whole week. They now use the filtered rows (`ReviewPage.tsx`).
- **Sofia, corrections:** bulk "move to client" and "mark (non-)billable" left entries reviewed. A real change now returns the entry to review; unchanged values and explicit review actions do not (`review.ts`).
- **Sofia, Undo:** Undo restored a snapshot of all data, erasing newer work. It now restores only the affected entries and declines with an explanation if one changed since (`review.ts`).
- **Workflow:** changing week or filters clears the selection and says so, so actions only touch visible rows. A "Show N left to check" link filters to unreviewed entries.

## Verified

- `npm run check` on Node 24: 31 unit tests pass (7 new in `src/review.test.ts`) and the build passes.
- `npm run test:e2e`: 10 of 10 pass, including axe checks.
- Walked each report in Chrome on the pilot week: totals match rows, export contains only filtered rows, billable preserved, moved entry returns to Needs review, Undo works and is declined after a conflicting edit, selection clears.
- Not tested: before-fix runs (diagnosed from code), native Safari, Replace-and-restore dialog (I loaded the fixture into localStorage), the quick-filter link has no unit test.
- Node 26 fails 5 existing persistence tests (`localStorage` undefined in jsdom). That is an environment problem; use Node 24.

## Remaining

- Dark theme and repeat-yesterday's-entry deferred. Neither is part of the review workflow, and dark theme risks contrast regressions.
- Undo covers only the last action, and it refuses rather than merges on conflict.
- Review state is not tracked per field, so any edit to a reviewed entry needs review again.

## Release recommendation

Yes, to the local pilot. The reported defects are fixed and covered by tests. Limits: single browser, no multi-user sync.

## AI use

Claude Code (Sonnet 5.5) read the code, proposed root causes and wrote the changes. I checked each cause against the source and reproduced the behaviour in the browser. One correction: the first browser script matched "shareholder" case-sensitively, found nothing, and I re-ran it rather than trusting a partial result.
