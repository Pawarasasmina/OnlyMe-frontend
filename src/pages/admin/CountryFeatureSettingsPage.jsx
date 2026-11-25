import { FiGlobe, FiShield } from "react-icons/fi";
import AdminMonetizationPolicy from "../../components/financial/AdminMonetizationPolicy";

export default function CountryFeatureSettingsPage() {
  return <div className="mx-auto max-w-6xl">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-500"><FiGlobe /> Platform availability</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Country feature controls</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Turn platform features on or off for people in a country. Saved changes apply immediately without a new application release.</p>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
        <FiShield className="text-base" /> Enforced in UI and API
      </div>
    </header>
    <AdminMonetizationPolicy />
  </div>;
}
