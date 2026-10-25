# Despliegue de Ritmo

## Instalación compatible

Una instancia Node.js 24, disco persistente y HTTPS. Puede ejecutarse en Linux con Docker o como proceso Node detrás de un proxy. Esta configuración aún no se ha desplegado en un proveedor externo.

No uses GitHub Pages, disco efímero ni varias réplicas compartiendo SQLite. Frontend y API deben estar en el mismo origen.

## Docker Compose con HTTPS

1. Prepara Docker Compose y un dominio cuyo DNS apunte al servidor.
2. Permite puertos 80 y 443 y descarga esta rama.
3. Crea `.env` junto a `compose.yaml` con `DOMAIN=tu-dominio.example`. No lo publiques.
4. Ejecuta `docker compose up -d --build`.
5. Comprueba `docker compose ps`, HTTPS, `/healthz`, una cuenta y su persistencia tras reiniciar.

Caddy termina HTTPS y conecta a `app:3000` por red privada. Solo el proxy publica puertos. La aplicación usa un usuario sin privilegios. El volumen `ritmo-data` conserva SQLite. **No elimines ese volumen:** contiene los datos.

`SITE_URL` determina canonical, sitemap, OG y origen permitido. Si cambias dominio, reinicia con el nuevo valor y verifica las URLs. Producción rechaza una URL sin HTTPS.

`TRUST_PROXY=1` solo se configura detrás de Caddy para limitar por IP de cliente. No lo habilites si el proceso recibe conexiones directas de Internet.

## Sin Docker

Configura `NODE_ENV=production`, `SITE_URL=https://tu-dominio.example`, `HOST=127.0.0.1`, `PORT=3000` y `DATABASE_PATH` persistente. Usa un supervisor y proxy HTTPS. Con `.env`, inicia mediante `node --env-file=.env server/index.js`. No confíes en cabeceras de clientes directos.

## Copias

```sh
npm run backup
```

Usa la API de copia consistente de SQLite, no una copia parcial con WAL activo. Acepta una ruta de destino. Con `.env`, ejecuta `node --env-file=.env scripts/backup.js`.

En Docker:

```sh
docker compose exec app node scripts/backup.js /app/data/backups/ritmo.sqlite
docker compose cp app:/app/data/backups/ritmo.sqlite ./ritmo-backup.sqlite
```

Guarda copias fuera del servidor con acceso restringido y cifrado. Define frecuencia y conservación: no hay servicio automático configurado. Las copias contienen información privada; no las publiques.

Para restaurar, detén el proceso, conserva el estado anterior y restaura la copia consistente a `DATABASE_PATH`. Verifica propietario y permisos. No mezcles WAL/SHM anteriores con la copia: recupera con el servicio detenido y comprueba integridad y acceso antes de abrirlo al público.

## Cuentas

Tras comprobar la identidad de quien solicita ayuda por un canal privado:

```sh
node scripts/reset-password.js estudiante@example.com
```

Genera una contraseña aleatoria e invalida accesos anteriores. La muestra en esa ejecución: entrégala por canal privado y usa un gestor. No envía correos ni verifica identidad automáticamente.

Eliminar una cuenta y sus sesiones de la base activa:

```sh
node scripts/delete-account.js estudiante@example.com --confirm
```

Es irreversible sobre la base activa. Verifica la solicitud y el identificador antes. Las copias anteriores siguen su política de conservación. En Docker, antepón `docker compose exec app` a los comandos Node.

## Antes de abrir al público

Verifica certificado, dominio, persistencia, restauración, aislamiento y HTTP 404. Añade soporte y conservación a privacidad. Decide si necesitas verificación de correo, restablecimiento automático, monitoreo u otros controles de abuso: no están activados en esta entrega.
