const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ritmo-browser-'));
  const reservation = net.createServer();
  await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
  const port = reservation.address().port;
  await new Promise((r) => reservation.close(r));
  const base = `http://localhost:${port}`;
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      TRUST_PROXY: '0',
      PORT: String(port),
      SITE_URL: base,
      DATABASE_PATH: path.join(directory, 'browser.sqlite'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let browser;
  const checks = [],
    errors = [];
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('El servidor de prueba no arrancó')),
        15000,
      );
      child.stdout.on('data', (data) => {
        if (data.toString().includes('Ritmo:')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code) reject(new Error('El servidor de prueba terminó antes de iniciar'));
      });
    });
    browser = await chromium.launch({
      headless: true,
      ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(base);
    await page.getByText('Vista previa · datos de ejemplo', { exact: true }).waitFor();
    await page.locator('.event').first().click();
    await page.locator('#topic').fill('Mi primera sesión propia');
    await page.locator('#save-session').click();
    await page.locator('#session-dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.event').count(), 1);
    await page.reload();
    await page.getByText('Guardado en este navegador', { exact: true }).waitFor();
    checks.push('Demo edit becomes one real local session; reload persists it');
    await page.locator('#account-button').click();
    await page.locator('#auth-switch').click();
    await page.locator('#email').fill('browser-test@example.test');
    await page.locator('#password').fill('una frase segura para esta prueba');
    await page.locator('#auth-submit').click();
    await page.locator('#account-dialog').waitFor({ state: 'hidden' });
    await page.getByText('Guardado en tu cuenta', { exact: true }).waitFor();
    assert.equal(await page.locator('.event').count(), 0);
    checks.push('Registration creates an empty private account');
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.locator('#upload-local-button').click();
    await page.locator('#confirm-dialog button[value=confirm]').click();
    await page.getByText('Importación completada: 1 sesiones añadidas.', { exact: true }).waitFor();
    checks.push('Explicit local-to-account import');
    await page.getByRole('link', { name: 'Mi semana', exact: true }).click();
    await page.locator('#plan-button').click();
    await page.locator('#topic').fill('<img src=x onerror=alert(1)>');
    await page.locator('#subject').fill('Prueba de accesibilidad');
    await page.locator('#time').fill('22:30');
    await page.locator('#minutes').fill('25');
    await page.locator('#save-session').click();
    await page.locator('#session-dialog').waitFor({ state: 'hidden' });
    await page.reload();
    await page.getByText('Guardado en tu cuenta', { exact: true }).waitFor();
    assert.equal(await page.locator('.event').count(), 2);
    checks.push('Plan at 22:30 persists; calendar expands for late sessions; text stays escaped');
    await page.getByRole('link', { name: 'Mis sesiones', exact: true }).click();
    await page.locator('#search').fill('<img');
    assert.equal(await page.locator('#all-sessions tbody tr').count(), 1);
    assert.equal(await page.locator('#all-sessions img').count(), 0);
    await page.locator('#all-sessions [data-edit]').click();
    await page.locator('#delete-session').click();
    await page.locator('#confirm-dialog button[value=confirm]').click();
    await page.locator('#session-dialog').waitFor({ state: 'hidden' });
    checks.push('Search, edit and confirmed delete; HTML is rendered as text');
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.locator('#weekly-goal').fill('450');
    await page.locator('#goal-form button').click();
    await page.getByText('Tu meta semanal está actualizada.', { exact: true }).waitFor();
    await page.reload();
    assert.equal(await page.locator('#weekly-goal').inputValue(), '450');
    const download = page.waitForEvent('download');
    await page.locator('#export-button').click();
    assert.match((await download).suggestedFilename(), /^ritmo-.*\.json$/);
    checks.push('Goal persists and JSON export downloads');
    await page.getByRole('link', { name: 'Mi semana', exact: true }).click();
    await page.locator('.timer-options summary').click();
    await page.locator('[data-duration="15"]').click();
    await page.locator('#timer-start').click();
    await page.waitForTimeout(1100);
    await page.locator('#timer-start').click();
    assert.notEqual(await page.locator('#timer').textContent(), '15:00');
    const time = await page.locator('#timer').textContent();
    await page.reload();
    assert.equal(await page.locator('#timer').textContent(), time);
    checks.push('Timer duration, pause and reload restoration');
    await page.locator('.timer-options summary').click();
    await page.locator('#immersive-button').click();
    assert.ok(await page.locator('body').evaluate((el) => el.classList.contains('immersive')));
    await page.keyboard.press('Escape');
    assert.ok(!(await page.locator('body').evaluate((el) => el.classList.contains('immersive'))));
    checks.push('Immersive mode exits with Escape');
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(base);
    await guestPage.getByText('Vista previa · datos de ejemplo', { exact: true }).waitFor();
    assert.equal((await guestPage.request.get(base + '/api/state')).status(), 401);
    checks.push('New browser context has no access to private account');
    await guest.close();
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.locator('#settings-account').click();
    await page.getByText('Sesión cerrada.', { exact: true }).waitFor();
    assert.equal((await page.request.get(base + '/api/state')).status(), 401);
    checks.push('Logout revokes browser access');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally {
    await browser?.close();
    if (child.exitCode === null) {
      child.kill();
      await new Promise((r) => child.once('exit', r));
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
