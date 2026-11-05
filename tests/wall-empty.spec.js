import { test, expect } from "@playwright/test";

const user = { id: "507f1f77bcf86cd799439011", name: "Wall Fixture", username: "wallfixture", role: "fan", city: "Fixture City", onboarding: { status: "completed" } };
async function fixture(page, { path = "/wall?topic=kids_family&location=UAE&country=AE", fail = false, posts = [], delayed = false, needData, sharePeople = [] } = {}) {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.addInitScript(value => {
    localStorage.setItem("onlyme_access_token", "wall_fixture_token");
    localStorage.setItem("onlyme_cached_user", JSON.stringify(value));
  }, user);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, warnings: [], count: 0, unreadCount: 0 };
    if (url.pathname.endsWith("/messages/share/recipients")) data = { people: sharePeople };
    if (url.pathname.endsWith("/auth/me")) data = { user };
    if (url.pathname.endsWith("/profile/me") || url.pathname.endsWith("/profiles/me")) data = { user, profile: { city: "Fixture City" } };
    if (url.pathname.endsWith("/posts/need-counts")) data = needData || { previews: {}, counts: {}, topicCounts: {} };
    if (url.pathname.endsWith("/posts")) {
      if (delayed) await pending;
      if (fail) return route.fulfill({ status: 503, json: { message: "Fixture unavailable" } });
      data = { items: posts, pagination: { page: 1, pages: 1, total: posts.length } };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto(path);
  return release;
}

