import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ffc.reclamation',
  appName: 'FFC Reclamation',
  webDir: 'out',
  server: {
    url: 'http://192.168.100.180:3000',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
