/**
 * Cliente HTTP da API Orienta (v1) para React Native / Expo.
 * Rastreabilidade: Fase 4 - f4-t1, f4-t8, f4-t9
 * 
 * Centraliza requisições com baseURL '/api/v1', interceptors para injeção automática de Bearer Token,
 * e tratamento padronizado de respostas de erro (400, 401, 403, 409, 422).
 */
import axios, { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Agendamento, AgendamentoRequest, ApiResponse, JustificativaRequest, RemarcarAgendamentoRequest } from "../types/agendamento";

const RAW_API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
// Garante URL raiz para chamadas que já utilizam '/api/...' ou '/agendamentos'
export const API_URL = RAW_API_URL.replace(/\/api(\/v1)?\/?$/, "");
// URL base da API v1 para uso em clientes REST dedicados
export const API_V1_URL = `${API_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_V1_URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de Requisição: Injeta automaticamente o Bearer Token salvo
api.interceptors.request.use(
  async (config) => {
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

// Interceptor de Resposta: Trata códigos HTTP semânticos (401, 403, 409, 422)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; error?: string; fieldErrors?: Array<{ field: string; message: string }> }>) => {
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

