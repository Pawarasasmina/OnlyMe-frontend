import { defineConfig } from "@playwright/test";
import config from "./playwright.wall.config.js";
export default defineConfig({ ...config, testMatch: "recommendations.spec.js", use: { ...config.use, baseURL: "http://localhost:5191" }, webServer: { command: "node node_modules/vite/bin/vite.js --port 5191", url: "http://localhost:5191", reuseExistingServer: true } });
