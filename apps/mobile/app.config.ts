import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'English Coach',
  slug: 'english-coach',
  version: '1.0.0',
  scheme: 'englishcoach',
  userInterfaceStyle: 'automatic',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: 'com.englishcoach.app',
    icon: './assets/expo.icon',
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription:
        'English Coach uses your microphone for English speaking and pronunciation practice.',
    },
  },
  android: {
    package: 'com.englishcoach.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-asset',
    'expo-font',
    'expo-web-browser',
    [
      'expo-image-picker',
      {
        photosPermission:
          'English Coach uses your selected photo as your profile picture.',
      },
    ],
    ['expo-secure-store', { configureAndroidBackup: true }],
    [
      'expo-audio',
      {
        microphonePermission:
          'English Coach uses your microphone for English speaking and pronunciation practice.',
      },
    ],
    ['expo-notifications', { defaultChannel: 'default' }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
