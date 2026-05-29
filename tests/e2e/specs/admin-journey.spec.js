const { test, expect } = require('@playwright/test');

test.describe('Admin Journey', () => {
  test('admin can login, view dashboard, manage doctors, view reports', async ({
    page,
  }) => {
    test.skip('Playwright E2E tests require running frontend + backend — implement when ready');
  });
});
