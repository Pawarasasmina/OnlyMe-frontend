import { msg as __msg } from "../i18n/runtime.js";
export const CONTENT_ENTITY_TYPES = {
  BOOK: "book",
  EXPERIENCE: "experience",
  JOURNEY: "journey",
  PLACE: "place",
};

export const CONTENT_ENTITY_LABELS = {
  get [CONTENT_ENTITY_TYPES.BOOK]() { return __msg("contentEntities.book"); },
  get [CONTENT_ENTITY_TYPES.EXPERIENCE]() { return __msg("contentEntities.experience"); },
  get [CONTENT_ENTITY_TYPES.JOURNEY]() { return __msg("contentEntities.journey"); },
  get [CONTENT_ENTITY_TYPES.PLACE]() { return __msg("contentEntities.place"); },
};

export const CONTENT_ENTITY_ICONS = {
  get [CONTENT_ENTITY_TYPES.BOOK]() { return __msg("contentEntities.book"); },
  get [CONTENT_ENTITY_TYPES.EXPERIENCE]() { return __msg("contentEntities.experience"); },
  get [CONTENT_ENTITY_TYPES.JOURNEY]() { return __msg("contentEntities.journey"); },
  get [CONTENT_ENTITY_TYPES.PLACE]() { return __msg("contentEntities.place"); },
};
