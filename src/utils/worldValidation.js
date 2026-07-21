export const WORLD_CONFIG = {
  WORLD: {
    label: "World",
    min: 2,
    max: 10,
    previewMin: 1,
    previewMax: 1,
    pricingMode: "ONE_TIME",
    defaultPrice: 1,
  },
  PREMIUM_WORLD: {
    label: "Premium World",
    min: 2,
    max: 10,
    previewMin: 1,
    previewMax: 2,
    pricingMode: "MONTHLY",
    defaultPrice: 90,
  },
};

export const PREMIUM_PRESETS = [90, 190, 290];

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
    errors.general.push("Unsupported World kind");
    return errors;
  }
  if (!publication.title?.trim()) errors.details.push("Title is required");
  if (!publication.summary?.trim()) errors.details.push("Summary is required");
  if (!publication.category?.trim())
    errors.details.push("Category is required");
  if (!publication.coverMedia?.secureUrl)
    errors.cover.push("A verified cover is required");
  const chapters = publication.chapters || [];
  const previews = chapters.filter((chapter) => chapter.isPreview).length;
  if (chapters.length < config.min || chapters.length > config.max)
    errors.chapters.push(
      `${config.label} requires ${config.min}-${config.max} chapters`,
    );
  if (previews < config.previewMin || previews > config.previewMax)
    errors.preview.push(
      `${config.label} requires ${config.previewMin === config.previewMax ? config.previewMin : `${config.previewMin}-${config.previewMax}`} preview chapters`,
    );
  if (chapters.length > 0 && previews === chapters.length)
    errors.preview.push("At least one chapter must remain locked");
  if (publication.pricing?.mode !== config.pricingMode)
    errors.pricing.push("Invalid pricing mode");
  if (
    publication.kind === "WORLD" &&
    (!Number.isSafeInteger(Number(publication.pricing?.starsAmount)) ||
      Number(publication.pricing.starsAmount) < 1)
  )
    errors.pricing.push("World price must be a positive whole Stars amount");
  if (
    publication.kind === "PREMIUM_WORLD" &&
    !PREMIUM_PRESETS.includes(Number(publication.pricing?.starsAmount))
  )
    errors.pricing.push("Choose a supported monthly price");
  return errors;
}

export function worldCompleteness(publication) {
  return Object.values(worldCompletenessBySection(publication)).flat();
}

export const isPlanet = (publication) =>
  ["WORLD", "PREMIUM_WORLD"].includes(publication.kind);
