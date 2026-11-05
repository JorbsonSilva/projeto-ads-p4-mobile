#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE ATUALIZAÇÃO DIRETA DA BRANCH Front-3.0 A PARTIR DO GIT BUNDLE
# ==============================================================================
set -e

echo "========================================================================"
echo "  🚀 ATUALIZANDO REPOSITÓRIO LOCAL COM A ENTREGA ORIENTA 2.0"
echo "========================================================================"

BUNDLE_FILE=""
if [ -f "./orienta-frontend.bundle" ]; then
    BUNDLE_FILE="./orienta-frontend.bundle"
elif [ -f "./bundles/orienta-frontend.bundle" ]; then
    BUNDLE_FILE="./bundles/orienta-frontend.bundle"
elif [ -f "../orienta-frontend.bundle" ]; then
    BUNDLE_FILE="../orienta-frontend.bundle"
elif [ -f "../bundles/orienta-frontend.bundle" ]; then
    BUNDLE_FILE="../bundles/orienta-frontend.bundle"
else
    echo "❌ Erro: orienta-frontend.bundle não encontrado na pasta atual!"
    exit 1
fi

echo "▶ 1. Ingerindo commits do bundle para a branch Front-3.0..."
git fetch "$BUNDLE_FILE" refactor/orienta-2.0:Front-3.0

echo "▶ 2. Alternando para a branch Front-3.0..."
git checkout Front-3.0

echo "▶ 3. Alinhando a working tree com o commit d952276..."
git reset --hard FETCH_HEAD

echo "▶ 4. Verificando o commit no HEAD:"
git log -n 1 --oneline

echo "========================================================================"
echo "  ✅ REPOSITÓRIO LOCAL ATUALIZADO COM SUCESSO!"
echo "  Para enviar ao GitHub oficial, execute:"
echo "    git push -u origin Front-3.0 --force"
echo "========================================================================"
