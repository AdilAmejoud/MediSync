const fs = require('fs');
const path = require('path');

// Configure paths
const dirPath = path.join(__dirname, 'src', 'environments');
const prodEnvPath = path.join(dirPath, 'environment.prod.ts');
const devEnvPath = path.join(dirPath, 'environment.ts');

// Create environments directory if it doesn't exist
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Retrieve variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const apiUrlProd = process.env.API_URL || '/api';
const apiUrlDev = process.env.API_URL || 'http://localhost:3000/api';

// Vercel build warning system
const isVercel = process.env.VERCEL === '1';
if (isVercel) {
  if (!process.env.SUPABASE_URL) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: VERCEL build environment detected, but SUPABASE_URL is empty or undefined.');
  }
  if (!process.env.SUPABASE_KEY) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: VERCEL build environment detected, but SUPABASE_KEY is empty or undefined.');
  }
}

// Content for environment.prod.ts
const prodEnvConfig = `export const environment = {
  production: true,
  apiUrl: '${apiUrlProd}',
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

// Content for environment.ts
const devEnvConfig = `export const environment = {
  production: false,
  apiUrl: '${apiUrlDev}',
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

try {
  // Write production config
  fs.writeFileSync(prodEnvPath, prodEnvConfig, { encoding: 'utf8' });
  console.log(`Successfully generated environment.prod.ts with injected variables.`);
  
  // Write development config
  fs.writeFileSync(devEnvPath, devEnvConfig, { encoding: 'utf8' });
  console.log(`Successfully generated environment.ts.`);
} catch (error) {
  console.error('Error writing environment files:', error);
  process.exit(1);
}
