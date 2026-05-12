#!/bin/bash
# ------------------------------------------------------------------------
# Script para automatizar la instalación y configuración de Postfix (Forwarder)
# Este script instalará Postfix sin hacer preguntas, configurará tu dominio
# y redirigirá los correos entrantes hacia una cuenta externa.
# ------------------------------------------------------------------------

# --- CONFIGURACIÓN PRINCIPAL ---
DOMAIN="renace.tech"
# 👇 REEMPLAZA ESTO POR EL CORREO DONDE QUIERES RECIBIR LOS MENSAJES 👇
TARGET_EMAIL="tu_correo_personal@gmail.com"
# -------------------------------

if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Por favor, ejecuta este script como root (usando sudo)"
  exit 1
fi

if [ "$TARGET_EMAIL" = "tu_correo_personal@gmail.com" ]; then
  echo "⚠️  Advertencia: Estás usando el correo de ejemplo. Cambia TARGET_EMAIL en el script."
  exit 1
fi

echo "🚀 [1/5] Configurando opciones de instalación desatendida para Postfix..."
# Esto evita que Postfix pida confirmaciones en una pantalla azul/rosada
echo "postfix postfix/mailname string $DOMAIN" | debconf-set-selections
echo "postfix postfix/main_mailer_type string 'Internet Site'" | debconf-set-selections

echo "📦 [2/5] Actualizando repositorios e instalando Postfix..."
DEBIAN_FRONTEND=noninteractive apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y postfix

echo "⚙️  [3/5] Configurando dominios y reenvíos virtuales..."
# Añade las configuraciones a main.cf de manera automática
postconf -e "virtual_alias_domains = $DOMAIN"
postconf -e "virtual_alias_maps = hash:/etc/postfix/virtual"

# Crea el archivo de rutas (alias virtuales)
cat > /etc/postfix/virtual <<EOF
adderlymarte@$DOMAIN    $TARGET_EMAIL
info@$DOMAIN            $TARGET_EMAIL
EOF

echo "🔄 [4/5] Aplicando cambios y reiniciando el servicio de correo..."
postmap /etc/postfix/virtual
systemctl restart postfix

echo "🛡️  [5/5] Configurando el Firewall (UFW) para el puerto 25..."
if command -v ufw > /dev/null; then
    ufw allow 25/tcp
    echo "Puerto 25 abierto en UFW."
else
    echo "⚠️  UFW no está instalado. Si usas otro firewall (como iptables o desde el panel de tu proveedor), asegúrate de abrir el puerto 25 (TCP)."
fi

echo "✅ ¡Instalación y configuración completada automáticamente!"
echo ""
echo "📝 SIGUIENTE PASO OBLIGATORIO:"
echo "Ve a la configuración DNS de tu dominio ($DOMAIN) y agrega el siguiente registro:"
echo "- Tipo: MX"
echo "- Nombre: @"
echo "- Destino: mail.$DOMAIN (Asegúrate de tener también un registro A 'mail' que apunte a la IP de este servidor)"
echo "- Prioridad: 10"
