#!/bin/bash
# Captura Jetstereo y Acosa desde la Mac y sube el resultado a GitHub (la página se actualiza sola después).
# La corre a diario el agente que instala tools/instalar-mac.sh; también se puede correr a mano:
#   bash ~/vitrina-hn/tools/captura-mac.sh
# El agente la llama con --auto (9:15 a. m., 7:40 p. m. y al encender/iniciar sesión): en ese modo se salta
# si ya hubo una captura buena en las últimas 6 horas. A mano siempre corre.
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1

MARCA="$HOME/.vitrina-hn-ultima-captura"
AUTO=0; args=(); for a in "$@"; do [ "$a" = "--auto" ] && AUTO=1 || args+=("$a"); done
if [ $AUTO -eq 1 ]; then
  ultima=$(cat "$MARCA" 2>/dev/null || echo 0)
  if [ $(( $(date +%s) - ultima )) -lt 21600 ]; then echo "$(date '+%Y-%m-%d %H:%M') ya hubo captura hace menos de 6 h; se omite."; exit 0; fi
  sleep 45   # al encender, dar tiempo a que conecte el wifi
fi
listo() { date +%s > "$MARCA"; }

avisar() { osascript -e "display notification \"$1\" with title \"Vitrina HN\"" >/dev/null 2>&1 || true; echo "$1"; }

echo "== $(date '+%Y-%m-%d %H:%M') =="
git pull --rebase --autostash --quiet origin main || { avisar "No se pudo actualizar la copia del proyecto (git pull)."; exit 1; }

node src/capture-browser.mjs ${args[@]+"${args[@]}"}
estado=$?
resumen=$(tr '\n' ' ' < /tmp/vitrina-captura-resumen.txt 2>/dev/null)
if [ $estado -ne 0 ]; then avisar "La captura falló: $resumen"; exit 1; fi

git add data/manual/*.json
if git diff --cached --quiet; then listo; avisar "Captura sin cambios: $resumen"; exit 0; fi
git commit --quiet -m "Captura desde Mac $(date '+%Y-%m-%d %H:%M')"
# GitHub pudo recibir otros cambios mientras corría la captura: se integran y se reintenta.
for intento in 1 2 3; do
  if git pull --rebase --autostash --quiet origin main && git push --quiet origin main; then
    listo; avisar "Precios subidos: $resumen"; exit 0
  fi
  sleep 20
done
avisar "Se capturó pero no se pudo subir a GitHub."; exit 1
