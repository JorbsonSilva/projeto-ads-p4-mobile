import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { criarConversa, encerrarConversa, enviarMensagem, TutorApiError } from '../services/tutorApi';
import type { TutorConversaDTO, TutorMensagemRequestDTO, TutorRespostaDTO } from '../types/tutor';

interface PendingMessage {
  conversaId: string;
  request: TutorMensagemRequestDTO;
}

interface Turn {
  request: TutorMensagemRequestDTO;
  response?: TutorRespostaDTO;
  failed?: boolean;
}

interface ConversationState {
  conversation: TutorConversaDTO | null;
  turns: Turn[];
  draft: string;
  activity: 'sending' | 'closing' | null;
  notice: string | null;
  retry: PendingMessage | null;
  closeUnconfirmed: boolean;
  needsNewConversation: boolean;
  needsLogin: boolean;
}

const EMPTY: ConversationState = {
  conversation: null, turns: [], draft: '', activity: null, notice: null,
  retry: null, closeUnconfirmed: false, needsNewConversation: false, needsLogin: false,
};

const EDGE_SPACE = /^\p{White_Space}+|\p{White_Space}+$/gu;

export function createTutorConversation(token: string, randomUUID: () => string) {
  let state = EMPTY;
  let active: AbortController | null = null;
  const listeners = new Set<() => void>();

  function update(patch: Partial<ConversationState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }

  function fail(error: unknown, request?: TutorMensagemRequestDTO, conversaId?: string) {
    if (!(error instanceof TutorApiError)) {
      update({ notice: 'Não foi possível concluir a operação do Tutor.' });
      return;
    }
    if (error.kind === 'autenticacao') {
      update({ ...EMPTY, needsLogin: true, notice: 'Sua sessão está indisponível. Entre novamente.' });
      return;
    }

    const code = error.kind === 'backend' ? error.codigo : undefined;
    const uncertain = error.kind === 'rede' || error.kind === 'timeout_local' || code === 'TUTOR_TIMEOUT';
    if (code === 'CONVERSA_INDISPONIVEL' && conversaId) {
      update({ conversation: null, retry: null, needsNewConversation: true,
        notice: 'Esta conversa ficou indisponível. Abra uma nova conversa. O contexto anterior não será recuperado.' });
      return;
    }
    const retry = request && conversaId && (
      error.kind === 'rede' || error.kind === 'timeout_local' || (code && error.reenviavel)
    ) ? { request, conversaId } : null;
    const notices: Record<string, string> = {
      REQUISICAO_INVALIDA: 'Solicitação inválida. Revise a pergunta antes de enviar.',
      FORMATO_INVALIDO: 'O Tutor recebeu uma solicitação em formato inválido.',
      MENSAGEM_EM_CONFLITO: 'O identificador desta mensagem já foi usado. Revise a pergunta e faça um novo envio.',
      TURNO_EM_ANDAMENTO: 'O Tutor ainda está processando esta pergunta.',
      LIMITE_DE_CONVERSAS: 'O Tutor atingiu o limite de conversas. Tente abrir uma conversa mais tarde.',
      LIMITE_DE_MENSAGENS: 'Esta conversa atingiu o limite de mensagens. Abra uma nova conversa para continuar.',
      LIMITE_DE_CONCORRENCIA: 'O Tutor atingiu o limite de solicitações simultâneas.',
      FALHA_INTEGRACAO_TUTOR: 'O Tutor encontrou uma falha temporária de comunicação.',
      TUTOR_DESATIVADO: 'O Tutor não está habilitado neste ambiente.',
      TUTOR_INDISPONIVEL: 'O Tutor está temporariamente indisponível.',
      TUTOR_TIMEOUT: 'Não foi possível confirmar a resposta do Tutor.',
    };
    let notice = code ? notices[code] : undefined;
    if (error.kind === 'rede') notice = 'A conexão falhou. Não foi possível confirmar a resposta.';
    if (error.kind === 'timeout_local') notice = 'O prazo de espera terminou. Não foi possível confirmar a resposta.';
    if (error.kind === 'resposta_invalida') notice = 'O Tutor retornou uma resposta inválida.';
    if (error.kind === 'cancelamento') notice = 'Solicitação cancelada.';
    if (error.kind === 'entrada') notice = notices.REQUISICAO_INVALIDA;
    if (request && !conversaId && uncertain) {
      notice = 'Não foi possível confirmar a criação da conversa. Tentar novamente pode abrir outra conversa.';
    }
    if (retry) notice = (notice ?? 'Não foi possível confirmar a resposta.') + ' Você pode reenviar a mesma pergunta.';
    if (request && !retry && !conversaId) {
      update({ draft: request.pergunta, turns: state.turns.filter((turn) => turn.request !== request) });
    } else if (request && !retry) {
      const editable = code === 'REQUISICAO_INVALIDA' || code === 'FORMATO_INVALIDO' || code === 'MENSAGEM_EM_CONFLITO';
      update({
        ...(editable ? { draft: request.pergunta } : {}),
        turns: editable ? state.turns.filter((turn) => turn.request !== request) :
          state.turns.map((turn) => turn.request === request ? { ...turn, failed: true } : turn),
      });
    }
    update({ notice: notice ?? 'Não foi possível concluir a operação do Tutor.', retry,
      needsNewConversation: code === 'LIMITE_DE_MENSAGENS' || (code === 'TURNO_EM_ANDAMENTO' && !retry) });
  }

  async function send(retry = false) {
    if (active || state.needsLogin || state.needsNewConversation || state.closeUnconfirmed) return;
    const pending = state.retry;
    let request = pending?.request;
    if (retry) {
      if (!pending || state.conversation?.conversaId !== pending.conversaId) return;
    } else {
      if (request) return;
      const question = state.draft.replace(EDGE_SPACE, '');
      if (!question || Array.from(question).length > 1000) {
        update({ notice: 'Digite uma pergunta com 1 a 1.000 caracteres.' });
        return;
      }
      try {
        request = { mensagemId: randomUUID(), pergunta: question };
      } catch {
        update({ notice: 'Não foi possível gerar o identificador da mensagem neste dispositivo.' });
        return;
      }
    }

    if (!request) return;
    const controller = new AbortController();
    active = controller;
    const options = { token, signal: controller.signal };
    update({
      activity: 'sending', notice: null, retry: null, draft: '',
      turns: retry ? state.turns : [...state.turns, { request }],
    });
    let conversation = state.conversation;
    try {
      if (!conversation) {
        conversation = await criarConversa(options);
        if (active !== controller) return;
        update({ conversation });
      }
      const response = await enviarMensagem(conversation.conversaId, request, options);
      if (active !== controller) return;
      update({ turns: state.turns.map((turn) => turn.request.mensagemId === request.mensagemId
        ? { ...turn, response } : turn) });
    } catch (error) {
      if (active === controller) fail(error, request, conversation?.conversaId);
    } finally {
      if (active === controller) {
        active = null;
        update({ activity: null });
      }
    }
  }

  async function close() {
    if (active || state.needsLogin) return;
    const id = state.conversation?.conversaId;
    if (!id) {
      update(EMPTY);
      return;
    }

    const controller = new AbortController();
    active = controller;
    update({ activity: 'closing', notice: null });
    try {
      await encerrarConversa(id, { token, signal: controller.signal });
      if (active === controller) update(EMPTY);
    } catch (error) {
      if (active === controller) {
        if (error instanceof TutorApiError && error.kind === 'backend' && error.codigo === 'CONVERSA_INDISPONIVEL') {
          update({ ...EMPTY, notice: 'A conversa já estava indisponível.' });
        } else if (error instanceof TutorApiError && error.kind === 'autenticacao') {
          fail(error);
        } else {
          update({ closeUnconfirmed: true,
            notice: 'Não foi possível confirmar o encerramento. Tente encerrar novamente ou descarte apenas a conversa local.' });
        }
      }
    } finally {
      if (active === controller) {
        active = null;
        update({ activity: null });
      }
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setDraft(draft: string) {
      if (!active && !state.retry && !state.needsLogin && !state.needsNewConversation && !state.closeUnconfirmed) {
        update({ draft });
      }
    },
    send,
    close,
    discardLocally() {
      if (!active && state.closeUnconfirmed) {
        update({ ...EMPTY, notice: 'Histórico descartado neste dispositivo. O encerramento remoto não foi confirmado.' });
      }
    },
    discard() {
      const controller = active;
      active = null;
      controller?.abort();
      update(EMPTY);
    },
  };
}

export function useTutorConversation(token: string, randomUUID: () => string) {
  const conversation = useMemo(() => createTutorConversation(token, randomUUID), [token, randomUUID]);
  const state = useSyncExternalStore(conversation.subscribe, conversation.getSnapshot, conversation.getSnapshot);
  useLayoutEffect(() => conversation.discard, [conversation]);
  return { state, setDraft: conversation.setDraft, send: conversation.send, close: conversation.close,
    discardLocally: conversation.discardLocally };
}
