import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useChapterCompletion } from "../../src/hooks/useChapterCompletion";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAnalyticsPage from "../../src/pages/admin/AdminAnalyticsPage";
import { useRecommendationTracking } from "../../src/hooks/useRecommendationTracking";

function Fixture() {
  const [chapter, setChapter] = useState(1);
  const video = new URLSearchParams(location.search).has("video");
  const skip = new URLSearchParams(location.search).has("skip");
  const skipRef = useRecommendationTracking({ entityId: "507f1f77bcf86cd799439011", entityType: "seen", enabled: skip });
  const completion = useChapterCompletion({ publicationId: "507f1f77bcf86cd799439011", chapterId: `chapter-${chapter}`, enabled: !skip });
  if (skip) return <><div ref={skipRef} style={{ height: 300 }}><h1>Video feed item</h1><video controls /></div><div style={{ height: 1500 }} /><p>Next feed item</p></>;
  return <><button onClick={() => setChapter(value => value + 1)}>Next chapter</button><article ref={completion.rootRef} key={chapter}>
    <h1>Chapter {chapter}</h1><div style={{ height: 1400 }}>Chapter content</div>
    {video ? <video controls /> : null}
    <div ref={completion.endRef} style={{ height: 1 }} /><p>End of chapter</p>
  </article></>;
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById("root")).render(<React.StrictMode>{new URLSearchParams(location.search).has("admin")
  ? <QueryClientProvider client={client}><MemoryRouter initialEntries={["/admin/analytics?tab=engagement"]}><AdminAnalyticsPage /></MemoryRouter></QueryClientProvider>
  : <Fixture />}</React.StrictMode>);
