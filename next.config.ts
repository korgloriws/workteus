import type { NextConfig } from "next";

const extraDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Acesso via IP da rede (ex.: celular/outro PC) — sem isso o HMR quebra e a página
  // pode não hidratar, fazendo o login "não entrar" sem erro.
  allowedDevOrigins: ["10.131.1.227", "127.0.0.1", ...extraDevOrigins],
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
