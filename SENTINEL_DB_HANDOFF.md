# SENTINEL · Handoff para conectar la base de datos

> Este documento es para que **otra IA (o desarrollador)** conecte la consola
> de telemetría Sentinel a una base de datos PostgreSQL gestionada por
> **Insforge** (o cualquier BaaS compatible con PostgREST: Supabase, PostgREST
> propio, etc.). Léelo de arriba abajo.

---

## 0. Contexto rápido

El sitio `moonshadowspro.com` es estático (nginx) y tiene una **consola admin oculta** llamada **Sentinel**:

- **Activación en el sitio:** tipear `jaujau` en cualquier escena (sin estar en un input), o `Ctrl/Cmd + Shift + S`, o visitar `/#jaujau`.
- **PIN:** `101284` (hardcoded en `sentinel.js`, validado por hash SHA-256 en runtime).
- **Sin backend** = la consola abre pero todas las pestañas muestran "Conecta Insforge para ver datos reales". Toda la telemetría se acumula en `localStorage` como fallback y se pierde.

Tu misión: hacer que Sentinel **escriba telemetría real** en una base PostgreSQL y **lea métricas** para llenar el dashboard.

---

## 1. Arquitectura

```
┌────────────────────┐      INSERT (anon)          ┌──────────────────┐
│ Navegador          │ ──── POST /rest/v1/... ───> │ Insforge (PostgREST)│
│ - sentinel.js      │                              │                  │
│ - lee meta tags    │ ──── GET  /rest/v1/...  ───> │ PostgreSQL       │
│   con endpoint+key │      SELECT (admin role)     │ - 5 tablas       │
└────────────────────┘                              │ - 8 vistas       │
                                                    │ - RLS activo     │
                                                    └──────────────────┘
```

**El cliente nunca habla con la DB directa.** Habla con el endpoint REST que expone Insforge (compatible PostgREST). La seguridad la dan las **políticas RLS** en la base, no la ocultación de la clave.

---

## 2. Archivos relevantes

| Archivo | Para qué |
|---|---|
| `sentinel.js` | Cliente: captura eventos, hace POST/GET, renderiza dashboard. Lee credenciales de meta tags. |
| `sentinel.css` | Estilos del PIN pad + consola. **No tocar.** |
| `sentinel/schema.sql` | **Esquema completo de la DB** (tablas, vistas, triggers, RLS, función de retención). Copiar/pegar tal cual. |
| `sentinel/README.md` | Documentación detallada de Sentinel (activación, métricas capturadas, vistas). |
| `index.html` (líneas 56-57) | Donde van las credenciales en producción. |

---

## 3. Setup paso a paso

### 3.1 Crear proyecto en Insforge

