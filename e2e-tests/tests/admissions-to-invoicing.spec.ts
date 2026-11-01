import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

test.describe('ERP Admin admissions', () => {
  test('authenticates, creates a student, and establishes an HttpOnly cookie session', async ({ page, context }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required for authenticated portal E2E.');
    }

    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/password/i).fill(password);
    await page.getByRole('button', { name: /secure login/i }).click();

    await expect(page).toHaveURL(/\/admin(?:\/|$)/);

    const studentName = `E2E Student ${randomUUID()}`;
    const rollNumber = `E2E-${randomUUID()}`;
    await page.goto('/admin/students');
    await page.getByRole('button', { name: /add student/i }).click();
    await page.getByPlaceholder(/full name/i).fill(studentName);
    await page.getByPlaceholder(/roll no/i).fill(rollNumber);
    await page.getByPlaceholder(/class/i).fill('10');
    await page.getByPlaceholder(/section/i).fill('A');
    await page.locator('form').getByRole('button', { name: 'Add Student' }).click();
    await expect(page.getByText(studentName, { exact: true })).toBeVisible();

    const cookies = await context.cookies();
    expect(cookies.some((cookie) => cookie.name === 'access_token' && cookie.httpOnly)).toBe(true);
    const browserTokenKeys = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => /token/i.test(key)),
    );
    expect(browserTokenKeys).toEqual([]);
  });
});
