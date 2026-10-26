import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.simplymar.tablet',
  appName: 'Aino Dash',
  webDir: 'dist',
  backgroundColor: '#dfe4e8',
  android: { allowMixedContent: false },
  plugins: { CapacitorHttp: { enabled: true } },
};

export default config;
