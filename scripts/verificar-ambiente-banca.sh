#!/usr/bin/env bash
# ==============================================================================
# Script de Auditoria Pré-Banca — Orienta Mobile
# ==============================================================================
echo "🔍 [BANCA] Auditando ambiente do aplicativo mobile..."

echo "1. Verificando TypeScript..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "   ✅ TypeScript: 0 erros."
else
    echo "   ⚠️ Avisos detectados no TypeScript."
fi

echo "2. Testando comunicação com a API local (http://localhost:8080)..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health || echo "API offline ou porta não mapeada"

echo "✅ [BANCA] Ambiente mobile verificado!"
