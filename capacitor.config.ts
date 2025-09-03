import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigideer.menumagic',
  appName: 'MenuMagic',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    minVersion: '14.0',
    icon: 'src/assets/menuMagicSquare.png'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#10b981',
      showSpinner: true,
      spinnerColor: '#ffffff'
    }
  }
};

export default config;
