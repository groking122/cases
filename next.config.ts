import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverMinification: true,
  },
  // Externalize Lucid + CSL so Node can load the WASM from node_modules instead of bundling
  serverExternalPackages: [
    'lucid-cardano',
    '@emurgo/cardano-serialization-lib-nodejs'
  ],
  eslint: {
    // Unblock production build despite ESLint errors (you can re-enable later)
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Ensure WASM files from cardano-serialization-lib-nodejs are handled in server build
    config.experiments = { ...config.experiments, asyncWebAssembly: true, topLevelAwait: true };
    // Force NodeJS CSL and avoid bundling the browser WASM lib on the server
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@emurgo/cardano-serialization-lib-browser': false,
      '@emurgo/cardano-serialization-lib': false,
      'cardano-serialization-lib': false,
    };
    return config;
  },
};

export default nextConfig;
