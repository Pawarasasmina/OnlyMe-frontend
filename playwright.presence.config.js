import { defineConfig } from "@playwright/test";
import config from "./playwright.wall.config.js";
export default defineConfig({...config,testMatch:"presence.spec.js"});
