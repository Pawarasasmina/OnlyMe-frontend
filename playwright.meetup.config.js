import { defineConfig } from "@playwright/test";
import config from "./playwright.wall.config.js";
export default defineConfig({...config,testMatch:"meetup.spec.js",use:{...config.use,baseURL:"http://localhost:5193"},webServer:{command:"node node_modules/vite/bin/vite.js --port 5193",url:"http://localhost:5193",reuseExistingServer:true}});
