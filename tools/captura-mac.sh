#!/bin/bash
# Captura Jetstereo y Acosa desde la Mac y sube el resultado a GitHub (la página se actualiza sola después).
# La corre a diario el agente que instala tools/instalar-mac.sh; también se puede correr a mano:
#   bash ~/vitrina-hn/tools/captura-mac.sh
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1

avisar() { osascript -e "display notification \"$1\" with title \"Vitrina HN\"" >/dev/null 2>&1 || true; echo "$1"; }

echo "== $(date '+%Y-%m-%d %H:%M') =="
git pull --rebase --autostash --quiet origin main || { avisar "No se pudo actualizar la copia del proyecto (git pull)."; exit 1; }

node src/capture-browser.mjs "$@"
estado=$?
resumen=$(tr '\n' ' ' < /tmp/vitrina-captura-resumen.txt 2>/dev/null)
if [ $estado -ne 0 ]; then avisar "La captura falló: $resumen"; exit 1; fi

git add data/manual/*.json
if git diff --cached --quiet; then avisar "Captura sin cambios: $resumen"; exit 0; fi
git commit --quiet -m "Captura desde Mac $(date '+%Y-%m-%d %H:%M')"
if git push --quiet origin main; then
  avisar "Precios subidos: $resumen"
else
  avisar "Se capturó pero no se pudo subir a GitHub."; exit 1
fi
