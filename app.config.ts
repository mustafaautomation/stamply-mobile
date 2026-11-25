import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Stamply',
  slug: 'stamply',
  scheme: 'stamply',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.quvantic.stamply',
    supportsTablet: true,
    associatedDomains: ['applinks:stamply-app.quvantic.com'],
    infoPlist: {
      NSCameraUsageDescription: 'Stamply uses the camera so staff can scan a customer stamp card.',
    },
  },
  android: {
    package: 'com.quvantic.stamply',
    adaptiveIcon: {
      backgroundColor: '#1C1915',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['android.permission.CAMERA'],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'stamply-app.quvantic.com', pathPrefix: '/' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'Stamply uses the camera so staff can scan a customer stamp card.',
        barcodeScannerEnabled: true,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-notifications',
      {
        color: '#C4452D',
        defaultChannel: 'stamps',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F3EEE4',
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
  extra: {
    supportsDemoWithoutBackend: true,
  },
};

export default config;
