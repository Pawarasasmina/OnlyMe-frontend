/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiAlertCircle } from "react-icons/fi";
export default function ModerationFeedbackPanel({ status, feedback }) {
  __useUiLanguage(); if (!["CHANGES_REQUESTED", "REJECTED"].includes(status) || !feedback) return null; return <div className="rounded-2xl border border-orange-400/25 bg-orange-500/10 p-4 text-orange-100"><div className="flex items-center gap-2 font-bold"><FiAlertCircle /> {status === "REJECTED" ? __msg("content.rejectionFeedback") : __msg("content.changesRequested")}</div><p dir="auto" className="mt-2 whitespace-pre-wrap text-sm">{feedback}</p></div>; }
