import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Empacotamento: evita falha de fetch next/font (Google Fonts) em ambientes com TLS do sistema
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "frame-src 'self' https://www.youtube.com https://youtube.com https://*.youtube.com https://*.google.com",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://*.youtube.com https://*.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              // GO-H2D: client upload (@vercel/blob) PUT → vercel.com/api/blob;
              // store público: *.public.blob.vercel-storage.com (upload/playback)
              "connect-src 'self' https://www.youtube.com https://*.youtube.com https://*.google.com https://vercel.com https://*.vercel.com https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://*.public.blob.vercel-storage.com",
              "media-src 'self' https://*.blob.vercel-storage.com https://*.public.blob.vercel-storage.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
