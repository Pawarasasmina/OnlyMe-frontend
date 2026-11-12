import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/context/AuthContext";
import StoriesRow from "../../src/components/stories/StoriesRow";
import "../../src/index.css";
const user = { id: "507f1f77bcf86cd799439011", role: "fan", name: "Max", username: "max" };
const items = ["Lina", "Mia", "Zoe"].map((name, i) => {
  const owner = { id: `507f1f77bcf86cd79943902${i}`, name, username: name.toLowerCase() };
  return { id: owner.id, user: owner, hasUnseenStories: true, stories: [{ id: `507f1f77bcf86cd79943903${i}`, owner, ownerId: owner.id, caption: `${name} story`, mediaUrl: "/illustrations/empty-feed.svg", image: "/illustrations/empty-feed.svg", mediaType: "image", viewed: false, createdAt: new Date().toISOString() }] };
});
const client = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false } } });
client.setQueryData(["wall-stories", user.id, ""], { viewer: { ...user, stories: [] }, items });
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user }}><QueryClientProvider client={client}><BrowserRouter><main className="social-center-scroll" style={{ width: "min(100%,550px)", height: "100dvh", margin: "auto" }}><StoriesRow currentUser={user} /></main></BrowserRouter></QueryClientProvider></AuthContext.Provider>);
