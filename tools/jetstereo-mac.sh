#!/bin/bash
# Captura semanal de Jetstereo desde tu Mac y la sube al repo.
# Uso manual:   bash tools/jetstereo-mac.sh
# Automático:   ver tools/com.novawebstudio.vitrina-jetstereo.plist
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

git pull --rebase --quiet origin main
node src/capture-jetstereo.mjs
git add data/manual/jetstereo.json
if git diff --cached --quiet; then echo "Sin cambios"; exit 0; fi
git commit --quiet -m "Captura de Jetstereo desde Mac $(date '+%Y-%m-%d %H:%M')"
git push --quiet origin main
echo "Listo: captura subida. GitHub actualiza la página en unos minutos."
