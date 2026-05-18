# Sentinel · Consola de Telemetría Moonshadows

Sentinel es la capa de telemetría y panel administrativo de moonshadowspro.com.
Funciona como una consola oculta accesible solo con un PIN, y captura métricas
reales en una base de datos PostgreSQL hospedada en **Insforge** (o cualquier
backend compatible con PostgREST).

> **Importante:** Sentinel está completamente aislado del sitio. Los archivos
> `sentinel.js` y `sentinel.css` viven aparte de `app.js` y `styles.css`, se
> cargan de forma diferida, y **nunca** modifican variables CSS globales,
> tipografías ni el flujo visual del sitio.

---

## 1. Activación de la consola

Hay tres formas de abrir el PIN pad:

| Método | Plataforma | Notas |
|---|---|---|
| Tipear `admin` | Desktop / teclado físico | En cualquier escena, sin estar en un input |
| `Ctrl/Cmd + Shift + S` | Desktop | Atajo directo |
| Visitar `/#snt` | Móvil + Desktop | La URL se limpia automáticamente |

Una vez en el PIN pad, ingresar **`101284`** (6 dígitos).
Tras 5 intentos fallidos, se bloquea por 5 minutos.

---

## 2. Estructura de archivos

```
moonshadows/
├── index.html              # SEO + carga diferida de sentinel.*
├── styles.css              # + .sr-only (clase aislada al final)
├── app.js                  # Sin cambios
├── sentinel.css            # Estilos de PIN pad + consola
├── sentinel.js             # Telemetría + dashboard + Insforge client
└── sentinel/
    ├── schema.sql          # Tablas + vistas + RLS para Insforge
    └── README.md           # Este archivo
```

---

## 3. Setup en Insforge

### 3.1 Crear proyecto

1. Crear un nuevo proyecto en Insforge (o el BaaS que prefieras).
2. Anotar:
   - **API URL** (algo como `https://xxx.insforge.app/rest/v1` o similar).
   - **Anon key** (clave pública, segura para exponer al navegador).
   - **Service role key** (privada — solo para administración).

### 3.2 Aplicar el esquema

Conectarse a la consola SQL de Insforge y ejecutar:

```bash
psql "postgresql://..." < sentinel/schema.sql
```

O copiar/pegar el contenido de `sentinel/schema.sql` en el editor SQL del dashboard.

El esquema crea:

- **5 tablas**: `sentinel_sessions`, `sentinel_events`, `sentinel_performance`, `sentinel_errors`, `sentinel_admin_audit`
- **8 vistas** para el dashboard: `sentinel_v_daily`, `sentinel_v_scene_engagement`, `sentinel_v_top_referrers`, `sentinel_v_geo`, `sentinel_v_device`, `sentinel_v_funnel`, `sentinel_v_live`, `sentinel_v_perf`
- **Triggers** que actualizan automáticamente `last_seen_at`, contadores y `bounce_rate`
- **Row-Level Security** (RLS): el rol `anonymous` solo puede INSERTAR, solo el rol `admin` puede leer.

### 3.3 Configurar el frontend

Editar **`index.html`** y poner las credenciales en los meta tags ya preparados:

```html
<meta name="sentinel-endpoint" content="https://tu-proyecto.insforge.app/rest/v1" />
<meta name="sentinel-anon-key" content="eyJhbGciOiJIUzI1NiIsInR5cCI6...tu-anon-key..." />
```

> **No expongas la `service_role` key en el frontend.** Solo la `anon` key.
> La protección viene de las políticas RLS, no de ocultar la key.

### 3.4 Verificar conexión

1. Abrir el sitio en una pestaña nueva.
2. Activar Sentinel (`admin` + PIN `101284`).
3. En el footer de la consola debe decir **"Conectado a Insforge"**.
4. Las pestañas deben empezar a llenarse con datos en segundos.

---

## 4. Métricas capturadas

### Por sesión (`sentinel_sessions`)
- Duración, páginas vistas, escenas vistas, scroll máximo
- Conteo de interacciones, conteo de CTA clicks, bounce rate
- Referrer, dominio del referrer, UTMs completos
- Dispositivo (mobile/tablet/desktop), navegador, OS, idioma, timezone
- Viewport, screen size, pixel ratio, touch capability
- Color scheme preferido, reduced motion
- Geolocalización (país, región, ciudad — vía IP en Insforge)
- IP hasheada (no se guarda IP cruda)

### Por evento (`sentinel_events`)
Tipos de evento capturados automáticamente:

| Tipo | Cuándo se dispara |
|---|---|
| `session_start` | Inicio de sesión |
| `page_view` | Carga inicial de la página |
| `scene_change` | Cambio entre escenas 0→1→2→3 |
| `card_open` | Apertura de una tarjeta de servicio |
| `light_toggle` | Encender/apagar la luz |
| `cta_click` | Clic en CTA principal (WhatsApp / Conversemos) |
| `link_click` | Clic en cualquier link |
| `scroll` | Hitos 25/50/75/100% de profundidad |
| `resize` | Redimensión del viewport |
| `copy` | Texto copiado |
| `visibility_hidden` / `visibility_visible` | Cambios de pestaña |

### Rendimiento (`sentinel_performance`)
- **Core Web Vitals**: LCP, FCP, CLS, FID, INP, TTFB
- Navigation Timing: DOM interactive, DOM Content Loaded, Load Event
- Network: tipo de conexión, downlink, RTT, save-data
- Memoria JS (cuando el navegador lo expone)

### Errores (`sentinel_errors`)
- Errores JS no capturados (`window.onerror`)
- Promesas rechazadas sin handler (`unhandledrejection`)
- Stack trace, source, línea, columna

