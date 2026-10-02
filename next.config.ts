import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // 船舶写真（Wikimedia Commons）。shipDatabase.json の image.url
    remotePatterns: [
      { protocol: "https", hostname: "thumb.wikimedia.org", port: "", pathname: "/wikipedia/commons/**", search: "" },
      { protocol: "https", hostname: "upload.wikimedia.org", port: "", pathname: "/wikipedia/commons/**", search: "" },
    ],
  },
};

export default nextConfig;
