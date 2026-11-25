/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../hooks/useTutorConversation.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

const conversation = { conversaId: '831af292-0756-4b70-9457-20981cc5ff95', expiraEm: '2026-11-24T15:00:00Z' };
const id = '724ef4c7-1ac4-49b7-a39c-ce8ede5126f7';
const response = {
  conversaId: conversation.conversaId, mensagemId: id, origem: 'SIMULADO',
  resultado: 'RESPONDIDA', resposta: 'Resposta de teste', evidencias: [{ id: 'M07', versaoCorpus: 1 }],
};

class TutorApiError extends Error {
  constructor(kind, codigo) {
    super(kind);
    Object.assign(this, { kind, codigo });
  }
}

function fixture(overrides = {}) {
  const calls = [];
  const defaults = {
    criarConversa: async (options) => { calls.push(['create', options]); return conversation; },
    enviarMensagem: async (...args) => { calls.push(['send', ...args]); return response; },
    encerrarConversa: async (...args) => { calls.push(['close', ...args]); },
  };
  const module = { exports: {} };
  new Function('exports', 'require', outputText)(module.exports, (path) => {
    if (path === 'react') return {};
    assert.equal(path, '../services/tutorApi');
    return { ...defaults, ...overrides, TutorApiError };
  });
  let uuidCalls = 0;
  const create = (token = 'test-session', uuid = () => { uuidCalls++; return id; }) =>
    module.exports.createTutorConversation(token, uuid);
  return { create, calls, uuidCalls: () => uuidCalls };
}

test('cria a conversa sob demanda, envia e encerra usando o token capturado', async () => {
  const { create, calls } = fixture();
  const store = create();
  assert.deepEqual(calls, []);
  store.setDraft('  Como agendar? ');
  await store.send();
  assert.deepEqual(store.getSnapshot().turns, [{ request: { mensagemId: id, pergunta: 'Como agendar?' }, response }]);
  assert.equal(calls[0][1].token, 'test-session');
  assert.equal(calls[1][3].token, 'test-session');
  await store.close();
  assert.equal(calls[2][1], conversation.conversaId);
  assert.deepEqual(store.getSnapshot().turns, []);
  assert.equal(store.getSnapshot().conversation, null);
});

test('bloqueia envio duplo e encerramento enquanto o turno está pendente', async () => {
  const { create, calls, uuidCalls } = fixture();
  const store = create();
  store.setDraft('Pergunta');
  await Promise.all([store.send(), store.send(), store.close()]);
  assert.deepEqual(calls.map(([operation]) => operation), ['create', 'send']);
  assert.equal(uuidCalls(), 1);
});

test('reenvio explícito usa a mesma pergunta e UUID, sem duplicar o histórico', async () => {
  const attempts = [];
  const { create, uuidCalls } = fixture({
    enviarMensagem: async (_, request) => {
      attempts.push(request);
      if (attempts.length === 1) throw new TutorApiError('timeout_local');
      return response;
    },
  });
  const store = create();
  store.setDraft('Pergunta');
  await store.send();
  assert.equal(attempts.length, 1);
  assert.equal(store.getSnapshot().retry.request.mensagemId, id);
  await store.send(true);
  assert.equal(uuidCalls(), 1);
  assert.deepEqual(attempts[0], attempts[1]);
  assert.equal(store.getSnapshot().turns.length, 1);
  assert.equal(store.getSnapshot().turns[0].response, response);
});

test('404 exige nova conversa e descarta o contexto quando o usuário confirma', async () => {
  const { create, calls } = fixture({
    enviarMensagem: async () => { throw new TutorApiError('backend', 'CONVERSA_INDISPONIVEL'); },
  });
  const store = create();
  store.setDraft('Pergunta');
  await store.send();
  assert.equal(store.getSnapshot().needsNewConversation, true);
  await store.send();
  assert.equal(calls.length, 1);
  await store.close();
  assert.deepEqual(store.getSnapshot().turns, []);
  assert.equal(store.getSnapshot().needsNewConversation, false);
});

