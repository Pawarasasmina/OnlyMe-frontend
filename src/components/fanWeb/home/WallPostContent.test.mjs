import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { wallPostCaption } from "../../../utils/wallVoiceDisplay.js";

test("Wall renders compact audio with hidden, nonduplicated transcript content", async () => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null } });
  try {
    const { WallVoiceNote, WallTextContent, TranslationLink } = await server.ssrLoadModule("/src/components/fanWeb/home/WallPostContent.jsx");
    const { AuthContext } = await server.ssrLoadModule("/src/context/AuthContext.js");
    const { LanguageContext } = await server.ssrLoadModule("/src/context/LanguageContext.js");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const render = (content) => renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(AuthContext.Provider, { value: { user: { id: "viewer" } } }, React.createElement(LanguageContext.Provider, { value: { language: "en" } }, content))));
    const item = { id: "voice", type: "audio", url: "https://example.com/audio.webm", duration: 14, transcript: "Hidden speech should not appear by default" };
    const voiceOnly = render(React.createElement(WallVoiceNote, { item, postId: "demo", postText: "" }));
    assert.ok(voiceOnly.includes("Show text"));
    assert.ok(voiceOnly.includes('aria-expanded="false"'));
    assert.ok(!voiceOnly.includes(item.transcript));
    assert.ok(!voiceOnly.includes("<select"));
    assert.ok(voiceOnly.includes("wall-audio-player"));
    assert.ok(!voiceOnly.includes("Original"));
    assert.ok(!voiceOnly.includes("Show translation"));
    const translated = render(React.createElement(TranslationLink, { alwaysVisible: true, translation: { showing: true, metadata: { sourceLanguageName: "Arabic", canTranslate: true } } }));
    assert.ok(translated.includes("Translated from Arabic"));
    assert.ok(translated.includes("Show original"));
    const sameLanguage = render(React.createElement(TranslationLink, { alwaysVisible: true, translation: { sameLanguage: true, metadata: { canTranslate: false, targetLanguageName: "English" } } }));
    assert.ok(sameLanguage.includes("Show translation"));
    assert.ok(sameLanguage.includes("Already in English"));
    const converted = render(React.createElement(React.Fragment, null, React.createElement(WallTextContent, { postId: "demo", text: wallPostCaption(item.transcript, [item]) }), React.createElement(WallVoiceNote, { item, postId: "demo", postText: wallPostCaption(item.transcript, [item]) })));
    assert.equal(converted.split(item.transcript).length - 1, 0);
    assert.ok(converted.includes("Show text"));
    const caption = render(React.createElement(React.Fragment, null, React.createElement(WallTextContent, { postId: "demo", text: "My separate caption" }), React.createElement(WallVoiceNote, { item, postId: "demo", postText: "My separate caption" })));
    assert.ok(caption.includes("My separate caption"));
    assert.ok(caption.includes("Show text"));
    assert.ok(!caption.includes(item.transcript));
    client.clear();
  } finally { await server.close(); }
});
