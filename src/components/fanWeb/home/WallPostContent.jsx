/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { useId, useState } from "react";
import { FiChevronDown, FiChevronUp, FiGlobe } from "react-icons/fi";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";
import { useWallTranslation } from "../../../hooks/useWallTranslation";
import { transcriptAlreadyShown } from "../../../utils/wallVoiceDisplay";

export function TranslationLink({ translation, onClick, alwaysVisible = false }) {
  __useUiLanguage();
  if (!alwaysVisible && !translation.metadata?.canTranslate) return null;
  return <div className="wall-content-translation">
    <FiGlobe aria-hidden="true" />
    <span>{translation.showing ? __msg("fanWeb.translatedFrom", { value0: translation.metadata?.sourceLanguageName || __msg("fanWeb.originalLanguage") }) : __msg("fanWeb.original")}</span>
    <span aria-hidden="true">&middot;</span>
    <button disabled={translation.loading} onClick={onClick || translation.toggle} type="button">{translation.loading ? __msg("fanWeb.translating") : translation.error ? __msg("fanWeb.tryTranslationAgain") : translation.showing ? __msg("fanWeb.showOriginal") : __msg("fanWeb.showTranslation")}</button>
    {translation.sameLanguage ? <span className="wall-translation-notice" role="status">{__msg("fanWeb.alreadyIn")} {translation.metadata?.targetLanguageName || __msg("fanWeb.yourPreferredLanguage")}</span> : null}
    {translation.error ? <span className="wall-translation-notice" role="status">{__msg("fanWeb.translationUnavailablePleaseTryAgain")}</span> : null}
  </div>;
}

export function WallTextContent({ postId, text }) {
  __useUiLanguage();
  const translation = useWallTranslation({ postId, text });
  const [expanded, setExpanded] = useState(false);
  if (!text?.trim()) return null;
  const display = translation.text || text;
  const long = display.length > 260;
  return <div className="wall-post-text-content" ref={translation.ref}>
    <p className="home-feed-text" dir="auto">{long && !expanded ? `${display.slice(0, 260).trim()}...` : display}</p>
    {long ? <button className="home-feed-show-more" onClick={() => setExpanded(!expanded)} type="button">{expanded ? __msg("fanWeb.showLess") : __msg("fanWeb.showMore")}</button> : null}
    <TranslationLink translation={translation} />
  </div>;
}

export function WallVoiceNote({ item, postId, postText }) {
  __useUiLanguage();
  const [open, setOpen] = useState(false);
  const transcriptId = useId();
  const duplicate = transcriptAlreadyShown(postText, item.transcript);
  const transcript = duplicate ? "" : item.transcript || "";
  const translation = useWallTranslation({ postId, mediaId: item.id || item.assetId, text: transcript });
  return <div className="wall-voice-note" ref={translation.ref}>
    <VoiceMessageBubble audio={{ duration: item.duration, url: item.url, waveform: item.waveform }} compact label={__msg("fanWeb.voiceNote")} />
    {transcript ? <>
      <button aria-controls={transcriptId} aria-expanded={open} className="wall-transcript-toggle" onClick={() => setOpen(!open)} type="button">{open ? __msg("fanWeb.hideText") : __msg("fanWeb.showText")}{open ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}</button>
      {open ? <p className="wall-transcript-text" dir="auto" id={transcriptId}>{translation.text}</p> : null}
      {open ? <TranslationLink alwaysVisible onClick={() => { setOpen(true); translation.toggle(); }} translation={translation} /> : null}
    </> : null}
  </div>;
}
