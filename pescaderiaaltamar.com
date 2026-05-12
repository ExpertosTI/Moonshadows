upstream odoo-backend {
    server 127.0.0.1:9010;
}
upstream odoo-chat {
    server 127.0.0.1:8072;
}

server {
    server_name pescaderiaaltamar.com;

    # Log files
    access_log /var/log/nginx/odoo.access.log;
    error_log /var/log/nginx/odoo.error.log;

    # Aumentar límites para subida de archivos pesados
    client_max_body_size 128M;

    # Parámetros de buffer para evitar errores de cabeceras largas
    proxy_read_timeout 720s;
    proxy_connect_timeout 720s;
    proxy_send_timeout 720s;
    proxy_buffers 16 64k;
    proxy_buffer_size 128k;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Hide Nginx version
    server_tokens off;

    # Bloquear acceso a archivos ocultos (ej. .git, .env)
    location ~ /\. {
        deny all;
    }

    # Cabeceras estándar para Odoo Proxy Mode
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # Redirección de Longpolling (Chat)
    location /longpolling {
        proxy_pass http://odoo-chat;
    }

    # Landing Page y Assets servidos desde el Servidor 2 (Traefik - 45.9.191.18)
    location = / {
        proxy_pass https://45.9.191.18;
        proxy_ssl_verify off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /assets/ {
        proxy_pass https://45.9.191.18;
        proxy_ssl_verify off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Resto de la aplicación Odoo (/web, /shop, etc.)
    location / {
        proxy_redirect off;
        proxy_pass http://odoo-backend;
    }

    # Caché para archivos estáticos
    location ~* /web/static/ {
        proxy_cache_valid 200 90m;
        proxy_buffering on;
        expires 864000;
        proxy_pass http://odoo-backend;
    }

    # Compresión Gzip
    gzip_types text/css text/less text/plain text/xml application/xml application/json application/javascript;
    gzip on;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/pescaderiaaltamar.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/pescaderiaaltamar.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}


server {
    if ($host = pescaderiaaltamar.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name pescaderiaaltamar.com;
    return 404; # managed by Certbot


}