for (const width of [1440, 393]) {
  test(`empty topic matches prototype and actions preserve scope at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page);
    const empty = page.locator(".wall-empty-state");
    await expect(empty.getByRole("heading")).toHaveText("Quiet in UAE — for now");
    await expect(empty.locator(".wall-empty-label")).toHaveText("Kids & Family");
    await expect(empty.locator(".wall-empty-video")).toHaveJSProperty("muted", true);
    await expect(empty.locator(".wall-empty-write")).toHaveCSS("background-color", "rgb(156, 203, 255)");
    await empty.scrollIntoViewIfNeeded();
    expect(await empty.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `tmp/wall-empty-${width}.png`, fullPage: true });
    await empty.getByRole("button", { name: "See everything nearby" }).click();
    await expect(page).not.toHaveURL(/topic=/);
    await expect(page).toHaveURL(/location=UAE/);
    await empty.getByRole("button", { name: "Go worldwide" }).click();
    await expect(page).not.toHaveURL(/location=|near=|country=/);
    await expect(empty.getByRole("heading")).toHaveText("Quiet in the world — for now");
    await empty.getByRole("button", { name: "Write the first post" }).click();
    await expect(page.locator(".wall-need-picker")).toBeVisible();
  });
}

test("type CTA opens the selected post type and topic without dropping location", async ({ page }) => {
  await fixture(page, { path: "/wall?type=question&topic=kids_family&location=UAE" });
  await expect(page.locator(".wall-empty-state h3")).toHaveText("No questions yet");
  await page.locator(".wall-empty-write").click();
  await expect(page.locator(".wall-create-header h1")).toHaveText("Question");
  await expect(page.locator(".wall-create-screen")).toContainText("Kids & Family");
  await expect(page.locator(".wall-create-screen")).toContainText("UAE");
});

test("loading and API failures do not render an empty result", async ({ page }) => {
  const release = await fixture(page, { delayed: true, fail: true });
  await expect(page.locator(".wall-empty-state")).toHaveCount(0);
  release();
  await expect(page.locator(".home-feed-error")).toBeVisible();
  await expect(page.locator(".wall-empty-state")).toHaveCount(0);
});

test("a populated feed does not render the empty card", async ({ page }) => {
  await fixture(page, { posts: [{ id: "507f1f77bcf86cd799439012", author: user, text: "A real Wall post", postType: "Question", comments: [], media: [], publishedAt: new Date().toISOString() }] });
  await expect(page.getByText("A real Wall post", { exact: true })).toBeVisible();
  await expect(page.locator(".wall-empty-state")).toHaveCount(0);
});

test("need cards render distinct profile photos for both API ID formats", async ({ page }) => {
  const previews = [
    { text: "A real active note", author: { id: "one", name: "One", avatar: "/one.jpg" } },
    { text: "Another note by One", author: { id: "one", name: "One", avatar: "/one.jpg" } },
    { text: "A second author", author: { _id: "two", name: "Two", profilePhoto: "/two.jpg" } },
    { text: "A third author", author: { id: "three", displayName: "Three", avatarUrl: "/three.jpg" } },
  ];
  await fixture(page, { needData: { counts: { right_now: 4 }, topicCounts: { meet_people: 4 }, previews: { right_now: previews, meet_people: previews } } });
  for (const name of ["Right now", "Meet people"]) {
    const card = page.locator(".wall-explore-track .wall-explore-card").filter({ has: page.getByText(name, { exact: true }) });
    await expect(card).toContainText("4 active");
    await expect(card).toContainText("A real active note");
    await expect(card.locator(".fan-avatar")).toHaveCount(3);
    await expect(card.locator(".fan-avatar").first()).toHaveCSS("width", "18px");
  }
});

for (const width of [1440, 393]) {
  test(`Wall prompt opens editor first and back changes category without losing draft at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page, { path: "/wall?location=UAE" });
    const prompt = page.locator(".home-composer-trigger > button");
    await prompt.click();
    await expect(page.locator(".wall-create-header h1")).toHaveText("Need help");
    await expect(page.getByRole("textbox", { name: "Note text" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Attach image", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record voice note", exact: true })).toBeVisible();
    await expect(page.locator(".wall-compose-settings")).toContainText("UAE");
    await page.getByRole("textbox", { name: "Note text" }).fill("Keeping this draft while I choose a category");
    const settings = page.locator(".wall-compose-settings button");
    await settings.nth(2).click();
    for (const label of ["Offering", "Looking for", "Need help", "Buy & Sell", "Question", "Recommendation", "Event"]) {
      await page.getByRole("button", { name: "Back to needs", exact: true }).click();
      await expect(page.locator(".wall-need-picker h1")).toHaveText("What do you need today?");
      await page.locator(".wall-need-card").filter({ has: page.getByText(label, { exact: true }) }).click();
      await expect(page.locator(".wall-create-header h1")).toHaveText(label);
      await expect(page.getByRole("textbox", { name: "Note text" })).toHaveValue("Keeping this draft while I choose a category");
      await expect(settings.nth(1)).toContainText("UAE");
      await expect(settings.nth(2)).toHaveAttribute("aria-pressed", "true");
    }
    await page.getByRole("button", { name: "Back to needs", exact: true }).click();
    await page.getByRole("button", { name: "Close need picker", exact: true }).click();
    await prompt.click();
    await expect(page.locator(".wall-create-header h1")).toHaveText("Event");
    await expect(page.getByRole("textbox", { name: "Note text" })).toHaveValue("Keeping this draft while I choose a category");
  });

  test(`three independent Wall filters survive reload and Explore navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page, { path: "/wall?location=UAE&country=AE" });
    const card = name => page.locator(".wall-explore-track .wall-explore-card").filter({ has: page.locator("strong", { hasText: new RegExp(`^${name}$`) }) });
    await card("Right now").click();
    await card("Meet people").click();
    await card("Need help").click();
    for (const name of ["Right now", "Meet people", "Need help"]) await expect(card(name)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".wall-feed-heading h2")).toHaveText("Right now · Need help · Meet people");
    let query = new URL(page.url()).searchParams;
    expect([query.get("rightNow"), query.get("type"), query.get("topic")]).toEqual(["true", "need_help", "meet_people"]);
    await page.reload();
    for (const name of ["Right now", "Meet people", "Need help"]) await expect(card(name)).toHaveAttribute("aria-pressed", "true");
    await card("Right now").click();
    await expect(card("Right now")).toHaveAttribute("aria-pressed", "false");
    await expect(card("Need help")).toHaveAttribute("aria-pressed", "true");
    await expect(card("Meet people")).toHaveAttribute("aria-pressed", "true");
    await card("Right now").click();
    await page.getByRole("link", { name: "Explore all needs", exact: true }).click();
    await page.locator(".wall-explore-page-grid").first().getByRole("button", { name: /Offering/ }).click();
    await expect(page.locator(".wall-feed-heading h2")).toHaveText("Right now · Offering · Meet people");
    await expect(card("Offering")).toHaveAttribute("aria-pressed", "true");
    await expect(card("Need help")).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    query = new URL(page.url()).searchParams;
    expect([query.has("rightNow"), query.has("type"), query.has("topic")]).toEqual([false, false, false]);
    expect(query.get("location")).toBe("UAE");
    expect(query.get("country")).toBe("AE");
  });
}

for (const width of [1440, 393]) {
  test(`note comments and threaded replies match prototype at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const author = { id: "507f1f77bcf86cd799439015", name: "Sofia Marin", username: "sofia" };
    const comment = { id: "507f1f77bcf86cd799439016", text: "The public library has a quiet room.", author, reactionCount: 2 };
    let post = { id: "507f1f77bcf86cd799439012", author, text: "Where can we meet to study?", postType: "Need Help", comments: [comment], commentCount: 1, media: [], reactorPreviews: [author], reactions: [{ reaction: "love", count: 1 }], publishedAt: new Date().toISOString() };
    await fixture(page, { path: "/wall", posts: [post] });
    await page.route(`**/api/posts/${post.id}/comments**`, async route => {
      const body = route.request().postDataJSON();
      if (route.request().method() === "POST") {
        expect(body.parentCommentId).toBe(comment.id);
        post = { ...post, commentCount: 2, comments: [...post.comments, { id: "507f1f77bcf86cd799439017", author: user, text: body.text, parentCommentId: body.parentCommentId }] };
      } else {
        post = { ...post, comments: post.comments.map(item => item.id === comment.id ? { ...item, viewerReaction: body.reaction, reactionCount: body.reaction ? 3 : 2 } : item) };
      }
      await route.fulfill({ json: { success: true, data: { post } } });
    });
    const note = page.locator(".home-feed-post").first();
    await expect(note.locator(".home-feed-text")).toHaveCSS("font-size", "15.5px");
    await expect(note.locator(".home-feed-text")).toHaveCSS("font-weight", "400");
    await expect(note.locator(".wall-reactor-faces")).toBeVisible();
    await expect(note.locator(".wall-join-label")).toHaveText("I can help");
    await note.getByRole("button", { name: "Open comments", exact: true }).click();
    const row = note.locator(`[data-comment-id="${comment.id}"]`);
    await expect(row.locator(".seen-comment-copy > p")).toHaveCSS("font-size", "12.5px");
    await expect(row.locator(".seen-comment-copy > p")).toHaveCSS("font-weight", "400");
    await row.getByRole("button", { name: "Reply", exact: true }).click();
    const input = note.getByRole("textbox", { name: "Reply to Sofia Marin" });
    await expect(input).toBeFocused();
    await input.fill("Good idea. I can book it for Saturday.");
    await note.getByRole("button", { name: "Post", exact: true }).click();
    await expect(note.locator(".wall-comment-thread")).toContainText("Good idea. I can book it for Saturday.");
    await expect(note.locator(".wall-reply-target")).toHaveCount(0);
    await row.getByRole("button", { name: "React to Sofia Marin's reply", exact: true }).click();
    await page.locator(".wall-reaction-tray button[title='Love']").click();
    await expect(row.getByRole("button", { name: "React to Sofia Marin's reply", exact: true })).toHaveAttribute("aria-pressed", "true");
    // Keep the app's 16px mobile input rule to avoid iOS focus zoom.
    await expect(note.locator(".wall-comments-panel form input")).toHaveCSS("font-size", width < 440 ? "16px" : "12.5px");
    expect(await note.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `tmp/wall-comments-${width}.png`, fullPage: true });
  });
}

