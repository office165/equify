/**
 * Production mobile bundle configuration — Capacitor + PWA readiness for store builds.
 */

export const MOBILE_APP_ID = 'il.co.equify.app';
export const MOBILE_APP_NAME = 'equify BY SBC';
export const MOBILE_WEB_DIR = 'out';

export const iosProductionConfig = {
  scheme: 'equify',
  contentInset: 'automatic' as const,
  allowsLinkPreview: false,
  backgroundColor: '#020617',
  preferredContentMode: 'mobile',
};

export const androidProductionConfig = {
  minSdkVersion: 24,
  compileSdkVersion: 34,
  targetSdkVersion: 34,
  backgroundColor: '#020617',
  allowMixedContent: false,
  captureInput: true,
  webContentsDebuggingEnabled: false,
};

export const pwaProductionConfig = {
  name: MOBILE_APP_NAME,
  shortName: 'equify',
  description:
    'אינדיקציית שווי מוסמכת ומדויקת מבוססת מודלים פיננסיים מתקדמים בזמן אמת.',
  themeColor: '#020617',
  backgroundColor: '#020617',
  display: 'standalone' as const,
  orientation: 'portrait' as const,
  startUrl: '/',
  scope: '/',
  lang: 'en',
  dir: 'ltr' as const,
  categories: ['finance', 'business', 'productivity'],
};

export const capacitorPlugins = {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#020617',
    showSpinner: false,
  },
  StatusBar: {
    style: 'DARK',
    backgroundColor: '#020617',
  },
  Keyboard: {
    resize: 'body',
    resizeOnFullScreen: true,
  },
};

export const nativeBuildScripts = {
  sync: 'npx cap sync',
  ios: 'npx cap open ios',
  android: 'npx cap open android',
  copy: 'npx cap copy',
};
