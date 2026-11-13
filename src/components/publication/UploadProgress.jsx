import { createPortal } from "react-dom";
import { msg } from "../../i18n/runtime";
import { useLanguage } from "../../hooks/useLanguage";
import "./PublishBanner.css";

export default function UploadProgress({ progress }) {
  useLanguage();
  if (progress === null) return null;
  return createPortal(<div className="publication-upload"><div aria-label={msg("creator.uploadingMedia")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number.isFinite(progress) ? progress : undefined} className={`publication-upload-track ${Number.isFinite(progress) ? "" : "is-indeterminate"}`} role="progressbar"><i style={Number.isFinite(progress) ? { width: `${Math.max(0, Math.min(100, progress))}%` } : undefined} /></div><span role="status">{msg("creator.uploadingMedia")}{Number.isFinite(progress) ? ` ${progress}%` : ""}</span></div>, document.body);
}
