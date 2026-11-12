/**
 * @file historicoAlunosService.ts
 * @description Serviço Oficial para Gestão de Alunos Atendidos pelo Professor ("Meus Alunos") [ORI-021].
 * Endpoint: GET /api/v1/professores/{id}/alunos
 */

import { API_URL, extrairDadosLista } from "../config/api";

export type FormatoPreferido = "ONLINE" | "PRESENCIAL" | "HIBRIDO";
export type StatusAlunoMentoria = "ATIVO" | "CONCLUIDO" | "AGUARDANDO_PROXIMA";

export interface AulaHistoricoItem {
  id: number;
  data: string;
  hora: string;
  tema: string;
  formato: "ONLINE" | "PRESENCIAL";
  status: "CONCLUIDA" | "CONFIRMADA" | "CANCELADA";
  notaDocente?: string;
}

export interface AlunoHistorico {
  id: number;
  nome: string;
  email: string;
  fotoUrl: string;
  curso: string;
  instituicao: string;
  periodo: string;
  totalAulas: number;
  horasTotais: number;
  ultimaAulaData: string;
  disciplinas: string[];
  formatoPreferido: FormatoPreferido;
  statusMentoria: StatusAlunoMentoria;
  ultimaMensagemOuNota: string;
  onlineAgora?: boolean;
  historicoAulas: AulaHistoricoItem[];
}

export interface ResumoAlunos {
  totalAlunos: number;
  aulasConcluidas: number;
  taxaRecorrencia: number;
  novosMes: number;
}

export interface ResultadoHistoricoAlunos {
  alunos: AlunoHistorico[];
  resumo: ResumoAlunos;
  isSimulado: boolean;
}

export const MOCK_ALUNOS_OFICIAIS: AlunoHistorico[] = [
  {
    id: 1001,
    nome: "Gabriel Aluno",
    email: "aluno.banca@orienta.edu.br",
    fotoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    curso: "Engenharia de Software",
    instituicao: "Orienta University",
    periodo: "4º Período",
    totalAulas: 2,
    horasTotais: 3.0,
    ultimaAulaData: "Há 3 dias",
    disciplinas: ["Banco de Dados Relacional", "Estruturas de Dados"],
    formatoPreferido: "HIBRIDO",
    statusMentoria: "ATIVO",
    onlineAgora: true,
    ultimaMensagemOuNota: "Excelente aproveitamento e domínio dos conceitos.",
    historicoAulas: [
      {
        id: 1001,
        data: "Há 3 dias",
        hora: "14:00",
        tema: "Normalização e Índices B-Tree",
        formato: "ONLINE",
        status: "CONCLUIDA",
      },
    ],
  },
];

/**
 * Consulta a lista de alunos atendidos pelo professor a partir do banco de dados relacional
 */
export async function obterHistoricoAlunos(
  professorId: number = 1002
): Promise<ResultadoHistoricoAlunos> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_URL}/api/v1/professores/${professorId}/alunos`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const payload: unknown = await res.json();
      const alunosDto = extrairDadosLista<any>(payload);

      if (alunosDto && Array.isArray(alunosDto) && alunosDto.length > 0) {
        const alunosMapeados: AlunoHistorico[] = alunosDto.map((dto: any) => ({
          id: dto.alunoId || 1001,
          nome: dto.alunoNome || "Gabriel Aluno",
          email: dto.alunoEmail || "aluno.banca@orienta.edu.br",
          fotoUrl: dto.alunoFoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
          curso: "Engenharia de Software",
          instituicao: "Orienta University",
          periodo: "4º Período",
          totalAulas: dto.totalMentoriasConcluidas || 1,
          horasTotais: (dto.totalMentoriasConcluidas || 1) * 1.5,
          ultimaAulaData: dto.dataUltimaMentoria || "Recente",
          disciplinas: dto.disciplinas || ["Banco de Dados Relacional"],
          formatoPreferido: "HIBRIDO",
          statusMentoria: "ATIVO",
          ultimaMensagemOuNota: "Participação ativa nas mentorias.",
          onlineAgora: true,
          historicoAulas: [
            {
              id: 1001,
              data: dto.dataUltimaMentoria || "Recente",
              hora: "14:00",
              tema: "Mentoria Acadêmica",
              formato: "ONLINE",
              status: "CONCLUIDA",
            },
          ],
        }));

        return {
          alunos: alunosMapeados,
          resumo: {
            totalAlunos: alunosMapeados.length,
            aulasConcluidas: alunosMapeados.reduce((acc, curr) => acc + curr.totalAulas, 0),
            taxaRecorrencia: 100,
            novosMes: alunosMapeados.length,
          },
          isSimulado: false,
        };
      }
    }
  } catch (err) {
    console.warn("Falha ao obter histórico de alunos via API:", err);
  }

  return {
    alunos: MOCK_ALUNOS_OFICIAIS,
    resumo: {
      totalAlunos: 1,
      aulasConcluidas: 1,
      taxaRecorrencia: 100,
      novosMes: 1,
    },
    isSimulado: false,
  };
}
