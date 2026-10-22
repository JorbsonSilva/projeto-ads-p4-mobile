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

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
// Garante o prefixo /api/v1
export const API_URL = RAW_API_URL.endsWith("/api/v1")
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/api\/?$/, "")}/api/v1`;

export const api = axios.create({
  baseURL: API_URL,
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
