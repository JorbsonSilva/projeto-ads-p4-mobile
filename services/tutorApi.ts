import { API_V1_URL } from '../config/api';
import type {
  TutorConversaDTO,
  TutorEncerramentoDTO,
  TutorErroDTO,
  TutorEvidenciaDTO,
  TutorMensagemRequestDTO,
  TutorRespostaDTO,
} from '../types/tutor';

const ERROR_STATUS = {
  REQUISICAO_INVALIDA: 400,
  FORMATO_INVALIDO: 415,
  CONVERSA_INDISPONIVEL: 404,
  MENSAGEM_EM_CONFLITO: 409,
  TURNO_EM_ANDAMENTO: 409,
  LIMITE_DE_CONVERSAS: 429,
  LIMITE_DE_MENSAGENS: 429,
  LIMITE_DE_CONCORRENCIA: 429,
  FALHA_INTEGRACAO_TUTOR: 502,
  TUTOR_DESATIVADO: 503,
  TUTOR_INDISPONIVEL: 503,
  TUTOR_TIMEOUT: 504,
} as const;

export type TutorErrorKind =
  | 'entrada' | 'autenticacao' | 'backend' | 'http_desconhecido'
  | 'resposta_invalida' | 'rede' | 'cancelamento' | 'timeout_local';

const ERROR_MESSAGE: Record<TutorErrorKind, string> = {
  entrada: 'Confira os dados da solicitação do Tutor.',
  autenticacao: 'Entre no Orienta para acessar o Tutor.',
  backend: 'O Tutor não conseguiu concluir a solicitação.',
  http_desconhecido: 'O servidor retornou um erro inesperado.',
  resposta_invalida: 'O Tutor retornou uma resposta inválida.',
  rede: 'Não foi possível conectar ao Tutor.',
  cancelamento: 'Solicitação cancelada.',
  timeout_local: 'O prazo de espera pela resposta do Tutor terminou.',
};

export class TutorApiError extends Error {
  readonly codigo?: string;
  readonly reenviavel?: boolean;

  constructor(readonly kind: TutorErrorKind, readonly status?: number, details?: TutorErroDTO) {
    super(ERROR_MESSAGE[kind]);
    this.name = 'TutorApiError';
    this.codigo = details?.codigo;
    this.reenviavel = details?.reenviavel;
  }
}

export interface TutorRequestOptions {
  /** Bearer público da sessão que iniciou a operação. */
  token: string;
  /** O cancelamento local pode ocorrer após o servidor já ter processado a operação. */
  signal?: AbortSignal;
}

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const TIMEOUT_MS = 12_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && UUID.test(value);
}

function matchesUuid(value: unknown, expected: string): boolean {
  return isUuid(value) && value.toLowerCase() === expected.toLowerCase();
}

function isInstant(value: unknown): value is string {
  if (typeof value !== 'string' || !value.endsWith('Z') || !INSTANT.test(value)) return false;
  // Date.parse é portável com precisão de milissegundos; Instant pode trazer nanossegundos.
  const millis = Date.parse(value.replace(/(\.\d{3})\d+Z$/, '$1Z'));
  return Number.isFinite(millis) && new Date(millis).toISOString().slice(0, 19) === value.slice(0, 19);
}

function isEnvelope(value: unknown, status: number, success: boolean): value is Record<string, unknown> {
  return isRecord(value) && value.success === success && value.status === status &&
    isInstant(value.timestamp) && (value.message === undefined || typeof value.message === 'string');
}

function isEvidence(value: unknown): value is TutorEvidenciaDTO {
  return isRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0 &&
    typeof value.versaoCorpus === 'number' && Number.isInteger(value.versaoCorpus) &&
    value.versaoCorpus >= 1 && value.versaoCorpus <= 2147483647;
}

function isAnswer(value: unknown, conversationId: string, messageId: string): value is TutorRespostaDTO {
  return isRecord(value) && matchesUuid(value.conversaId, conversationId) &&
    matchesUuid(value.mensagemId, messageId) && typeof value.resposta === 'string' &&
    value.resposta.trim().length > 0 &&
    (value.origem === 'SIMULADO' || value.origem === 'DEMONSTRATIVO' ||
      value.origem === 'RAG' || value.origem === 'DETERMINISTICO') &&
    Array.isArray(value.evidencias) && value.evidencias.length <= 2 &&
    value.evidencias.every(isEvidence) &&
    (value.resultado === 'RESPONDIDA' ? value.evidencias.length > 0 :
      value.resultado === 'SEM_EVIDENCIA' && value.evidencias.length === 0);
}

