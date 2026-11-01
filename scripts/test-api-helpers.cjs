/**
 * Testes Automatizados Permanentes e Reprodutíveis dos Helpers de API (Orienta 2.0).
 * Rastreabilidade: Prioridade 1 - Lote 1 (Refinamento de Robustez)
 * 
 * Dependência de execução: 'esbuild' é uma dependência necessária para a transpilação
 * do TypeScript em runtime, simulando o ambiente do client sem instalar pacotes adicionais.
 * 
 * O script tenta primeiro require("esbuild") no ambiente padrão. Caso não seja encontrado,
 * é possível definir o caminho do módulo através da variável de ambiente ORIENTA_ESBUILD_PATH.
 * 
 * Exemplos de execução:
 * node scripts/test-api-helpers.cjs
 * ORIENTA_ESBUILD_PATH=/caminho/para/esbuild node scripts/test-api-helpers.cjs
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let esbuild;
try {
  esbuild = require("esbuild");
} catch (errPadrao) {
  const customPath = process.env.ORIENTA_ESBUILD_PATH;
  if (customPath) {
    try {
      esbuild = require(customPath);
    } catch (errCustom) {
      console.error(`Falha ao carregar esbuild a partir de ORIENTA_ESBUILD_PATH ("${customPath}"):`, errCustom.message);
      process.exit(1);
    }
  } else {
    console.error("esbuild não encontrado. Instale o pacote 'esbuild' no ambiente ou configure a variável de ambiente ORIENTA_ESBUILD_PATH com o caminho do módulo.");
    process.exit(1);
  }
}

const apiConfigPath = path.resolve(__dirname, "../config/api.ts");
if (!fs.existsSync(apiConfigPath)) {
  console.error("Arquivo config/api.ts não encontrado em:", apiConfigPath);
  process.exit(1);
}

const tsCode = fs.readFileSync(apiConfigPath, "utf8");
const jsCode = esbuild.transformSync(tsCode, { loader: "ts", target: "es2022", format: "cjs" }).code;

const m = { exports: {} };
const fn = new Function("module", "exports", "require", jsCode);
const mockAxios = {
  create: () => ({ interceptors: { request: { use: () => {} }, response: { use: () => {} } } })
};
mockAxios.default = mockAxios;

fn(m, m.exports, (mod) => {
  if (mod === "axios") return mockAxios;
  if (mod === "@react-native-async-storage/async-storage") return { default: {} };
  return {};
});

const {
  isApiResponse,
  isApiError,
  extrairDadosLista,
  extrairDadosObjeto,
  desempacotarResposta
} = m.exports;

let totalExecutados = 0;
let totalAprovados = 0;
let totalReprovados = 0;

function executarTeste(nome, testeFn) {
  totalExecutados++;
  try {
    testeFn();
    totalAprovados++;
    console.log(`  [PASS] ${nome}`);
  } catch (error) {
    totalReprovados++;
    console.error(`  [FAIL] ${nome}`);
    console.error(`         Motivo: ${error.message}`);
  }
}

console.log("================================================================================");
console.log("SUÍTE DE TESTES PERMANENTE: HELPERS ApiResponse<T> (PRIORIDADE 1 - LOTE 1)");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// 1. isApiResponse<T>
// -----------------------------------------------------------------------------
console.log("--- 1. Testes de isApiResponse<T> ---");

executarTeste("isApiResponse: Envelope válido com success: true", () => {
  assert.equal(isApiResponse({ success: true, data: [1, 2] }), true);
});

executarTeste("isApiResponse: Envelope válido com success: false", () => {
  assert.equal(isApiResponse({ success: false, data: null }), true);
});

executarTeste("isApiResponse: success textual (string \"true\") deve ser rejeitado", () => {
  assert.equal(isApiResponse({ success: "true", data: [] }), false);
});

executarTeste("isApiResponse: success textual (string \"sim\") deve ser rejeitado", () => {
  assert.equal(isApiResponse({ success: "sim", data: [] }), false);
});

executarTeste("isApiResponse: Ausência de success deve retornar false", () => {
  assert.equal(isApiResponse({ data: [] }), false);
});

executarTeste("isApiResponse: Ausência de data deve retornar false", () => {
  assert.equal(isApiResponse({ success: true }), false);
});

executarTeste("isApiResponse: Payload nulo deve retornar false", () => {
  assert.equal(isApiResponse(null), false);
});

executarTeste("isApiResponse: Payload indefinido deve retornar false", () => {
  assert.equal(isApiResponse(undefined), false);
});

executarTeste("isApiResponse: Payload primitivo (número) deve retornar false", () => {
  assert.equal(isApiResponse(42), false);
});

executarTeste("isApiResponse: Payload primitivo (string) deve retornar false", () => {
  assert.equal(isApiResponse("texto"), false);
});

// -----------------------------------------------------------------------------
// 2. isApiError
// -----------------------------------------------------------------------------
console.log("\n--- 2. Testes de isApiError ---");

executarTeste("isApiError: ErrorResponseDTO válido com status 400 (Bad Request)", () => {
  assert.equal(isApiError({ status: 400, error: "Bad Request", message: "Campo inválido", path: "/api/v1/auth" }), true);
});

executarTeste("isApiError: ErrorResponseDTO válido com status 401 (Unauthorized)", () => {
  assert.equal(isApiError({ status: 401, error: "Credenciais Inválidas", message: "Senha incorreta" }), true);
});

executarTeste("isApiError: ErrorResponseDTO válido com status 404 (Not Found)", () => {
  assert.equal(isApiError({ status: 404, error: "Recurso Não Encontrado", message: "Usuário inexistente" }), true);
});

executarTeste("isApiError: ErrorResponseDTO válido com status 500 (Internal Server Error)", () => {
  assert.equal(isApiError({ status: 500, error: "Erro Interno", message: "Falha de servidor" }), true);
});

executarTeste("isApiError: Objeto com status: 200 NÃO deve ser classificado como erro", () => {
  assert.equal(isApiError({ status: 200, message: "OK" }), false);
});

executarTeste("isApiError: Objeto de domínio com status numérico NÃO deve ser erro", () => {
  assert.equal(isApiError({ id: 10, status: 1, alunoNome: "Gabriel" }), false);
});

executarTeste("isApiError: Objeto de domínio com error textual isolado NÃO deve ser erro", () => {
  assert.equal(isApiError({ id: 10, error: "campo_secundario", valor: 100 }), false);
});

executarTeste("isApiError: Objeto com message textual mas sem estrutura de erro NÃO deve ser erro", () => {
  assert.equal(isApiError({ message: "Olá, bem-vindo!" }), false);
});

executarTeste("isApiError: Payload nulo deve retornar false", () => {
  assert.equal(isApiError(null), false);
});

executarTeste("isApiError: Payload primitivo deve retornar false", () => {
  assert.equal(isApiError("erro fatal"), false);
});

executarTeste("isApiError: ApiResponse com success: false e mensagem deve ser reconhecido como erro", () => {
  assert.equal(isApiError({ success: false, message: "Regra violada" }), true);
});

// -----------------------------------------------------------------------------
// 3. extrairDadosLista<T>
// -----------------------------------------------------------------------------
console.log("\n--- 3. Testes de extrairDadosLista<T> ---");

executarTeste("extrairDadosLista: Array direto deve ser retornado intacto", () => {
  const lista = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(extrairDadosLista(lista), lista);
});

executarTeste("extrairDadosLista: Envelope contendo array em data deve ser desempacotado", () => {
  const envelope = { success: true, data: [{ id: 10 }, { id: 20 }] };
  assert.deepEqual(extrairDadosLista(envelope), [{ id: 10 }, { id: 20 }]);
});

executarTeste("extrairDadosLista: Lista vazia deve retornar []", () => {
  assert.deepEqual(extrairDadosLista({ success: true, data: [] }), []);
});

executarTeste("extrairDadosLista: data: null com success: true deve retornar []", () => {
  assert.deepEqual(extrairDadosLista({ success: true, data: null }), []);
});

executarTeste("extrairDadosLista: data: undefined com success: true deve retornar []", () => {
  assert.deepEqual(extrairDadosLista({ success: true, data: undefined }), []);
});

executarTeste("extrairDadosLista: Objeto no lugar de array deve lançar TypeError", () => {
  assert.throws(
    () => extrairDadosLista({ success: true, data: { id: 1, nome: "Carlos" } }),
    TypeError
  );
});

executarTeste("extrairDadosLista: Número no lugar de array deve lançar TypeError/Error", () => {
  assert.throws(
    () => extrairDadosLista({ success: true, data: 12345 }),
    TypeError
  );
});

executarTeste("extrairDadosLista: String no lugar de array deve lançar TypeError/Error", () => {
  assert.throws(
    () => extrairDadosLista({ success: true, data: "string_invalida" }),
    TypeError
  );
});

executarTeste("extrairDadosLista: ErrorResponseDTO deve lançar exceção com mensagem", () => {
  assert.throws(
    () => extrairDadosLista({ status: 400, error: "Bad Request", message: "Regra violada" }),
    (err) => err.message.includes("Regra violada")
  );
});

executarTeste("extrairDadosLista: Envelope malformado sem data deve lançar TypeError", () => {
  assert.throws(
    () => extrairDadosLista({ success: true }),
    TypeError
  );
});

// -----------------------------------------------------------------------------
// 4. extrairDadosObjeto<T>
// -----------------------------------------------------------------------------
console.log("\n--- 4. Testes de extrairDadosObjeto<T> ---");

executarTeste("extrairDadosObjeto: Objeto direto deve ser retornado", () => {
  const obj = { id: 1, nome: "Carlos" };
  assert.deepEqual(extrairDadosObjeto(obj), obj);
});

executarTeste("extrairDadosObjeto: Envelope contendo objeto deve ser desempacotado", () => {
  const envelope = { success: true, data: { id: 2, nome: "Helena" } };
  assert.deepEqual(extrairDadosObjeto(envelope), { id: 2, nome: "Helena" });
});

executarTeste("extrairDadosObjeto: Array direto recebido deve lançar TypeError", () => {
  assert.throws(
    () => extrairDadosObjeto([{ id: 1 }]),
    TypeError
  );
});

executarTeste("extrairDadosObjeto: Envelope contendo array em data deve lançar TypeError", () => {
  assert.throws(
    () => extrairDadosObjeto({ success: true, data: [{ id: 1 }] }),
    TypeError
  );
});

executarTeste("extrairDadosObjeto: Dados nulos devem lançar exceção", () => {
  assert.throws(
    () => extrairDadosObjeto(null),
    Error
  );
});

executarTeste("extrairDadosObjeto: ErrorResponseDTO deve lançar exceção com a mensagem", () => {
  assert.throws(
    () => extrairDadosObjeto({ status: 404, error: "Not Found", message: "Usuário não localizado" }),
    (err) => err.message.includes("Usuário não localizado")
  );
});

executarTeste("extrairDadosObjeto: Envelope com data nulo deve lançar exceção", () => {
  assert.throws(
    () => extrairDadosObjeto({ success: true, data: null }),
    Error
  );
});

// -----------------------------------------------------------------------------
// 5. desempacotarResposta<T>
// -----------------------------------------------------------------------------
console.log("\n--- 5. Testes de desempacotarResposta<T> ---");

executarTeste("desempacotarResposta: Envelope contendo objeto deve desempacotar", () => {
  const env = { success: true, data: { id: 99, nome: "Objeto" } };
  assert.deepEqual(desempacotarResposta(env), { id: 99, nome: "Objeto" });
});

executarTeste("desempacotarResposta: Envelope contendo array deve desempacotar (sem lançar TypeError)", () => {
  const env = { success: true, data: [1, 2, 3] };
  assert.deepEqual(desempacotarResposta(env), [1, 2, 3]);
});

executarTeste("desempacotarResposta: Envelope contendo primitivo deve desempacotar", () => {
  const env = { success: true, data: 42 };
  assert.equal(desempacotarResposta(env), 42);
});

executarTeste("desempacotarResposta: Envelope com success: false deve lançar exceção", () => {
  assert.throws(
    () => desempacotarResposta({ success: false, message: "Acesso revogado" }),
    (err) => err.message.includes("Acesso revogado")
  );
});

executarTeste("desempacotarResposta: ErrorResponseDTO deve lançar exceção", () => {
  assert.throws(
    () => desempacotarResposta({ status: 403, error: "Acesso Negado", message: "Sem permissão" }),
    (err) => err.message.includes("Sem permissão")
  );
});

executarTeste("desempacotarResposta: Payload direto (sem envelope) deve ser retornado", () => {
  assert.equal(desempacotarResposta("string_direta"), "string_direta");
});

console.log("\n================================================================================");
console.log(`RESUMO DOS TESTES: Executados: ${totalExecutados} | Aprovados: ${totalAprovados} | Reprovados: ${totalReprovados}`);
console.log("================================================================================");

if (totalReprovados > 0) {
  process.exit(1);
} else {
  console.log(">>> TODOS OS CENÁRIOS OBRIGATÓRIOS FORAM VALIDADOS COM 100% DE SUCESSO! <<<\n");
  process.exit(0);
}
