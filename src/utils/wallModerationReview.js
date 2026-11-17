export function isAutomatedWallReview(report) {
  return report?.scope === "FEED_POST" && report.source === "AUTOMATED_DUPLICATE";
}

export function canMarkFalseWallReport(report, action) {
  return report?.scope === "FEED_POST" && (report.source || "USER_REPORT") === "USER_REPORT" && Boolean(report.reporter) && action === "NO_ACTION";
}

export function wallReviewDecision(report, action, falseReport) {
  return canMarkFalseWallReport(report, action) && falseReport ? { falseReport: true } : {};
}
