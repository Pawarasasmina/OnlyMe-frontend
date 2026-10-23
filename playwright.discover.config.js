import { defineConfig } from "@playwright/test";
import wallConfig from "./playwright.wall.config.js";
export default defineConfig({ ...wallConfig, testMatch: "discover.spec.js" });
