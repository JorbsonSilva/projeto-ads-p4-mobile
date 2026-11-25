/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadTs(path, imports, globals = {}) {
  const source = readFileSync(join(__dirname, '..', path), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', ...Object.keys(globals), outputText)(
    module, module.exports, (id) => {
      assert.ok(Object.hasOwn(imports, id), `Importação inesperada: ${id}`);
      return imports[id];
    }, ...Object.values(globals),
  );
  return module.exports;
}

const base = 'https://spring.example.test/api/v1';
const conversation = '831af292-0756-4b70-9457-20981cc5ff95';
const message = '724ef4c7-1ac4-49b7-a39c-ce8ede5126f7';
const date = '2026-11-24T15:00:00.123456789Z';
const session = { token: 'public-test-fixture' };
const answer = {
  conversaId: conversation, mensagemId: message, resultado: 'RESPONDIDA',
  resposta: 'Resposta da FAQ.', origem: 'SIMULADO', evidencias: [{ id: 'M07', versaoCorpus: 1 }],
};
function envelope(status, data, extra) {
  return { success: status < 300, status, data, timestamp: date, ...extra };
}
function json(status, data, extra) {
  return new Response(JSON.stringify(envelope(status, data, extra)), { status });
}
function fixture(reply, globals) {
  const calls = [];
  const api = loadTs('services/tutorApi.ts', { '../config/api': { API_V1_URL: base } }, {
    fetch: (...args) => {
      calls.push(args);
      return reply(...args);
    },
    ...globals,
  });
  return { api, calls };
}
function send(api, pergunta = 'Como faço?', options = session, id = message) {
  return api.enviarMensagem(conversation, { mensagemId: id, pergunta }, options);
}

test('cria conversa com JSON vazio e Bearer da sessão', async () => {
  const data = { conversaId: conversation, expiraEm: date };
  const { api, calls } = fixture(() => json(201, data));
  assert.deepEqual(await api.criarConversa(session), data);
  const [[url, init]] = calls;
  assert.equal(url, base + '/tutor/conversas');
  assert.equal(init.method, 'POST');
  assert.equal(init.body, '{}');
  assert.equal(init.headers.Authorization, 'Bearer public-test-fixture');
  assert.equal(init.headers['Content-Type'], 'application/json');
});

test('envia somente UUID e pergunta, conserva caixa no reenvio e retorna evidência simulada', async () => {
  const { api, calls } = fixture(() => json(200, answer));
  const input = { mensagemId: message.toUpperCase(), pergunta: ' ação 😀 ', usuarioId: 42, modo: 'RAG' };
  assert.deepEqual(await api.enviarMensagem(conversation, input, session), answer);
  assert.deepEqual(await api.enviarMensagem(conversation, input, session), answer);
  assert.equal(calls.length, 2);
  for (const [url, init] of calls) {
    assert.equal(url, base + '/tutor/conversas/' + conversation + '/mensagens');
    assert.deepEqual(JSON.parse(init.body), { mensagemId: input.mensagemId, pergunta: 'ação 😀' });
  }
});

test('SEM_EVIDENCIA é resposta normal', async () => {
  const data = { ...answer, resultado: 'SEM_EVIDENCIA', evidencias: [] };
  const { api } = fixture(() => json(200, data));
  assert.deepEqual(await send(api), data);
});

test('encerra a conversa com DELETE sem corpo', async () => {
  const data = { conversaId: conversation };
  const { api, calls } = fixture(() => json(200, data));
  assert.deepEqual(await api.encerrarConversa(conversation, session), data);
  assert.equal(calls[0][0], base + '/tutor/conversas/' + conversation);
  assert.equal(calls[0][1].method, 'DELETE');
  assert.equal(Object.hasOwn(calls[0][1], 'body'), false);
});

for (const [name, reply] of [
  ['evidência inválida', () => json(200, { ...answer, evidencias: [{ id: 'M07', versaoCorpus: 0 }] })],
  ['resultado desconhecido', () => json(200, { ...answer, resultado: 'OUTRO' })],
  ['origem desconhecida', () => json(200, { ...answer, origem: 'OUTRA' })],
  ['status inesperado de sucesso', () => json(201, answer)],
  ['status do envelope divergente', () => json(200, answer, { status: 201 })],
  ['envelope ausente', () => new Response(JSON.stringify(answer))],
  ['JSON inválido', () => new Response('{')],
  ['UUID de resposta não canônico', () => json(200, { ...answer, mensagemId: '1-1-1-1-1' })],
  ['UUID de mensagem divergente', () => json(200, { ...answer, mensagemId: conversation })],
  ['UUID de conversa divergente', () => json(200, { ...answer, conversaId: message })],
]) {
  test(name, async () => {
    const { api } = fixture(reply);
    await assert.rejects(send(api), { kind: 'resposta_invalida' });
  });
}

test('rejeita datas inválidas no envelope e na conversa', async () => {
  for (const [data, extra] of [
    [{ conversaId: conversation, expiraEm: '2026-02-30T11:00:00Z' }],
    [{ conversaId: conversation, expiraEm: date }, { timestamp: 'inválido' }],
  ]) {
    const { api } = fixture(() => json(201, data, extra));
    await assert.rejects(api.criarConversa(session), { kind: 'resposta_invalida' });
  }
});

test('valida UUIDs e pergunta antes de abrir conexão', async () => {
  const { api, calls } = fixture(() => json(200, answer));
  await assert.rejects(send(api, '\u0085\u00A0'), { kind: 'entrada' });
  await assert.rejects(send(api, '😀'.repeat(1001)), { kind: 'entrada' });
  await assert.rejects(send(api, 'texto', session, '1-1-1-1-1'), { kind: 'entrada' });
  await assert.rejects(api.encerrarConversa(conversation + '\n', session), { kind: 'entrada' });
  assert.equal(calls.length, 0);
});

