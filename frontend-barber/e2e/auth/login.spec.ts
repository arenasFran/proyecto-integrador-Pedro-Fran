import { test, expect } from '@playwright/test';
import { buildTestUser } from '../helpers/test-data';
import { registerUser } from '../helpers/api';

test('login exitoso de cliente registrado', async ({ page }) => {
  const user = buildTestUser();

  const registerResponse = await registerUser(user);
  expect(registerResponse.ok()).toBeTruthy();

  await page.goto('/login');

  await page.getByPlaceholder('Ingresa tu correo').fill(user.email);
  await page.getByPlaceholder('Ingresa tu contraseña').fill(user.password);

  const loginPromise = page.waitForResponse((res) => res.url().includes('/auth/login'));
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const loginResponse = await loginPromise;
  expect(loginResponse.status()).toBe(200);

  await expect(page).toHaveURL(/\/mis-turnos/, { timeout: 5000 });
});
