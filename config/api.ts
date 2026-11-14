/**
 * Cliente HTTP da API Orienta (v1) para React Native / Expo.
 * Rastreabilidade: Fase 4 - f4-t1, f4-t8, f4-t9
 *
 * Centraliza requisições com baseURL '/api/v1', interceptors para injeção automática de Bearer Token,
 * e tratamento padronizado de respostas de erro (400, 401, 403, 409, 422).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError } from "axios";
import { Agendamento, AgendamentoRequest, ApiResponse, JustificativaRequest, RemarcarAgendamentoRequest } from "../types/agendamento";

export type { ApiResponse };

const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
const defaultBaseUrl = "http://localhost:8080";
const RAW_API_URL = (envApiUrl || defaultBaseUrl).replace(/\/+$/, "");
// Garante URL raiz para chamadas que já utilizam '/api/...' ou '/agendamentos'
export const API_URL = RAW_API_URL.replace(/\/api(\/v1)?\/?$/, "");
// URL base da API v1 para uso em clientes REST dedicados
export const API_V1_URL = `${API_URL}/api/v1`;

export type DataSourceMode = 'real';

/**
 * Obtém o modo de fonte de dados ativo (Full-Stack Real: Spring Boot 3 + PostgreSQL).
 */
export function getActiveDataSource(): DataSourceMode {
  return 'real';
}

/**
 * Emite log HTTP para a bancada pai caso esteja rodando em iframe.
 */
export function emitHttpLogToParent(log: {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  source: 'mock' | 'real';
  error?: string;
}) {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({
        type: 'ORIENTA_HTTP_LOG',
        log: {
          ...log,
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false })
        }
      }, '*');
    } catch {
      // ignore
    }
  }
}

