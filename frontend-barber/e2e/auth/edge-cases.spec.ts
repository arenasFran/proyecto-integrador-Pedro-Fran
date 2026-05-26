import { test, expect } from '@playwright/test';
import { buildTestUser, twoFactorCode } from '../helpers/test-data';
import { abortRequest, mockJson } from '../helpers/mocks';

test('login rechaza credenciales invalidas', async ({ page }) => {
  const user = buildTestUser();

  await page.route('**/auth/2fa/send', (route) =>
    mockJson(route, 401, { error: 'Email y/o contraseña incorrectos.' })
  );

  await page.goto('/login');
  await page.getByPlaceholder('Ingresa tu correo').fill(user.email);
  await page.getByPlaceholder('Ingresa tu contraseña').fill(user.password);
  await page.getByRole('button', { name: 'Enviar código de verificación' }).click();

  await expect(page.getByText('Email y/o contraseña incorrectos.')).toBeVisible();
});

test('muestra error cuando el codigo 2FA expira', async ({ page }) => {
  const user = buildTestUser();

  await page.route('**/auth/2fa/send', (route) =>
    mockJson(route, 200, { message: 'Código enviado al email' })
  );
  await page.route('**/auth/2fa/verify', (route) =>
    mockJson(route, 401, { error: 'El código expiró.' })
  );

  await page.goto('/login');
  await page.getByPlaceholder('Ingresa tu correo').fill(user.email);
  await page.getByPlaceholder('Ingresa tu contraseña').fill(user.password);
  await page.getByRole('button', { name: 'Enviar código de verificación' }).click();

  await expect(page.getByText(`Código enviado a ${user.email}`)).toBeVisible();

  await page.getByPlaceholder('Ingresa el código de 6 dígitos').fill(twoFactorCode);
  await page.getByRole('button', { name: 'Verificar código' }).click();

  await expect(page.getByText('El código expiró.')).toBeVisible();
});

test('muestra error de red en login', async ({ page }) => {
  const user = buildTestUser();

  await page.route('**/auth/2fa/send', (route) => abortRequest(route));

  await page.goto('/login');
  await page.getByPlaceholder('Ingresa tu correo').fill(user.email);
  await page.getByPlaceholder('Ingresa tu contraseña').fill(user.password);
  await page.getByRole('button', { name: 'Enviar código de verificación' }).click();

  await expect(page.getByText('No se pudo conectar al servidor')).toBeVisible();
});

test('registro rechaza email ya existente', async ({ page }) => {
  const user = buildTestUser();

  await page.route('**/auth/register', (route) =>
    mockJson(route, 409, { error: 'Email en uso.' })
  );

  await page.goto('/register');

  await page.getByPlaceholder('Nombre').fill(user.name);
  await page.getByPlaceholder('Apellido').fill(user.lastname);
  await page.getByPlaceholder('correo@email.com').fill(user.email);
  await page.getByPlaceholder('+54 9 11 1234 5678').fill(user.phone);
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(user.password);
  await page.getByPlaceholder('Repite tu contraseña').fill(user.repeatPassword);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByText('Email en uso.')).toBeVisible();
});
