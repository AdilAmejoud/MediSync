import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  projects: [
    {
      name: 'patient-journey',
      testMatch: '**/patient-journey.spec.js',
    },
    {
      name: 'admin-journey',
      testMatch: '**/admin-journey.spec.js',
    },
    {
      name: 'doctor-journey',
      testMatch: '**/doctor-journey.spec.js',
    },
    {
      name: 'secretaire-journey',
      testMatch: '**/secretaire-journey.spec.js',
    },
  ],
});
