const { test, expect } = require('@playwright/test');

test.describe('Patient Journey', () => {
  test('user can register, login, browse doctors, book and cancel appointment', async ({
    page,
  }) => {
    test.skip('Playwright E2E tests require running frontend + backend — implement when ready');
  });
});
