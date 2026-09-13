import { test, expect } from '@playwright/test';

// Эти тесты идут без сохранённой сессии — приложение должно показать форму входа.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('экран входа', () => {
  test('без сессии показывается форма входа, а не приложение', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('main')).toHaveCount(0);
  });

  test('неверный пароль показывает ошибку и не пускает внутрь', async ({ page }) => {
    await page.goto('/');

    await page.locator('#email').fill('admin@global.tech');
    await page.locator('#password').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText(/Неверный/i)).toBeVisible();
    await expect(page.locator('main')).toHaveCount(0);
  });
});
