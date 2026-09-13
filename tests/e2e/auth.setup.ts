import { test as setup, expect } from '@playwright/test';
import { storageStatePath } from './paths';
import { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD } from './owner';

/**
 * Первичная настройка и вход.
 *
 * Приложение поставляется без учётной записи: пароль по умолчанию в сиде —
 * это пароль, который знают все. Поэтому на чистой базе первый экран — не
 * вход, а создание владельца. Проходим его один раз и сохраняем localStorage
 * (zustand persist), чтобы остальные тесты стартовали авторизованными.
 */
setup('первичная настройка создаёт владельца и сохраняет сессию', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#name')).toBeVisible();

  await page.locator('#name').fill(OWNER_NAME);
  await page.locator('#email').fill(OWNER_EMAIL);
  await page.locator('#password').fill(OWNER_PASSWORD);
  await page.locator('#repeat').fill(OWNER_PASSWORD);
  await page.getByRole('button', { name: 'Создать и войти' }).click();

  // После успешной настройки рендерится Layout с боковым меню и main.
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('nav')).toBeVisible();

  await page.context().storageState({ path: storageStatePath });
});
