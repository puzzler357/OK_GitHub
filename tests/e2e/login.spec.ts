import { test, expect } from '@playwright/test';
import { OWNER_EMAIL } from './owner';

// Эти тесты идут без сохранённой сессии — приложение должно показать форму
// входа. Владелец к этому моменту уже создан проектом setup.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('экран входа', () => {
  test('без сессии показывается форма входа, а не приложение', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('main')).toHaveCount(0);
  });

  test('экран входа не подсказывает учётные данные', async ({ page }) => {
    await page.goto('/');

    // Раньше здесь были предзаполненные admin@global.tech / password123
    // и строка «Вход владельца: …» прямо на боевом экране.
    await expect(page.locator('#email')).toHaveValue('');
    await expect(page.locator('#password')).toHaveValue('');
    await expect(page.getByText(/password123/i)).toHaveCount(0);
  });

  test('неверный пароль показывает ошибку и не пускает внутрь', async ({ page }) => {
    await page.goto('/');

    await page.locator('#email').fill(OWNER_EMAIL);
    await page.locator('#password').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText(/Неверный/i)).toBeVisible();
    await expect(page.locator('main')).toHaveCount(0);
  });
});
