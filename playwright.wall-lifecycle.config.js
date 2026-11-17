import { defineConfig } from "@playwright/test";
import config from "./playwright.wall.config.js";
export default defineConfig({ ...config, testMatch: ["wall-lifecycle.spec.js", "wall-category.spec.js"] });
