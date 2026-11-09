import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiEdit3 } from "react-icons/fi";
import { publicationService as api } from "../../services/publicationService";

export default function AiSettingsPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["ai-seen-status"], queryFn: () => api.getAiSeenStatus().then((response) => response.data.data) });
  const status = query.data;
  return <main className="settings-index-page"><header className="settings-index-header"><button aria-label={__msg("settings.backToSettings")} onClick={() => navigate("/settings")} type="button"><FiArrowLeft /></button><h1>AI</h1></header>
    <section className="settings-index-group"><h2>{__msg("system.AiSettingsPage.f5e25a74d3")}</h2><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><FiEdit3 className="text-2xl text-atseen-blue" /><h3 className="mt-3 text-lg font-black">{__msg("system.AiSettingsPage.825d8f22e3")}</h3><p className="mt-2 text-sm leading-6 text-white/60">{__msg("system.AiSettingsPage.1ded5d7687")}</p>
      {query.isLoading ? <p className="mt-5 text-sm text-white/50">{__msg("system.AiSettingsPage.fdb3eb6ef5")}</p> : query.isError ? <p className="mt-5 text-sm text-atseen-danger">{__msg("system.AiSettingsPage.161baa1c5d")}</p> : <dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-black/20 p-3"><dt className="text-white/45">{__msg("system.AiSettingsPage.ec41f00052")}</dt><dd className="mt-1 text-xl font-black">{status.remaining}</dd></div><div className="rounded-xl bg-black/20 p-3"><dt className="text-white/45">{__msg("system.AiSettingsPage.e0213d0cc4")}</dt><dd className="mt-1 text-xl font-black">{status.dailyLimit}</dd></div><div className="rounded-xl bg-black/20 p-3"><dt className="text-white/45">{__msg("system.AiSettingsPage.1af95fc6b7")}</dt><dd className="mt-1 text-xl font-black">{status.maxTriesPerSeen}</dd></div><div className="rounded-xl bg-black/20 p-3"><dt className="text-white/45">{__msg("system.AiSettingsPage.da1a3c8018")}</dt><dd className="mt-1 text-xs font-bold">{new Intl.DateTimeFormat(__uiLocale(),{hour:"numeric",minute:"2-digit"}).format(new Date(status.resetAt))}</dd></div></dl>}
    </div></section>
    <section className="settings-index-group"><h2>{__msg("system.AiSettingsPage.b1a02f8990")}</h2><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-sm leading-6 text-white/60"><p>{__msg("system.AiSettingsPage.3472e65a7f")}</p><p className="mt-3">{__msg("system.AiSettingsPage.f750a251ad")}</p></div></section>
  </main>;
}
