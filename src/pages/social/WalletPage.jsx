import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronRight, FiClock, FiShoppingBag, FiStar } from "react-icons/fi";
import { Link } from "react-router-dom";
import LedgerList from "../../components/financial/LedgerList";
import WalletBalance from "../../components/financial/WalletBalance";
import { walletService } from "../../services/walletService";

// Beta-only switch. Set to false (or remove the mask below) to restore the wallet UI.
const WALLET_BETA_MASK_ENABLED = true;

function WalletAccessLink({ count, description, icon: Icon, label, to }) {
  return <Link className="group flex items-center gap-4 rounded-2xl border border-atseen-line bg-atseen-surface p-5 transition hover:border-atseen-blue/50 hover:bg-atseen-blue/[0.04]" to={to}>
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-atseen-blue/10 text-xl text-atseen-blue"><Icon /></span>
    <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong>{label}</strong><span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-atseen-muted">{count}</span></span><span className="mt-1 block text-sm text-atseen-muted">{description}</span></span>
    <FiChevronRight className="shrink-0 text-atseen-muted transition group-hover:translate-x-0.5 group-hover:text-atseen-blue" />
  </Link>;
}

export default function WalletPage() {
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), retry: false });
  const ledger = useQuery({ queryKey: ["wallet-ledger", 1], queryFn: () => walletService.getLedger({ page: 1, limit: 10 }).then((response) => response.data.data), retry: false });
  const entitlements = useQuery({ queryKey: ["world-entitlements"], queryFn: () => walletService.getWorldEntitlements().then((response) => response.data.data.items), retry: false });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), retry: false });

  return <div className="relative min-h-[560px]">
    {WALLET_BETA_MASK_ENABLED ? <div className="absolute inset-0 z-20 flex items-start justify-center rounded-3xl bg-atseen-bg/90 px-5 pt-20 text-center backdrop-blur-md sm:pt-28" role="status">
      <div className="w-full max-w-md rounded-3xl border border-atseen-line bg-atseen-surface p-8 shadow-2xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-atseen-blue/10 text-3xl text-atseen-blue"><FiClock /></span>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-atseen-blue">Coming soon</p>
        <h1 className="mt-2 text-3xl font-black">Wallet integration</h1>
        <p className="mt-3 text-sm leading-6 text-atseen-muted">We’re preparing a secure and seamless wallet experience. Wallet features will become available after the beta release.</p>
        <Link className="mt-7 inline-flex items-center gap-2 rounded-full border border-atseen-line px-5 py-2.5 text-sm font-bold transition hover:border-atseen-blue/50 hover:text-atseen-blue" to="/profile"><FiArrowLeft /> Back to Profile</Link>
      </div>
    </div> : null}
    <div aria-hidden={WALLET_BETA_MASK_ENABLED} className={WALLET_BETA_MASK_ENABLED ? "pointer-events-none select-none opacity-20 blur-sm" : ""}>
    <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/profile"><FiArrowLeft /> Back to Profile</Link>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-atseen-blue">Wallet</p><h1 className="mt-2 text-3xl font-black">Your Stars</h1><p className="mt-2 text-sm text-atseen-muted">Stars purchase is not available yet. Wallets are currently funded manually by the platform administrator.</p></div><button className="rounded-full border border-atseen-line px-4 py-2 opacity-50" disabled>Buy Stars unavailable</button></div>
    <section className="mt-6 rounded-2xl border border-atseen-line bg-atseen-surface p-6"><p className="text-xs text-atseen-muted">Available balance</p>{wallet.isError ? <p className="mt-2 text-2xl font-black text-atseen-muted">Unavailable</p> : <div className="mt-2"><WalletBalance /></div>}<p className="mt-3 text-xs text-atseen-muted">{wallet.data ? `Wallet version ${wallet.data.version} · Updated from the server` : "No balance is assumed when the service is unavailable."}</p></section>
    <section className="mt-6"><h2 className="font-black">Wallet activity</h2><p className="mt-1 text-sm text-atseen-muted">Open your purchase history or manage Premium memberships.</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><WalletAccessLink count={entitlements.isError ? "Unavailable" : entitlements.data?.length || 0} description="View your purchased Worlds" icon={FiShoppingBag} label="Purchases" to="/purchases" /><WalletAccessLink count={memberships.isError ? "Unavailable" : memberships.data?.length || 0} description="Manage Premium access and renewals" icon={FiStar} label="Memberships" to="/memberships" /></div></section>
    <section className="mt-6 rounded-2xl border border-atseen-line bg-atseen-surface p-5"><div className="flex justify-between"><h2 className="font-black">Recent ledger activity</h2><Link className="text-xs font-bold text-atseen-blue" to="/wallet/ledger">View all</Link></div><LedgerList error={ledger.isError} items={ledger.data?.items} loading={ledger.isLoading} /></section>
    </div>
  </div>;
}
