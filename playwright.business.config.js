import { defineConfig } from "@playwright/test";
import config from "./playwright.wall.config.js";
export default defineConfig({...config,testMatch:"business.spec.js",use:{...config.use,baseURL:"http://localhost:5192"},webServer:{command:"node node_modules/vite/bin/vite.js --port 5192",url:"http://localhost:5192",reuseExistingServer:true}});
