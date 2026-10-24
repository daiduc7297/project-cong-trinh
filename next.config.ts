import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongodb", "bcryptjs"],
  outputFileTracingIncludes: {
    "/tien-do": ["./src/assets/tien-do.html"],
  },
};

export default nextConfig;
