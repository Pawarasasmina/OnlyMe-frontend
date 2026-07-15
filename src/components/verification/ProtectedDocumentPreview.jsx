import { useEffect, useState } from "react";
import { FiExternalLink, FiEye, FiX } from "react-icons/fi";
import { verificationService } from "../../services/verificationService";

function ProtectedDocumentPreview({ documentType, metadata }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const load = async () => {
    if (objectUrl) return;
    setLoading(true);
    setError("");
    try {
      const response = await verificationService.getDocument(documentType);
      setObjectUrl(URL.createObjectURL(response.data));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this protected document.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl("");
  };

  if (!metadata) return null;
  const isPdf = metadata.mimeType === "application/pdf";

  return <div className="space-y-3">
    {!objectUrl ? <button className="inline-flex items-center gap-2 text-sm font-semibold text-brand-secondary hover:text-white disabled:opacity-50" disabled={loading} onClick={load} type="button"><FiEye />{loading ? "Loading protected preview..." : "View protected document"}</button> : null}
    {error ? <p className="text-xs text-red-300">{error}</p> : null}
    {objectUrl && isPdf ? <div className="flex flex-wrap gap-3"><a className="inline-flex items-center gap-2 text-sm font-semibold text-brand-secondary" href={objectUrl} rel="noreferrer" target="_blank"><FiExternalLink /> Open PDF</a><button aria-label="Close document preview" className="text-brand-mist/60" onClick={close} type="button"><FiX /></button></div> : null}
    {objectUrl && !isPdf ? <div className="relative max-w-md overflow-hidden rounded-2xl border border-white/10"><img alt="Protected verification document" className="max-h-72 w-full object-contain bg-black/20" src={objectUrl} /><button aria-label="Close document preview" className="absolute right-2 top-2 rounded-full bg-black/70 p-2" onClick={close} type="button"><FiX /></button></div> : null}
  </div>;
}

export default ProtectedDocumentPreview;
