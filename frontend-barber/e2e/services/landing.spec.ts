import { expect, test } from '@playwright/test';

test('la landing espera los servicios reales antes de mostrar sus imágenes', async ({ page }) => {
  let releaseServicesResponse!: () => void;
  const servicesResponseGate = new Promise<void>((resolve) => {
    releaseServicesResponse = resolve;
  });

  await page.route('**/api/services', async (route) => {
    await servicesResponseGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        services: [
          {
            id: 'beard-service',
            name: 'Barba',
            description: 'Perfilado y recorte de barba',
            price: 250,
            durationMinutes: 25,
            imageUrl: '/service-beard.webp',
            status: 'active',
          },
        ],
      }),
    });
  });

  await page.goto('/');
  const servicesSection = page.locator('#servicios');
  await servicesSection.scrollIntoViewIfNeeded();
  await expect(servicesSection.locator('.services-grid')).toHaveAttribute('aria-busy', 'true');
  await expect(servicesSection.getByRole('img', { name: 'Barba' })).toHaveCount(0);

  releaseServicesResponse();

  await expect(servicesSection.getByRole('img', { name: 'Barba' })).toHaveAttribute(
    'src',
    '/Corte de barba.png'
  );
});
