import test from "node:test";
import assert from "node:assert/strict";
import { wallCurrencyLabel, formatWallPriceInput, firstWallPhoto, wallCurrencyOfLocation, wallPricePresentation } from "./wallMarketplace.js";

test("Marketplace chooses the first photo, skipping voice and supporting legacy images", () => {
  assert.equal(firstWallPhoto({ media: [{ type: "audio", url: "voice.webm" }, { type: "image", url: "one.jpg" }, { type: "image", url: "two.jpg" }] }).url, "one.jpg");
  assert.equal(firstWallPhoto({ images: ["legacy.jpg"] }).url, "legacy.jpg");
  assert.equal(firstWallPhoto({ media: [{ type: "image" }], images: ["legacy.jpg"] }).url, "legacy.jpg");
  assert.equal(firstWallPhoto({ media: [{ type: "audio", url: "voice.webm" }] }), undefined);
});
test("stored listing prices distinguish zero, absent, invalid and country currencies", () => {
  const base = { postType: "Buy & Sell", location: "Dubai, UAE" };
  assert.equal(wallPricePresentation({ ...base, price: 1500 }), "AED 1,500");
  assert.equal(wallPricePresentation({ ...base, price: 0 }), "Free");
  assert.equal(wallPricePresentation({ ...base, price: null }), "");
  assert.equal(wallPricePresentation({ ...base, price: -1 }), "");
  assert.equal(wallPricePresentation({ ...base, price: Infinity }), "");
  assert.equal(wallPricePresentation({ ...base, price: 25, currency: "GBP" }), "£25");
  assert.equal(wallPricePresentation({ ...base, text: "Desk AED 1,500" }), "");
  assert.equal(wallPricePresentation({ ...base, postType: "Question", text: "Can I save $50?" }), "");
  assert.equal(wallCurrencyOfLocation("Paris, France"), "EUR");
  assert.equal(wallCurrencyOfLocation("London"), "GBP");
});

test("prices retain currency precision and blank values never become Free", () => {
 const base = { postType: "Buy & Sell" };
 assert.equal(wallPricePresentation({ ...base, price: "   " }), "");
 assert.equal(wallPricePresentation({ ...base, price: 12.5, currency: "USD" }), "$12.5");
 assert.equal(wallPricePresentation({ ...base, price: 1.125, currency: "KWD" }), "KWD 1.125");
 assert.equal(wallCurrencyOfLocation("Unknown"), "");
 assert.equal(wallCurrencyOfLocation("Paris, France"), "EUR");
});

test("price input permits only nine digits and groups thousands", () => {
 for (const [raw, display] of [["", ""], ["0", "0"], ["123444", "123,444"], ["1234.50", "123,450"], ["1234.", "1,234"], ["abc", ""], ["00012", "12"], ["1234567890", "123,456,789"], ["999999999", "999,999,999"], ["1,234", "1,234"]]) assert.equal(formatWallPriceInput(raw), display);
});

test("composer currency labels match prototype symbols", () => {
 for (const [code,label] of [["AED","AED"],["SAR","SAR"],["QAR","QAR"],["EUR","\u20ac"],["GBP","\u00a3"],["USD","$"],["JPY","\u00a5"]]) assert.equal(wallCurrencyLabel(code),label);
 assert.equal(wallPricePresentation({postType:"Offering",price:25,currency:"USD"}), "");
});
