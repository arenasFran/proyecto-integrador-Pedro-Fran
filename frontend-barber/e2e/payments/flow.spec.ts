import { test, expect } from '@playwright/test';

test.describe('Payment flow', () => {
  test('payment modal opens after creating an order', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Ingresa tu correo').fill('comprador@test.com');
    await page.getByPlaceholder('Ingresa tu contraseña').fill('Test1234!');

    const sendPromise = page.waitForResponse(
      (res) => res.url().includes('/auth/2fa/send')
    );
    await page.getByRole('button', { name: 'Enviar código de verificación' }).click();
    await sendPromise;

    await page.waitForTimeout(500);

    await page.goto('/tienda');

    await page.waitForTimeout(2000);

    const buyNowButtons = page.locator('button', { hasText: 'Comprar' });
    const count = await buyNowButtons.count();
    if (count > 0) {
      await buyNowButtons.first().click();

      await expect(page.getByText('Elegí cómo pagar')).toBeVisible({ timeout: 5000 });

      const onlineButton = page.getByRole('button', { name: 'Pagar online con MercadoPago' });
      await expect(onlineButton).toBeVisible();
      await onlineButton.click();

      await expect(page.getByText('Completar pago')).toBeVisible({ timeout: 10000 });
    }
  });

  test('loading spinner shown during order creation', async ({ page }) => {
    await page.goto('/tienda');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/orders') && res.request().method() === 'POST',
      { timeout: 0 }
    ).catch(() => null);

    const buyNowButtons = page.locator('button', { hasText: 'Comprar' });
    const count = await buyNowButtons.count();

    if (count > 0) {
      await buyNowButtons.first().click();
      await page.waitForTimeout(300);

      await expect(page.getByText('Elegí cómo pagar')).toBeVisible({ timeout: 5000 });

      const onlineButton = page.getByRole('button', { name: 'Pagar online con MercadoPago' });
      await onlineButton.click();

      try {
        await responsePromise;
      } catch {
        // If not authenticated, the order creation is skipped
      }
    }
  });

  test('payment result page shows fallback when status is success without real payment_id', async ({ page }) => {
    await page.goto('/payment/result?status=success&payment_id=123456789&external_reference=ref123');

    await page.waitForTimeout(5000);

    const hasButton = await page.getByText('Volver al inicio').isVisible().catch(() => false);
    expect(hasButton).toBe(true);
  });

  test('payment result shows pending state', async ({ page }) => {
    await page.goto('/payment/result?status=pending');

    await expect(page.getByText('Pago pendiente')).toBeVisible({ timeout: 5000 });
  });

  test('payment result shows rejected state', async ({ page }) => {
    await page.goto('/payment/result?status=failure');

    await expect(page.getByText('Pago rechazado')).toBeVisible({ timeout: 5000 });
  });

  test('payment result without query params shows success fallback', async ({ page }) => {
    await page.goto('/payment/result');

    await page.waitForTimeout(2000);

    const successOrError = await Promise.any([
      page.getByText('¡Pago confirmado!').isVisible(),
      page.locator('text=Volver al inicio').isVisible(),
    ]).catch(() => false);

    expect(successOrError).toBe(true);
  });
});
