import { test, expect } from "@playwright/test";
const recipient = "507f1f77bcf86cd799439012";
async function setup(page, group = false) {
 
 const user={id:"507f1f77bcf86cd799439011",name:"Max Carter",username:"max",role:"fan",onboarding:{status:"completed"}};
 await page.addInitScript(user=>{localStorage.setItem("onlyme_access_token","chat-fixture");localStorage.setItem("onlyme_cached_user",JSON.stringify(user));},user);
 const participant = { id: recipient, displayName: "Mia Tanaka", name: "Mia Tanaka", username: "mia", role: "fan" };
 await page.route("**/api/**", async route => {
  const path = new URL(route.request().url()).pathname;
  if (!path.startsWith("/api/")) return route.continue();
  let data = { items: [], groups: [], windows: [], people: [], calls: [] };
  if (path.endsWith("/auth/me")) data={user};
  if (path.endsWith("/profiles/me")) data={user,profile:{}};
  if (path === "/api/messages/conversations") data = { conversations: [{ id: recipient, type: "direct", status: "ACTIVE", participant }] };
  if (path === `/api/messages/groups/${recipient}`) data = { group: { id: recipient, name: "Morning circle", members: [user, participant], isCircle: true }, messages: [], pageInfo: { hasMore: false } };
  if (path === `/api/messages/conversations/${recipient}`) data = { participant, messages: [], conversation: { status: "ACTIVE" }, blockStatus: {}, pageInfo: { hasMore: false } };
  await route.fulfill({ json: { success: true, data } });
 });
 await page.goto(`/messages?${group ? "group" : "with"}=${recipient}`);
}
for (const width of [390, 1280]) test(`chat options opens prototype actions and dismisses at ${width}px`, async ({ page }) => {
 await page.setViewportSize({ width, height: 900 });
 await setup(page);
 await expect(page.getByText("Text messages are private between you and this fan.", {exact:true})).toBeVisible();
 await page.getByRole("button", { name: "Chat options", exact: true }).click();
 const menu=page.getByRole("dialog", {name:"Chat options",exact:true});
 await expect(menu).toBeVisible();
 await expect(menu).toBeInViewport();
 for (const name of ["Share profile", "Mute notifications", "Archive chat", "Report", "Delete chat", "Block Mia"]) await expect(menu.getByRole("button",{name,exact:true})).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(menu).toHaveCount(0);
 await page.getByRole("button", { name: "Chat options", exact: true }).click();
 await menu.getByRole("button", {name:"Report",exact:true}).click();
 await expect(page.locator(".message-report-sheet")).toBeVisible();
});

for (const width of [390, 1280]) test(`circle group omits one-to-one privacy notice at ${width}px`, async ({ page }) => {
 await page.setViewportSize({width,height:900});
 await setup(page,true);
 await expect(page.locator(".message-chat-header-identity")).toContainText("Morning circle");
 await expect(page.getByText(/Text messages are private between you and this/)).toHaveCount(0);
});
