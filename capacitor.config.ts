import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.luma.social',
  appName: 'Luma',
  webDir: 'out',
  server: {
    // Set this to the deployed Vercel URL in Codemagic before building.
    url: process.env.CAP_SERVER_URL ?? 'https://YOUR-VERCEL-DOMAIN.vercel.app',
    cleartext: false
  }
};

export default config;
