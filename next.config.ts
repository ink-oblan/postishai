import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack(config) {
    // Webpack ignores all of node_modules by default, so the dev server doesn't
    // detect when `prisma generate` regenerates the client. Let the two Prisma
    // output directories through so the server reloads after every schema change.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: (absPath: string) =>
        absPath.includes("node_modules") &&
        !absPath.includes("node_modules/.prisma") &&
        !absPath.includes("node_modules/@prisma"),
    };
    return config;
  },
};

export default nextConfig;
