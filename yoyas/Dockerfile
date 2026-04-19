FROM nginx:1.27-alpine

RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/America/Santo_Domingo /etc/localtime && \
    echo "America/Santo_Domingo" > /etc/timezone

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar assets estáticos
COPY index.html style.css script.js /usr/share/nginx/html/

# Copiar assets estáticos (incluyendo logos y svg)
COPY index.html style.css script.js renace.svg logo.png /usr/share/nginx/html/

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 644 /usr/share/nginx/html/*

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
