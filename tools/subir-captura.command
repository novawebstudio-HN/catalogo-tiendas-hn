#!/bin/bash
# Sube a GitHub las capturas que bajó el botón del navegador (jetstereo.json / acosa.json en Descargas).
# Doble clic en Finder, o en Terminal:  bash ~/vitrina-hn/tools/subir-captura.command
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
DL="$HOME/Downloads"
subidas=()

git pull --rebase --autostash --quiet origin main || { echo "No se pudo actualizar la copia del proyecto (git pull)."; read -r -p "Enter para cerrar"; exit 1; }

for id in jetstereo acosa; do
  # Chrome nombra las repetidas "jetstereo (1).json": se toma la más reciente de las últimas 24 h.
  f=$(find "$DL" -maxdepth 1 -name "$id*.json" -mtime -1 -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
  [ -n "$f" ] || continue
  n=$(node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(!Array.isArray(d.items)||!d.items.length)process.exit(1);console.log(d.items.length)' "$f" 2>/dev/null) \
    || { echo "✗ $(basename "$f") no tiene productos; no se sube."; continue; }
  cp "$f" "data/manual/$id.json"
  find "$DL" -maxdepth 1 -name "$id*.json" -delete
  subidas+=("$id: $n productos")
done

if [ ${#subidas[@]} -eq 0 ]; then
  echo "No encontré jetstereo.json ni acosa.json de hoy en Descargas. Primero usa el botón en la página de la tienda."
  read -r -p "Enter para cerrar"; exit 1
fi
git add data/manual/*.json
git commit --quiet -m "Captura desde navegador $(date '+%Y-%m-%d %H:%M')" || true
for intento in 1 2 3; do
  if git pull --rebase --autostash --quiet origin main && git push --quiet origin main; then
    printf '✓ Subido: %s\nLa página se actualiza en unos minutos.\n' "${subidas[*]}"
    osascript -e "display notification \"Subido: ${subidas[*]}\" with title \"Vitrina HN\"" >/dev/null 2>&1
    sleep 3; exit 0
  fi
  sleep 10
done
echo "No se pudo subir a GitHub."; read -r -p "Enter para cerrar"; exit 1