for (const width of [1440, 393]) {
  test(`Buy and Sell availability bump sold and reopen flow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const post = { id: "507f1f77bcf86cd799439018", author: user, text: "Selling a coffee machine, 250 AED. Pickup in Marina.", postType: "Buy & Sell", context: "Buy/Sell", isOwner: true, canResolve: true, canBump: true, publishedAt: new Date(Date.now() - 15 * 86400000).toISOString(), comments: [{ id: "507f1f77bcf86cd799439019", author: { id: "507f1f77bcf86cd799439020", name: "Maya", username: "maya" }, text: "Can I collect tomorrow?" }], commentCount: 1, reactions: [{ reaction: "love", count: 2 }], media: [] };
    await fixture(page, { path: "/wall?type=buy_sell", posts: [post] });
    await page.route(`**/api/posts/${post.id}/bump`, async route => {
      expect(route.request().method()).toBe("POST");
      Object.assign(post, { canBump: false, bumpedAt: new Date().toISOString() });
      await route.fulfill({ json: { success: true, data: { post } } });
    });
    await page.route(`**/api/posts/${post.id}`, route => route.fulfill({ json: { success: true, data: { post } } }));
    await page.route(`**/api/posts/${post.id}/resolution`, async route => {
      const { solved } = route.request().postDataJSON();
      Object.assign(post, { resolvedAt: solved ? new Date().toISOString() : null, isClosed: solved, closedReason: solved ? "resolved" : "" });
      await route.fulfill({ json: { success: true, data: { post } } });
    });
    const note = page.locator(".home-feed-post").first();
    const availability = note.locator(".wall-note-availability");
    await expect(availability).toContainText("Still available?");
    await expect(availability).toContainText("Posted 15d ago");
    await expect(availability.locator("strong")).toHaveCSS("font-size", "13.5px");
    await expect(availability.getByRole("button", { name: "Yes, bump" })).toHaveCSS("color", "rgb(156, 203, 255)");
    expect(await availability.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `tmp/wall-buy-sell-${width}.png`, fullPage: true });
    await availability.getByRole("button", { name: "Yes, bump" }).click();
    await expect(availability).toHaveCount(0);
    await note.getByRole("button", { name: "Mark as sold", exact: true }).click();
    await expect(note.locator(".wall-note-meta")).toContainText("Sold");
    await expect(page).toHaveURL(new RegExp(`/wall\\?note=${post.id}`));
    await expect(note.locator(".wall-post-type-link svg")).toHaveCount(1);
    await expect(note.locator(".wall-post-type-link")).toHaveCSS("color", "rgb(143, 221, 175)");
    await page.reload();
    await expect(note.locator(".wall-note-meta")).toContainText("Sold");
    await note.getByRole("button", { name: "Open comments", exact: true }).click();
    await expect(note).toContainText("Can I collect tomorrow?");
    await expect(note.locator(".wall-comments-panel form input")).toBeEnabled();
    await expect(note.locator(".wall-replies-closed")).toHaveCount(0);
    await note.getByRole("button", { name: /More actions for/ }).click();
    await page.getByRole("button", { name: /^Reopen/ }).click();
    await expect(note.locator(".wall-note-meta")).toContainText("Buy & Sell");
    if (await note.getByRole("button", { name: "Open comments", exact: true }).getAttribute("aria-expanded") === "false") await note.getByRole("button", { name: "Open comments", exact: true }).click();
    await expect(note.locator(".wall-comments-panel form input")).toBeEnabled();
    await expect(note).toContainText("Can I collect tomorrow?");
    await expect(note.locator(".home-reaction-capsule strong")).toHaveText("2");
  });
}

test("buyer sees a Buy and Sell note without owner availability controls", async ({ page }) => {
  await fixture(page, { path: "/wall?type=buy_sell", posts: [{ id: "507f1f77bcf86cd799439018", author: { id: "507f1f77bcf86cd799439020", name: "Maya", username: "maya" }, postType: "Buy & Sell", text: "Selling a bicycle, 200 AED", canBump: false, canResolve: false, publishedAt: new Date(Date.now() - 15 * 86400000).toISOString(), media: [], comments: [] }] });
  await expect(page.getByText("Selling a bicycle, 200 AED", { exact: true })).toBeVisible();
  await expect(page.locator(".wall-note-availability")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark as sold", exact: true })).toHaveCount(0);
});

for (const width of [1440, 393]) {
  test(`Your note menu matches all six prototype actions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const post = { id: "507f1f77bcf86cd799439018", author: user, text: "Owner note menu fixture", postType: "Buy & Sell", isOwner: true, canResolve: true, resolvedAt: new Date().toISOString(), isClosed: true, closedReason: "resolved", comments: [], media: [], publishedAt: new Date().toISOString() };
    await fixture(page, { path: "/wall", posts: [post] });
    await page.route(`**/api/posts/${post.id}/share`, async route => {
      expect(route.request().method()).toBe("PUT");
      Object.assign(post, { viewerShared: !post.viewerShared, shareCount: post.viewerShared ? 0 : 1 });
      await route.fulfill({ json: { success: true, data: { post } } });
    });
    const more = page.getByRole("button", { name: /More actions for/ }).first();
    await more.click();
    const sheet = page.locator(".home-post-more-sheet");
    await expect(sheet.locator(".home-post-more-title")).toHaveText("Your note");
    await expect(sheet.locator(".home-post-more-list > button strong")).toHaveText(["Reopen", "Add to your story", "Repost to my profile", "Share", "Archive", "Delete note"]);
    await expect(sheet.locator('[data-action="resolution"] small')).toHaveText("Back among active posts");
    await expect(sheet.locator('[data-action="resolution"] svg')).toHaveCSS("color", "rgb(143, 221, 175)");
    await expect(sheet.locator('[data-action="repost"] strong')).toHaveCSS("font-size", "13.5px");
    await sheet.locator('[data-action="repost"]').click();
    await expect(sheet).toHaveCount(0);
    await more.click();
    await expect(sheet.locator('[data-action="repost"] strong')).toHaveText("Remove from profile");
    await sheet.locator('[data-action="repost"]').click();
    await more.click();
    await expect(sheet.locator('[data-action="repost"] strong')).toHaveText("Repost to my profile");
    await sheet.locator('[data-action="delete"]').click();
    await expect(page.getByRole("heading", { name: "Delete note", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("Owner note menu fixture", { exact: true })).toBeVisible();
    await more.click();
    await sheet.locator('[data-action="share"]').click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Share/, exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: "Instagram", exact: true }).click();
    const preview = page.locator(".instagram-save-content");
    await expect(preview.locator("img")).toHaveAttribute("src", /^data:image\/png;base64,/);
    await expect(preview.getByRole("link", { name: "Save picture", exact: true })).toHaveAttribute("download", "seen-note.png");
    await expect(preview).toContainText("Then open Instagram");
  });
}

