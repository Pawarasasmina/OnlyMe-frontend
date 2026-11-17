import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/context/AuthContext";
import FeedPost from "../../src/components/fanWeb/home/FeedPost";
import "../../src/index.css";

const profile = new URLSearchParams(location.search).has("profile");
const author = { id: "author", name: "Lina", username: "lina" };
const posts = [0, 1, 3].map((commentCount, index) => ({
  id: `fixture-${index}`, author, text: "A note from our neighbourhood. A clean thread with room to read.",
  postType: "Question", publishedAt: new Date().toISOString(), commentCount, media: [],
  reactorPreviews: [{ id: "one", name: "Maya" }, { id: "two", name: "Alex" }],
}));
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={client}><MemoryRouter><AuthContext.Provider value={{ user: { id: "viewer", username: "viewer" } }}>
    <main className={profile ? "profile-prototype" : ""} style={{ maxWidth: 600, margin: "auto", padding: "0 16px" }}>
      <div className={profile ? "profile-wall-section profile-notes-list" : "home-feed-list"}>
        {posts.map(post => <FeedPost key={post.id} post={post} profileNote={profile} />)}
      </div>
    </main>
  </AuthContext.Provider></MemoryRouter></QueryClientProvider>,
);
