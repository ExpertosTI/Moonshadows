# Moonshadows — Web

Sitio corporativo de **Moonshadows EIRL** (Carlos A. Arbeláez).
Vanilla HTML + CSS moderno + JS sin dependencias, SVG inline animado.
Stack ultraligero (~30 KB sin fuentes), 0 build step, nginx:alpine en Docker.

## Estructura

```
moonshadows-web/
├── index.html         # one-page completo
├── styles.css         # design system (cascade layers, tokens, animaciones)
├── app.js             # interacciones (reveal, spotlight, tilt, magnetic)
├── assets/
│   ├── logo.svg       # logo grande (hero)
│   ├── logo-mark.svg  # monograma compacto (nav)
│   └── favicon.svg    # favicon dark
├── Dockerfile         # nginx:alpine
├── nginx.conf         # caching + gzip + headers
├── docker-compose.yml # Docker Swarm + Traefik + RenaceNet
└── deploy.sh          # Renace protocol
```

## Desarrollo local

```bash
# opción 1 — desde el worktree
cd moonshadows-web
python3 -m http.server 5183
# → http://localhost:5183

# opción 2 — vía .claude/launch.json (en Claude Code)
# preview_start con nombre "moonshadows"
```

## Despliegue (Renace Protocol)

```bash
# 1. SSH al VPS
ssh user@renace-vps

# 2. Primera vez (clona repo en /opt/moonshadows)
git clone git@github.com:renace-tech/moonshadows.git /opt/moonshadows

# 3. Deploy
cd /opt/moonshadows
./moonshadows-web/deploy.sh

# Variables opcionales:
 DOMAIN=moonshadowspro.com \
  STACK_NAME=moonshadows \
  ./moonshadows-web/deploy.sh
```

### Verificación post-deploy

```bash
docker stack services moonshadows
docker service logs -f moonshadows_web
curl -I https://moonshadowspro.com/healthz
```

## DNS

Apuntar al VPS:

```
moonshadowspro.com      A   <VPS_IP>
www.moonshadowspro.com  A   <VPS_IP>
```

Traefik gestiona el certificado vía Let's Encrypt automáticamente.

## Decisiones de diseño

- **Vanilla > framework** — el sitio carga en ~150ms FCP. Una landing one-page no justifica Next.js.
- **CSS cascade layers** — tokens, base, components, animations, utilities — sin conflictos.
- **SVG inline en el hero** — animaciones CSS por partes (luna, bulbo, haz). No requiere JS.
- **IntersectionObserver para reveals** — 60fps, sin librerías.
- **Spotlight que sigue al mouse** — `--mx`/`--my` CSS custom properties + radial-gradient + mix-blend-mode.
- **Cards con tilt 3D + spotlight local** — JS mínimo, GPU-accelerated.
- **Magnetic CTAs** — los botones primarios "atraen" al cursor sutilmente.
- **Partículas de polvo dorado** — capas absolutas con `animation-delay` aleatorio. Lamplight feel.
- **Honra `prefers-reduced-motion`** — todas las animaciones se desactivan.

## Powered by

Sutil en el footer: punto dorado pulsante + texto en uppercase con baja opacidad.
Hover → opacidad 100% + link a [renace.tech](https://renace.tech).
