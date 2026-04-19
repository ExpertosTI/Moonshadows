FROM nginx:1.27-alpine

RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/America/Santo_Domingo /etc/localtime && \
    echo "America/Santo_Domingo" > /etc/timezone

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar assets estáticos
COPY index.html style.css script.js /usr/share/nginx/html/

# Copiar logo si existe (build no falla si está ausente)
RUN mkdir -p /tmp/logobuild
COPY logo.* /tmp/logobuild/ 2>/dev/null || true
RUN if ls /tmp/logobuild/logo.* 1>/dev/null 2>&1; then \
        cp /tmp/logobuild/logo.* /usr/share/nginx/html/; \
    fi && rm -rf /tmp/logobuild

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 644 /usr/share/nginx/html/*

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
