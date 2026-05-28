import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kasiroffline.kencanamandiri',
  appName: 'Kasir Offline',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
