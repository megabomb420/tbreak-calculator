import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'happy-dom',
    include: ['tests/ui/**/*.test.ts', 'tests/ui/**/*.test.tsx'],
    setupFiles: ['tests/ui/setup.ts'],
  },
});