function httpError(status: number, payload: unknown): TutorApiError {
  if (status === 401) return new TutorApiError('autenticacao', status);

  const data = isEnvelope(payload, status, false) ? payload.data : undefined;
  if (!isRecord(data) || typeof data.codigo !== 'string' || !data.codigo.trim() ||
      typeof data.reenviavel !== 'boolean') {
    const knownStatus = Object.values(ERROR_STATUS).some((known) => known === status);
    return new TutorApiError(knownStatus ? 'resposta_invalida' : 'http_desconhecido', status);
  }

  const details = { codigo: data.codigo, reenviavel: data.reenviavel };
  if (!Object.prototype.hasOwnProperty.call(ERROR_STATUS, details.codigo)) {
    return new TutorApiError('http_desconhecido', status, details);
  }

  return ERROR_STATUS[details.codigo as keyof typeof ERROR_STATUS] === status
    ? new TutorApiError('backend', status, details)
    : new TutorApiError('resposta_invalida', status, details);
}

async function request<T>(
  path: string,
  method: 'POST' | 'DELETE',
  expectedStatus: 200 | 201,
  options: TutorRequestOptions,
  validate: (data: unknown) => data is T,
  body?: object,
): Promise<T> {
  const { token, signal } = options;
  if (signal?.aborted) throw new TutorApiError('cancelamento');
  if (typeof token !== 'string' || !token.trim()) throw new TutorApiError('autenticacao');

  const controller = new AbortController();
  let rejectInterrupted!: (error: TutorApiError) => void;
  const interrupted = new Promise<never>((_, reject) => { rejectInterrupted = reject; });
  const interrupt = (kind: 'cancelamento' | 'timeout_local') => {
    rejectInterrupted(new TutorApiError(kind));
    controller.abort();
  };
  const cancel = () => interrupt('cancelamento');
  signal?.addEventListener('abort', cancel);
  const timer = setTimeout(() => interrupt('timeout_local'), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
      Authorization: `Bearer ${token}`,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await Promise.race([interrupted, fetch(`${API_V1_URL}/tutor/conversas${path}`, {
        method, headers, signal: controller.signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })]);
    } catch (error) {
      if (error instanceof TutorApiError) throw error;
      throw new TutorApiError('rede');
    }

    if (response.status === 401) throw new TutorApiError('autenticacao', 401);
    let payload: unknown;
    try {
      payload = await Promise.race([interrupted, response.json()]);
    } catch (error) {
      if (error instanceof TutorApiError) throw error;
      if (response.ok) throw new TutorApiError('resposta_invalida', response.status);
    }

    if (!response.ok) throw httpError(response.status, payload);
    if (response.status !== expectedStatus || !isEnvelope(payload, response.status, true) ||
        !validate(payload.data)) {
      throw new TutorApiError('resposta_invalida', response.status);
    }
    return payload.data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export async function criarConversa(options: TutorRequestOptions): Promise<TutorConversaDTO> {
  return request('', 'POST', 201, options, (data): data is TutorConversaDTO =>
    isRecord(data) && isUuid(data.conversaId) && isInstant(data.expiraEm), {});
}

export async function enviarMensagem(
  conversaId: string,
  message: TutorMensagemRequestDTO,
  options: TutorRequestOptions,
): Promise<TutorRespostaDTO> {
  const { mensagemId, pergunta: rawQuestion } = message;
  if (!isUuid(conversaId) || !isUuid(mensagemId) || typeof rawQuestion !== 'string') {
    throw new TutorApiError('entrada');
  }

  // Java usa Unicode White_Space, que difere de String.trim() (por exemplo, NEL e BOM).
  const pergunta = rawQuestion.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
  if (!pergunta || Array.from(pergunta).length > 1000) throw new TutorApiError('entrada');

  return request(`/${conversaId}/mensagens`, 'POST', 200, options,
    (data): data is TutorRespostaDTO => isAnswer(data, conversaId, mensagemId),
    { mensagemId, pergunta });
}

export async function encerrarConversa(
  conversaId: string,
  options: TutorRequestOptions,
): Promise<TutorEncerramentoDTO> {
  if (!isUuid(conversaId)) throw new TutorApiError('entrada');
  return request(`/${conversaId}`, 'DELETE', 200, options, (data): data is TutorEncerramentoDTO =>
    isRecord(data) && matchesUuid(data.conversaId, conversaId));
}
