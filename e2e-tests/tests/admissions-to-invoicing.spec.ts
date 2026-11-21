import { test, expect } from '@playwright/test';
import { E2E_PASSWORD, E2E_USERS } from '../fixtures/seed';

test.describe('Admissions to Invoicing Critical Flow', () => {
  // Use a predictable test student name unique to this run
  const stamp = Date.now();
  const studentName = `E2E Student ${stamp}`;

  test('ERP Admin can login, create a student, and generate an invoice', async ({ page }) => {
    test.setTimeout(90000); // Next.js production server compiles pages on demand, increasing load times

    // --- 1. Authentication ---
    await page.goto('/', { timeout: 60000 });

    await page.getByPlaceholder(/email/i).fill(E2E_USERS.erpAdmin.email);
    await page.getByPlaceholder(/password/i).fill(E2E_PASSWORD);
    await page.getByRole('button', { name: /secure login/i }).click();

    // Verify successful login by waiting for the success message
    await expect(page.getByText(/login successful/i)).toBeVisible();

    // Wait for redirect to admin dashboard
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/.*\/admin/);

    // --- 2. Admissions (Student Creation) ---
    await page.goto('/admin/students', { timeout: 60000 });
    await page.waitForURL('**/admin/students');

    // Click the header "Add Student" action to open the enrollment drawer
    await page.getByRole('button', { name: 'Add Student' }).click();
    await expect(page.getByText('Register New Student')).toBeVisible();

    // Fill the official enrollment form
    await page.locator('input[name="firstName"]').fill(studentName);
    await page.locator('input[name="className"]').fill('10');
    await page.locator('input[name="section"]').fill('A');
    await page.locator('input[name="guardianPhone"]').fill('9876543210');
    await page.getByRole('button', { name: 'Save Student' }).click();

    // Verify student was created through the success lifecycle modal
    await expect(page.getByText('Student Added Successfully')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText(studentName)).toBeVisible({ timeout: 15000 });

    // --- 3. Invoicing ---
    await page.goto('/admin/fees', { timeout: 60000 });
    await page.waitForURL('**/admin/fees');
    await expect(page.getByText('Fee & Invoice Management')).toBeVisible();

    // Auto-accept the confirmation dialog raised by Auto-Generate Fees
    page.once('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: /auto-generate fees/i }).click();

    // The page reports the result inline; verify the API call completed successfully
    await expect(page.getByText('Monthly fees generated successfully!')).toBeVisible({ timeout: 15000 });
  });
});
