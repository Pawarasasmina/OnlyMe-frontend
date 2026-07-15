import { useEffect, useState } from "react";
import { FiExternalLink, FiEye, FiFile, FiX, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { adminVerificationService } from "../../services/adminVerificationService";

function AdminProtectedDocumentViewer({ verificationId, documentType, label, metadata }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await adminVerificationService.getDocument(verificationId, documentType);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      const url = URL.createObjectURL(response.data);
      setObjectUrl(url);
      if (metadata.mimeType !== "application/pdf") setOpen(true);
    } catch (requestError) {
      setError(requestError.response?.status === 404 ? "Document file is unavailable." : "Unable to load the protected document.");
    } finally { setLoading(false); }
  };

  if (!metadata) return <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500"><p className="font-semibold text-slate-700">{label}</p><p className="mt-1">Not submitted</p></div>;
  const isPdf = metadata.mimeType === "application/pdf";

  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><FiFile /></span><div className="min-w-0"><p className="font-bold text-slate-900">{label}</p><p className="mt-1 truncate text-xs text-slate-500">{metadata.originalName}</p><p className="mt-1 text-xs text-slate-400">{metadata.mimeType} · {(metadata.size / 1024 / 1024).toFixed(2)} MB</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={loading} onClick={load} type="button"><FiEye />{loading ? "Loading..." : isPdf ? "Load PDF" : "Preview"}</button>{isPdf && objectUrl ? <a className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700" href={objectUrl} rel="noreferrer" target="_blank"><FiExternalLink />Open protected PDF</a> : null}</div>{error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    {open && objectUrl ? <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 p-4" role="dialog" aria-modal="true" aria-label={`${label} preview`}><div className="flex items-center justify-between text-white"><p className="font-bold">{label}</p><div className="flex gap-2"><button aria-label="Zoom out" className="rounded-lg bg-white/10 p-2" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} type="button"><FiZoomOut /></button><button aria-label="Zoom in" className="rounded-lg bg-white/10 p-2" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} type="button"><FiZoomIn /></button><button aria-label="Close preview" className="rounded-lg bg-white/10 p-2" onClick={() => { setOpen(false); setZoom(1); }} type="button"><FiX /></button></div></div><div className="mt-4 flex flex-1 items-center justify-center overflow-auto"><img alt={`${label} protected preview`} className="max-h-full max-w-full origin-center object-contain transition-transform" src={objectUrl} style={{ transform: `scale(${zoom})` }} /></div></div> : null}
  </article>;
}

export default AdminProtectedDocumentViewer;
