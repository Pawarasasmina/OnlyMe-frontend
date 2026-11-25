import { useState } from "react";

function EvidenceMedia({kind,media}) {
  const [failed,setFailed] = useState(false);
  if (!media?.assetId && !media?.url) return null;
  if (!media.url || failed) return <p role="status" className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{kind === "audio" ? "Voice note" : kind === "video" ? "Video circle" : "Photo"} could not be loaded. Reopen this report to retry.</p>;
  if (kind === "image") return <img alt="Reported photo evidence" className="mt-3 max-h-96 max-w-full rounded-xl object-contain" src={media.url} onError={()=>setFailed(true)} />;
  if (kind === "audio") return <audio aria-label="Reported voice note" className="mt-3 w-full" controls preload="metadata" src={media.url} onError={()=>setFailed(true)} />;
  return <video aria-label="Reported video circle" className="mt-3 aspect-square w-full max-w-80 rounded-2xl bg-black object-contain" controls playsInline preload="metadata" src={media.url} onError={()=>setFailed(true)} />;
}

export default function MessageEvidencePreview({report}) {
  const snapshot = report.snapshot || {};
  const rows = snapshot.messages || (snapshot.messageId || snapshot.body ? [snapshot] : []);
  return <div className="space-y-3">
    <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">{snapshot.evidenceVersion ? "Frozen evidence: preserved separately from the chat. Disappearing or deleting the original does not remove this evidence." : "Legacy report: captured content is shown below. Media availability depends on the original stored asset."}</p>
    {snapshot.frozenAt && <p className="text-xs text-slate-500">Captured {new Date(snapshot.frozenAt).toLocaleString()}</p>}
    {rows.map((row,index)=><article className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={row.messageId || index}>
      {row.disappearAfterSeconds != null && <span className="mb-2 inline-block rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold">Disappearing message</span>}
      <p className="whitespace-pre-wrap break-words text-sm text-slate-900">{row.body}</p>
      {["image","audio","video"].map(kind=><EvidenceMedia key={kind} kind={kind} media={row[kind]} />)}
    </article>)}
    {snapshot.context?.length > 0 && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold">Captured conversation context</summary><div className="mt-3 space-y-3">{snapshot.context.filter(row=>!row.reported).map((row,index)=><article className="rounded-lg bg-slate-50 p-3" key={row.messageId || index}><p className="whitespace-pre-wrap break-words text-sm">{row.body}</p>{["image","audio","video"].map(kind=><EvidenceMedia key={kind} kind={kind} media={row[kind]} />)}</article>)}</div></details>}
  </div>;
}
