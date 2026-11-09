import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongodb", "bcryptjs"],
  outputFileTracingIncludes: {
    "/tien-do": ["./src/assets/tien-do.html"],
    "/high-rise": ["./src/assets/high-rise-lc11.html"],
  },
};

export default nextConfig;
