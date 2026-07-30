import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'English Coach',
  slug: 'english-learning-app',
  owner: 'imran_dev',
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
  androidNavigationBar: {
    backgroundColor: '#EDF6FF',
    barStyle: 'dark-content',
  },
  android: {
    package: 'com.imran_dev.englishlearningapp',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    softwareKeyboardLayoutMode: 'resize',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    name: 'English Coach',
    shortName: 'Eng Coach',
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
  extra: { eas: { projectId: '67c4381c-2520-479f-b2be-3026536516aa' } },
  experiments: { typedRoutes: true },
};

export default config;
