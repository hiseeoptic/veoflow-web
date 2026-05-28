import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' chrome-extension://* https://flowveo.nguyenduchoa.com https://storyboard.nguyenduchoa.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
