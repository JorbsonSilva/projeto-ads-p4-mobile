/**
 * Cliente HTTP da API Orienta (P4)
 * Respeita variáveis de ambiente para desenvolvimento local, Expo Web, emulador e dispositivo físico.
 * Configura Axios com interceptors para envio automático de Bearer Token e tratamento de 401.
 * (Rastreabilidade: DT-001, DT-007, f3-t11)
 */
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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

// Interceptor de Resposta: Trata 401 Unauthorized e propaga erro limpo
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("Sessão expirada ou não autorizada (HTTP 401).");
    }
    return Promise.reject(error);
  }
);

export default api;
