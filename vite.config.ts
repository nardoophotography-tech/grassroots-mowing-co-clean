import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      hmr: false,
    },

    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 4173,
      allowedHosts: true,
    },

    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
    },
  };
});
