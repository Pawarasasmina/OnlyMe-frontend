export const EMPTY_REVIEW_CHECKS = { evidence: false, violation: false, context: false, proportionate: false };

export function reviewIsComplete(checks) {
  return Object.keys(EMPTY_REVIEW_CHECKS).every((key) => checks[key]);
}
