import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
<<<<<<< HEAD
import { VitePWA } from "vite-plugin-pwa";
=======
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
<<<<<<< HEAD
    host: "0.0.0.0",
    port: 3000,
=======
    host: "::",
    port: 8080,
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
    hmr: {
      overlay: false,
    },
  },
<<<<<<< HEAD
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-icon-512.png'],
      manifest: {
        name: 'PROFIX — REDE DE PROFISSIONAIS',
        short_name: 'PROFIX',
        description: 'A maior rede de profissionais autônomos e serviços prestados no Brasil.',
        theme_color: '#001525',
        background_color: '#001525',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-icon-512.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ].filter(Boolean),
=======
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
