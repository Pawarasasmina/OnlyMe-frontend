import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/context/AuthContext";
import StoryViewer from "../../src/components/stories/StoryViewer";
import "../../src/index.css";
const groups = ["Lina", "Mia", "Zoe"].map((name, person) => Array.from({ length: person === 0 ? 2 : 1 }, (_, i) => ({ id: `${person}-${i}`, ownerId: `person-${person}`, owner: { id: `person-${person}`, name, username: name.toLowerCase() }, caption: `${name} story ${i + 1}`, image: "/illustrations/empty-feed.svg", mediaUrl: "/illustrations/empty-feed.svg", mediaType: "image", duration: 30, createdAt: new Date().toISOString() })));
function Fixture() {
  const [person, setPerson] = useState(0), [open, setOpen] = useState(false);
  return <main className="social-center-scroll" style={{ width: "min(100%,550px)", height: "100dvh", margin: "auto" }}><button onClick={() => setOpen(true)}>Open stories</button><StoryViewer previewOnly stories={groups[person]} isOpen={open} onClose={() => setOpen(false)} onComplete={() => setPerson(p => Math.min(2, p + 1))} onPreviousComplete={() => setPerson(p => Math.max(0, p - 1))} /></main>;
}
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user: { id: "viewer", role: "fan" } }}><QueryClientProvider client={new QueryClient()}><BrowserRouter><Fixture /></BrowserRouter></QueryClientProvider></AuthContext.Provider>);