test('normalização Unicode considera acentos, emoji, caracteres suplementares, NEL e BOM', async () => {
  const { api, calls } = fixture(() => json(200, answer));
  const question = 'é😀𐐷' + '😀'.repeat(997);
  await send(api, '\u0085' + question + '\u00A0');
  await send(api, '\uFEFFé');
  assert.equal(JSON.parse(calls[0][1].body).pergunta, question);
  assert.equal(JSON.parse(calls[1][1].body).pergunta, '\uFEFFé');
});

for (const [status, codigo, reenviavel] of [
  [400, 'REQUISICAO_INVALIDA', false],
  [415, 'FORMATO_INVALIDO', false],
  [404, 'CONVERSA_INDISPONIVEL', false],
  [409, 'MENSAGEM_EM_CONFLITO', false],
  [409, 'TURNO_EM_ANDAMENTO', true],
  [429, 'LIMITE_DE_CONVERSAS', true],
  [429, 'LIMITE_DE_MENSAGENS', false],
  [429, 'LIMITE_DE_CONCORRENCIA', true],
  [502, 'FALHA_INTEGRACAO_TUTOR', false],
  [503, 'TUTOR_DESATIVADO', false],
  [503, 'TUTOR_INDISPONIVEL', true],
  [504, 'TUTOR_TIMEOUT', true],
]) {
  test(`preserva ${status} ${codigo} sem retry`, async () => {
    const { api, calls } = fixture(() => json(status, { codigo, reenviavel }));
    await assert.rejects(send(api), { kind: 'backend', status, codigo, reenviavel });
    assert.equal(calls.length, 1);
  });
}

test('401 problem+json não passa por hooks globais nem remove credenciais', async () => {
  // O carregador já rejeita qualquer import adicional e a configuração só fornece a URL.
  const { api, calls } = fixture(() => new Response('{"status":401}', {
    status: 401, headers: { 'Content-Type': 'application/problem+json' },
  }));
  await assert.rejects(api.criarConversa(session), { kind: 'autenticacao', status: 401 });
  assert.equal(calls.length, 1);
  await assert.rejects(api.criarConversa({ token: '' }), { kind: 'autenticacao' });
  assert.equal(calls.length, 1);
});

test('preserva metadados de erro desconhecido sem expor a mensagem interna', async () => {
  const { api } = fixture(() => json(418, { codigo: 'NOVO_CODIGO', reenviavel: false }, {
    message: 'diagnóstico interno',
  }));
  await assert.rejects(send(api), (error) => error.kind === 'http_desconhecido' &&
    error.status === 418 && error.codigo === 'NOVO_CODIGO' && error.reenviavel === false &&
    !error.message.includes('diagnóstico'));
});

test('rejeita erro sem envelope, com código incoerente ou sem reenviavel', async () => {
  for (const reply of [
    () => new Response('{}', { status: 409 }),
    () => json(409, { codigo: 'TUTOR_DESATIVADO', reenviavel: false }),
    () => json(409, { codigo: 'MENSAGEM_EM_CONFLITO' }),
  ]) {
    const { api } = fixture(reply);
    await assert.rejects(send(api), { kind: 'resposta_invalida', status: 409 });
  }
});

test('falha de rede não expõe o erro de transporte nem repete o envio', async () => {
  const { api, calls } = fixture(() => Promise.reject(new Error('detalhe interno')));
  await assert.rejects(send(api), { kind: 'rede', message: 'Não foi possível conectar ao Tutor.' });
  assert.equal(calls.length, 1);
});

test('cancelamento durante a leitura do corpo aborta o transporte e descarta resposta tardia', async () => {
  const control = new AbortController();
  let releaseBody;
  let readingBody;
  const bodyStarted = new Promise((resolve) => { readingBody = resolve; });
  const { api, calls } = fixture(() => ({
    ok: true, status: 200, json: () => {
      readingBody();
      return new Promise((resolve) => { releaseBody = resolve; });
    },
  }));
  const pending = send(api, 'FAQ?', { ...session, signal: control.signal });
  await bodyStarted;
  control.abort();
  await assert.rejects(pending, { kind: 'cancelamento' });
  assert.equal(calls[0][1].signal.aborted, true);
  releaseBody(envelope(200, answer));
  await assert.rejects(send(api, 'FAQ?', { ...session, signal: control.signal }), { kind: 'cancelamento' });
  assert.equal(calls.length, 1);
});

test('timeout local tem classificação própria e cancela a conexão', async () => {
  let expire;
  const { api, calls } = fixture(() => new Promise(() => {}), {
    setTimeout: (fn, delay) => { assert.equal(delay, 12_000); expire = fn; return 1; },
    clearTimeout: (id) => assert.equal(id, 1),
  });
  const pending = send(api);
  expire();
  await assert.rejects(pending, { kind: 'timeout_local' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].signal.aborted, true);
});

test('resposta e credencial permanecem vinculadas aos valores do início da operação', async () => {
  let release;
  const { api, calls } = fixture(() => new Promise((resolve) => { release = resolve; }));
  const options = { token: 'conta-A' };
  const input = { mensagemId: message, pergunta: 'FAQ?' };
  const pending = api.enviarMensagem(conversation, input, options);
  options.token = 'conta-B';
  input.mensagemId = conversation;
  release(json(200, answer));
  assert.deepEqual(await pending, answer);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer conta-A');
  assert.equal(calls.length, 1);
});
