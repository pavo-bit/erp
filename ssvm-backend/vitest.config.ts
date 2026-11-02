import { configDefaults, defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

const ratchetPath = path.resolve(__dirname, 'coverage-ratchet.json');
let thresholds = {
  lines: 0,
  functions: 0,
  branches: 0,
  statements: 0,
};

if (fs.existsSync(ratchetPath)) {
  try {
    thresholds = JSON.parse(fs.readFileSync(ratchetPath, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse coverage-ratchet.json', err);
  }
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    maxWorkers: 2,
    minWorkers: 1,
    setupFiles: ['./src/tests/workerDbSetup.ts', './src/tests/setup.ts'],
    exclude: [...configDefaults.exclude, 'dist/**', 'src/tests/db/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      thresholds,
    },
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
