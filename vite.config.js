import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.ASSETS_PROXY_TARGET;

  return {
    plugins: [tailwindcss(), vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@Data': resolve(__dirname, 'src/data/'),
        '@Maps': resolve(__dirname, 'src/maps/'),
        '@Objects': resolve(__dirname, 'src/objects/'),
        '@Tileset': resolve(__dirname, 'src/tileset/'),
        '@Scenes': resolve(__dirname, 'src/scenes/'),
        '@Utilities': resolve(__dirname, 'src/utilities/')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 8086,
      allowedHosts: true,
      ...(proxyTarget ? {
        proxy: {
          '/tileset': { target: proxyTarget, changeOrigin: true },
        },
      } : {}),
    },
    define: {
      'process.env': {}
    },
    build: {
      assetsInlineLimit: 0,
      minify: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          test: resolve(__dirname, 'test.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        }
      }
    },
  };
});
