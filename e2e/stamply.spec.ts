import { expect, test } from '@playwright/test';

test('customer demo opens a stamp card and its QR', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('welcome-title')).toBeVisible();
  await page.getByTestId('demo-lina').click();
  await expect(page.getByTestId('wallet-title')).toBeVisible();
  await expect(page.getByText('Harbor & Rye').first()).toBeVisible();
  await page.getByTestId('card_lina_espresso').click();
  await expect(page.getByTestId('stamp-progress')).toContainText('5 of 8');
  await expect(page.getByTestId('customer-qr')).toBeVisible();
  await expect(page.getByTestId('apple-wallet')).toBeVisible();
});

test('staff stamps a card and cooldown still allows a redemption', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('demo-omar').click();
  await page.getByRole('tab', { name: 'Counter' }).or(page.getByText('Counter', { exact: true })).first().click();
  await page.getByTestId('open-scanner').click();
  await page.getByTestId('token-input').fill('stmp_lina_espresso');
  await page.getByTestId('lookup-token').click();
  const visibleStamp = () => page.getByTestId('stamp-screen').filter({ visible: true });
  await expect(visibleStamp().getByText('Lina Chen')).toBeVisible();
  await visibleStamp().getByTestId('pin-input').fill('2468');
  await visibleStamp().getByTestId('add-stamp').click();
  await expect(visibleStamp().getByTestId('stamp-result')).toContainText('Stamp added');

  await page.getByTestId('back-button').filter({ visible: true }).click();
  await page.getByTestId('token-input').filter({ visible: true }).fill('stmp_jonah_espresso');
  await page.getByTestId('lookup-token').filter({ visible: true }).click();
  await expect(visibleStamp().getByText(/cooldown/i)).toBeVisible();
  await visibleStamp().getByTestId('pin-input').fill('2468');
  await visibleStamp().getByTestId('redeem').click();
  await expect(visibleStamp().getByTestId('stamp-result')).toContainText('redeemed');
});

test('magic link creates an empty wallet', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('email-input').fill('new.guest@example.com');
  await page.getByTestId('send-magic-link').click();
  await expect(page.getByTestId('magic-code')).toContainText('000000');
  await page.getByTestId('code-input').fill('000000');
  await page.getByTestId('verify-code').click();
  await expect(page.getByTestId('empty-wallet')).toBeVisible();
});

test('org switcher filters the wallet and dark mode stays usable', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('demo-lina').click();
  await page.getByTestId('org-switcher').click();
  await page.getByTestId('org-northline').click();
  await expect(page.getByTestId('card_lina_loaf')).toBeVisible();
  await expect(page.getByTestId('card_lina_espresso')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Account' }).or(page.getByText('Account', { exact: true })).first().click();
  await page.getByTestId('theme-dark').click();
  await expect(page.getByText('Lina Chen').first()).toBeVisible();
  await page.getByTestId('enable-push').click();
  await expect(page.getByTestId('push-status')).toBeVisible();
  await page.getByTestId('sign-out').click();
  await expect(page.getByTestId('welcome-title')).toBeVisible();
});

test('customer deep link resolves after sign-in', async ({ page }) => {
  await page.goto('/c/stmp_lina_espresso');
  await page.getByTestId('demo-omar').click();
  await expect(page.getByTestId('stamp-screen')).toBeVisible();
  await expect(page.getByText('Lina Chen').first()).toBeVisible();
});
