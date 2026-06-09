import { test, expect } from '@playwright/test';
import { buildTestUser } from '../helpers/test-data';
import { getTwoFactorCode } from '../helpers/api';

test('register -> login -> 2FA', async ({ page }) => {
  const user = buildTestUser();

  await page.goto('/register');

  await page.getByPlaceholder('Nombre').fill(user.name);
  await page.getByPlaceholder('Apellido').fill(user.lastname);
  await page.getByPlaceholder('correo@email.com').fill(user.email);
  await page.getByPlaceholder('+54 9 11 1234 5678').fill(user.phone);
  await page.getByPlaceholder('Mínimo 8 caracteres, mayúscula, minúscula y número').fill(user.password);
  await page.getByPlaceholder('Repite tu contraseña').fill(user.repeatPassword);

  const regPromise = page.waitForResponse(
    (res) => res.url().includes('/auth/register')
  );
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  const regResponse = await regPromise;
  expect(regResponse.status()).toBe(201);

  await expect(page.getByText('¡Registro exitoso!')).toBeVisible({ timeout: 5000 });
  await page.waitForURL(/\/login/, { timeout: 5000 });

  await page.getByPlaceholder('Ingresa tu correo').fill(user.email);
  await page.getByPlaceholder('Ingresa tu contraseña').fill(user.password);

  const sendPromise = page.waitForResponse(
    (res) => res.url().includes('/auth/2fa/send')
  );
  await page.getByRole('button', { name: 'Enviar código de verificación' }).click();
  const sendResponse = await sendPromise;
  expect(sendResponse.status()).toBe(200);

  await expect(page.getByText(`Código enviado a ${user.email}`)).toBeVisible();
  const code = await getTwoFactorCode(user.email);
  await page.getByPlaceholder('Ingresa el código de 6 dígitos').fill(code);

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
