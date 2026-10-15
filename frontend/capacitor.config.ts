import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ffc.reclamation',
  appName: 'FFC Reclamation',
  webDir: 'out',
  server: {
    url: 'https://ffc-reclamation-system.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
