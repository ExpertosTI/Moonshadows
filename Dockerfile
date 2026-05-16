# ── Moonshadows static site — Renace protocol ──────────────
# nginx:alpine serves index.html + assets directly.
# Build is empty (vanilla site) but kept multi-stage-ready
# for future asset pipelines.

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="moonshadows-web" \
      org.opencontainers.image.description="Moonshadows EIRL — corporate site" \
      org.opencontainers.image.url="https://moonshadowspro.com" \
      org.opencontainers.image.vendor="renace.tech"

# Remove default config + welcome page
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy our nginx config and site
COPY nginx.conf            /etc/nginx/conf.d/moonshadows.conf
COPY index.html            /usr/share/nginx/html/index.html
COPY styles.css            /usr/share/nginx/html/styles.css
COPY app.js                /usr/share/nginx/html/app.js
COPY assets                /usr/share/nginx/html/assets

# Health endpoint
RUN printf 'OK\n' > /usr/share/nginx/html/healthz

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
