/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow build verification beside an already-running local dev server.
  distDir: process.env.RMW_NEXT_DIST_DIR || ".next",
};

export default nextConfig;
