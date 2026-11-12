import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/context/AuthContext";
import MemberTicket from "../../src/components/profile/MemberTicket";
import StoryCreator from "../../src/components/stories/StoryCreator";
import "../../src/index.css";
const user = { id: "507f1f77bcf86cd799439011", name: "Max Carter", username: "max", role: "fan", memberNumber: 1292, createdAt: "2026-11-11T08:00:00Z" };
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function StoryHarness() {
  const location = useLocation();
  const [open, setOpen] = React.useState(true);
  const [saved, setSaved] = React.useState(null);
  return <><StoryCreator initialContent={location.state?.storyDraft} isOpen={open} mode="compose" onClose={() => setOpen(false)} onSave={({ file, editorMetadata }) => setSaved({ url: URL.createObjectURL(file), editorMetadata, size: file.size })} />{saved ? <><img alt="Saved ticket story" src={saved.url} /><pre data-testid="saved-story">{JSON.stringify(saved)}</pre></> : null}</>;
}
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user }}><QueryClientProvider client={client}><BrowserRouter><main className="social-center-scroll profile-copy" style={{ width: "min(100%,550px)", height: "100dvh", margin: "auto" }}><Routes><Route path="/create" element={<StoryHarness />} /><Route path="*" element={<h1><MemberTicket profile={{ ...user, city: "Dubai" }} /></h1>} /></Routes></main></BrowserRouter></QueryClientProvider></AuthContext.Provider>);
