import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const nextConfig = {
  webpack: (config) => {
    config.resolveLoader ??= {};
    config.resolveLoader.alias ??= {};
    config.resolveLoader.alias["next-flight-client-entry-loader"] = require.resolve(
      "next/dist/build/webpack/loaders/next-flight-client-entry-loader.js"
    );

    return config;
  },
};

export default nextConfig;
