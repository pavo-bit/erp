import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/workerDbSetup.ts', './src/tests/setup.ts'],
    exclude: [
      ...configDefaults.exclude,
      'dist/**',
      'tests/**',
      'src/tests/db/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        'src/routes/payments.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
        'src/routes/finance*.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
        'src/routes/auth.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
        'src/routes/students.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
        'src/routes/invoices.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
        'src/routes/teachers.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
        'src/middleware/auth.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
        'src/lib/prisma.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
        'src/middleware/school-context.middleware.ts': { lines: 80, functions: 80, branches: 80, perFile: true },
      }
    },
    testTimeout: 30000,
  }
});
