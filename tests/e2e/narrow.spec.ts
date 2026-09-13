import { test, expect } from '@playwright/test';
import { ROUTES } from './routes';

/**
 * Минимальное окно приложения — 1024×700 (задано в tauri.conf.json).
 *
 * Проверка не про красоту, а про то, что содержимое помещается: если страница
 * начинает горизонтально прокручиваться целиком, часть интерфейса становится
 * недоступной — именно так вели себя длинные модалки и широкие колонки.
 *
 * Горизонтальная прокрутка внутри таблиц — нормальна и ожидаема (табель на 31
 * день иначе не показать); проверяется именно прокрутка документа.
 */
test.use({ viewport: { width: 1024, height: 700 } });

test.describe('минимальное окно 1024×700', () => {
  for (const route of ROUTES) {
    test(`${route.path} — ${route.title}: помещается по ширине`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
      });

      // Допуск в пару пикселей: субпиксельные округления границ дают
      // расхождение, которое пользователь никогда не увидит.
      expect(
        overflow.scrollWidth,
        `${route.path}: документ шире окна на ${overflow.scrollWidth - overflow.clientWidth} px`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 2);
    });
  }

  test('длинная модалка прокручивается внутри себя, а не обрезается', async ({ page }) => {
    await page.goto('/timeoff');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Подать заявку' }).first().click();

    const dialog = page.locator('.max-h-\\[85vh\\]').first();
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    expect(box, 'модалка не отрисована').not.toBeNull();
    // Модалка обязана помещаться в окно — иначе её нижняя часть, включая
    // кнопки, оказывается недостижимой.
    expect(box!.y + box!.height).toBeLessThanOrEqual(700);
  });
});
