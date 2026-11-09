import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/stream-s-songDB/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase') || id.includes('@firebase'))
              return 'firebase';
            if (id.includes('@dnd-kit')) return 'drag-and-drop';
            return 'vendor';
          }
        },
      },
    },
  },
});