export const api = axios.create({
  baseURL: API_V1_URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de Requisição: Injeta automaticamente o Bearer Token salvo e timestamp
api.interceptors.request.use(
  async (config: any) => {
    config.metadata = { startTime: Date.now() };
    try {
      const token = await AsyncStorage.getItem("@orienta_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Não foi possível recuperar o token do AsyncStorage:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Resposta: Trata códigos HTTP semânticos (401, 403, 409, 422) e notifica bancada
api.interceptors.response.use(
  (response) => {
    const startTime = (response.config as any)?.metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : 15;
    emitHttpLogToParent({
      method: (response.config.method || 'GET').toUpperCase(),
      url: response.config.url || '',
      status: response.status,
      durationMs: duration,
      source: getActiveDataSource(),
    });
    return response;
  },
  async (error: AxiosError<{ message?: string; error?: string; fieldErrors?: Array<{ field: string; message: string }> }>) => {
    const startTime = (error.config as any)?.metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : 15;
    emitHttpLogToParent({
      method: (error.config?.method || 'GET').toUpperCase(),
      url: error.config?.url || '',
      status: error.response?.status || 0,
      durationMs: duration,
      source: getActiveDataSource(),
      error: error.message,
    });
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          console.warn("[Orienta API] Sessão expirada ou credenciais inválidas (HTTP 401).");
          await AsyncStorage.removeItem("@orienta_token");
          await AsyncStorage.removeItem("@orienta_user");
          break;
        case 403:
          console.warn("[Orienta API] Acesso negado a este recurso (HTTP 403).");
          break;
        case 409:
          console.warn("[Orienta API] Conflito de agendamento detectado (HTTP 409):", data?.message);
          break;
        case 422:
          console.warn("[Orienta API] Regra de negócio violada (HTTP 422):", data?.message);
          break;
        default:
          break;
      }
    }
    return Promise.reject(error);
  }
);


// ============================================================================
// HELPERS DEFENSIVOS DE TRATAMENTO DO ENVELOPE ApiResponse<T> (Prioridade 1 - Lote 1)
// ============================================================================

/**
 * Type guard que valida estritamente se o payload recebido possui a estrutura do envelope ApiResponse<T>.
 * Valida não-nulidade, presença de data e expressamente o tipo booleano de success.
 * Rejeita valores textuais como "true", "false" ou "sim".
 *
 * Rastreabilidade: Prioridade 1 - Lote 1 (Refinamento de Robustez)
 */
export function isApiResponse<T = any>(payload: unknown): payload is ApiResponse<T> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    typeof (payload as { success: unknown }).success === "boolean" &&
    "data" in payload
  );
}

/**
 * Verifica se a resposta representa um erro explícito emitido pelo backend Orienta.
 * Alinhado estritamente com ErrorResponseDTO.java e envelopes ApiResponse com falha.
 *
 * Regras contra falsos positivos:
 * - Não classifica como erro apenas por possuir status numérico (ex: status: 200 ou status de entidade).
 * - Não classifica como erro apenas por possuir error textual (ex: campo de formulário ou log).
 * - Exige status HTTP de erro (status >= 400) em conjunto com chaves estruturais do ErrorResponseDTO (error, message, path ou fieldErrors).
 * - Reconhece envelopes ApiResponse onde success === false.
 *
 * Rastreabilidade: Prioridade 1 - Lote 1 (Refinamento de Robustez)
 */
export function isApiError(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;

  // Formato 1: ErrorResponseDTO emitido pelo GlobalExceptionHandler
  // Requer status numérico HTTP >= 400 conjugado com estrutura de erro do backend
  if (
    typeof p.status === "number" &&
    p.status >= 400 &&
    (typeof p.error === "string" || typeof p.message === "string" || "fieldErrors" in p || "path" in p)
  ) {
    return true;
  }

  // Formato 2: Envelope ApiResponse onde a operação falhou expressamente (success === false)
  if (
    "success" in p &&
    p.success === false &&
    ("message" in p || "error" in p || "data" in p)
  ) {
    return true;
  }

  return false;
}

/**
 * Helper defensivo para extração tipada de coleções da API Orienta.
 *
 * Regras estritas de validação:
 * - Resposta válida contendo lista (direta ou no campo data de ApiResponse): retorna T[].
 * - Resposta válida sem dados (data null ou undefined com success: true): retorna [].
 * - Resposta válida contendo objeto (não-lista): lança TypeError para não mascarar contrato de tela.
 * - Resposta inválida ou com erro de comunicação (success: false, status de erro ou payload nulo): lança Error com a mensagem da API.
 *
 * Rastreabilidade: Prioridade 1 - Lote 1 (Refinamento de Robustez)
 */
export function extrairDadosLista<T>(resposta: unknown): T[] {
  if (resposta === null || resposta === undefined) {
    throw new Error("Resposta inválida da API: payload nulo ou indefinido.");
  }

  // Verifica se é erro explícito retornado pelo backend
  if (isApiError(resposta)) {
    const err = resposta as Record<string, any>;
    const msg = err.message || err.error || "Erro de comunicação retornado pela API.";
    throw new Error(`[Orienta API Error] ${msg}`);
  }

  // Se já for array direto
  if (Array.isArray(resposta)) {
    return resposta as T[];
  }

  // Se for envelope ApiResponse
  if (isApiResponse<any>(resposta)) {
    if (resposta.success === false) {
      throw new Error(`[Orienta API Error] ${resposta.message || "Operação não teve sucesso no servidor."}`);
    }

    if (resposta.data === null || resposta.data === undefined) {
      // Resposta válida sem dados (ex: lista vazia no servidor representada por null)
      return [];
    }

    if (Array.isArray(resposta.data)) {
      return resposta.data as T[];
    }

    // Se data for um objeto ou valor primitivo e não uma lista
    throw new TypeError(
      `Contrato inválido: esperava-se uma lista no campo data do ApiResponse, mas foi recebido ${typeof resposta.data}.`
    );
  }

  // Se for um objeto direto mas não for lista
  if (typeof resposta === "object") {
    throw new TypeError(
      "Contrato inválido: a resposta da API é um objeto e não uma lista de registros."
    );
  }

  throw new Error(`Resposta da API em formato inesperado (${typeof resposta}).`);
}

/**
 * Helper defensivo especializado para extração tipada de um único registro ou entidade.
 *
 * Regras estritas de validação:
 * - Desempacota o campo data se estiver envelopado em ApiResponse<T>.
 * - Rejeita listas quando se espera um único objeto, lançando TypeError.
 * - Preserva tratamento de erros da API sem transformar respostas inválidas em objetos vazios.
 * - Rejeita payloads nulos/indefinidos com erro explícito.
 *
 * Rastreabilidade: Prioridade 1 - Lote 1 (Refinamento de Robustez)
 */
export function extrairDadosObjeto<T>(resposta: unknown): T {
  if (resposta === null || resposta === undefined) {
    throw new Error("Resposta inválida da API: payload nulo ou indefinido.");
  }

  if (isApiError(resposta)) {
    const err = resposta as Record<string, any>;
    const msg = err.message || err.error || "Erro retornado pela API.";
    throw new Error(`[Orienta API Error] ${msg}`);
  }

  // Rejeita array direto recebido quando se esperava um único objeto
  if (Array.isArray(resposta)) {
    throw new TypeError(
      "Contrato inválido: esperava-se um único objeto/registro, mas foi recebida uma lista."
    );
  }

  let payloadExtraido: unknown = resposta;

  if (isApiResponse<T>(resposta)) {
    if (resposta.success === false) {
      throw new Error(`[Orienta API Error] ${resposta.message || "Operação não teve sucesso no servidor."}`);
    }
    payloadExtraido = resposta.data;
  }

  // Rejeita array dentro do campo data quando se esperava um único objeto
  if (Array.isArray(payloadExtraido)) {
    throw new TypeError(
      "Contrato inválido: esperava-se um único objeto/registro no campo data do ApiResponse, mas foi recebida uma lista."
    );
  }

  if (payloadExtraido === null || payloadExtraido === undefined) {
    throw new Error("Resposta da API não contém dados do registro esperado (campo data vazio).");
  }

  return payloadExtraido as T;
}

/**
 * Utilitário genérico para desempacotar o campo data de um envelope ApiResponse<T>,
 * ou retornar o payload diretamente caso já esteja desempacotado.
 * Ao contrário de extrairDadosObjeto, não rejeita arrays (retorna qualquer tipo T contido no envelope).
 * Valida respostas de erro para não mascarar falhas da API.
 *
 * Rastreabilidade: Prioridade 1 - Lote 1 (Refinamento de Robustez)
 */
export function desempacotarResposta<T>(resposta: unknown): T {
  if (resposta === null || resposta === undefined) {
    throw new Error("Resposta inválida da API: payload nulo ou indefinido.");
  }

  if (isApiError(resposta)) {
    const err = resposta as Record<string, any>;
    const msg = err.message || err.error || "Erro retornado pela API.";
    throw new Error(`[Orienta API Error] ${msg}`);
  }

  if (isApiResponse<T>(resposta)) {
    if (resposta.success === false) {
      throw new Error(`[Orienta API Error] ${resposta.message || "Operação não teve sucesso no servidor."}`);
    }
    return resposta.data;
  }

  return resposta as T;
}

// Módulos de serviço da API v1 padronizados
export const agendamentoApi = {
  criar: async (payload: AgendamentoRequest) => {
    const res = await api.post<ApiResponse<Agendamento>>("/agendamentos", payload);
    return res.data;
  },
  listarPorAluno: async (alunoId: number) => {
    const res = await api.get<ApiResponse<Agendamento[]>>(`/agendamentos/aluno/${alunoId}`);
    return res.data;
  },
  listarPorProfessor: async (professorId: number) => {
    const res = await api.get<ApiResponse<Agendamento[]>>(`/agendamentos/professor/${professorId}`);
    return res.data;
  },
  aceitar: async (id: number) => {
    const res = await api.put<ApiResponse<Agendamento>>(`/agendamentos/${id}/aceitar`);
    return res.data;
  },
  recusar: async (id: number, payload: JustificativaRequest) => {
    const res = await api.put<ApiResponse<Agendamento>>(`/agendamentos/${id}/recusar`, payload);
    return res.data;
  },
  cancelar: async (id: number, payload: JustificativaRequest) => {
    const res = await api.put<ApiResponse<Agendamento>>(`/agendamentos/${id}/cancelar`, payload);
    return res.data;
  },
  remarcar: async (id: number, payload: RemarcarAgendamentoRequest) => {
    const res = await api.put<ApiResponse<Agendamento>>(`/agendamentos/${id}/remarcar`, payload);
    return res.data;
  },
};

export const usuarioApi = {
  obterPerfilCompleto: async (id: number) => {
    const res = await api.get(`/usuarios/${id}/perfil`);
    return res.data;
  },
};

export const chatApi = {
  obterConversa: async (agendamentoId: number, usuarioId: number) => {
    const res = await api.get<ApiResponse<any>>(`/chat/agendamento/${agendamentoId}?usuarioId=${usuarioId}`);
    return res.data;
  },
  listarMensagens: async (agendamentoId: number, usuarioId: number) => {
    const res = await api.get<ApiResponse<any[]>>(`/chat/agendamento/${agendamentoId}/mensagens?usuarioId=${usuarioId}`);
    return res.data;
  },
  enviarMensagem: async (agendamentoId: number, remetenteId: number, conteudo: string) => {
    const res = await api.post<ApiResponse<any>>(`/chat/agendamento/${agendamentoId}/mensagens`, {
      remetenteId,
      conteudo,
    });
    return res.data;
  },
};

export const suporteApi = {
  criarTicket: async (usuarioId: number, ticket: { titulo: string; descricao: string; categoria: string; prioridade?: string }) => {
    const res = await api.post<ApiResponse<any>>(`/suporte/tickets?usuarioId=${usuarioId}`, ticket);
    return res.data;
  },
  listarMeusTickets: async (usuarioId: number) => {
    const res = await api.get<ApiResponse<any[]>>(`/suporte/tickets/meus?usuarioId=${usuarioId}`);
    return res.data;
  },
  enviarDenuncia: async (denuncianteId: number, denuncia: { denunciadoId: number; agendamentoId?: number; motivo: string; descricao: string }) => {
    const res = await api.post<ApiResponse<any>>(`/suporte/denuncias?denuncianteId=${denuncianteId}`, denuncia);
    return res.data;
  },
};

export const notificacaoApi = {
  listar: async (usuarioId: number) => {
    const res = await api.get<ApiResponse<any[]>>(`/notificacoes?usuarioId=${usuarioId}`);
    return res.data;
  },
  contarNaoLidas: async (usuarioId: number) => {
    const res = await api.get<ApiResponse<{ totalNaoLidas: number }>>(`/notificacoes/nao-lidas/count?usuarioId=${usuarioId}`);
    return res.data;
  },
  marcarComoLida: async (notificacaoId: number, usuarioId: number) => {
    const res = await api.patch<ApiResponse<any>>(`/notificacoes/${notificacaoId}/lida?usuarioId=${usuarioId}`);
    return res.data;
  },
  marcarTodasComoLidas: async (usuarioId: number) => {
    const res = await api.patch<ApiResponse<any>>(`/notificacoes/marcar-todas-lidas?usuarioId=${usuarioId}`);
    return res.data;
  },
};

export default api;

