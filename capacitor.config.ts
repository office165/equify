import type { CapacitorConfig } from '@capacitor/cli';
import {
  MOBILE_APP_ID,
  MOBILE_APP_NAME,
  MOBILE_WEB_DIR,
  capacitorPlugins,
} from './mobile/production.config';

const config: CapacitorConfig = {
  appId: MOBILE_APP_ID,
  appName: MOBILE_APP_NAME,
  webDir: MOBILE_WEB_DIR,
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
  },
  plugins: capacitorPlugins,
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#020617',
  },
  android: {
    backgroundColor: '#020617',
    allowMixedContent: false,
  },
};

export default config;
