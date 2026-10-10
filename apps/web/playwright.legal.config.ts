import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/design', testMatch:/legal-(acceptance|loading)\.spec\.ts/, timeout:60000, workers:1,
  use:{baseURL:'http://127.0.0.1:3011',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'npm run dev -- --hostname 127.0.0.1 --port 3011',url:'http://127.0.0.1:3011',reuseExistingServer:!process.env.CI,timeout:180000},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
});
