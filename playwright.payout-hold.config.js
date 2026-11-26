import { defineConfig } from "@playwright/test";
import config from "./playwright.wall.config.js";
export default defineConfig({ ...config, testMatch: ["payout-hold.spec.js", "wallet-ledgers.spec.js"] });
