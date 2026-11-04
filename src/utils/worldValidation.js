/* i18n-source-migrated */
import { msg as __msg } from "../i18n/runtime.js";
export const WORLD_CONFIG = {
  WORLD: {
    get label() { return __msg("admin.world"); },
    min: 1,
    max: 7,
    previewMin: 1,
    previewMax: 7,
    pricingMode: "FREE",
    defaultPrice: null,
  },
  PREMIUM_WORLD: {
    get label() { return __msg("financial.premiumWorld"); },
    min: 0,
    max: 1,
    previewMin: 0,
    previewMax: 1,
    pricingMode: "MONTHLY",
    defaultPrice: 190,
  },
  EXPERIENCE: {
    get label() { return __msg("create.premiumExperience"); },
    min: 2,
    max: null,
    previewMin: 0,
    previewMax: 0,
    pricingMode: "ONE_TIME",
    defaultPrice: 190,
  },
};

export const PREMIUM_PRESETS = [190, 490, 990];

export function worldCompletenessBySection(publication) {
  const config = WORLD_CONFIG[publication?.kind];
  const errors = {
    general: [],
    details: [],
    cover: [],
    chapters: [],
    preview: [],
    pricing: [],
  };
  if (!config) {
    errors.general.push(__msg("worldValidation.unsupportedWorldKind"));
    return errors;
  }
  if (!publication.title?.trim()) errors.details.push(__msg("publicationValidation.titleIsRequired"));
  if (!(publication.summary || publication.description)?.trim()) errors.details.push(__msg("worldValidation.descriptionIsRequired"));
  if (publication.kind === "EXPERIENCE" && !publication.category?.trim())
    errors.details.push(__msg("publicationValidation.categoryIsRequired"));
  if (!publication.coverMedia?.secureUrl)
    errors.cover.push(__msg("publicationValidation.aVerifiedCoverIsRequired"));
  const chapters = publication.chapters || [];
  const previews = chapters.filter((chapter) => chapter.isPreview).length;
  if (chapters.length < config.min || (config.max && chapters.length > config.max))
    errors.chapters.push(
      config.max ? `${config.label} requires ${config.min}-${config.max} chapters` : __msg("worldValidation.value0RequiresAtLeastValue1Chapters", { value0: config.label, value1: config.min }),
    );
  if (publication.kind !== "EXPERIENCE" && (previews < config.previewMin || previews > config.previewMax))
    errors.preview.push(
      __msg("worldValidation.value0RequiresValue1PreviewChapters", { value0: config.label, value1: config.previewMin === config.previewMax ? config.previewMin : `${config.previewMin}-${config.previewMax}` }),
    );
  if (publication.kind === "EXPERIENCE" && publication.pricing?.mode !== "FREE" && chapters.length > 0 && previews === chapters.length)
    errors.preview.push(__msg("worldValidation.atLeastOneChapterMustRemainLocked"));
  if (publication.pricing?.mode !== config.pricingMode && !(publication.kind === "EXPERIENCE" && publication.pricing?.mode === "FREE"))
    errors.pricing.push(__msg("worldValidation.invalidPricingMode"));
  if (
    publication.kind === "WORLD" &&
    (publication.pricing?.mode !== "FREE" || publication.pricing?.starsAmount != null)
  )
    errors.pricing.push(__msg("worldValidation.freeWorldsCannotChargeStars"));
  if (publication.kind === "WORLD" && previews !== chapters.length)
    errors.preview.push(__msg("worldValidation.everyFreeWorldChapterMustBeOpen"));
  if (publication.kind === "PREMIUM_WORLD" && chapters.length && (!chapters[0]?.isPreview || previews !== chapters.length))
    errors.preview.push(__msg("worldValidation.worldStoryPreviewsMustRemainVisibleBeforeSubscription"));
  if (publication.kind === "EXPERIENCE" && publication.pricing?.mode !== "FREE" && previews !== 0)
    errors.preview.push(__msg("worldValidation.premiumExperienceChaptersUnlockOnlyAfterPurchase"));
  if (
    publication.kind === "PREMIUM_WORLD" &&
    !PREMIUM_PRESETS.includes(Number(publication.pricing?.starsAmount))
  )
    errors.pricing.push(`Choose a supported ${publication.kind === "EXPERIENCE" ? "one-time" : "monthly"} price`);
  if (publication.kind === "EXPERIENCE" && publication.pricing?.mode !== "FREE" && (!Number.isSafeInteger(Number(publication.pricing?.starsAmount)) || Number(publication.pricing?.starsAmount) < 10))
    errors.pricing.push(__msg("worldValidation.experiencePriceMustBeAtLeast10Stars"));
  if (publication.kind === "EXPERIENCE" && publication.pricing?.mode === "FREE" && previews !== chapters.length)
    errors.preview.push(__msg("worldValidation.everyFreeExperienceChapterMustBeOpen"));
  return errors;
}

export function worldCompleteness(publication) {
  return Object.values(worldCompletenessBySection(publication)).flat();
}

export const isPlanet = (publication) =>
  ["WORLD", "PREMIUM_WORLD"].includes(publication.kind);
