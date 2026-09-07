export const SAVED_PEOPLE_DETAIL_TITLE = "Favorite Creators";
export const SAVED_PEOPLE_EMPTY_STATE = "Follow creators to keep them close.";

export function savedPeopleCount(counts = {}) {
  return Number(counts.people) || 0;
}

export function followInvalidationKeys() {
  return [
    ["unified-profile"],
    ["saved"],
    ["discover"],
    ["search"],
    ["orbit"],
  ];
}
