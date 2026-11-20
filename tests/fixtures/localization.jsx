import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CommentAuthorIdentity, CommentReplyMention } from "../../src/components/comments/CommentIdentity";
import { activateLanguage, loadLanguage, msg } from "../../src/i18n/runtime.js";
import "../../src/index.css";

const language = new URLSearchParams(location.search).get("lang") || "ar";
await loadLanguage(language);
await activateLanguage(language);
document.documentElement.lang = language;
document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
const author = { id: "liam", username: "liam.carter" };
createRoot(document.getElementById("root")).render(<BrowserRouter><main>
  <p data-testid="identity"><span>{msg("creator.thisMonth")} </span><CommentAuthorIdentity author={author} /><span> {msg("creator.freeForever")}</span></p>
  <p data-testid="reply"><CommentReplyMention author={author} replyingAuthor={{ id: "other" }} /></p>
  <p data-testid="world">{msg("profile.sWorld_9663ba", { value0: "Liam" })}</p>
  <p data-testid="paid">{msg("system.ProfileContentGrid.645017bd05")} 190</p>
  <p data-testid="month">+4 {msg("creator.thisMonth")}</p>
</main></BrowserRouter>);
