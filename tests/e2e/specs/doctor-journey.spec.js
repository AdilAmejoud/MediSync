const { test, expect } = require('@playwright/test');

test.describe('Doctor Journey', () => {
  test('doctor can login, view appointments, manage schedule', async ({
    page,
  }) => {
    test.skip('Playwright E2E tests require running frontend + backend — implement when ready');
  });
});
