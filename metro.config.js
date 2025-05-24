const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const emptyShim = require.resolve('./src/lib/polyfills/empty.ts');

// Configure resolver to provide polyfills for Node.js core modules
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules, // Preserve existing extraNodeModules
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer/'), // Note the trailing slash for 'buffer'
  net: require.resolve('./src/lib/polyfills/empty.ts'),
  url: require.resolve('url/'),
  zlib: require.resolve('browserify-zlib'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  crypto: require.resolve('react-native-get-random-values'), // crypto-browserify fallback in case react-native-get-random-values doesn't polyfill enough
  path: require.resolve('path-browserify'),
  os: require.resolve('os-browserify/browser'),
  vm: require.resolve('vm-browserify'),
  assert: require.resolve('assert/'), // Note the trailing slash for assert
  constants: require.resolve('constants-browserify'),

  // For modules that are unlikely to be used meaningfully on client-side by Supabase
  // or have no good direct RN polyfill for WS library's potential needs:
  tls: emptyShim,
  dns: emptyShim,
  fs: emptyShim,
  // 'async_hooks': emptyShim, // If it ever comes up
};

// It's also good practice to ensure 'sourceExts' includes 'cjs' if not already.
// This helps with some CommonJS modules. Default Expo config usually handles this.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;