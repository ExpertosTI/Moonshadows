#!/bin/bash
# Script para reparar el dominio del correo en Roundcube (VPS 45.9.191.18)

echo "🚀 Iniciando conexión con el servidor RenaceTech (VPS)..."
ssh root@45.9.191.18 << 'EOF'
  echo "🔍 Buscando contenedor de Roundcube activo..."
  RC_CONTAINER=$(docker ps -q -f name=roundcube | head -n 1)
  
  if [ -z "$RC_CONTAINER" ]; then
    echo "❌ No se encontró ningún contenedor de Roundcube corriendo."
    exit 1
  fi
  
  echo "✅ Contenedor encontrado: $RC_CONTAINER"
  
  # Usar el archivo en host o sacarlo del contenedor
  echo "📥 Extrayendo config.inc.php usando Copia Atómica..."
  docker cp $RC_CONTAINER:/var/www/html/config/config.inc.php /root/rncmail/config.inc.php
  
  # Si el archivo NO tiene ya el dominio, se inyecta:
  if ! grep -q "mail_domain" /root/rncmail/config.inc.php; then
    echo "✍️ Inyectando validaciones de mail_domain y username_domain..."
    echo "" >> /root/rncmail/config.inc.php
    echo "// Forzar dominios corporativos" >> /root/rncmail/config.inc.php
    echo "\$config['mail_domain'] = 'renace.tech';" >> /root/rncmail/config.inc.php
    echo "\$config['username_domain'] = 'renace.tech';" >> /root/rncmail/config.inc.php
    
    echo "📤 Retornando config.inc.php al contenedor..."
    docker cp /root/rncmail/config.inc.php $RC_CONTAINER:/var/www/html/config/config.inc.php
    echo "🎉 ¡Dominio parcheado exitosamente!"
  else
    echo "⚠️ El archivo ya contiene mail_domain. No se harán doble inyecciones."
  fi
EOF

echo "✅ Operación finalizada. Por favor inicia sesión de nuevo en el Webmail de Renace."
