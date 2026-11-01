import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 1,
      },
    },
    setupFiles: ['./src/tests/workerDbSetup.ts', './src/tests/setup.ts'],
    exclude: [...configDefaults.exclude, 'dist/**', 'tests/**', 'src/tests/db/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        'src/routes/finance.ts': { lines: 80, functions: 80, branches: 70 },
        'src/routes/auth.ts': { lines: 80, functions: 80, branches: 70 },
        'src/routes/tenant.ts': { lines: 80, functions: 80, branches: 70 },
        'src/middleware/auth.ts': { lines: 80, functions: 80, branches: 70 },
        'src/middleware/school-context.middleware.ts': { lines: 80, functions: 80, branches: 70 },
      },
    },
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
