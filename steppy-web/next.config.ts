import type { NextConfig } from "next";
module.exports = {
    allowedDevOrigins: ['192.168.68.103'],
}
const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["react-syntax-highlighter"],
};

export default nextConfig;
