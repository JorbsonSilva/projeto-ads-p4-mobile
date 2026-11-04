/**
 * @file buscaPresencialService.ts
 * @description Serviço Híbrido Resiliente de Busca Presencial por Geolocalização.
 * 
 * Regra de Resiliência:
 * - Tenta consumir o endpoint oficial da API Spring Boot: GET /api/v1/usuarios/professores/busca
 * - Caso a rota retorne 404, o backend esteja inacessível ou ocorra timeout de rede,
 *   cai automaticamente para o fallback mocado oficial com sinalização de isSimulado.
 */

import { API_URL } from "../config/api";

export interface ProfessorPresencial {
  id: number;
  nome: string;
  materia: string;
  notaMedia: number;
  totalAvaliacoes: number;
  fotoUrl: string;
  oferecePresencial: boolean;
  regiaoAtendimento: string;
  distanciaKm: number;
  textoProximidade: string;
  tags: string[];
  precoHora: number;
  online: boolean;
  // Posição percentual no mapa (0 a 100)
  mapPin: {
    topPercent: number;
    leftPercent: number;
  };
}

export interface ResultadoBuscaPresencial {
  professores: ProfessorPresencial[];
  isSimulado: boolean;
  motivoStatus: string;
  cidadeAtual: string;
  raioKm: number;
}

// Fallback canônico baseado estritamente na referência IMG-007B (Buscar_Presencial.jpeg)
export const MOCK_PROFESSORES_PRESENCIAIS: ProfessorPresencial[] = [
  {
    id: 101,
    nome: "Prof. Lucas Rocha",
    materia: "Matemática",
    notaMedia: 4.9,
    totalAvaliacoes: 128,
    fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Caruaru - PE",
    distanciaKm: 1.2,
    textoProximidade: "A 1,2 km • Presencial",
    tags: ["Ensino Superior", "Concursos"],
    precoHora: 60.0,
    online: true,
    mapPin: {
      topPercent: 32,
      leftPercent: 24,
    },
  },
  {
    id: 102,
    nome: "Profa. Juliana Santos",
    materia: "Física",
    notaMedia: 4.8,
    totalAvaliacoes: 96,
    fotoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Caruaru - PE",
    distanciaKm: 2.0,
    textoProximidade: "A 2,0 km • Presencial",
    tags: ["Ensino Médio", "Superior"],
    precoHora: 55.0,
    online: true,
    mapPin: {
      topPercent: 26,
      leftPercent: 75,
    },
  },
  {
    id: 103,
    nome: "Prof. Rafael Kim",
    materia: "Programação",
    notaMedia: 4.9,
    totalAvaliacoes: 74,
    fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Caruaru - PE",
    distanciaKm: 2.5,
    textoProximidade: "A 2,5 km • Presencial",
    tags: ["Python", "Java"],
    precoHora: 70.0,
    online: true,
    mapPin: {
      topPercent: 68,
      leftPercent: 68,
    },
  },
  {
    id: 104,
    nome: "Profa. Mariana Costa",
    materia: "Química",
    notaMedia: 4.7,
    totalAvaliacoes: 52,
    fotoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Caruaru - PE",
    distanciaKm: 3.2,
    textoProximidade: "A 3,2 km • Presencial",
    tags: ["Ensino Médio", "Vestibulares"],
    precoHora: 50.0,
    online: false,
    mapPin: {
      topPercent: 20,
      leftPercent: 43,
    },
  },
  {
    id: 105,
    nome: "Prof. Carlos Eduardo",
    materia: "História",
    notaMedia: 4.9,
    totalAvaliacoes: 61,
    fotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Caruaru - PE",
    distanciaKm: 3.8,
    textoProximidade: "A 3,8 km • Presencial",
    tags: ["Humanas", "ENEM"],
    precoHora: 45.0,
    online: true,
    mapPin: {
      topPercent: 65,
      leftPercent: 35,
    },
  },
];

/**
 * Busca de Professores Presenciais com Estratégia Híbrida & Resiliência.
 */
export async function buscarProfessoresPresencialComFallback(filtros?: {
  termo?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  raioKm?: number;
}): Promise<ResultadoBuscaPresencial> {
  const latitude = filtros?.latitude ?? -8.2833; // Caruaru - PE
  const longitude = filtros?.longitude ?? -35.9761;
  const raioKm = filtros?.raioKm ?? 10;
  const termo = filtros?.termo?.trim() ?? "";
  const area = filtros?.area ?? "Todas as áreas";

  // Tentativa de consumo da API real Spring Boot
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const queryParams = new URLSearchParams({
      modalidade: "PRESENCIAL",
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      raioKm: raioKm.toString(),
    });

    if (termo) queryParams.append("termo", termo);

    const url = `${API_URL}/api/v1/usuarios/professores/busca?${queryParams.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const listaApi = json.data || json;

      if (Array.isArray(listaApi) && listaApi.length > 0) {
        // Normaliza itens da API para o contrato visual
        const convertidos: ProfessorPresencial[] = listaApi.map((item: any, index: number) => {
          const aptidaoPrincipal = item.aptidoes?.[0];
          const pinPositions = [
            { topPercent: 32, leftPercent: 24 },
            { topPercent: 26, leftPercent: 75 },
            { topPercent: 68, leftPercent: 68 },
            { topPercent: 20, leftPercent: 43 },
            { topPercent: 65, leftPercent: 35 },
          ];
          const pin = pinPositions[index % pinPositions.length];

          const distancia = item.distanciaAproximadaKm ?? (1.0 + index * 0.7);

          return {
            id: item.id || 100 + index,
            nome: item.nome || "Professor(a)",
            materia: aptidaoPrincipal?.saberNome || "Matemática",
            notaMedia: item.notaMedia ?? 4.9,
            totalAvaliacoes: item.totalAvaliacoes ?? 100,
            fotoUrl: item.fotoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
            oferecePresencial: true,
            regiaoAtendimento: item.regiaoAtendimento || "Caruaru - PE",
            distanciaKm: Number(distancia.toFixed(1)),
            textoProximidade: `A ${distancia.toFixed(1).replace(".", ",")} km • Presencial`,
            tags: [aptidaoPrincipal?.nivelDominio || "Ensino Superior", "Presencial"],
            precoHora: aptidaoPrincipal?.precoHora ?? 60.0,
            online: true,
            mapPin: pin,
          };
        });

        return {
          professores: convertidos,
          isSimulado: false,
          motivoStatus: "Conectado à API Spring Boot com sucesso",
          cidadeAtual: "Caruaru - PE",
          raioKm,
        };
      }
    }
  } catch {
    // Falha silenciosa capturada para acionar o fallback com elegância
  }

  // Fallback de dados mocados (Modo Simulação)
  let filtrados = [...MOCK_PROFESSORES_PRESENCIAIS];

  if (termo) {
    const t = termo.toLowerCase();
    filtrados = filtrados.filter(
      (p) => p.nome.toLowerCase().includes(t) || p.materia.toLowerCase().includes(t) || p.tags.some((tag) => tag.toLowerCase().includes(t))
    );
  }

  if (area && area !== "Todas as áreas" && area !== "Todas") {
    filtrados = filtrados.filter(
      (p) => p.materia.toLowerCase().includes(area.toLowerCase()) || p.tags.some((tag) => tag.toLowerCase().includes(area.toLowerCase()))
    );
  }

  return {
    professores: filtrados,
    isSimulado: true,
    motivoStatus: "Backend offline ou rota indisponível (Fallback mocado ativado)",
    cidadeAtual: "Caruaru - PE",
    raioKm,
  };
}
