import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload do extrato (PDF/imagens) pro agente de extração — pode vir mais
      // de um arquivo (ex.: 2 fotos do mesmo extrato), por isso o limite total
      // é maior que o de um arquivo só (ver TAMANHO_MAX_BYTES em agente-extracao.ts).
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