1. Ir a [insforge.dev](https://insforge.dev) (o el host que use el cliente) y crear un nuevo proyecto.
2. Anotar de **Settings → API**:
   - **API URL** (algo como `https://<id>.insforge.app/rest/v1`).
   - **`anon` key** (JWT público, seguro para el navegador).
   - **`service_role` key** (privado — solo para administración. **NUNCA ponerlo en el frontend.**).

### 3.2 Aplicar el esquema SQL

Abre el editor SQL de Insforge y ejecuta el contenido completo de [`sentinel/schema.sql`](sentinel/schema.sql).

Crea:

- **5 tablas:** `sentinel_sessions`, `sentinel_events`, `sentinel_performance`, `sentinel_errors`, `sentinel_admin_audit`.
- **8 vistas:** `sentinel_v_daily`, `sentinel_v_scene_engagement`, `sentinel_v_top_referrers`, `sentinel_v_geo`, `sentinel_v_device`, `sentinel_v_funnel`, `sentinel_v_live`, `sentinel_v_perf`.
- **Triggers:** `trg_event_touch_session` mantiene `last_seen_at`, `max_scroll_depth`, `cta_clicks_count`, `bounced` actualizados automáticamente al recibir eventos.
- **Políticas RLS:** el rol `anonymous` solo puede INSERT; el rol `admin` puede SELECT en las vistas.
- **Función de retención:** `sentinel_purge_old()` borra datos antiguos (180 días eventos/perf/errors, 365 días sesiones).

Verifica con:

```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE 'sentinel_%';
SELECT viewname  FROM pg_views  WHERE viewname  LIKE 'sentinel_v_%';
```

Deberías ver **5 tablas + 8 vistas**.

### 3.3 Configurar permisos RLS

El `schema.sql` ya activa RLS, pero verifica que estas policies existen:

```sql
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'sentinel_%';
```

Esperado:

| Tabla | Policy | Comando |
|---|---|---|
| sentinel_sessions | `anon_insert_sessions` | INSERT (rol: anon) |
| sentinel_events | `anon_insert_events` | INSERT (rol: anon) |
| sentinel_performance | `anon_insert_perf` | INSERT (rol: anon) |
| sentinel_errors | `anon_insert_errors` | INSERT (rol: anon) |
| sentinel_admin_audit | `anon_insert_audit` | INSERT (rol: anon) |
| Todas las vistas | `admin_select_*` | SELECT (rol: admin) |

Si Insforge usa nombres de rol distintos (`anonymous`, `authenticated`, etc.), ajustar el SQL.

### 3.4 Inyectar credenciales en el sitio

Editar `index.html` (líneas 56-57):

```html
<meta name="sentinel-endpoint" content="https://<TU-PROYECTO>.insforge.app/rest/v1" />
<meta name="sentinel-anon-key" content="<ANON_KEY_JWT_AQUI>" />
```

**Solo la `anon` key.** Si pones la `service_role` aquí, expones admin a todo internet.

### 3.5 Permitir CORS

En Insforge → Settings → CORS, agregar orígenes permitidos:

```
https://moonshadowspro.com
https://www.moonshadowspro.com
http://localhost:*
```

Si no se hace, los `POST` desde el navegador fallarán con CORS error.

### 3.6 Build + deploy

El sitio se sirve desde Docker (nginx). Después de editar `index.html`:

```bash
git add index.html
git commit -m "config: connect Sentinel to Insforge"
git push origin main
```

Y en el VPS:

```bash
cd /opt/moonshadows && ./deploy.sh
```

El `deploy.sh` hace `git pull` + `docker compose build` + `docker compose up -d`. Los archivos `sentinel.js`, `sentinel.css` y `sitemap.xml` están en el `Dockerfile` (verifica que se copian a `/usr/share/nginx/html/`).

---

## 4. Validación post-deploy

### 4.1 Smoke test del endpoint

Desde tu terminal:

```bash
ENDPOINT="https://<proyecto>.insforge.app/rest/v1"
ANON="<anon-key>"

# Debe devolver [] o un array vacío (no error 401/403)
curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "$ENDPOINT/sentinel_v_live?limit=1"

# Test de INSERT — debe devolver 201 Created
curl -i -X POST \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '[{"session_id":"test-1","visitor_id":"test-v","started_at":"2026-05-18T00:00:00Z"}]' \
  "$ENDPOINT/sentinel_sessions"
```

### 4.2 Validar Sentinel en el navegador

1. Abrir `https://moonshadowspro.com` en una pestaña nueva.
2. Tipear `jaujau` → debe aparecer el PIN pad.
3. Ingresar `101284`.
4. En el footer de la consola debe decir **"Conectado a Insforge"** (no "Offline").
5. Navegar un poco por el sitio en otra pestaña (Scene 1, 2, 3, abrir tarjetas), volver y refrescar la consola.
6. La pestaña **"Live"** debe mostrar tu sesión activa.
7. **"Resumen"** debe mostrar KPIs > 0.

### 4.3 Consultas de verificación en SQL

```sql
-- ¿Está llegando data?
SELECT COUNT(*) FROM sentinel_sessions;
SELECT COUNT(*) FROM sentinel_events;
SELECT COUNT(*) FROM sentinel_performance;

-- Última sesión
SELECT * FROM sentinel_sessions ORDER BY started_at DESC LIMIT 5;

-- Top de eventos hoy
SELECT type, COUNT(*) FROM sentinel_events
WHERE created_at > now() - interval '1 day'
GROUP BY type ORDER BY 2 DESC;
```

---

## 5. Métricas capturadas (qué espera ver el cliente)

### Por sesión (`sentinel_sessions`)
- Duración, páginas vistas, escenas vistas, scroll máximo
- Conteo de interacciones, conteo de CTA clicks, bounce rate
- Referrer + UTM (source, medium, campaign, term, content)
- Dispositivo (mobile/tablet/desktop), navegador, OS, idioma, timezone
- Viewport, screen size, pixel ratio, touch capability
- Color scheme preferido, reduced motion
- Geolocalización (país, región, ciudad — via IP en Insforge edge function)
- IP **hasheada con salt**, no IP cruda

### Por evento (`sentinel_events`)
- `session_start`, `page_view`, `scene_change`, `card_open`, `light_toggle`
- `cta_click`, `link_click`, `scroll` (hitos 25/50/75/100)
- `resize`, `copy`, `visibility_hidden`, `visibility_visible`

### Rendimiento (`sentinel_performance`) — Core Web Vitals
- **LCP** (Largest Contentful Paint)
- **FCP** (First Contentful Paint)
- **CLS** (Cumulative Layout Shift)
- **FID** (First Input Delay)
- **INP** (Interaction to Next Paint)
- **TTFB** (Time to First Byte)
- Navigation Timing, network type, memoria JS

### Errores (`sentinel_errors`)
- JS uncaught + promesas rechazadas, con stack trace, source, línea, columna.

### Audit (`sentinel_admin_audit`)
- Cada intento de PIN (éxito o fallo), apertura/cierre de consola.

---

## 6. Geolocalización por IP (opcional pero recomendado)

Las columnas `country`, `region`, `city`, `ip_hash` quedan NULL si no implementas geo. Tres opciones:

**A — Edge Function en Insforge (recomendado):**
Interceptar el INSERT a `sentinel_sessions`, leer `X-Forwarded-For`, llamar a un servicio gratuito (ipapi.co, ip-api.com), hashear la IP con un salt (`SHA-256(ip + SECRET_SALT)`) y popular los campos antes de escribir.

**B — Trigger en Postgres con `plv8` o `pg_net`:**
Solo si Insforge expone esa extensión. Hacer fetch HTTP dentro del trigger.

**C — Sin geo:**
El dashboard mostrará "Unknown" en la pestaña Audiencia → Geografía. Es válido para empezar.

---

## 7. Cron de retención

Programar en Insforge → Scheduled Tasks:

```
0 3 * * *   SELECT sentinel_purge_old();
```

Corre diario a las 03:00 UTC. Borra:
- Eventos / performance / errors con más de **180 días**.
- Sesiones con más de **365 días**.

Si quieres cambiar la retención, editar la función `sentinel_purge_old()` en `sentinel/schema.sql`.

---

## 8. Cambiar el PIN

El PIN `101284` está hardcoded en `sentinel.js`. Para cambiarlo:

1. Editar la línea con `sha256('101284')` (búscala con grep).
2. Reemplazar `'101284'` por el nuevo PIN de 6 dígitos.
3. Commit + push + redeploy.

Si quieres otro largo, también ajustar `CONFIG.pinLength`.

Para resetear el bloqueo por intentos fallidos (5 fallos → 5 min lock):

```js
// En la consola del navegador:
localStorage.removeItem('snt:pin_lock');
```

---

## 9. Cambiar la palabra de activación

Está en `sentinel.js`, `CONFIG.activationWord` (línea ~28). Hoy es `'jaujau'`.

También está en el hash fallback (`location.hash === '#jaujau'`). Si la cambias, actualiza ambos lugares.

---

## 10. Troubleshooting

### "Offline · configurar endpoint" en el footer
→ Los meta tags `sentinel-endpoint` o `sentinel-anon-key` están vacíos en `index.html`.

### "Sin datos" en las pestañas
→ Conexión OK pero aún no hay registros. Navegar un poco, volver, refrescar.

### CORS error en consola del navegador
→ Agregar `moonshadowspro.com` a CORS allowlist en Insforge.

### 401 Unauthorized
→ La `anon` key es incorrecta o expiró. Regenerar en Insforge → Settings → API.

### 403 Forbidden en INSERT
→ Política RLS de INSERT para rol `anon` no está activa. Revisar `pg_policies`.

### El PIN pad no aparece al tipear `jaujau`
→ Verificar que no estás en un `<input>` o `<textarea>` (Sentinel los ignora intencionalmente). Refrescar y probar.

### Funciona en local pero no en producción
→ Lo más común: el Docker no copió `sentinel.js` / `sentinel.css`. Verificar el `Dockerfile`:
```bash
docker exec moonshadows_web ls /usr/share/nginx/html/
```
Debe listar `sentinel.js`, `sentinel.css`, `sitemap.xml`, `index.html`, `styles.css`, `app.js`, `assets/`.

---

## 11. Privacidad y cumplimiento

- **Sin PII:** no se captura nombre, email, IP cruda.
- **IP hasheada con salt** (configurar en edge function).
- **Sin cookies de tracking:** `visitor_id` vive en `localStorage`.
- **Sin third-parties:** Google Analytics, Hotjar, Meta Pixel — nada. Solo Insforge.

Para GDPR/LGPD estricto: agregar banner de consentimiento que retrase la inicialización de Sentinel hasta consent. Hoy se asume consentimiento implícito (datos anónimos).

---

## 12. Resumen de lo que NO debes hacer

- ❌ **NO** poner la `service_role` key en el frontend.
- ❌ **NO** modificar `app.js`, `styles.css` (global), ni el `:root` del sitio. Sentinel es 100% aislado.
- ❌ **NO** cambiar el orden de boot en `sentinel.js` (`Admin.init()` debe ir antes que `Recorder.init()`).
- ❌ **NO** desactivar RLS. Sin RLS, cualquiera con la anon key puede leer toda la telemetría.
- ❌ **NO** capturar PII (email, nombre, teléfono, IP cruda). El esquema no lo soporta a propósito.

---

## 13. Contacto / handoff

- **Esquema completo:** [`sentinel/schema.sql`](sentinel/schema.sql) (432 líneas, idempotente — se puede re-ejecutar).
- **Cliente JS:** [`sentinel.js`](sentinel.js) (1531 líneas, vanilla, sin dependencias).
- **Documentación detallada:** [`sentinel/README.md`](sentinel/README.md).

Cualquier duda sobre la **lógica del cliente** (qué eventos captura, cómo agrupa sesiones, cómo hace flush): leer `sentinel.js` — está bien comentado.

Cualquier duda sobre **estructura de la DB** (qué columna significa qué, qué vista alimenta qué pestaña): leer `sentinel/schema.sql` y la sección 5 de `sentinel/README.md`.

---

*Sentinel v1.0 · Moonshadows EIRL · Renace Protocol*
