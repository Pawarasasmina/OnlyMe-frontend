import { test, expect } from "@playwright/test";

const viewer = "507f1f77bcf86cd799439011", recipient = "507f1f77bcf86cd799439012";
async function fixture(page, incoming = false) {
  const participant = { id: recipient, displayName: "Mia Tanaka", name: "Mia Tanaka", username: "mia", role: "fan" };
  const message = { id: "invitation-message", senderId: viewer, recipientId: recipient, body: "Shared a invitation", mediaType: "text", createdAt: new Date().toISOString(), disappearAfterSeconds: null, sharedContent: { contentType: "invitation", contentId: viewer, title: "Max invited you to @seen", previewText: "Real stories from real people. Join me there.", route: "/invite/f-max-test", author: { id: viewer, name: "Max Carter", username: "max" } } };
  if (incoming) { message.senderId = recipient; message.recipientId = viewer; }
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    let data = { items: [], groups: [], windows: [], people: [], calls: [] };
    if (path.endsWith("/landing")) data = { inviter: { name: "Max Carter", username: "max" }, joinedCount: 1284, fanNumber: 1285, previews: [{ id: "one", title: "Morning Espresso Ritual", coverUrl: "/illustrations/empty-feed.svg", resourceType: "image" }] };
    if (path.endsWith("/join")) data = { username: "max", number: 1285 };
    if (path === "/api/messages/conversations") data = { conversations: [{ id: recipient, type: "direct", status: "ACTIVE", participant, lastMessage: message }] };
    if (path === `/api/messages/conversations/${recipient}`) data = { participant, messages: [message], conversation: { status: "ACTIVE" }, blockStatus: {}, pageInfo: { hasMore: false } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/tests/fixtures/invitation-messages.html");
}
test("inbox shows invitation link title and chat uses the prototype card", async ({ page }) => {
  await fixture(page, true);
  await page.getByRole("button", { name: /Mia Tanaka.*Link/ }).click();
  const card = page.getByRole("button", { name: "Open invitation: Max invited you to @seen" });
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS("width", "244px");
  await expect(card.locator(".invitation-message-hero>.fan-avatar")).toHaveCSS("width", "64px");
  await expect(card.locator("b")).toHaveCSS("font-size", "13.5px");
  await expect(card.getByText("Real stories from real people. Join me there.")).toBeVisible();
  await expect(card.getByText("atseen.com", { exact: true })).toBeVisible();
  await expect(page.getByText("Shared a invitation", { exact: true })).toHaveCount(0);
  await expect(page.locator(".has-invitation-card")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.screenshot({ path: test.info().outputPath("invitation-chat.png") });
  await card.click();
  await expect(page).toHaveURL(/\/invitations\/f-max-test$/);
  await expect(page.getByRole("heading", { name: "Step into Max’s world" })).toBeVisible();
  await expect(page.getByText("1,284 joined through Max")).toBeVisible();
  await expect(page.getByText(/#1,285, only you see it/)).toBeVisible();
  await expect(page.getByText("Morning Espresso Ritual")).toBeVisible();
  await page.getByRole("button", { name: "Close invitation" }).click();
  await expect(page).toHaveURL(/\/messages\?with=/);
  await page.getByRole("button", { name: "Open invitation: Max invited you to @seen" }).click();
  await page.getByRole("button", { name: "Join Max", exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/max$/);
});

test("sender invitation card has no click or keyboard action", async ({ page }) => {
  await fixture(page);
  await expect(page.getByText("You: ↪ Link — Max invited you to @seen", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Mia Tanaka.*Link/ }).click();
  const card = page.locator(".invitation-message-card.is-outgoing");
  await expect(card).toBeVisible();
  await expect(page.getByRole("button", { name: "Open invitation: Max invited you to @seen" })).toHaveCount(0);
  await expect(card).not.toHaveAttribute("tabindex");
  const url = page.url();
  await card.click();
  await expect(page).toHaveURL(url);
});
