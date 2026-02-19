import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

/** Treat .geojson files as JSON modules */
function geojsonPlugin() {
  return {
    name: 'vite-plugin-geojson',
    transform(src, id) {
      if (id.endsWith('.geojson')) {
        return {
          code: `export default ${src}`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), geojsonPlugin()],
  base: process.env.NODE_ENV === 'production' ? '/maraton-cali/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
