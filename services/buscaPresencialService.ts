/**
 * @file buscaPresencialService.ts
 * @description Serviço Oficial de Busca Presencial por Geolocalização conectado à API Spring Boot 3.
 * Endpoint consumido: GET /api/v1/usuarios/professores/busca-presencial
 */

import { api } from "../config/api";
import type { ApiResponse } from "../config/api";

export interface ProfessorPresencial {
  id: number;
  nome: string;
  materia: string;
  notaMedia: number;
  totalAvaliacoes: number;
  fotoUrl: string;
  oferecePresencial: boolean;
  regiaoAtendimento: string;
  distanciaKm: number | null;
  textoProximidade: string;
  tags: string[];
  precoHora: number;
  online: boolean;
}

export interface ResultadoBuscaPresencial {
  professores: ProfessorPresencial[];
}

interface ProfessorBuscaApi {
  id: number;
  nome: string;
  bioProfessor: string | null;
  fotoUrl: string | null;
  notaMedia: number | null;
  totalAvaliacoes: number | null;
  oferecePresencial: boolean | null;
  regiaoAtendimento: string | null;
  distanciaKm: number | null;
  distanciaAproximadaKm: number | null;
  textoProximidade: string | null;
  aptidoes: {
    saberNome: string | null;
    precoHora: number | null;
    nivelDominio: string | null;
  }[] | null;
}

/**
 * Consulta a busca presencial na API, que calcula as distâncias com Haversine.
 */
export async function obterProfessoresPresenciais(filtros: {
  latitude: number;
  longitude: number;
  raioKm?: number;
  termo?: string;
  area?: string;
}): Promise<ResultadoBuscaPresencial> {
  const latitude = filtros.latitude;
  const longitude = filtros.longitude;
  const raioKm = filtros.raioKm ?? 20;
  const termo = filtros.termo?.trim() ?? "";
  const area = filtros.area ?? "Todas as áreas";

  const response = await api.get<ApiResponse<ProfessorBuscaApi[]>>(
    "/usuarios/professores/busca-presencial",
    {
      params: {
        latitude,
        longitude,
        raioKm,
        ...(termo ? { termo } : {}),
      },
    }
  );
  const listaApi = response.data.data;

  if (!response.data.success || !Array.isArray(listaApi)) {
    throw new Error(response.data.message || "A API retornou uma lista de professores inválida.");
  }

  let convertidos: ProfessorPresencial[] = listaApi.map((item, index) => {
    const aptidaoPrincipal = item.aptidoes?.[0];
    const distancia = item.distanciaKm ?? item.distanciaAproximadaKm;

    return {
      id: item.id,
      nome: item.nome,
      materia: aptidaoPrincipal?.saberNome || "Mentoria",
      notaMedia: item.notaMedia ?? 0,
      totalAvaliacoes: item.totalAvaliacoes ?? 0,
      fotoUrl: item.fotoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      oferecePresencial: item.oferecePresencial ?? false,
      regiaoAtendimento: item.regiaoAtendimento || "Região não informada",
      distanciaKm: distancia == null ? null : Number(distancia.toFixed(1)),
      textoProximidade: item.textoProximidade || "Distância indisponível",
      tags: [aptidaoPrincipal?.nivelDominio, "Presencial"].filter(
        (tag): tag is string => Boolean(tag)
      ),
      precoHora: aptidaoPrincipal?.precoHora ?? 0,
      online: false,
    };
  });

  if (area && area !== "Todas as áreas" && area !== "Todas") {
    convertidos = convertidos.filter(
      (professor) =>
        professor.materia.toLowerCase().includes(area.toLowerCase()) ||
        professor.tags.some((tag) => tag.toLowerCase().includes(area.toLowerCase()))
    );
  }

  return {
    professores: convertidos,
  };
}
