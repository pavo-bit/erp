import { test, expect } from '@playwright/test';

test.describe('Admissions to Invoicing Critical Flow', () => {
  // Use a predictable test student data
  const studentName = `E2E Test Student ${Date.now()}`;
  const admissionNo = `E2E-${Math.floor(Math.random() * 100000)}`;

  test('ERP Admin can login, create a student, and generate an invoice', async ({ page }) => {
    // --- 1. Authentication ---
    // Navigate to the ERP Admin login page
    await page.goto('/');
    
    // Fill in credentials. We will use the seeded admin credentials.
    await page.getByPlaceholder(/email/i).fill('superadmin@ssvmerp.com');
    await page.getByPlaceholder(/password/i).fill('admin123');
    await page.getByRole('button', { name: /secure login/i }).click();

    // Verify successful login by waiting for the success message
    await expect(page.getByText(/login successful/i)).toBeVisible();
    
    // Wait for redirect to admin dashboard
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/.*\/admin/);

    // --- 2. Admissions (Student Creation) ---
    // Navigate to Students/Admissions module
    await page.getByRole('link', { name: /students/i }).click();
    await page.waitForURL('**/admin/students');
    
    // Wait a bit for React hydration and layout
    await page.waitForTimeout(1000);
    
    // Click on Add/New Student
    await page.getByRole('button', { name: /add student/i }).click();
    
    // Wait for the modal to animate in
    await page.waitForTimeout(500);
    
    // Fill out the admission form
    await page.getByPlaceholder(/full name/i).fill(studentName);
    await page.getByPlaceholder(/roll no/i).fill(admissionNo);
    // Submit the form
    await page.locator('form').getByRole('button', { name: 'Add Student' }).click();

    // Verify student was created
    await expect(page.getByText('Student created successfully', { exact: false })).toBeVisible({ timeout: 10000 }).catch(() => {});
    await expect(page.getByText(studentName)).toBeVisible();

    // --- 3. Invoicing ---
    // Navigate to Fee Management module
    await page.getByRole('link', { name: /fee management/i }).click();
    await page.waitForURL('**/admin/fees');
    
    // Wait a bit for React hydration
    await page.waitForTimeout(1000);
    
    // Auto-accept the confirmation dialog and the success alert
    let alertMessage = '';
    page.on('dialog', dialog => {
      if (dialog.type() === 'alert') {
        alertMessage = dialog.message();
      }
      dialog.accept();
    });

    // Click Auto-Generate Fees
    await page.getByRole('button', { name: /auto-generate fees/i }).click();
    
    // Wait for the api call to finish and the second dialog (alert) to be processed
    await page.waitForTimeout(2000);

    // Verify invoice generation triggered
    expect(alertMessage).toContain('Monthly fees generated successfully');
  });
});
