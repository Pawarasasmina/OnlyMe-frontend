# Wall publishing restrictions

Implemented against the supplied web.html v113.479 and v113.492 and the requested checklist.

## Publishing

- Category is required by server validation on creation and draft publication.
- Rolling 24-hour limits: first seven days 2 notes; established accounts 5; Business profiles 1 Offering.
- New accounts cannot include links, including bare domains. Established accounts have one link per note.
- Contact numbers containing eight or more digits and messenger references (including plain Signal) are rejected in captions and prepared voice transcripts. Restriction errors use the specified prototype messages.
- Durable WallPublicationLog records survive deletion and archive. An atomic per-author reservation prevents concurrent requests exceeding quotas. Failed unpublished attempts release their reservation; accepted review holds consume quota.
- Same-account copies normalize Unicode, case, whitespace, punctuation and invisible separators. Exact recent cross-account copies are refused. Near-copies use word-shingle similarity and are held privately for human review. This is a heuristic detector, not a guarantee against every paraphrase.
- Bumps retain the existing atomic seven-day cooldown and three-bump maximum.

## Reports and visibility

- Three distinct qualifying reports hide a note pending review. Qualification defaults: active, non-test accounts aged at least seven days, fewer than three explicitly confirmed false Wall reports.
- A dismissal alone never counts as a false report. Moderators must explicitly confirm it; automated duplicate checks cannot penalize a reporter.
- Moderators can approve or reject copy holds and inspect matching text. Later suspicious edits reopen review.
- Held/hidden notes are filtered from public Wall, counts, previews, search, profiles, saved items, reposts, translation and message-sharing lookups. Authors can inspect held notes privately. Archive restoration cannot undo a moderation rejection.
- Popular/Nearby ranking lowers notes without a real profile photo, with upheld author reports resolved within the last 90 days, or with pending qualifying reports. The explicit Recent sort remains chronological. Personalization preserves the trust ordering.
- Readers can flag active Recommendations as “Outdated?”. Three distinct non-author readers trigger the author's “Still true?” prompt and lower ranking without closing the note. Confirmation resets those votes; cooldown and bump limits remain enforced. Test accounts do not contribute freshness votes.

## Verification

- Browser suite: `npx playwright test --config playwright.wall-publishing.config.js`
- Isolated MongoDB suites: `wallAntiSpam.integration.test.js` and `wallCreationConcurrency.integration.test.js`, enabled with `WALL_MONGO_INTEGRATION=1`. These use an isolated test database, not application data.
- Focused publishing, report, feed, saved, translation, profile and moderation UI tests pass.
- Production build passes. Existing lint warnings remain; changed files have no lint errors.