test('troca de sessão aborta a operação anterior e ignora sua resposta tardia', async () => {
  let finish;
  let oldSignal;
  const { create } = fixture({
    enviarMensagem: async (_, request, { token, signal }) => {
      if (token === 'new-session') return { ...response, resposta: request.pergunta };
      oldSignal = signal;
      return new Promise((resolve) => { finish = resolve; });
    },
  });
  const oldStore = create('old-session');
  oldStore.setDraft('Pergunta anterior');
  const pending = oldStore.send();
  await Promise.resolve();
  oldStore.discard();
  assert.equal(oldSignal.aborted, true);
  const newStore = create('new-session');
  assert.deepEqual(newStore.getSnapshot().turns, []);
  newStore.setDraft('Nova conta');
  await newStore.send();
  finish(response);
  await pending;
  assert.deepEqual(oldStore.getSnapshot().turns, []);
  assert.equal(newStore.getSnapshot().turns[0].response.resposta, 'Nova conta');
});

test('401 limpa somente a sessão local do Tutor e bloqueia novos envios', async () => {
  const { create, calls } = fixture({
    enviarMensagem: async () => { throw new TutorApiError('autenticacao'); },
  });
  const store = create();
  store.setDraft('Pergunta');
  await store.send();
  assert.equal(store.getSnapshot().needsLogin, true);
  assert.deepEqual(store.getSnapshot().turns, []);
  await store.send();
  assert.equal(calls.length, 1);
});

test('ausência de UUID seguro impede envio sem criar conversa', async () => {
  const { create, calls } = fixture();
  const store = create('test-session', () => { throw new Error('crypto indisponível'); });
  store.setDraft('Pergunta');
  await store.send();
  assert.deepEqual(calls, []);
  assert.match(store.getSnapshot().notice, /identificador/);
  assert.equal(store.getSnapshot().draft, 'Pergunta');
});

test('falha na criação restaura o rascunho e avisa sobre possível conversa órfã', async () => {
  const { create, calls } = fixture({ criarConversa: async () => { throw new TutorApiError('timeout_local'); } });
  const store = create();
  store.setDraft('Pergunta');
  await store.send();
  assert.equal(store.getSnapshot().draft, 'Pergunta');
  assert.equal(store.getSnapshot().retry, null);
  assert.deepEqual(store.getSnapshot().turns, []);
  assert.match(store.getSnapshot().notice, /pode abrir outra conversa/);
  assert.deepEqual(calls, []);
});

for (const [codigo, texto, nova] of [
  ['REQUISICAO_INVALIDA', /Solicitação inválida/, false],
  ['FORMATO_INVALIDO', /formato inválido/, false],
  ['MENSAGEM_EM_CONFLITO', /identificador/, false],
  ['LIMITE_DE_CONVERSAS', /limite de conversas/, false],
  ['LIMITE_DE_MENSAGENS', /limite de mensagens/, true],
  ['LIMITE_DE_CONCORRENCIA', /solicitações simultâneas/, false],
  ['FALHA_INTEGRACAO_TUTOR', /falha temporária/, false],
  ['TUTOR_DESATIVADO', /não está habilitado/, false],
  ['TUTOR_INDISPONIVEL', /temporariamente indisponível/, false],
]) {
  test(`orienta recuperação para ${codigo}`, async () => {
    const store = fixture({ enviarMensagem: async () => { throw new TutorApiError('backend', codigo); } }).create();
    store.setDraft('Pergunta');
    await store.send();
    assert.match(store.getSnapshot().notice, texto);
    assert.equal(store.getSnapshot().needsNewConversation, nova);
    assert.equal(store.getSnapshot().retry, null);
    if (['REQUISICAO_INVALIDA', 'FORMATO_INVALIDO', 'MENSAGEM_EM_CONFLITO'].includes(codigo)) {
      assert.equal(store.getSnapshot().draft, 'Pergunta');
      assert.deepEqual(store.getSnapshot().turns, []);
    }
  });
}

