import process from "node:process";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "wall-creation.spec.js", workers: 1, timeout: 30000,
  use: { baseURL: "http://localhost:5173", headless: true, launchOptions: { executablePath: process.env.WALL_BROWSER_PATH || (process.platform === "win32" ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" : undefined), args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] }, trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
});
