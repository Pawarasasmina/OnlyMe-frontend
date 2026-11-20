import { test, expect } from "@playwright/test";

for (const language of ["ar", "ru", "uk", "es", "pt", "fr", "de"]) {
  test(`identity isolation and translated labels in ${language}`, async ({ page }) => {
    await page.goto(`/tests/fixtures/localization.html?lang=${language}`);
    await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
    for (const id of ["identity", "reply"]) {
      const handle = page.getByTestId(id).locator("bdi");
      await expect(handle).toHaveText("@liam.carter");
      await expect(handle).toHaveCSS("direction", "ltr");
      await expect(handle).toHaveCSS("unicode-bidi", "isolate");
      const order = await handle.evaluate(element => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const positions = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          for (let i = 0; i < node.length; i++) {
            const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
            positions.push({ char: node.data[i], left: range.getBoundingClientRect().left });
          }
        }
        return positions;
      });
      expect(order[0].char).toBe("@");
      expect(order[0].left).toBeLessThan(order[1].left);
      await expect(handle.locator("..")).toHaveAttribute("href", "/profile/liam.carter");
    }
    await expect(page.getByTestId("paid")).not.toContainText("\u2047");
    await expect(page.getByTestId("month")).not.toContainText("this month");
    if (language === "ru") {
      await expect(page.getByTestId("world")).toHaveText("\u041c\u0438\u0440 Liam");
      await expect(page.getByTestId("paid")).toContainText("\u041f\u041b\u0410\u0422\u041d\u041e");
    }
  });
}
