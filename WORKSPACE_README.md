# RenaceTech Workspace Directory

This workspace contains multiple active and legacy projects. To avoid confusion for technical agents and developers, please follow this structure:

## 🏛️ Core Renace Stack (Root)
- `server.js`: The main Express production server (metrics, Odoo portal, forms). **DO NOT DELETE**.
- `docker-compose.yml`: Stack definition for the main corporate site.
- `deploy_corporate.sh`: Deployment script for the `renace` stack.
- `portal.html`, `index.html`, etc.: Static assets for the corporate portal.

## 🚀 Active Projects
- `jairo-main/`: The main monorepo for JairoApp (API & Web).
  - Use `jairo-main/deploy.sh` to ship changes to the VPS.
- `renace-pos-promo/`: High-performance mobile promo for Renace POS.
- `wedding-invitation/`: Cinematic wedding invitation app.

## 📂 System & Tools
- `_agents/`: Internal documentation and project configuration for AI agents.
- `SysMonitor/`: System health tracking tools.
- `automatizacion/`: Infrastructure scripts.

## 📦 Archives & Legacy
- `_legacy_archives/`: Container for old PHP files (`ayuda.php`, `contact.php`) and deprecated projects.
- `raices/`, `presta_pro/`: Projects being phased out or in maintenance.

---
**Standard Protocol**: Always check the specific project folder for a `deploy.sh` before running generic root commands.