for (const width of [1440, 393]) {
  test(`need picker uses prototype charcoal surfaces and icons at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page, { path: "/wall" });
    await page.locator(".home-composer-trigger > button").click();
    await page.getByRole("button", { name: "Back to needs", exact: true }).click();
    const picker = page.locator(".wall-need-picker");
    await expect(picker).toHaveCSS("background-color", "rgb(10, 12, 15)");
    const cards = picker.locator(".wall-need-card");
    await expect(cards).toHaveCount(7);
    await page.mouse.move(0, 0);
    await expect(cards.first()).toHaveCSS("background-color", /rgba\(255, 255, 255, 0\.04[35]\)/);
    await expect(cards.first()).toHaveCSS("min-height", "0px");
    await expect(cards.first().locator("strong")).toHaveCSS("font-size", "15.5px");
    await expect(cards.first().locator("span")).toHaveCSS("font-weight", "400");
    await expect(cards.first().locator("svg")).toHaveCSS("color", "rgb(156, 203, 255)");
    await expect(cards.nth(4).locator("svg path")).toHaveCount(3);
    await expect(picker.locator("h1")).toHaveCSS("font-size", width < 480 ? "26px" : "28px");
    expect(await picker.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `tmp/wall-picker-${width}.png`, fullPage: true });
  });
}

test("a sold note allows posting a threaded reply without reopening", async ({ page }) => {
  const comment = { id: "507f1f77bcf86cd799439019", author: { id: "507f1f77bcf86cd799439020", name: "Maya", username: "maya" }, text: "Can you share the model name?" };
  const post = { id: "507f1f77bcf86cd799439018", author: user, text: "Sold bicycle", postType: "Buy & Sell", isClosed: true, resolvedAt: new Date().toISOString(), comments: [comment], commentCount: 1, media: [] };
  await fixture(page, { path: "/wall", posts: [post] });
  await page.route(`**/api/posts/${post.id}/comments`, async route => {
    const body = route.request().postDataJSON();
    expect(body.parentCommentId).toBe(comment.id);
    post.comments.push({ id: "507f1f77bcf86cd799439021", author: user, text: body.text, parentCommentId: body.parentCommentId });
    post.commentCount = 2;
    await route.fulfill({ json: { success: true, data: { post } } });
  });
  const note = page.locator(".home-feed-post").first();
  await note.getByRole("button", { name: "Open comments", exact: true }).click();
  await expect(note.locator(".wall-replies-closed")).toHaveCount(0);
  await note.getByRole("button", { name: "Reply", exact: true }).click();
  await note.getByRole("textbox", { name: "Reply to Maya" }).fill("It is the folding model from last year.");
  await note.getByRole("button", { name: "Post", exact: true }).click();
  await expect(note.locator(".wall-comment-thread")).toContainText("It is the folding model from last year.");
  await expect(note.locator(".wall-note-meta")).toContainText("Sold");
});

for (const width of [1440, 393]) {
  test(`Wall share sheet matches prototype preview grid and horizontal actions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const picture = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#24344f"/></svg>');
    const sharePeople = ["Lina", "Mia", "Zoe", "Ethan", "Anna", "Omar", "Sofia", "Luca"].map((name, i) => ({ id: `507f1f77bcf86cd7994390${31 + i}`, name, username: name.toLowerCase(), avatarUrl: picture }));
    const post = { id: "507f1f77bcf86cd799439018", author: user, text: "Selling my coffee machine, barely used. Includes all pods. Pickup in Marina.", postType: "Buy & Sell", comments: [], media: [{ type: "image", url: picture }] };
    await fixture(page, { path: "/wall", posts: [post], sharePeople });
    await page.getByRole("button", { name: "Send post", exact: true }).click();
    const sheet = page.locator(".share-sheet-overlay.is-wall-share");
    await expect(sheet.locator(".share-recipient-item")).toHaveCount(8);
    await expect(sheet.locator(".share-chat-copy strong")).toContainText("Selling my coffee machine");
    await expect(sheet.locator(".share-chat-copy > span")).toHaveText("Note");
    await expect(sheet.locator(".share-chat-copy strong")).toHaveCSS("font-size", "13.5px");
    await expect(sheet.locator(".share-chat-avatar")).toBeHidden();
    await expect(sheet.locator(".share-chat-card")).toHaveCSS("background-color", "rgb(27, 34, 48)");
    await expect(sheet.locator(".share-recipient-ring").first()).toHaveCSS("width", "58px");
    const sizes = await sheet.evaluate(el => {
      const panel = el.querySelector('.share-sheet-panel').getBoundingClientRect();
      const card = el.querySelector('.share-chat-card').getBoundingClientRect();
      const row = el.querySelector('.share-external-row');
      return { ratio: card.width / (panel.width - 40), rightGap: panel.right - card.right, scroll: row.scrollWidth > row.clientWidth };
    });
    expect(sizes.ratio).toBeCloseTo(.84, 2);
    expect(sizes.rightGap).toBeCloseTo(20, 0);
    await expect(sheet.locator(".share-external-row")).toHaveCSS("display", "flex");
    await expect(sheet.locator(".share-external-action small")).toHaveText(["Story", "Instagram", "Copy link", "WhatsApp", "Telegram", "Messages", "More"]);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tmp/wall-share-${width}.png`, fullPage: true });
    await sheet.getByRole("button", { name: "Select Lina", exact: true }).click();
    await expect(sheet.locator(".share-message-row")).toBeVisible();
    await expect(sheet.locator(".share-external-row")).toHaveCount(0);
    await page.route("**/api/messages/share", async route => {
      const body = route.request().postDataJSON();
      expect(body.recipientIds).toEqual([sharePeople[0].id]);
      expect(body.sharedContent.contentId).toBe(post.id);
      await route.fulfill({ json: { success: true, data: { sent: [{ recipientId: sharePeople[0].id }], failed: [] } } });
    });
    await sheet.locator(".share-message-row input").fill("Thought you might like this.");
    await sheet.getByRole("button", { name: "Send", exact: true }).click();
    await expect(sheet).toHaveCount(0);
  });
}

for (const width of [1440, 393]) {
  test(`note Story actions open the prototype text card at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const post = { id: "507f1f77bcf86cd799439018", author: user, text: "Selling my Nespresso Vertuo - barely used, all pods included. 250 AED, pickup in Marina.", location: "Dubai", postType: "Buy & Sell", isOwner: true, canResolve: true, comments: [], media: [] };
    await fixture(page, { path: "/wall", posts: [post] });
    await page.getByRole("button", { name: "Send post", exact: true }).click();
    await page.locator(".share-sheet-overlay").getByRole("button", { name: "Story", exact: true }).click();
    const stage = page.locator(".story-composer-stage.is-wall-note");
    await expect(stage).toBeVisible();
    const card = stage.locator(".story-shared-card-preview");
    await expect(card).toContainText("NOTE");
    await expect(card).toContainText("Dubai");
    await expect(card.locator("strong")).toHaveText(post.text);
    await expect(card.locator("small")).toContainText("from my Wall");
    await expect(card.locator("img")).toHaveCount(0);
    await expect(card.locator("strong")).toHaveCSS("font-size", "14px");
    await expect(card.locator("strong")).toHaveCSS("font-weight", "400");
    await expect(card).toHaveCSS("max-width", "258px");
    await expect(card.locator(".wall-note-story-byline")).toContainText("Wall");
    await expect(card.locator(".wall-note-story-byline .fan-avatar")).toHaveCount(1);
    await card.click();
    await expect(card).toHaveAttribute("aria-expanded", "true");
    await expect(card.locator("strong")).toHaveCSS("font-size", "13px");
    await card.press("Enter");
    await expect(card).toHaveAttribute("aria-expanded", "false");
    await expect(stage.getByRole("button", { name: "Mention people", exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `tmp/wall-story-${width}.png`, fullPage: true });
    await stage.getByRole("button", { name: "Close Story composer", exact: true }).click();
    await expect(page).toHaveURL(/\/wall/);
    await page.getByRole("button", { name: /More actions for/ }).first().click();
    await page.locator('.home-post-more-sheet [data-action="story"]').click();
    await expect(stage).toBeVisible();
    await expect(card.locator("strong")).toHaveText(post.text);
    let uploaded = false;
    await page.route("**/api/stories", async route => {
      const body = route.request().postDataBuffer().toString("utf8");
      expect(body).toContain('"kind":"note"');
      expect(body).toContain(`/wall?note=${post.id}`);
      expect(body).toContain('"displayMode":"text_only"');
      expect(body).toContain(post.text);
      uploaded = true;
      await route.fulfill({ json: { success: true, data: { story: { id: "507f1f77bcf86cd799439022", author: user, mediaUrl: "/fixture.png" } } } });
    });
    await stage.getByRole("button", { name: "Share", exact: true }).click();
    await expect(stage).toHaveCount(0);
    expect(uploaded).toBe(true);
  });
}

