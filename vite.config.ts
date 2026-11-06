import { resolve } from "node:path";
import stylex from "@stylexjs/unplugin";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src *",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const contentSecurityPolicy: Plugin = {
  name: "apostil-content-security-policy",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "meta",
      attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY },
      injectTo: "head-prepend",
    },
  ],
};

export default defineConfig({
  base: "./",
  plugins: [stylex.vite({ useCSSLayers: true }), react(), contentSecurityPolicy],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, "index.html"),
        write: resolve(import.meta.dirname, "write/index.html"),
      },
    },
  },
});
