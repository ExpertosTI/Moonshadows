# RENACE.TECH — Runbook de Seguridad

Fecha: 2026-04-21
Alcance: hardening del monorepo en raíz.

---

## ✅ Ya ejecutado en esta sesión

1. **Google `client_secret_*.json` movido fuera del repo**
   - Origen: `jairo-main/client_secret_2_609647959676-iligcp74gacllstqga2ri7jmtifm3m7g.apps.googleusercontent.com.json`
   - Destino: `~/.renace-secrets/` (fuera del working tree).
   - **Verificado**: el archivo nunca estuvo commiteado (`git log --all --full-history -- "jairo-main/client_secret*"` devuelve vacío). No hace falta `git filter-repo`.

2. **`.gitignore` reforzado** con patrones para `client_secret*.json`, `credentials*.json`, `*service-account*.json`, `*firebase-adminsdk*.json`, `secrets/`, `*.tar.gz`, `*.dmg`.

3. **`.dockerignore` creado** para que las imágenes nunca lleven `.env`, `.git/`, `node_modules/`, archivos de IDE, backups, subproyectos no relacionados, ni el `client_secret`.

---

## ⚠️ Acciones que debes ejecutar tú (no las hice por ser irreversibles)

### 1. Rotar el client_secret de Google OAuth (CRÍTICO)

Aunque el archivo nunca se commiteó, estuvo en disco durante semanas en una carpeta de trabajo sincronizada con varios IDEs (`.idea/`, `.vscode/`, `.trae/`, `.windsurf/`, `.claude/`, `.superpowers/`). Asume potencial exposición.

```
1. Abrir  https://console.cloud.google.com/apis/credentials
2. Proyecto correspondiente al Client ID 609647959676-iligcp74...
3. Eliminar el client secret actual (o regenerarlo).
4. Crear uno nuevo.
5. Descargar el JSON NUEVO y guardarlo en  ~/.renace-secrets/
6. En server.js o .env, apuntar GOOGLE_CLIENT_SECRET al nuevo valor.
7. Redeploy del stack que consume ese OAuth.
```

### 2. Auditar si `.env` fue commiteado alguna vez

```bash
git log --all --full-history -- .env
git log --all --full-history -- "**/.env"
```

Si devuelve commits: purgar con `git filter-repo` y rotar TODO lo del `.env.example` (DB, SMTP, ADMIN_*, ODOO_API_KEY, PORTAL_ENCRYPTION_KEY, WEDDING_ADMIN_KEY).

Si devuelve vacío: todo ok, solo confirmar que está en `.gitignore` (ya está).

### 3. Revocar llaves SSH/API no usadas

Si alguna vez se usaron llaves de despliegue (`deploy_corporate.sh`, `setup_email_forwarding.sh`) desde este workspace, revísalas en tu VPS/Hostinger/DigitalOcean y rótalas.

### 4. Decidir qué hacer con `pescaderia-produccion.tar.gz` (166 MB)

Opciones:
- Mover a backup externo (S3, Hetzner Storage Box, disco USB cifrado).
- Si contiene datos de producción del cliente: **cifrar con GPG antes de guardar**.
- Nunca volver a dejarlo en el directorio raíz del repo.

```bash
# Cifrar antes de mover:
gpg --symmetric --cipher-algo AES256 pescaderia-produccion.tar.gz
mv pescaderia-produccion.tar.gz.gpg ~/renace-backups/
rm pescaderia-produccion.tar.gz   # el original
```

---

## 🛡️ Hardening pendiente (sugerido, no urgente)

| # | Tarea | Impacto | Complejidad |
|---|---|---|---|
| A | Endurecer CSP de `server.js`: remover `'unsafe-inline'` de `scriptSrc` y migrar onclicks de `admin-dashboard.html` y `cotizacion.html` a listeners externos | Alto (previene XSS reflejado) | Media |
| B | Mover tokens admin (`adminTokens`, `adminCodes` en `server.js:123`) a Postgres con TTL por DB | Medio (persistencia + multi-réplica) | Media |
| C | Secret management: usar Docker secrets o Vault, no env planos en `docker-compose.yml` | Medio | Media |
| D | Healthcheck profundo `/healthz` que valide DB + SMTP + disco | Bajo (observabilidad) | Baja |
| E | GitHub Actions: `npm ci && eslint .` y `docker build --no-cache` en cada PR | Medio | Baja |
| F | Rate-limit más agresivo en rutas admin (`/admin/*` → 10 req / 15 min / IP) | Medio | Baja |
| G | Agregar `Strict-Transport-Security` en nginx del stack de producción | Bajo (ya está en helmet) | Baja |

---

## 🆕 Nueva landing de ejemplo

Archivo: `landing.html` + `landing.js` en raíz.

Características de seguridad aplicadas:
- **CSP estricta vía `<meta http-equiv>`**: `script-src 'self'` (sin `unsafe-inline`), `frame-src 'none'`, `object-src 'none'`, `base-uri 'self'`.
- **Sin handlers inline** (`onclick=`, `onerror=`, etc.): todo pasa por `addEventListener` en `landing.js`.
- **Imágenes** limitadas a `'self' data: https:`.
- **Formularios** solo pueden enviar a `'self'` y subdominios `*.renace.tech`.
- **Preconnect** a Google Fonts pero `font-src` estrictamente limitado a `fonts.gstatic.com`.
- Enlaces externos (WhatsApp) usan `rel="noopener"`.

Para probar local:
```bash
# Ya queda configurado en .claude/launch.json como "renace-landing" en puerto 3460.
# Abrir: http://localhost:3460/
```

Para publicar en producción (cuando quieras):
- Opción A (rápida): añadir ruta en `server.js`:
  ```js
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'landing.html')));
  ```
  Y mover el fallback actual (`index.html` de yoyas) a `/yoyas`.
- Opción B: dominio separado, nginx directo.

---

## Checklist final

- [x] Secret movido fuera del repo
- [x] `.gitignore` endurecido
- [x] `.dockerignore` creado
- [x] Landing nueva con CSP estricta
- [ ] **Rotar client_secret en Google Cloud Console** ← TÚ
- [ ] Confirmar que `.env` nunca se commiteó (ver §2)
- [ ] Cifrar y mover `pescaderia-produccion.tar.gz` (ver §4)
- [ ] Revisar tabla de hardening A-G