test('turno em andamento congela rascunho e mantém conversa, pergunta e UUID no reenvio', async () => {
  const attempts = [];
  const store = fixture({ enviarMensagem: async (...args) => {
    attempts.push(args);
    if (attempts.length === 1) {
      throw Object.assign(new TutorApiError('backend', 'TURNO_EM_ANDAMENTO'), { reenviavel: true });
    }
    return response;
  } }).create();
  store.setDraft(' Pergunta ');
  await store.send();
  store.setDraft('Tentativa de editar a mensagem pendente');
  await store.send();
  assert.equal(attempts.length, 1);
  assert.equal(store.getSnapshot().draft, '');
  assert.equal(store.getSnapshot().retry.conversaId, conversation.conversaId);
  await store.send(true);
  await store.send(true);
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0].slice(0, 2), attempts[1].slice(0, 2));
  assert.equal(store.getSnapshot().turns.length, 1);
});

for (const kind of ['rede', 'timeout_local']) {
  test(`encerramento sem confirmação (${kind}) permite descarte local explícito e nova conversa`, async () => {
    const { create, calls } = fixture({ encerrarConversa: async () => { throw new TutorApiError(kind); } });
    const store = create();
    store.setDraft('Pergunta');
    await store.send();
    await store.close();
    assert.equal(store.getSnapshot().closeUnconfirmed, true);
    assert.equal(store.getSnapshot().turns.length, 1);
    assert.equal(store.getSnapshot().activity, null);
    store.discardLocally();
    assert.match(store.getSnapshot().notice, /remoto não foi confirmado/);
    store.setDraft('Nova pergunta');
    await store.send();
    assert.equal(calls.filter(([op]) => op === 'create').length, 2);
  });
}

test('DELETE 404 limpa o estado sem afirmar encerramento remoto', async () => {
  const store = fixture({ encerrarConversa: async () => {
    throw new TutorApiError('backend', 'CONVERSA_INDISPONIVEL');
  } }).create();
  store.setDraft('Pergunta');
  await store.send();
  await store.close();
  assert.deepEqual(store.getSnapshot().turns, []);
  assert.match(store.getSnapshot().notice, /já estava indisponível/);
});

test('logout durante criação descarta 401 antigo e não libera operação da nova geração', async () => {
  let rejectOld;
  let resolveNew;
  let number = 0;
  const { create, calls } = fixture({ criarConversa: () => new Promise((resolve, reject) => {
    if (number++ === 0) rejectOld = reject;
    else resolveNew = resolve;
  }) });
  const store = create();
  store.setDraft('Antiga');
  const old = store.send();
  store.discard();
  store.setDraft('Nova');
  const current = store.send();
  rejectOld(new TutorApiError('autenticacao'));
  await old;
  assert.equal(store.getSnapshot().needsLogin, false);
  assert.equal(store.getSnapshot().activity, 'sending');
  assert.deepEqual(calls, []);
  resolveNew(conversation);
  await current;
  assert.equal(store.getSnapshot().turns[0].request.pergunta, 'Nova');
});

test('sugestão no rascunho não cria sessão e resposta simulada sem evidência é preservada', async () => {
  let called = false;
  const { create, calls } = fixture({ enviarMensagem: async () => {
    called = true;
    return { ...response, resultado: 'SEM_EVIDENCIA', evidencias: [] };
  } });
  const store = create();
  store.setDraft('Como buscar professores?');
  assert.deepEqual(calls, []);
  assert.equal(called, false);
  await store.send();
  assert.equal(store.getSnapshot().turns[0].response.origem, 'SIMULADO');
  assert.deepEqual(store.getSnapshot().turns[0].response.evidencias, []);
});
