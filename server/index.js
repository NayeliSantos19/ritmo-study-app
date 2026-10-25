import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { openDatabase, transaction } from './database.js';
import { hashPassword, verifyPassword, validateCredentials, digest, makeToken } from './auth.js';
import { validateSession, normalizeImport } from '../public/domain.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = resolve(root, 'public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};
const sessionTTL = 7 * 24 * 60 * 60 * 1000;
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const htmlEscape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export async function createApp(config = {}) {
  const production = config.production ?? process.env.NODE_ENV === 'production';
  const siteURL = config.siteURL || process.env.SITE_URL || 'http://localhost:3000';
  const origin = new URL(siteURL).origin;
  if (production && !origin.startsWith('https://'))
    throw new Error('SITE_URL debe usar HTTPS en producción.');
  const db = openDatabase(
    config.databasePath || process.env.DATABASE_PATH || resolve(root, 'data/ritmo.sqlite'),
  );
  const dummyHash = await hashPassword(makeToken());
  const cookieName = production ? '__Host-ritmo' : 'ritmo_session';
  const sessionCookie = (token, maxAge = 604800) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production ? '; Secure' : ''}`;
  const cleanup = () => {
    db.prepare('DELETE FROM auth_sessions WHERE expires_at<?').run(Date.now());
    db.prepare('DELETE FROM rate_limits WHERE expires_at<?').run(Date.now());
  };
  cleanup();
  const cleanupInterval = setInterval(cleanup, 3600000);
  cleanupInterval.unref();
  const getUser = (req) => {
    const cookies = (req.headers.cookie || '').split(';').map((c) => c.trim());
    const cookie = cookies.find((c) => c.startsWith(`${cookieName}=`));
    const token = cookie?.slice(cookieName.length + 1) || '';
    if (!/^[\w-]{43}$/.test(token)) return null;
    return (
      db
        .prepare(
          'SELECT u.id,u.email,u.weekly_goal FROM users u JOIN auth_sessions a ON a.user_id=u.id WHERE a.token_hash=? AND a.expires_at>?',
        )
        .get(digest(token), Date.now()) || null
    );
  };
  function limit(key, max, window = 15 * 60 * 1000) {
    const now = Date.now();
    const row = db.prepare('SELECT count,expires_at FROM rate_limits WHERE key=?').get(key);
    if (row && row.expires_at > now && row.count >= max)
      fail(429, 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.');
    db.prepare(
      'INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at>? THEN count+1 ELSE 1 END,expires_at=CASE WHEN expires_at>? THEN expires_at ELSE excluded.expires_at END',
    ).run(key, now + window, now, now);
  }
  async function readJSON(req) {
    if (!req.headers['content-type']?.startsWith('application/json'))
      fail(415, 'Envía los datos en formato JSON.');
    const chunks = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > 2_000_000) fail(413, 'El archivo supera el límite de 2 MB.');
      chunks.push(part);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      fail(400, 'Los datos no contienen JSON válido.');
    }
  }
  const send = (res, status, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, { 'Content-Type': type });
    res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
  };
  function addSession(userId, s, ignore = false) {
    db.prepare(
      `INSERT ${ignore ? 'OR IGNORE ' : ''}INTO sessions(id,user_id,tema,materia,fecha,hora,minutos,notas,estado) VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(s.id, userId, s.tema, s.materia, s.fecha, s.hora, s.minutos, s.notas, s.estado);
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Event placement and progress widths use computed inline style attributes; scripts stay self-only.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const method = req.method;
      if (pathname === '/healthz')
        return send(res, 200, { ok: db.prepare('SELECT 1 AS ok').get().ok === 1 });
      if (pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD', 'POST', 'PUT', 'DELETE'].includes(method))
          fail(405, 'Método no permitido.');
        if (['POST', 'PUT', 'DELETE'].includes(method)) {
          // Enforce origin + a custom header, including login, to prevent cross-site requests.
          if (req.headers.origin !== origin || req.headers['x-ritmo-request'] !== '1')
            fail(
              403,
              'La solicitud no pertenece a este sitio. Recarga la página e inténtalo de nuevo.',
            );
        }
        if (pathname === '/api/auth/me' && method === 'GET') {
          const u = getUser(req);
          return send(res, 200, { user: u ? { id: u.id, email: u.email } : null });
        }
        if (['/api/auth/register', '/api/auth/login'].includes(pathname) && method === 'POST') {
          const ip =
            process.env.TRUST_PROXY === '1'
              ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
                  .split(',')[0]
                  .trim()
              : req.socket.remoteAddress || 'unknown';
          limit(`auth-ip:${digest(ip)}`, 30);
          const register = pathname.endsWith('register');
          let credentials;
          try {
            credentials = validateCredentials(await readJSON(req), register);
          } catch (error) {
            if (error.status) throw error;
            fail(400, error.message);
          }
          limit(`auth-email:${digest(credentials.email)}`, 15);
          const found = db
            .prepare('SELECT id,email,password_hash FROM users WHERE email=?')
            .get(credentials.email);
          let userId;
          if (register) {
            const hashed = await hashPassword(credentials.password);
            if (found) fail(409, 'No se pudo crear la cuenta. Si ya tienes una, inicia sesión.');
            userId = randomUUID();
            try {
              db.prepare(
                'INSERT INTO users(id,email,password_hash,created_at) VALUES (?,?,?,?)',
              ).run(userId, credentials.email, hashed, Date.now());
            } catch (error) {
              if (error.code === 'ERR_SQLITE_ERROR' && String(error.message).includes('UNIQUE'))
                fail(409, 'No se pudo crear la cuenta. Si ya tienes una, inicia sesión.');
              throw error;
            }
          } else {
            const valid = await verifyPassword(
              credentials.password,
              found?.password_hash || dummyHash,
            );
            if (!found || !valid) fail(401, 'El correo o la contraseña no son correctos.');
            userId = found.id;
          }
          const token = makeToken();
          db.prepare('INSERT INTO auth_sessions VALUES (?,?,?)').run(
            digest(token),
            userId,
            Date.now() + sessionTTL,
          );
          res.setHeader('Set-Cookie', sessionCookie(token));
          return send(res, register ? 201 : 200, {
            user: { id: userId, email: credentials.email },
          });
        }
        if (pathname === '/api/auth/logout' && method === 'POST') {
          const cookie = (req.headers.cookie || '')
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith(`${cookieName}=`));
          if (cookie)
            db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(
              digest(cookie.slice(cookieName.length + 1)),
            );
          res.setHeader('Set-Cookie', sessionCookie('', 0));
          return send(res, 200, { ok: true });
        }
        const user = getUser(req);
        if (!user) fail(401, 'Tu sesión terminó. Inicia sesión para continuar.');
        if (method !== 'GET') limit(`write:${user.id}`, 300, 60000);
        if (pathname === '/api/state' && method === 'GET')
          return send(res, 200, {
            meta: user.weekly_goal,
            sesiones: db
              .prepare(
                'SELECT id,tema,materia,fecha,hora,minutos,notas,estado FROM sessions WHERE user_id=? ORDER BY fecha DESC,hora DESC',
              )
              .all(user.id),
          });
        if (pathname === '/api/goal' && method === 'PUT') {
          const { meta } = await readJSON(req);
          if (!Number.isInteger(meta) || meta < 1 || meta > 10080)
            fail(400, 'La meta debe ser un número entero entre 1 y 10080.');
          db.prepare('UPDATE users SET weekly_goal=? WHERE id=?').run(meta, user.id);
          return send(res, 200, { ok: true });
        }
        if (pathname === '/api/import' && method === 'POST') {
          let imported;
          try {
            imported = normalizeImport(await readJSON(req));
          } catch (error) {
            if (error.status) throw error;
            fail(400, error.message);
          }
          transaction(db, () => {
            for (const s of imported.sesiones) addSession(user.id, s, true);
            db.prepare('UPDATE users SET weekly_goal=? WHERE id=?').run(imported.meta, user.id);
          });
          return send(res, 200, { ok: true });
        }
        const match = pathname.match(/^\/api\/sessions(?:\/([a-zA-Z0-9-]{1,80}))?$/);
        if (match) {
          const id = match[1];
          if (method === 'POST' && !id) {
            const body = await readJSON(req);
            let s;
            try {
              s = validateSession(body);
            } catch (error) {
              fail(400, error.message);
            }
            if (typeof body.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(body.id))
              fail(400, 'Identificador no válido.');
            if (db.prepare('SELECT 1 FROM sessions WHERE user_id=? AND id=?').get(user.id, body.id))
              fail(409, 'Esta sesión ya existe.');
            addSession(user.id, { ...s, id: body.id });
            return send(res, 201, { ok: true });
          }
          if (id && ['PUT', 'DELETE'].includes(method)) {
            if (!db.prepare('SELECT 1 FROM sessions WHERE id=? AND user_id=?').get(id, user.id))
              fail(404, 'La sesión no existe en tu cuenta.');
            if (method === 'DELETE') {
              db.prepare('DELETE FROM sessions WHERE id=? AND user_id=?').run(id, user.id);
              return send(res, 200, { ok: true });
            }
            let s;
            try {
              s = validateSession(await readJSON(req));
            } catch (error) {
              if (error.status) throw error;
              fail(400, error.message);
            }
            db.prepare(
              'UPDATE sessions SET tema=?,materia=?,fecha=?,hora=?,minutos=?,notas=?,estado=? WHERE id=? AND user_id=?',
            ).run(s.tema, s.materia, s.fecha, s.hora, s.minutos, s.notas, s.estado, id, user.id);
            return send(res, 200, { ok: true });
          }
        }
        fail(404, 'Esta ruta no existe.');
      }
      if (!['GET', 'HEAD'].includes(method)) fail(405, 'Método no permitido.');
      if (pathname === '/robots.txt')
        return send(
          res,
          200,
          `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`,
          'text/plain; charset=utf-8',
        );
      if (pathname === '/sitemap.xml')
        return send(
          res,
          200,
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${htmlEscape(origin)}/</loc></url><url><loc>${htmlEscape(origin)}/privacidad</loc></url></urlset>`,
          'application/xml; charset=utf-8',
        );
      if (pathname === '/llms.txt')
        return send(
          res,
          200,
          `# Ritmo\n\n> Aplicación para estudiantes: planificación semanal, sesiones de estudio y enfoque.\n\n## Páginas públicas\n- [Ritmo](${origin}/): descripción y vista previa con datos ilustrativos.\n- [Privacidad](${origin}/privacidad): almacenamiento y límites.\n\n## Acceso privado\nLas sesiones de cada estudiante requieren autenticación. No son contenido público ni están disponibles para rastreo.\n`,
          'text/plain; charset=utf-8',
        );
      const routeFiles = { '/': 'index.html', '/privacidad': 'privacy.html' };
      let file = routeFiles[pathname];
      let status = 200;
      if (!file) {
        let decoded;
        try {
          decoded = decodeURIComponent(pathname);
        } catch {
          fail(400, 'La direcci�n no tiene un formato v�lido.');
        }
        const candidate = resolve(publicDir, '.' + decoded);
        if (
          !candidate.startsWith(publicDir + sep) ||
          !mime[extname(candidate)] ||
          extname(candidate) === '.html'
        )
          ((file = '404.html'), (status = 404));
        else file = candidate;
      }
      let contents;
      try {
        contents = await readFile(file.startsWith(publicDir) ? file : resolve(publicDir, file));
      } catch (error) {
        if (!['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) throw error;
        contents = await readFile(resolve(publicDir, '404.html'));
        file = '404.html';
        status = 404;
      }
      const extension = extname(file);
      if (extension === '.html') {
        let html = contents.toString('utf8').replaceAll('{{ORIGIN}}', htmlEscape(origin));
        if (pathname === '/' && getUser(req)) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          html = html.replace('</head>', '<meta name="robots" content="noindex,nofollow"></head>');
        }
        // Permit the server's fixed JSON-LD block without allowing inline JavaScript.
        const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
        if (ld)
          res.setHeader(
            'Content-Security-Policy',
            res
              .getHeader('Content-Security-Policy')
              .replace(
                "script-src 'self'",
                `script-src 'self' 'sha256-${(await import('node:crypto')).createHash('sha256').update(ld).digest('base64')}'`,
              ),
          );
        return send(res, status, method === 'HEAD' ? '' : html, mime[extension]);
      }
      if (status === 200) res.setHeader('Cache-Control', 'public, max-age=3600');
      res.writeHead(status, { 'Content-Type': mime[extension] || 'application/octet-stream' });
      res.end(method === 'HEAD' ? '' : contents);
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('Request failed:', error.code || error.name);
      if (!res.headersSent)
        send(res, status, {
          error:
            status === 500 ? 'No pudimos completar la acción. Inténtalo de nuevo.' : error.message,
        });
      else res.end();
    }
  });
  server.headersTimeout = 15000;
  server.requestTimeout = 20000;
  return {
    server,
    db,
    close: () =>
      new Promise((resolve, reject) => {
        clearInterval(cleanupInterval);
        server.close((error) => {
          db.close();
          error ? reject(error) : resolve();
        });
        server.closeIdleConnections();
      }),
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = await createApp();
  const port = Number(process.env.PORT || 3000);
  app.server.listen(port, process.env.HOST || '127.0.0.1', () =>
    console.log(`Ritmo: http://${process.env.HOST || '127.0.0.1'}:${port}`),
  );
  const shutdown = () => app.close().then(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
