import { defineConfig } from '@playwright/test';
import config from './playwright.wall.config.js';
export default defineConfig({...config,testMatch:['wallet.spec.js','payout.spec.js','settings-payments.spec.js','message-audience.spec.js']});
