import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.theway.cafe',
  appName: '이음카페',
  webDir: 'dist',
  server: {
    // 운영 서버 URL을 로드
    url: 'https://theway2.vercel.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FDF2F8',
      showSpinner: false
    }
  }
};

export default config;
