import { msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { canMarkFalseWallReport, isAutomatedWallReview } from "../../utils/wallModerationReview.js";

export default function WallReportReviewFields({ report, action, falseReport, onChange }) {
  useLanguage();
  if (isAutomatedWallReview(report)) return <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">{msg("admin.wallReview.automatedExplanation")}</p>;
  if (!canMarkFalseWallReport(report, action)) return null;
  return <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
    <input checked={falseReport} className="mt-1" onChange={event => onChange(event.target.checked)} type="checkbox" />
    <span><b>{msg("admin.wallReview.falseReport")}</b><small className="mt-1 block text-slate-500">{msg("admin.wallReview.falseReportExplanation")}</small></span>
  </label>;
}
