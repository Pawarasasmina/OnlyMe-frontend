import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { businessService as api } from "../../services/businessService";
function Dispute({ item }) {
  const [resolution, setResolution] = useState("");
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: () => api.resolve(item._id, resolution), onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "support-inbox"] }) });
  return <article className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">{item.service}</h2><p className="mt-2 text-sm">Booking {item._id} · {new Date(item.scheduledAt).toLocaleString()} · {item.price} {item.currency}</p><p className="text-sm">Customer: @{item.customer?.username} · Business: @{item.business?.username}</p><p className="mt-3 whitespace-pre-wrap">{item.dispute.reason}</p>{item.dispute.resolvedAt ? <p className="mt-3 rounded-xl bg-green-50 p-3">Resolution: {item.dispute.resolution}</p> : <form className="mt-4" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><label className="block text-sm font-bold">Support resolution<textarea className="mt-1 w-full rounded-xl border bg-white p-3" required minLength={3} maxLength={2000} value={resolution} onChange={e => setResolution(e.target.value)} /></label><p className="my-2 text-xs text-slate-500">Record the outcome agreed with the customer and business. Resolving here does not process a payment or refund.</p><button className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-40" disabled={mutation.isPending}>Resolve dispute</button></form>}{mutation.isError && <p role="alert" className="text-red-700">{mutation.error.response?.data?.message || "Unable to resolve dispute"}</p>}</article>;
}
export default function BusinessSupportInboxPage() {
  const [resolved, setResolved] = useState(false);
  const query = useQuery({ queryKey: ["admin", "support-inbox", resolved], queryFn: () => api.inbox(resolved) });
  return <main className="mx-auto max-w-5xl space-y-5 text-slate-900"><h1 className="text-3xl font-black">Support inbox</h1><p className="text-sm text-slate-500">Booking disputes submitted by customers and businesses.</p><label className="flex gap-2"><input type="checkbox" checked={resolved} onChange={e => setResolved(e.target.checked)} />Show resolved disputes</label>{query.isPending && <p>Loading disputes…</p>}{query.isError && <p role="alert">Unable to load support inbox. <button onClick={() => query.refetch()}>Retry</button></p>}{query.data?.items.length === 0 && <p>No {resolved ? "resolved" : "open"} booking disputes.</p>}{query.data?.items.map(item => <Dispute key={item._id} item={item} />)}</main>;
}
