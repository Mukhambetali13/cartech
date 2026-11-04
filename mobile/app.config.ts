import type { ConfigContext, ExpoConfig } from 'expo/config';

// Static settings live in app.json; this file adds what depends on the build profile.
// EAS sets EAS_BUILD_PROFILE; API URL and project id come from eas.json / EAS env vars.
const profile = process.env.EAS_BUILD_PROFILE ?? 'local';
const isProduction = profile === 'production';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

if (isProduction && (!apiUrl.startsWith('https://') || apiUrl.includes('example.'))) {
  throw new Error('Production build needs EXPO_PUBLIC_API_URL set to your real https:// API address in eas.json.');
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    // Plain http is only allowed in dev/preview builds that talk to a local backend
    ['expo-build-properties', { android: { usesCleartextTraffic: !isProduction } }],
  ],
  extra: {
    ...config.extra,
    eas: { projectId: process.env.EAS_PROJECT_ID ?? config.extra?.eas?.projectId },
  },
});
