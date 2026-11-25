import {defineConfig} from "@playwright/test";
import config from "./playwright.meetup.config.js";
export default defineConfig({...config,testMatch:"evidence.spec.js"});
