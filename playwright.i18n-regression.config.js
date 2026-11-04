import { defineConfig } from "@playwright/test";
import config from "./playwright.wall.config.js";
export default defineConfig({ ...config, expect: { timeout: 15000 }, testMatch: ["language.spec.js", "ownership.spec.js", "verification.spec.js", "bank-payouts.spec.js", "monetization.spec.js", "wall-creation.spec.js"] });
