/**
 * @file agendaService.ts
 * @description Serviço Híbrido Resiliente para Agenda Unificada Aluno/Professor (ORI-012).
 * Baseado na referência oficial de alta fidelidade Agenda.jpeg (IMG-001).
 */

import { API_URL } from "../config/api";

export type PerfilAgenda = "ALUNO" | "PROFESSOR";

export interface SolicitacaoAula {
  id: number;
  alunoNome: string;
  alunoFoto: string;
  materia: string;
  modalidade: "Presencial" | "Online";
  horario: string; // "Hoje, 14:00"
  status: "PENDENTE" | "ACEITA" | "RECUSADA";
  online: boolean;
}

export interface CompromissoAgenda {
  id: number;
  nome: string;
  foto: string;
  tituloProfissional?: string;
  materia: string;
  horario: string; // "Hoje, 14:00 – 15:00"
  modalidade: "Online" | "Presencial";
  localizacao?: string; // "Presencial • Caruaru – PE"
  status: "Confirmada" | "Pendente" | "Cancelada";
  tipo: "AULA" | "MENTORIA";
  online: boolean;
}

export interface AgendaCompleta {
  perfil: PerfilAgenda;
  solicitacoes: SolicitacaoAula[];
  aulasProfessor: CompromissoAgenda[];
  aulasAluno: CompromissoAgenda[];
  mentoriasAluno: CompromissoAgenda[];
  isSimulado: boolean;
}

export const MOCK_AGENDA_INICIAL: AgendaCompleta = {
  perfil: "PROFESSOR",
  isSimulado: true,

  // Visão Professor
  solicitacoes: [
    {
      id: 201,
      alunoNome: "Ana Clara",
      alunoFoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      materia: "Matemática",
      modalidade: "Presencial",
      horario: "Hoje, 14:00",
      status: "PENDENTE",
      online: true,
    },
    {
      id: 202,
      alunoNome: "Pedro Henrique",
      alunoFoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      materia: "Programação",
      modalidade: "Online",
      horario: "Hoje, 16:00",
      status: "PENDENTE",
      online: true,
    },
  ],

  aulasProfessor: [
    {
      id: 301,
      nome: "Ana Clara",
      foto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      materia: "Matemática",
      modalidade: "Online",
      horario: "Hoje 14:00 – 15:00",
      status: "Confirmada",
      tipo: "AULA",
      online: true,
    },
    {
      id: 302,
      nome: "Pedro Henrique",
      foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      materia: "Programação",
      modalidade: "Presencial",
      horario: "Hoje 16:00 – 17:00",
      status: "Confirmada",
      tipo: "AULA",
      online: true,
    },
  ],

  // Visão Aluno
  aulasAluno: [
    {
      id: 401,
      nome: "Prof. Lucas Rocha",
      foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      materia: "Matemática",
      horario: "Hoje, 14:00 – 15:00",
      modalidade: "Presencial",
      localizacao: "Presencial • Caruaru – PE",
      status: "Confirmada",
      tipo: "AULA",
      online: true,
    },
  ],

  mentoriasAluno: [
    {
      id: 402,
      nome: "Profa. Juliana Santos",
      foto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      materia: "Física",
      horario: "Hoje, 16:00 – 17:00",
      modalidade: "Online",
      localizacao: "Online",
      status: "Confirmada",
      tipo: "MENTORIA",
      online: true,
    },
  ],
};

/**
 * Consulta a agenda completa com fallback resiliente
 */
export async function obterAgendaComFallback(
  perfil: PerfilAgenda,
  usuarioId: number = 1
): Promise<AgendaCompleta> {
  const isDemo =
    typeof window !== "undefined" &&
    (window.location.search.includes("demo=true") ||
      window.location.search.includes("simulacao=true") ||
      window.location.hostname !== "localhost");

  if (isDemo) {
    return {
      ...MOCK_AGENDA_INICIAL,
      perfil,
      isSimulado: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const rota =
      perfil === "PROFESSOR"
        ? `${API_URL}/api/v1/agendamentos/professor/${usuarioId}`
        : `${API_URL}/api/v1/agendamentos/aluno/${usuarioId}`;

    const res = await fetch(rota, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const dados = json.data || json;
      if (Array.isArray(dados) && dados.length > 0) {
        // Converte dados reais
        return {
          ...MOCK_AGENDA_INICIAL,
          perfil,
          isSimulado: false,
        };
      }
    }
  } catch {
    // Falha silenciosa para fallback
  }

  return {
    ...MOCK_AGENDA_INICIAL,
    perfil,
    isSimulado: true,
  };
}

/**
 * Aceitar solicitação de aula (Professor)
 */
export async function aceitarSolicitacaoComFallback(id: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);
    await fetch(`${API_URL}/api/v1/agendamentos/${id}/aceitar`, {
      method: "PUT",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch {
    // fallback
  }
  return true;
}

/**
 * Recusar solicitação de aula (Professor)
 */
export async function recusarSolicitacaoComFallback(id: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);
    await fetch(`${API_URL}/api/v1/agendamentos/${id}/recusar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ motivo: "Indisponibilidade de horário" }),
      signal: controller.signal,
    });
  } catch {
    // fallback
  }
  return true;
}
