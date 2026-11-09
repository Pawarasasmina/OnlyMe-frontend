import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useMemo, useRef, useState } from "react";
import { FiFile, FiTrash2, FiUploadCloud } from "react-icons/fi";
import ProtectedDocumentPreview from "./ProtectedDocumentPreview";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

function formatSize(size = 0) {
  return size < 1024 * 1024 ? __msg("verification.value0Kb", { value0: Math.max(1, Math.round(size / 1024)) }) : __msg("posts.value0Mb", { value0: (size / 1024 / 1024).toFixed(1) });
}

function VerificationDocumentUploader({ documentType, label, metadata, imageOnly = false, disabled, busy, onDelete, onUpload }) {
  __useUiLanguage();
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const accept = useMemo(() => imageOnly ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf", [imageOnly]);

  const choose = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!ACCEPTED.includes(file.type) || (imageOnly && file.type === "application/pdf")) {
      setError(imageOnly ? __msg("verification.chooseAJpegPngOrWebpImage") : __msg("verification.chooseAJpegPngWebpOrPdfFile"));
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(__msg("verification.theFileMustBe10MbOrSmaller"));
      return;
    }
    setProgress(1);
    try {
      await onUpload(file, (eventProgress) => setProgress(eventProgress.total ? Math.round((eventProgress.loaded * 100) / eventProgress.total) : 1));
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || __msg("verification.documentUploadFailed"));
    } finally {
      setProgress(0);
    }
  };

  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0"><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-brand-mist/50">{imageOnly ? __msg("verification.jpegPngOrWebp") : __msg("verification.jpegPngWebpOrPdf")} {__msg("verification.maximum10Mb")}</p>
        {metadata ? <div className="mt-3 flex items-start gap-2 text-sm text-brand-mist/75"><FiFile className="mt-0.5 shrink-0 text-brand-secondary" /><div className="min-w-0"><p className="truncate font-medium text-white">{metadata.originalName}</p><p className="text-xs">{metadata.mimeType} · {formatSize(metadata.size)}</p></div></div> : <p className="mt-3 text-sm text-brand-mist/45">{__msg("verification.noDocumentUploaded")}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2"><input accept={accept} className="sr-only" disabled={disabled || busy} onChange={choose} ref={inputRef} type="file" /><button className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-40" disabled={disabled || busy} onClick={() => inputRef.current?.click()} type="button"><FiUploadCloud />{metadata ? __msg("profile.replace") : __msg("profile.upload")}</button>{metadata ? <button aria-label={__msg("verification.delete", { value0: label })} className="inline-flex items-center gap-2 rounded-full border border-red-400/25 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-40" disabled={disabled || busy} onClick={onDelete} type="button"><FiTrash2 />{__msg("posts.delete")}</button> : null}</div>
    </div>
    {progress ? <div aria-label={__msg("verification.uploadComplete", { value0: progress })} className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand-primary transition-all" style={{ width: `${progress}%` }} /></div> : null}
    {error ? <p className="mt-3 text-sm text-red-300">{__systemMessage(error)}</p> : null}
    {metadata ? <div className="mt-3"><ProtectedDocumentPreview documentType={documentType} metadata={metadata} /></div> : null}
  </section>;
}

export default VerificationDocumentUploader;
