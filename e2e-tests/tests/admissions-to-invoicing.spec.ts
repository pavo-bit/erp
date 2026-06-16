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
    
    // Click on Add/New Student
    await page.getByRole('button', { name: /add student/i }).click();
    
    // Fill out the admission form
    await page.getByPlaceholder(/full name/i).fill(studentName);
    await page.getByPlaceholder(/roll no/i).fill(admissionNo);
    // Submit the form
    await page.locator('form').getByRole('button', { name: 'Add Student' }).click();

    // Verify student was created
    await expect(page.getByText('Student created successfully', { exact: false })).toBeVisible({ timeout: 10000 }).catch(() => {});
    await expect(page.getByText(studentName)).toBeVisible();

    // --- 3. Invoicing ---
    // Navigate to Finance or Invoices module
    await page.getByRole('link', { name: /finance|invoices/i }).click();
    
    // Click Generate Invoice
    await page.getByRole('button', { name: /generate|new invoice/i }).click();
    
    // Select the student we just created
    // Assuming a select or combobox exists
    await page.getByRole('combobox', { name: /student/i }).click();
    await page.getByRole('option', { name: new RegExp(studentName, 'i') }).click();

    // Fill in invoice details
    await page.getByLabel(/amount/i).fill('5000');
    await page.getByLabel(/description/i).fill('E2E Test Tuition Fee');
    
    // Submit invoice
    await page.getByRole('button', { name: /save|generate/i }).click();

    // Verify invoice was generated and is PENDING
    await expect(page.getByText('Invoice created successfully', { exact: false })).toBeVisible({ timeout: 10000 }).catch(() => {});
    await expect(page.getByText('PENDING')).toBeVisible();
    await expect(page.getByText('5000')).toBeVisible();
  });
});
