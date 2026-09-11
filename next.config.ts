import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload do extrato (PDF/imagem) pro agente de extração.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
