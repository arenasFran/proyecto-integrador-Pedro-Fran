import type { Route } from '@playwright/test';

export const mockJson = async (route: Route, status: number, body: Record<string, unknown>) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

export const abortRequest = async (route: Route) => {
  await route.abort('connectionfailed');
};

export const mockTimeout = async (route: Route) => {
  await new Promise((resolve) => setTimeout(resolve, 35000));
  await route.fulfill({ status: 504, contentType: 'application/json', body: '{}' });
};