test("story note card toggles long text on tap but not drag and credits original author", async ({ page }) => {
  const text = "Selling my road bike, serviced last month. " + "Includes helmet, lights, lock and receipts. ".repeat(6);
  const avatar = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="blue"/></svg>');
  const author = { id: "507f1f77bcf86cd799439020", name: "Omar Haddad", username: "omar", avatar };
  await fixture(page, { path: "/wall", posts: [{ id: "507f1f77bcf86cd799439018", author, text, location: "Dubai", postType: "Buy & Sell", comments: [], media: [] }] });
  await page.getByRole("button", { name: "Send post", exact: true }).click();
  await expect(page.locator('.share-external-action').filter({ hasText: 'Story' }).locator('svg')).toHaveCSS('width', '19px');
  await page.locator(".share-sheet-overlay").getByRole("button", { name: "Story", exact: true }).click();
  const card = page.locator(".story-composer-stage.is-wall-note .story-shared-card-preview");
  await expect(card.locator(".wall-note-story-byline")).toContainText("Omar");
  await expect(card.locator(".wall-note-story-byline")).toContainText("Dubai");
  await expect(card.locator(".wall-note-story-byline img")).toHaveAttribute("src", avatar);
  await expect(card.locator("strong")).not.toHaveText(text);
  await card.click();
  await expect(card.locator("strong")).toHaveText(text);
  const bounds = await card.boundingBox();
  await page.mouse.move(bounds.x + 30, bounds.y + 30);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 60, bounds.y + 60, { steps: 5 });
  await page.mouse.up();
  await expect(card).toHaveAttribute("aria-expanded", "true");
  await card.click();
  await expect(card).toHaveAttribute("aria-expanded", "false");
  await expect(card.locator("strong")).not.toHaveText(text);
});
