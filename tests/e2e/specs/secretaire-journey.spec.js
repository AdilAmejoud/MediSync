const { test, expect } = require('@playwright/test');

test.describe('Secretaire Journey', () => {
  test('secretaire can login, manage appointments, register patients', async ({
    page,
  }) => {
    test.skip('Playwright E2E tests require running frontend + backend — implement when ready');
  });
});
