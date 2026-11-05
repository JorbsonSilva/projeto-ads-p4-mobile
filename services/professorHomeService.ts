/**
 * @file professorHomeService.ts
 * @description Serviço híbrido resiliente para a Home do Professor (ORI-015).
 * Implementado conforme a referência visual IMG-015 (Home Professor.png).
 * Conecta-se às APIs Spring Boot com fallback offline e dados oficiais da banca.
 */

import { api } from "../config/api";

export interface MetricaComparativa {
  valor: string | number;
  label: string;
  variacaoPercentual: string;
  icone: "calendar" | "users" | "clock" | "dollar-sign";
  positivo: boolean;
}

export interface ProximaAulaProfessor {
  id: number;
  alunoId: number;
  alunoNome: string;
  alunoFoto: string;
  disciplina: string;
  horario: string; // Ex: "Hoje, 14:00 – 15:00"
  modalidade: "Online" | "Presencial";
  local?: string;
  status: "CONFIRMADO" | "PENDENTE" | "EM_ANDAMENTO";
  linkMeet?: string;
  valor: number;
}

export interface DadosHomeProfessor {
  professorId: number;
  professorNome: string;
  metricas: {
    aulasRealizadas: MetricaComparativa;
    alunosAtendidos: MetricaComparativa;
    horasMinistradas: MetricaComparativa;
    ganhosMes: MetricaComparativa;
  };
  proximasAulas: ProximaAulaProfessor[];
  solicitacoesPendentesCount: number;
}

export interface ResultadoHomeProfessor {
  dados: DadosHomeProfessor;
  isSimulado: boolean;
}

// ==============================================================================
// BASE DE DADOS MOCKADA OFICIAL (Fiel à imagem IMG-015)
// ==============================================================================
export const MOCK_HOME_PROFESSOR_OFICIAL: DadosHomeProfessor = {
  professorId: 101,
  professorNome: "Prof. Lucas Rocha",
  metricas: {
    aulasRealizadas: {
      valor: 24,
      label: "Aulas realizadas",
      variacaoPercentual: "+12% vs mês ant.",
      icone: "calendar",
      positivo: true,
    },
    alunosAtendidos: {
      valor: 38,
      label: "Alunos atendidos",
      variacaoPercentual: "+8% vs mês ant.",
      icone: "users",
      positivo: true,
    },
    horasMinistradas: {
      valor: "36h",
      label: "Horas ministradas",
      variacaoPercentual: "+15% vs mês ant.",
      icone: "clock",
      positivo: true,
    },
    ganhosMes: {
      valor: "R$ 2.480,00",
      label: "Ganhos no mês",
      variacaoPercentual: "+22% vs mês ant.",
      icone: "dollar-sign",
      positivo: true,
    },
  },
  solicitacoesPendentesCount: 2,
  proximasAulas: [
    {
      id: 201,
      alunoId: 1,
      alunoNome: "Ana Silva",
      alunoFoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces",
      disciplina: "Matemática",
      horario: "Hoje, 14:00 – 15:00",
      modalidade: "Presencial",
      local: "Caruaru – PE",
      status: "CONFIRMADO",
      valor: 60.0,
    },
    {
      id: 202,
      alunoId: 2,
      alunoNome: "Pedro Henrique",
      alunoFoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
      disciplina: "Cálculo I",
      horario: "Hoje, 16:00 – 17:00",
      modalidade: "Online",
      linkMeet: "https://meet.google.com/ori-calc-aula",
      status: "CONFIRMADO",
      valor: 60.0,
    },
    {
      id: 203,
      alunoId: 3,
      alunoNome: "Mariana Souza",
      alunoFoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=faces",
      disciplina: "Álgebra Linear",
      horario: "Amanhã, 10:00 – 11:00",
      modalidade: "Online",
      linkMeet: "https://meet.google.com/ori-alg-linear",
      status: "PENDENTE",
      valor: 60.0,
    },
  ],
};

let mockHomeAtual = JSON.parse(JSON.stringify(MOCK_HOME_PROFESSOR_OFICIAL));

/**
 * Obtém os dados completos da Home do Professor com fallback offline imediato
 */
export async function obterDadosHomeProfessor(professorId: number = 101): Promise<ResultadoHomeProfessor> {
  try {
    const res = await api.get(`/api/v1/professores/${professorId}/dashboard`, {
      timeout: 3000,
    });
    if (res.data && res.data.dados) {
      return { dados: res.data.dados, isSimulado: false };
    }
    throw new Error("Dados indisponíveis na API");
  } catch {
    return { dados: mockHomeAtual, isSimulado: true };
  }
}
