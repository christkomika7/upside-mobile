#!/usr/bin/env bash
#
# Prépare un ZIP propre à envoyer au développeur qui publiera sur les stores.
# - Retire les fichiers internes (.claude/, notes internes, .DS_Store)
# - Exclut node_modules, .expo, .git
# - Vérifie qu'aucun secret évident ne traîne
# - Produit un fichier upside-mobile-handover-YYYY-MM-DD.zip à la racine du repo
#
# Usage : ./scripts/prepare-handover.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

DATE=$(date +%Y-%m-%d)
OUT="../upside-mobile-handover-${DATE}.zip"

# 1. Purge des .DS_Store (macOS)
find . -name ".DS_Store" -not -path "./node_modules/*" -delete 2>/dev/null || true

# 2. Détection basique de secrets (non exhaustive — à compléter au besoin)
if grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.expo \
     -E "(sk-[A-Za-z0-9]{20,}|BEGIN RSA PRIVATE KEY|xoxb-[A-Za-z0-9-]+)" . 2>/dev/null; then
  echo "⚠️  Des secrets potentiels ont été détectés (voir ci-dessus)."
  echo "    Retirez-les avant de créer le ZIP, puis relancez."
  exit 1
fi

# 3. Vérifie que les 3 docs de handover sont bien présents
for f in README.md HANDOVER.md eas.json; do
  if [ ! -f "$f" ]; then
    echo "❌ Fichier manquant : $f"
    exit 1
  fi
done

# 4. Création du ZIP en excluant les dossiers lourds / internes
zip -r "$OUT" . \
  -x "node_modules/*" \
  -x ".expo/*" \
  -x ".git/*" \
  -x ".claude/*" \
  -x "CLAUDE.md" \
  -x "AGENTS.md" \
  -x "*.DS_Store" \
  -x "google-service-account.json" \
  > /dev/null

echo "✅ Livrable prêt : $OUT"
du -h "$OUT" | awk '{print "   Taille :", $1}'
echo ""
echo "Prochaines étapes :"
echo "  1. Le développeur reçoit le ZIP."
echo "  2. Il l'extrait, lit README.md puis HANDOVER.md."
echo "  3. Il lance : cd mobile && npm ci && npx expo start pour vérifier."
echo "  4. Il enchaîne avec les builds EAS et la publication (voir HANDOVER.md § 3)."
