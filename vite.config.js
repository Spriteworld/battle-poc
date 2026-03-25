import { defineConfig } from 'vite';
import { resolve } from 'path';


export default defineConfig({
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
  },
  define: {
    'process.env': {}
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'SpriteworldBattle',
      fileName: 'battle',
    },
    rollupOptions: {
      // The host app supplies these — don't bundle them
      external: ['phaser', '@spriteworld/pokemon-data'],
      output: {
        globals: {
          phaser: 'Phaser',
          '@spriteworld/pokemon-data': 'SpriteworldPokemonData',
        },
      },
    },
    outDir: 'dist/lib',
  },
});
