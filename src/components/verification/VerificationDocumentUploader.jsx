import { useMemo, useRef, useState } from "react";
import { FiFile, FiTrash2, FiUploadCloud } from "react-icons/fi";
import ProtectedDocumentPreview from "./ProtectedDocumentPreview";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

function formatSize(size = 0) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function VerificationDocumentUploader({ documentType, label, metadata, imageOnly = false, disabled, busy, onDelete, onUpload }) {
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
      setError(imageOnly ? "Choose a JPEG, PNG, or WebP image." : "Choose a JPEG, PNG, WebP, or PDF file.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("The file must be 10 MB or smaller.");
      return;
    }
    setProgress(1);
    try {
      await onUpload(file, (eventProgress) => setProgress(eventProgress.total ? Math.round((eventProgress.loaded * 100) / eventProgress.total) : 1));
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || "Document upload failed.");
    } finally {
      setProgress(0);
    }
  };

  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0"><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-brand-mist/50">{imageOnly ? "JPEG, PNG or WebP" : "JPEG, PNG, WebP or PDF"} · maximum 10 MB</p>
        {metadata ? <div className="mt-3 flex items-start gap-2 text-sm text-brand-mist/75"><FiFile className="mt-0.5 shrink-0 text-brand-secondary" /><div className="min-w-0"><p className="truncate font-medium text-white">{metadata.originalName}</p><p className="text-xs">{metadata.mimeType} · {formatSize(metadata.size)}</p></div></div> : <p className="mt-3 text-sm text-brand-mist/45">No document uploaded.</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2"><input accept={accept} className="sr-only" disabled={disabled || busy} onChange={choose} ref={inputRef} type="file" /><button className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-40" disabled={disabled || busy} onClick={() => inputRef.current?.click()} type="button"><FiUploadCloud />{metadata ? "Replace" : "Upload"}</button>{metadata ? <button aria-label={`Delete ${label}`} className="inline-flex items-center gap-2 rounded-full border border-red-400/25 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-40" disabled={disabled || busy} onClick={onDelete} type="button"><FiTrash2 />Delete</button> : null}</div>
    </div>
    {progress ? <div aria-label={`Upload ${progress}% complete`} className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand-primary transition-all" style={{ width: `${progress}%` }} /></div> : null}
    {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    {metadata ? <div className="mt-3"><ProtectedDocumentPreview documentType={documentType} metadata={metadata} /></div> : null}
  </section>;
}

export default VerificationDocumentUploader;
