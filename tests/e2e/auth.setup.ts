import { test as setup, expect } from '@playwright/test';
import { storageStatePath } from './paths';

const EMAIL = 'admin@global.tech';
const PASSWORD = 'password123';

/**
 * Логинимся один раз и сохраняем localStorage (zustand persist) —
 * остальные тесты стартуют уже авторизованными.
 */
setup('вход владельца сохраняет сессию', async ({ page }) => {
  await page.goto('/');

  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();

  // После успешного входа рендерится Layout с боковым меню и main.
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('nav')).toBeVisible();

  await page.context().storageState({ path: storageStatePath });
});
