import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.js';
const origin = 'http://ritmo.test';
test('API: authentication, private ownership, persistence, import and public HTTP behavior', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ritmo-test-'));
  let app = await createApp({
    production: false,
    databasePath: join(directory, 'db.sqlite'),
    siteURL: origin,
  });
  let base;
  async function listen() {
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
  }
  await listen();
  async function request(
    path,
    { method = 'GET', body, cookie, customOrigin = origin, header = true } = {},
  ) {
    return fetch(base + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        Origin: customOrigin,
        ...(header ? { 'X-Ritmo-Request': '1' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  const credentials = { email: 'student@example.test', password: 'una frase segura de estudio' };
  const session = {
    id: 'session-1',
    tema: 'Funciones <script>alert(1)</script>',
    materia: 'Matemáticas',
    fecha: '2025-03-01',
    hora: '09:00',
    minutos: 25,
    notas: 'Un paso 🧠',
    estado: 'completed',
  };
  let cookie, secondCookie;
  try {
    await t.test('unauthenticated requests and cross-origin login are rejected', async () => {
      assert.equal((await request('/api/state')).status, 401);
      assert.equal(
        (
          await request('/api/auth/register', {
            method: 'POST',
            body: credentials,
            customOrigin: 'https://other.test',
          })
        ).status,
        403,
      );
      assert.equal(
        (await request('/api/auth/register', { method: 'POST', body: credentials, header: false }))
          .status,
        403,
      );
      assert.equal(
        (
          await request('/api/auth/register', {
            method: 'POST',
            body: { ...credentials, password: 'short' },
          })
        ).status,
        400,
      );
    });
    await t.test('register uses an HttpOnly cookie and passwords are hashed', async () => {
      const response = await request('/api/auth/register', { method: 'POST', body: credentials });
      assert.equal(response.status, 201);
      const value = response.headers.get('set-cookie');
      assert.match(value, /HttpOnly/);
      assert.match(value, /SameSite=Lax/);
      cookie = value.split(';')[0];
      const record = app.db.prepare('SELECT password_hash FROM users').get();
      assert.match(record.password_hash, /^scrypt\$/);
      assert.ok(!record.password_hash.includes(credentials.password));
      const me = await (await request('/api/auth/me', { cookie })).json();
      assert.equal(me.user.email, credentials.email);
    });
    await t.test('sessions validate, persist Unicode and reject duplicate creates', async () => {
      assert.equal(
        (await request('/api/sessions', { method: 'POST', cookie, body: session })).status,
        201,
      );
      assert.equal(
        (await request('/api/sessions', { method: 'POST', cookie, body: session })).status,
        409,
      );
      assert.equal(
        (
          await request('/api/sessions', {
            method: 'POST',
            cookie,
            body: { ...session, id: 'bad', minutos: -1 },
          })
        ).status,
        400,
      );
      const state = await (await request('/api/state', { cookie })).json();
      assert.equal(state.sesiones.length, 1);
      assert.equal(state.sesiones[0].notas, 'Un paso 🧠');
    });
    await t.test(
      'a second account cannot read, edit or delete the first account sessions',
      async () => {
        const response = await request('/api/auth/register', {
          method: 'POST',
          body: { ...credentials, email: 'another@example.test' },
        });
        secondCookie = response.headers.get('set-cookie').split(';')[0];
        assert.equal(
          (await (await request('/api/state', { cookie: secondCookie })).json()).sesiones.length,
          0,
        );
        assert.equal(
          (
            await request('/api/sessions/session-1', {
              method: 'PUT',
              cookie: secondCookie,
              body: session,
            })
          ).status,
          404,
        );
        assert.equal(
          (await request('/api/sessions/session-1', { method: 'DELETE', cookie: secondCookie }))
            .status,
          404,
        );
        assert.equal(
          (await request('/api/sessions', { method: 'POST', cookie: secondCookie, body: session }))
            .status,
          201,
        );
      },
    );
    await t.test('invalid import has no partial writes, valid import is idempotent', async () => {
      const invalid = {
        meta: 400,
        sesiones: [
          { ...session, id: 'imported' },
          { ...session, id: 'bad-date', fecha: '2025-02-30' },
        ],
      };
      assert.equal(
        (await request('/api/import', { method: 'POST', cookie, body: invalid })).status,
        400,
      );
      assert.equal((await (await request('/api/state', { cookie })).json()).meta, 300);
      const value = { meta: 400, sesiones: [{ ...session, id: 'imported' }] };
      for (let i = 0; i < 2; i++)
        assert.equal(
          (await request('/api/import', { method: 'POST', cookie, body: value })).status,
          200,
        );
      const state = await (await request('/api/state', { cookie })).json();
      assert.equal(state.sesiones.length, 2);
      assert.equal(state.meta, 400);
    });
    await t.test('restart preserves both database data and active account sessions', async () => {
      await app.close();
      app = await createApp({
        production: false,
        databasePath: join(directory, 'db.sqlite'),
        siteURL: origin,
      });
      await listen();
      const state = await (await request('/api/state', { cookie })).json();
      assert.equal(state.sesiones.length, 2);
      assert.equal(state.meta, 400);
    });
    await t.test('updates and deletes affect only the owning account', async () => {
      assert.equal(
        (
          await request('/api/sessions/session-1', {
            method: 'PUT',
            cookie,
            body: { ...session, tema: 'Editada' },
          })
        ).status,
        200,
      );
      assert.equal(
        (await request('/api/sessions/session-1', { method: 'DELETE', cookie })).status,
        200,
      );
      assert.equal(
        (await (await request('/api/state', { cookie: secondCookie })).json()).sesiones[0].tema,
        session.tema,
      );
    });
    await t.test(
      'HTML source has content, SEO is resolved and unknown routes return a real 404',
      async () => {
        const response = await request('/');
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /<h1[^>]*>Tu semana/);
        assert.ok(!html.includes('{{ORIGIN}}'));
        assert.match(html, /<link\s+rel="canonical"\s+href="http:\/\/ritmo.test\/"\s*\/?>/);
        assert.equal((await request('/missing-page')).status, 404);
        assert.match(await (await request('/missing-page')).text(), /se salió del horario/);
        assert.equal((await request('/privacidad')).status, 200);
        assert.equal((await request('/assets/og.png')).status, 200);
        assert.equal((await request('/assets/favicon.svg')).status, 200);
        assert.match(await (await request('/robots.txt')).text(), /Disallow: \/api\//);
        assert.match(
          await (await request('/sitemap.xml')).text(),
          /http:\/\/ritmo.test\/privacidad/,
        );
        assert.match(await (await request('/llms.txt')).text(), /Acceso privado/);
        assert.equal((await request('/.env')).status, 404);
        assert.equal((await request('/server/index.js')).status, 404);
        assert.equal(
          (await request('/', { cookie })).headers.get('x-robots-tag'),
          'noindex, nofollow',
        );
      },
    );
    await t.test('logout revokes the token and invalid passwords fail', async () => {
      assert.equal(
        (await request('/api/auth/logout', { method: 'POST', cookie, body: {} })).status,
        200,
      );
      assert.equal((await request('/api/state', { cookie })).status, 401);
      assert.equal(
        (
          await request('/api/auth/login', {
            method: 'POST',
            body: { ...credentials, password: 'incorrect' },
          })
        ).status,
        401,
      );
      const response = await request('/api/auth/login', { method: 'POST', body: credentials });
      assert.equal(response.status, 200);
    });
    await t.test('rate limits persist across repeated authentication attempts', async () => {
      let limited = false;
      for (let i = 0; i < 18; i++) {
        const response = await request('/api/auth/login', {
          method: 'POST',
          body: { ...credentials, password: 'incorrect' },
        });
        if (response.status === 429) {
          limited = true;
          break;
        }
      }
      assert.equal(limited, true);
    });
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
test('production requires HTTPS and sets Secure host-only cookies', async () => {
  await assert.rejects(
    () => createApp({ production: true, siteURL: 'http://ritmo.test', databasePath: ':memory:' }),
    /HTTPS/,
  );
  const app = await createApp({
    production: true,
    siteURL: 'https://ritmo.test',
    databasePath: ':memory:',
  });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${app.server.address().port}/api/auth/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://ritmo.test',
          'X-Ritmo-Request': '1',
        },
        body: JSON.stringify({
          email: 'prod@example.test',
          password: 'una frase segura para producir',
        }),
      },
    );
    assert.equal(response.status, 201);
    assert.match(response.headers.get('set-cookie'), /__Host-ritmo=.*; Secure/);
    assert.match(response.headers.get('strict-transport-security'), /31536000/);
  } finally {
    await app.close();
  }
});
