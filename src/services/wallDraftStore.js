// In-memory drafts retain File objects across route changes, but not browser refreshes.
let retained = null;
export function readWallDraft(owner) {
  if (retained?.owner !== owner) retained = null;
  return retained;
}
export function saveWallDraft(owner, draft) { retained = { owner, ...draft }; }
export function clearWallDraft() { retained = null; }
