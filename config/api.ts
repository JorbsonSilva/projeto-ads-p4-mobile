/**
 * URL Base da API Orienta (P4)
 * Respeita variáveis de ambiente para desenvolvimento local, Expo Web, emulador e dispositivo físico.
 * (Rastreabilidade: DT-001, DT-007, BKL-002)
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

