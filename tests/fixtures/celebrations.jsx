import ProfileContentGrid from "../../src/components/profile/ProfileContentGrid";
import { AuthContext } from "../../src/context/AuthContext";
import PublishBanner from "../../src/components/publication/PublishBanner";
import UploadProgress from "../../src/components/publication/UploadProgress";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import PurchaseWorldModal from "../../src/components/financial/PurchaseWorldModal";
import JoinPremiumModal from "../../src/components/financial/JoinPremiumModal";
import PublishMoment, { JoinMoment } from "../../src/components/publication/SuccessMoment";
import "../../src/index.css";

const params = new URLSearchParams(window.location.search);
const publication = { introMedia: params.has("voice") ? { secureUrl: "/owner-hello.webm", mediaType: "VOICE" } : undefined, id: "paid", title: "A small journey", kind: "SEEN", ownerCount: Number(params.get("owners") || 0), pricing: { mode: "ONE_TIME", starsAmount: 190 }, creator: { id: "creator", name: "Lina" }, ownerWelcomeNote: "Welcome. Start with the next chapter.", chapters: [{ stableChapterId: "preview", title: "Before", isPreview: true }, { stableChapterId: "paid", title: "Inside", locked: true }] };
export default function Fixture() {
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState(null);
  const [bannerVisible, setBannerVisible] = useState(true);
  const location = useLocation();
  const welcome = result && !result.alreadyActive && !result.queued;
  if (params.has("grid")) return <AuthContext.Provider value={{ user: { id: "creator" } }}><div id="publish-grid-scroll" style={{ height: 400, overflowY: "auto", width: 440, maxWidth: "100%" }}><div style={{ height: 1500 }} /><ProfileContentGrid owner kind="seens" content={[{ id: "new", status: "PUBLISHED", title: "A small journey", chapters: [], pricing: { mode: "FREE" } }]} highlightSeenId="new" /></div></AuthContext.Provider>;
  if (params.has("progress")) return <UploadProgress progress={params.get("progress") === "unknown" ? undefined : Number(params.get("progress"))} />;
  const banner = params.has("banner") && bannerVisible ? <PublishBanner publication={{ ...publication, updated: params.has("updated"), aiBonusGranted: params.has("reward") }} onDismiss={() => setBannerVisible(false)} onNotify={value => setResult(value)} /> : null;
  return <><p data-testid="route">{location.pathname}{location.search}</p><p data-testid="result">{JSON.stringify(result)}</p>{params.has("publish") ? open ? <PublishMoment message="Now it can be seen" onComplete={() => setOpen(false)} /> : <><p>Published destination</p>{banner}</> : params.has("join") ? <JoinPremiumModal open={open} onClose={() => setOpen(false)} publication={publication} onSuccess={payload => { setResult(payload || {}); setOpen(false); }} /> : <PurchaseWorldModal open={open} onClose={() => setOpen(false)} publication={publication} onSuccess={() => setResult({ refreshed: true })} />}{params.has("join") && welcome ? <JoinMoment><p>World welcome</p></JoinMoment> : null}</>;
}
createRoot(document.getElementById("root")).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Fixture /></MemoryRouter></QueryClientProvider>);
