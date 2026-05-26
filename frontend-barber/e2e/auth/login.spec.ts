import { test, expect } from '@playwright/test';
import { buildTestUser, twoFactorCode } from '../helpers/test-data';
import { registerUser } from '../helpers/api';

test('login con 2FA exitoso', async ({ page }) => {
  const user = buildTestUser();

  const registerResponse = await registerUser(user);
  expect(registerResponse.ok()).toBeTruthy();

  await page.goto('/login');

  await page.getByPlaceholder('Ingresa tu correo').fill(user.email);
  await page.getByPlaceholder('Ingresa tu contraseña').fill(user.password);

  const sendPromise = page.waitForResponse(
    (res) => res.url().includes('/auth/2fa/send')
  );
  await page.getByRole('button', { name: 'Enviar código de verificación' }).click();
  const sendResponse = await sendPromise;
  expect(sendResponse.status()).toBe(200);

  await expect(page.getByText(`Código enviado a ${user.email}`)).toBeVisible();
  await page.getByPlaceholder('Ingresa el código de 6 dígitos').fill(twoFactorCode);

  const verifyPromise = page.waitForResponse(
    (res) => res.url().includes('/auth/2fa/verify')
  );
  await page.getByRole('button', { name: 'Verificar código' }).click();
  const verifyResponse = await verifyPromise;
  expect(verifyResponse.status()).toBe(200);

  await expect(page.getByText('Login exitoso')).toBeVisible();
  await expect.poll(async () =>
    page.evaluate(() => localStorage.getItem('authToken'))
  ).not.toBeNull();
});
