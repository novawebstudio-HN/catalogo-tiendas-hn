#!/bin/bash
# Instala en la Mac la captura diaria de Jetstereo y Acosa para Vitrina HN.
# Se corre una sola vez en Terminal:
#   bash <(curl -fsSL https://raw.githubusercontent.com/novawebstudio-HN/catalogo-tiendas-hn/main/tools/instalar-mac.sh)
# Para quitarla:  launchctl bootout gui/$(id -u)/com.vitrinahn.captura
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
REPO="novawebstudio-HN/catalogo-tiendas-hn"
DIR="$HOME/vitrina-hn"
LABEL="com.vitrinahn.captura"
HORA="${HORA:-19}"; MINUTO="${MINUTO:-40}"   # todos los días a las 7:40 p. m.

paso() { printf '\n\033[1;32m▸ %s\033[0m\n' "$1"; }
falta() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1"; exit 1; }

paso "Revisando lo necesario"
[ -d "/Applications/Google Chrome.app" ] || falta "Falta Google Chrome. Instálalo desde google.com/chrome y vuelve a correr este comando."
xcode-select -p >/dev/null 2>&1 || { xcode-select --install || true; falta "Se abrió el instalador de herramientas de Apple (git). Termina esa instalación y vuelve a correr este comando."; }
if ! command -v brew >/dev/null; then
  falta 'Falta Homebrew. Instálalo con este comando y luego vuelve a correr el instalador:
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
fi
command -v node >/dev/null || brew install node
command -v gh >/dev/null || brew install gh

paso "Conectando con GitHub (para poder subir los precios)"
gh auth status >/dev/null 2>&1 || gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git

paso "Descargando el proyecto en $DIR"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --rebase --autostash --quiet origin main
else gh repo clone "$REPO" "$DIR" -- --quiet; fi
cd "$DIR"
git config user.name >/dev/null || git config user.name "$(gh api user -q .login)"
git config user.email >/dev/null || git config user.email "$(gh api user -q '.id').$(gh api user -q .login)@users.noreply.github.com"
npm install --no-save --no-audit --no-fund --silent playwright
chmod +x tools/captura-mac.sh

paso "Programando la captura diaria ($HORA:$(printf %02d "$MINUTO"))"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$DIR/tools/captura-mac.sh</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>$HORA</integer><key>Minute</key><integer>$MINUTO</integer></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/vitrina-captura.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/vitrina-captura.log</string>
</dict>
</plist>
EOF
launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

paso "Primera captura ahora (se abre una ventana de Chrome unos minutos; no la cierres)"
bash tools/captura-mac.sh || true

printf '\n\033[1;32m✓ Listo.\033[0m La captura corre sola todos los días a las %s:%02d si la Mac está encendida\n(si estaba dormida, corre al despertar). Registro: ~/Library/Logs/vitrina-captura.log\n' "$HORA" "$MINUTO"
