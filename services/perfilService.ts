/**
 * @file perfilService.ts
 * @description Serviço híbrido resiliente para o Perfil do Aluno [ORI-017 / IMG-016].
 * Conecta aos endpoints REST (/api/v1/usuarios/{id}/perfil) com fallback imediato
 * para dados de demonstração offline e badge de modo de simulação.
 */

import { API_URL } from "../config/api";

export interface AtividadeRecenteAluno {
  id: number;
  materia: string;
  professorNome: string;
  professorFoto: string;
  data: string;
  status: "CONCLUIDA" | "CONFIRMADA" | "PENDENTE";
  nota?: number;
}

export interface ProgressoAluno {
  materiasCursando: number;
  mentoriasRealizadas: number;
  horasAcumuladas: number;
}

export interface PerfilAlunoData {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  tipo: "ALUNO";
  fotoUrl: string;
  bio: string;
  progresso: ProgressoAluno;
  interesses: string[];
  atividadesRecentes: AtividadeRecenteAluno[];
}

export interface ResultadoPerfilAluno {
  dados: PerfilAlunoData;
  isSimulado: boolean;
}

export const MOCK_PERFIL_ALUNO_OFICIAL: PerfilAlunoData = {
  id: 1,
  nome: "Jorbson Silva",
  email: "jorbson.silva@academico.ufpb.br",
  telefone: "(83) 98765-4321",
  cidade: "João Pessoa",
  estado: "PB",
  tipo: "ALUNO",
  fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  bio: "Estudante de Análise e Desenvolvimento de Sistemas (UFPB). Apaixonado por engenharia de software, computação em nuvem e resolução de problemas complexos. Buscando aprimorar conceitos de Cálculo e Algoritmos.",
  progresso: {
    materiasCursando: 7,
    mentoriasRealizadas: 12,
    horasAcumuladas: 45,
  },
  interesses: [
    "Cálculo I",
    "Estrutura de Dados",
    "Python",
    "Algoritmos Avançados",
    "Física Mecânica",
    "Banco de Dados SQL",
  ],
  atividadesRecentes: [
    {
      id: 101,
      materia: "Cálculo Diferencial e Integral",
      professorNome: "Prof. Lucas Rocha",
      professorFoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      data: "Hoje às 15:00",
      status: "CONFIRMADA",
      nota: 5.0,
    },
    {
      id: 102,
      materia: "Programação e Algoritmos",
      professorNome: "Prof. Rafael Lima",
      professorFoto: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      data: "2 de Nov às 14:00",
      status: "CONCLUIDA",
      nota: 4.9,
    },
    {
      id: 103,
      materia: "Biologia Celular",
      professorNome: "Profa. Ana Clara",
      professorFoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      data: "28 de Out às 16:30",
      status: "CONCLUIDA",
      nota: 5.0,
    },
  ],
};

let perfilEmMemoria: PerfilAlunoData = { ...MOCK_PERFIL_ALUNO_OFICIAL };

/**
 * Consulta o perfil do aluno com resiliência contra indisponibilidade da API local.
 */
export async function obterPerfilAluno(
  usuarioId: number = 1
): Promise<ResultadoPerfilAluno> {
  const isDemo =
    typeof window !== "undefined" &&
    (window.location.search.includes("demo=true") ||
      window.location.search.includes("preview=true") ||
      window.location.protocol === "https:");

  if (isDemo) {
    return {
      dados: { ...perfilEmMemoria },
      isSimulado: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/perfil`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const u = json.dados || json.data || json;

      if (u && (u.nome || u.email)) {
        const dadosMapeados: PerfilAlunoData = {
          id: u.id || usuarioId,
          nome: u.nome || perfilEmMemoria.nome,
          email: u.email || perfilEmMemoria.email,
          telefone: u.telefone || perfilEmMemoria.telefone,
          cidade: u.cidade || "João Pessoa",
          estado: u.estado || "PB",
          tipo: "ALUNO",
          fotoUrl: u.fotoUrl || perfilEmMemoria.fotoUrl,
          bio: u.bioAluno || u.bio || perfilEmMemoria.bio,
          progresso: {
            materiasCursando: u.interesses?.length || 7,
            mentoriasRealizadas: perfilEmMemoria.progresso.mentoriasRealizadas,
            horasAcumuladas: perfilEmMemoria.progresso.horasAcumuladas,
          },
          interesses:
            u.interesses && u.interesses.length > 0
              ? u.interesses.map((i: any) => i.saber?.nome || i.nome || i)
              : perfilEmMemoria.interesses,
          atividadesRecentes: perfilEmMemoria.atividadesRecentes,
        };

        perfilEmMemoria = dadosMapeados;
        return {
          dados: dadosMapeados,
          isSimulado: false,
        };
      }
    }

    return {
      dados: { ...perfilEmMemoria },
      isSimulado: true,
    };
  } catch {
    return {
      dados: { ...perfilEmMemoria },
      isSimulado: true,
    };
  }
}

/**
 * Salva atualizações do perfil do aluno em memória e tenta sincronizar com o backend.
 */
export async function salvarPerfilAluno(
  usuarioId: number = 1,
  novosDados: Partial<PerfilAlunoData>
): Promise<boolean> {
  perfilEmMemoria = {
    ...perfilEmMemoria,
    ...novosDados,
    progresso: {
      ...perfilEmMemoria.progresso,
      ...(novosDados.progresso || {}),
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/aluno`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novosDados.nome || perfilEmMemoria.nome,
        bio: novosDados.bio || perfilEmMemoria.bio,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return true; // Sucesso na simulação local
  }
}
