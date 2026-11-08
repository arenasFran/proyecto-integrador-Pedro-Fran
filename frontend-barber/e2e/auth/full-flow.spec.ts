import { test, expect } from '@playwright/test';
import { buildTestUser } from '../helpers/test-data';

test('register -> login de cliente', async ({ page }) => {
  const user = buildTestUser();

  await page.goto('/register');

  await page.getByPlaceholder('Nombre').fill(user.name);
  await page.getByPlaceholder('Apellido').fill(user.lastname);
  await page.getByPlaceholder('correo@email.com').fill(user.email);
  await page.getByPlaceholder('598 91 234 567').fill(user.phone);
  await page.getByPlaceholder('Mínimo 8 caracteres, mayúscula, minúscula y número').fill(user.password);
  await page.getByPlaceholder('Repite tu contraseña').fill(user.repeatPassword);
  await page.getByRole('checkbox', { name: /He leído y acepto/i }).check();

  const regPromise = page.waitForResponse(
    (res) => res.url().includes('/auth/register')
  );
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  const regResponse = await regPromise;
  expect(regResponse.status()).toBe(201);

  await expect(page.getByText(/Registro exitoso/)).toBeVisible({ timeout: 5000 });
  await page.waitForURL(/\/login/, { timeout: 5000 });

  await page.getByPlaceholder('Ingresa tu correo').fill(user.email);
  await page.getByPlaceholder('Ingresa tu contraseña').fill(user.password);

  const loginPromise = page.waitForResponse((res) => res.url().includes('/auth/login'));
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const loginResponse = await loginPromise;
  expect(loginResponse.status()).toBe(200);

  await expect(page).toHaveURL(/\/mis-turnos/, { timeout: 5000 });
});
