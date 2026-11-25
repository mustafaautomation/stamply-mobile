import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const port = 4173;
const base = `http://127.0.0.1:${port}`;
fs.mkdirSync('docs/screenshots', { recursive: true });

const server = spawn('npx', ['serve', 'dist', '-l', String(port), '--no-port-switching', '-s'], {
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Server is still binding the port.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Screenshot server did not start');
}

try {
  await waitForServer();
  const browser = await chromium.launch();
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };

  const welcome = await browser.newPage(phone);
  await welcome.goto(base);
  await welcome.getByTestId('welcome-title').waitFor();
  await welcome.screenshot({ path: 'docs/screenshots/welcome.png' });
  await welcome.close();

  const wallet = await browser.newPage(phone);
  await wallet.goto(base);
  await wallet.getByTestId('demo-lina').click();
  await wallet.getByTestId('wallet-title').waitFor();
  await wallet.screenshot({ path: 'docs/screenshots/wallet.png' });
  await wallet.getByTestId('card_lina_espresso').click();
  await wallet.getByTestId('customer-qr').waitFor();
  await wallet.screenshot({ path: 'docs/screenshots/card.png' });
  await wallet.close();

  const counter = await browser.newPage(phone);
  await counter.goto(base);
  await counter.getByTestId('demo-omar').click();
  await counter.getByText('Counter', { exact: true }).click();
  await counter.getByTestId('open-scanner').click();
  await counter.getByTestId('token-input').fill('stmp_jonah_espresso');
  await counter.getByTestId('lookup-token').click();
  await counter.getByTestId('stamp-screen').filter({ visible: true }).getByText(/cooldown/i).waitFor();
  await counter.screenshot({ path: 'docs/screenshots/counter.png' });
  await counter.close();

  const dark = await browser.newPage(phone);
  await dark.goto(base);
  await dark.getByTestId('demo-lina').click();
  await dark.getByText('Account', { exact: true }).click();
  await dark.getByTestId('theme-dark').click();
  await dark.getByText('Wallet', { exact: true }).click();
  await dark.getByTestId('wallet-title').waitFor();
  await dark.screenshot({ path: 'docs/screenshots/wallet-dark.png' });
  await dark.setViewportSize({ width: 1100, height: 800 });
  await dark.screenshot({ path: 'docs/screenshots/wallet-desktop.png' });
  await dark.close();

  await browser.close();
  console.log('screenshots written');
} finally {
  server.kill('SIGTERM');
}
