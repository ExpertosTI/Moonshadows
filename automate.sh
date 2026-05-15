#!/bin/bash
# =================================================================
# RNV Manager - UNIVERSAL AUTOMATION TOOL (VPS + DESKTOP)
# =================================================================
# Usage: ./automate.sh [vps|desktop|all]

set -e

# --- CONFIGURATION ---
VPS_IP="45.9.191.18"
VPS_USER="root"
REMOTE_PATH="/root/renace.tech/rnv-manager-stack"
LOCAL_SRC="./rnv-manger"
APP_NAME="rnv-manager"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

header() {
    echo -e "${BLUE}=====================================================${NC}"
    echo -e "${BLUE}   $1${NC}"
    echo -e "${BLUE}=====================================================${NC}"
}

# --- 1. VPS DEPLOYMENT (GIT BASED) ---
deploy_vps() {
    header "ACTUALIZACIÓN DE SERVIDOR (VIA GIT)"
    
    echo -e "${YELLOW}💾 Asegurando que los cambios locales estén comiteados...${NC}"
    git add .
    git commit -m "Auto-deploy: Update RNV Manager logic $(date +'%Y-%m-%d %H:%M:%S')" || echo "No hay cambios nuevos para comitear."
    
    echo -e "${YELLOW}🔄 Sincronizando con el repositorio remoto (Pull)...${NC}"
    git pull origin main --rebase

    echo -e "${YELLOW}⬆️  Empujando cambios al repositorio remoto (Push)...${NC}"
    git push origin main

    echo -e "${YELLOW}🔄 Actualizando servidor VPS remotamente...${NC}"
    ssh "$VPS_USER@$VPS_IP" << EOF
        cd "$REMOTE_PATH"
        echo "📥 Bajando cambios de Git..."
        git pull origin main
        
        echo "🏗️  Actualizando Docker Swarm..."
        docker stack deploy -c docker-compose.yml --with-registry-auth rnv-manager-stack
        
        echo "✅ Servidor actualizado correctamente."
EOF
    echo -e "${GREEN}🚀 RNV Manager actualizado en: https://rnv.renace.tech${NC}"
}

# --- 2. DESKTOP COMPILATION ---
build_desktop() {
    header "COMPILANDO APP DE ESCRITORIO (ELECTRON)"
    
    echo -e "${YELLOW}📦 Instalando dependencias y generando Next.js standalone...${NC}"
    cd "$LOCAL_SRC"
    npm install
    npx prisma generate
    npm run build
    
    echo -e "${YELLOW}🔨 Empaquetando aplicación de escritorio...${NC}"
    cd electron-app
    npm install
    # Compilamos para Mac (si estás en Mac) o Windows
    npm run build:mac || npm run build
    
    echo -e "${GREEN}✅ App de escritorio generada en: $LOCAL_SRC/electron-app/dist${NC}"
    cd ../..
}

# --- EXECUTION LOGIC ---
case "$1" in
    vps)
        deploy_vps
        ;;
    desktop)
        build_desktop
        ;;
    all)
        deploy_vps
        build_desktop
        ;;
    *)
        echo "Uso: ./automate.sh [vps|desktop|all]"
        exit 1
        ;;
esac

echo -e "${GREEN}✨ ¡Proceso completado con éxito!${NC}"
