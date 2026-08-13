import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import { Link } from "react-router-dom";
import { walletService } from "../../services/walletService";

export default function PurchasesPage() {
  const q = useQuery({ queryKey: ["world-entitlements"], queryFn: () => walletService.getWorldEntitlements().then((response) => response.data.data.items), retry: false });

  return <div>
    <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/wallet"><FiArrowLeft /> Back to Wallet</Link>
    <h1 className="text-3xl font-black">Purchased Worlds</h1>
    <p className="mt-2 text-sm text-atseen-muted">One-time World purchase history from your authenticated account.</p>
    {q.isLoading ? <p className="mt-6">Loading purchases…</p> : q.isError ? <p className="mt-6 text-red-300">Purchase history is unavailable.</p> : q.data.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2">{q.data.map((item) => <article className="overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface" key={item.id}>{item.publication?.coverMedia?.secureUrl ? <img alt="" className="aspect-video w-full object-cover" src={item.publication.coverMedia.secureUrl} /> : null}<div className="p-4"><h2 className="font-black">{item.publication?.title || "World unavailable"}</h2><p className="mt-1 text-xs text-atseen-muted">Paid ✦{item.purchasedStars} · {new Date(item.grantedAt).toLocaleDateString()}</p><p className={`mt-2 text-sm font-bold ${item.status === "ACTIVE" ? "text-emerald-300" : "text-red-300"}`}>{item.status}</p>{item.status === "ACTIVE" && item.publication ? <Link className="mt-4 inline-block rounded-full bg-atseen-blue px-4 py-2 text-xs font-bold text-atseen-bg" to={`/world/${item.publication._id || item.publication.id}`}>Open World</Link> : <p className="mt-3 text-xs text-atseen-muted">Access is no longer active. Purchase history is retained.</p>}</div></article>)}</div> : <p className="mt-6 rounded-2xl border border-dashed border-atseen-line p-10 text-center text-atseen-muted">No World purchases yet.</p>}
  </div>;
}
