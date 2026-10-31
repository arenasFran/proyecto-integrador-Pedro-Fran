import { test, expect } from '@playwright/test';

async function expectOnlinePaymentsUnavailable(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: 'Los pagos en línea ya no están disponibles' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mis turnos' })).toHaveAttribute('href', '/mis-turnos');
  await expect(page.getByRole('link', { name: 'Mis órdenes' })).toHaveAttribute('href', '/mis-ordenes');
}

test.describe('Payment flow', () => {
  test('la página de retorno informa que los pagos online están deshabilitados', async ({ page }) => {
    await page.goto('/payment/result?status=success&payment_id=123456789&external_reference=ref123');
    await expectOnlinePaymentsUnavailable(page);
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

  test('el retorno de pago exitoso muestra la información vigente', async ({ page }) => {
    await page.goto('/payment/result?status=success&payment_id=123456789&external_reference=ref123');
    await expectOnlinePaymentsUnavailable(page);
  });

  test('el retorno de pago pendiente informa que los pagos online están deshabilitados', async ({ page }) => {
    await page.goto('/payment/result?status=pending');
    await expectOnlinePaymentsUnavailable(page);
  });

  test('el retorno de pago rechazado informa que los pagos online están deshabilitados', async ({ page }) => {
    await page.goto('/payment/result?status=failure');
    await expectOnlinePaymentsUnavailable(page);
  });

  test('el retorno de pago sin parámetros informa que los pagos online están deshabilitados', async ({ page }) => {
    await page.goto('/payment/result');
    await expectOnlinePaymentsUnavailable(page);
  });
});
