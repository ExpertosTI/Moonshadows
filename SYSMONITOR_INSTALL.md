# SysMonitor - Guía de Instalación

## ¿Qué es SysMonitor?

Una aplicación macOS nativa que te ayuda a liberar espacio en disco moviendo archivos pesados a un USB externo, con redirección automática de carpetas.

## Instalación (3 pasos)

### 1. Descargar
Descarga `SysMonitor.dmg` de este directorio (renace.tech/documentos)

### 2. Instalar
Abre el archivo `SysMonitor.dmg`:
- Haz doble clic en el DMG
- Se abrirá una ventana con el icono de SysMonitor.app
- **Arrastra** SysMonitor.app a la carpeta **Applications** (que aparece dentro)
- Espera a que termine la copia

### 3. Ejecutar
En Finder → Applications, busca **SysMonitor**
- Haz doble clic para abrirlo
- La primera vez te pedirá permisos (Dale OK)
- ¡Listo!

## Alternativa: Terminal

```bash
# Montar DMG
hdiutil attach ~/Downloads/SysMonitor.dmg

# Copiar a Applications
cp -r /Volumes/SysMonitor/SysMonitor.app /Applications/

# Desmontar
hdiutil detach /Volumes/SysMonitor

# Ejecutar
open /Applications/SysMonitor.app
```

## Funcionalidades

### 📁 Redirigir Carpetas
Mueve carpetas enteras (Descargas, Documentos, etc.) al USB automáticamente:
1. Conecta un USB
2. Elige el disco en la sección "Disco de Trabajo USB"
3. En la pestaña "Discos" → "Redirigir carpetas al USB"
4. Activa las carpetas que quieras mover

**Resultado:** Los archivos se guardan en el USB, pero aparecen en el mismo lugar en Finder (mediante symlinks)

### 📦 Mover Archivos Grandes
Detecta y copia archivos pesados (>20MB) al USB:
1. Selecciona qué mover
2. Haz clic en "Redirigir" en cada fila

### 🗑️ Limpiar Basura
Escanea y elimina:
- Cachés
- Logs
- Archivos temporales

## Requisitos

- **macOS 13+**
- **USB externo formateado** (en APFS o ExFAT)
- **Espacio disponible en el USB**

## Solución de Problemas

### "No puedo abrir SysMonitor"
- Abre **System Settings** → **Privacy & Security**
- Desplázate a **Open anyway**
- Haz clic en **Open**

### "SysMonitor se cierra sin hacer nada"
- Abre **Terminal**
- Corre: `open /Applications/SysMonitor.app`
- Verifica los mensajes de error en la consola

### "Los archivos no se mueven al USB"
- Verifica que el USB esté montado (`ls /Volumes/`)
- Asegúrate de que hay espacio libre en el USB
- Revisa los permisos de la carpeta

## Desinstalación

Para eliminar SysMonitor:
```bash
rm -rf /Applications/SysMonitor.app
```

---

**Versión:** 1.0  
**Última actualización:** Abril 2026
