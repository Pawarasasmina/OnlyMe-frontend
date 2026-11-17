import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("feed keeps legacy photos, resolves upload paths and gives slow reads a bounded deadline", async t => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null } });
  try {
    const { normalizePost, postService } = await server.ssrLoadModule("/src/services/postService.js");
    const { resolveMediaUrl } = await server.ssrLoadModule("/src/utils/media.js");
    const { default: api } = await server.ssrLoadModule("/src/api/axiosInstance.js");
    const legacy = normalizePost({ id: "legacy", media: [], images: ["/uploads/photo.jpg"] });
    assert.equal(legacy.media.length, 1);
    assert.equal(legacy.media[0].url, resolveMediaUrl("/uploads/photo.jpg"));
    assert.equal(normalizePost({ media: ["https://example.test/photo.jpg"] }).media[0].url, "https://example.test/photo.jpg");
    assert.equal(normalizePost({ media: [{ secureUrl: "https://example.test/secure.jpg", type: "image" }] }).media[0].url, "https://example.test/secure.jpg");
    assert.equal(normalizePost({ media: [{ url: "blob:preview", type: "audio" }] }).media[0].url, "blob:preview");
    t.mock.method(api, "get", async (_path, options) => {
      assert.equal(options.timeout, 30000);
      return { data: { data: { items: [{ id: "photo", images: ["/uploads/photo.jpg"] }], pagination: { pages: 3 } } } };
    });
    const result = await postService.getFeedPosts({ page: 3 });
    assert.equal(result.items[0].media[0].url, resolveMediaUrl("/uploads/photo.jpg"));
  } finally { await server.close(); }
});
