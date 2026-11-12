import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/context/AuthContext";
import FeedPost from "../../src/components/fanWeb/home/FeedPost";
import { SeenFeedItem } from "../../src/pages/social/SeenFeedPage";
import "../../src/index.css";
const user = { id: "507f1f77bcf86cd799439011", name: "Max", username: "max", role: "fan" };
const author = { id: "507f1f77bcf86cd799439012", name: "Lina", username: "lina" };
const initial = { id: "507f1f77bcf86cd799439013", author, creator: author, title: "Test Seen", text: "A Wall note", context: "Question", postType: "Question", createdAt: new Date().toISOString(), chapters: [], engagement: {}, viewerState: {} };
function Fixture() {
  const [item, setItem] = useState(initial);
  return <main className="social-center-scroll" style={{ width: "min(100%,550px)", height: "100dvh", margin: "auto" }}>{location.search.includes("wall") ? <FeedPost post={initial} /> : <SeenFeedItem animateOnScroll={false} currentUser={user} item={item} onFeedUpdate={(_id, next) => setItem(current => ({ ...current, ...next }))} onFeedReplace={(_id, next) => setItem(next)} />}</main>;
}
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user }}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false } } })}><BrowserRouter><Fixture /></BrowserRouter></QueryClientProvider></AuthContext.Provider>);
