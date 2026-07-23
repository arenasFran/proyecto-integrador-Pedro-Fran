import { test, expect } from '@playwright/test';
import { buildTestUser } from '../helpers/test-data';

test('registro exitoso', async ({ page }) => {
  const user = buildTestUser();

  await page.goto('/register');

  await page.getByPlaceholder('Nombre').fill(user.name);
  await page.getByPlaceholder('Apellido').fill(user.lastname);
  await page.getByPlaceholder('correo@email.com').fill(user.email);
  await page.getByPlaceholder('598 91 234 567').fill(user.phone);
  await page.getByPlaceholder('Mínimo 8 caracteres, mayúscula, minúscula y número').fill(user.password);
  await page.getByPlaceholder('Repite tu contraseña').fill(user.repeatPassword);

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/auth/register')
  );
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(201);
  await expect(page.getByText('¡Registro exitoso!')).toBeVisible({ timeout: 5000 });
});
