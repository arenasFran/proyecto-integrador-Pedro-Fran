import { expect, test } from '@playwright/test';
import { getTwoFactorCode } from '../helpers/api';

test('crud de profesionales desde el panel', async ({ page }) => {
  const uniqueId = Date.now().toString();
  const admin = {
    email: 'admin@example.com',
    password: 'Admin123!',
  };
  const nameValue = `Juan${uniqueId.slice(-4)}`;
  const lastnameValue = `Perez${uniqueId.slice(-4)}`;
  const fullName = `${nameValue} ${lastnameValue}`;
  const createdEmail = `juan.perez.${uniqueId}@example.com`;
  const createdPhone = `099${uniqueId.slice(-6).padStart(6, '0')}`;

  await page.goto('/login');

  await page.getByPlaceholder('Ingresa tu correo').fill(admin.email);
  await page.getByPlaceholder('Ingresa tu contraseña').fill(admin.password);

  const sendPromise = page.waitForResponse((response) => response.url().includes('/auth/2fa/send'));
  await page.getByRole('button', { name: 'Enviar código de verificación' }).click();
  const sendResponse = await sendPromise;
  expect(sendResponse.status()).toBe(200);

  const code = await getTwoFactorCode(admin.email);
  await page.getByPlaceholder('Ingresa el código de 6 dígitos').fill(code);

  const verifyPromise = page.waitForResponse(
    (response) => response.url().includes('/auth/2fa/verify')
  );
  await page.getByRole('button', { name: 'Verificar código' }).click();
  const verifyResponse = await verifyPromise;
  expect(verifyResponse.status()).toBe(200);

  await expect.poll(async () => page.evaluate(() => localStorage.getItem('authToken'))).not.toBeNull();

  await page.goto('/admin/profesionales');
  await expect(page.getByRole('heading', { name: 'Profesionales' })).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo barbero' }).click();

  await page.getByLabel('Nombre').fill(nameValue);
  await page.getByLabel('Apellido').fill(lastnameValue);
  await page.getByLabel('Email').fill(createdEmail);
  await page.getByLabel('Teléfono').fill(createdPhone);
  await page.getByLabel('Contraseña').fill('Admin123!');
  await page.getByLabel('Edad').fill('28');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Duración del turno').fill('45');
  await page.getByRole('switch', { name: 'Activar horario de Lunes' }).click();
  await page.getByLabel('Inicio Lunes', { exact: true }).fill('09:00');
  await page.getByLabel('Fin Lunes', { exact: true }).fill('18:00');
  await page.getByRole('button', { name: 'Agregar break' }).click();
  await page.getByLabel('Break inicio Lunes').fill('13:00');
  await page.getByLabel('Break fin Lunes').fill('14:00');
  await page.getByRole('switch', { name: 'Activar horario de Sábado' }).click();
  await page.getByLabel('Inicio Sábado', { exact: true }).fill('09:00');
  await page.getByLabel('Fin Sábado', { exact: true }).fill('13:00');

  const createResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/barbers') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Crear barbero' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const createdProfessional = (await createResponse.json()) as { id: string };
  const professionalId = createdProfessional.id;

  const createdCard = page.getByRole('heading', { name: fullName });
  await expect(createdCard).toBeVisible();

  const cardContainer = createdCard.locator('xpath=ancestor::div[contains(@class,"rounded-[18px]")]');
  await cardContainer.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByLabel('Duración del turno').fill('60');

  const updateBarberPromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/barbers/${professionalId}`) && response.request().method() === 'PUT'
  );
  const updateSchedulePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/barbers/${professionalId}/schedule`) &&
      response.request().method() === 'PUT'
  );
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  expect((await updateBarberPromise).status()).toBe(200);
  expect((await updateSchedulePromise).status()).toBe(200);

  await expect(cardContainer.getByText('60 min')).toBeVisible();

  const deletePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/barbers/${professionalId}`) &&
      response.request().method() === 'DELETE'
  );
  page.once('dialog', (dialog) => dialog.accept());
  await cardContainer.getByRole('button', { name: 'Eliminar' }).click();
  const deleteResponse = await deletePromise;
  expect(deleteResponse.status()).toBe(200);
  await expect(createdCard).not.toBeVisible();
});