### Auditoría admin (`sentinel_admin_audit`)
- Cada intento de PIN (exitoso o fallido)
- Apertura y cierre de la consola

---

## 5. Vistas del dashboard

| Vista | Pestaña que la usa |
|---|---|
| `sentinel_v_daily` | Resumen (KPIs + tendencia 14 días) |
| `sentinel_v_funnel` | Resumen (embudo de conversión) |
| `sentinel_v_scene_engagement` | Resumen + Comportamiento |
| `sentinel_v_top_referrers` | Audiencia (top fuentes) |
| `sentinel_v_geo` | Audiencia (geografía) |
| `sentinel_v_device` | Audiencia (dispositivos/navegadores) |
| `sentinel_v_live` | Live (sesiones activas en los últimos 5 min) |
| `sentinel_v_perf` | Rendimiento (percentiles Web Vitals) |

---

## 6. Privacidad y cumplimiento

- **Sin PII**: no se captura nombre, email, ni IP cruda.
- **IP hasheada**: Insforge debe configurarse para hashear la IP con un salt
  antes de almacenarla. Ver sección 8.
- **Sin cookies de tracking**: el `visitor_id` vive en `localStorage` del navegador.
- **Sin third-parties**: la telemetría va directo a tu Insforge — no Google,
  no Facebook, no Hotjar.

Para cumplir con GDPR/LGPD en visitantes europeos/latinoamericanos, considera
añadir un banner de consentimiento que retrase la inicialización de Sentinel
hasta que el usuario acepte. (No incluido por defecto — el sitio actualmente
asume consentimiento implícito y datos anónimos.)

---

## 7. Retención

`sentinel_purge_old()` es una función Postgres que limpia datos viejos.
Programarla como cron job en Insforge (sección "Scheduled Tasks") con expresión:

```
0 3 * * *   SELECT sentinel_purge_old();
```

Retención por defecto:
- Eventos / Performance / Errores: **180 días**
- Sesiones: **365 días**

Ajustar dentro de la función según política de datos.

---

## 8. Geolocalización por IP

Para llenar `country`, `region`, `city` y `ip_hash` necesitas:

**Opción A — Edge function en Insforge** (recomendada):
Una función que intercepta el insert en `sentinel_sessions`, lee la IP del header
`X-Forwarded-For`, la pasa por un servicio de geo (ipapi.co, IP2Location), hashea
con un salt y popula los campos antes de escribir.

**Opción B — Trigger Postgres con extensión `plv8`**:
Solo si Insforge expone `plv8`. Hacer fetch HTTP dentro del trigger.

**Opción C — Sin geo**:
Comentar los campos `country/region/city/ip_hash` en `schema.sql` y dejar que
queden NULL. El dashboard mostrará "Unknown".

---

## 9. Endpoints alternativos (sin Insforge)

Sentinel funciona con cualquier backend compatible con PostgREST:

- **Supabase**: cambiar `endpoint` a `https://xxx.supabase.co/rest/v1`
- **PostgREST** propio: apuntar a tu instancia
- **API custom**: implementar endpoints REST con la misma shape

La shape esperada por el cliente:

| Operación | Verbo HTTP | URL | Body |
|---|---|---|---|
| Insert | `POST` | `{endpoint}/{table}` | `[{row}, ...]` |
| Upsert | `POST` | `{endpoint}/{table}?on_conflict=col` | `{row}` + header `Prefer: resolution=merge-duplicates` |
| Select | `GET`  | `{endpoint}/{view}?order=col.desc&limit=N` | — |

Headers requeridos en cada request:

```
apikey: <ANON_KEY>
Authorization: Bearer <ANON_KEY>
Content-Type: application/json
```

---

## 10. Cambiar el PIN

El PIN está hardcodeado como `101284` dentro de `sentinel.js`:

```js
sha256('101284').then(function (h) { self.pinRealHash = h; });
```

Para cambiarlo: editar esa línea con el nuevo PIN de 6 dígitos. Si quieres
otro tamaño, también ajustar `CONFIG.pinLength`.

No olvides hacer un purge del lock storage si tu navegador quedó bloqueado:

```js
localStorage.removeItem('snt:pin_lock');
```

---

## 11. Resolución de problemas

### El footer dice "Offline · configurar endpoint"
→ Los meta tags `sentinel-endpoint` y `sentinel-anon-key` están vacíos en `index.html`.

### Las pestañas dicen "Sin datos"
→ La conexión funciona pero aún no hay registros. Visita el sitio en otra
pestaña, navega un poco, vuelve a abrir Sentinel y refresca.

### Error CORS
→ En el dashboard de Insforge, añade `https://moonshadowspro.com` y
`http://localhost:*` a la lista de orígenes permitidos.

### El PIN pad no aparece al tipear "admin"
→ Verifica que no estés tipeando dentro de un `<input>` o `<textarea>`.
Sentinel ignora la activación si el foco está en un campo de texto.

### La consola se ve mal en móvil
→ Reportar como bug. Sentinel.css incluye `@media (max-width: 720px)` con
adaptaciones específicas. Cualquier rotura indica regresión.

---

## 12. Roadmap

- [ ] Banner de consentimiento opcional (`data-sentinel-consent="required"`)
- [ ] Export CSV desde el dashboard
- [ ] Webhook a Slack en errores críticos
- [ ] A/B testing flags con el mismo storage
- [ ] Heatmaps con `viewport_x/y` que ya guardamos
- [ ] Comparativa semana vs semana
- [ ] Dark/light theme switcher dentro de la consola

---

*Sentinel v1.0 · Moonshadows EIRL · 2026*
