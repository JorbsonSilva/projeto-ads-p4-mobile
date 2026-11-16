import { API_URL, apiFetch, extrairDadosLista } from "../config/api";

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
}

export async function obterHistoricoAlunos(professorId: number): Promise<ResultadoHistoricoAlunos> {
  const response = await apiFetch(`${API_URL}/api/v1/professores/${professorId}/alunos`);
  const registros = extrairDadosLista<Record<string, any>>(await response.json());
  const alunos: AlunoHistorico[] = registros.map((dto) => ({
    id: Number(dto.alunoId ?? dto.id),
    nome: String(dto.nome ?? dto.alunoNome ?? ""),
    email: String(dto.email ?? dto.alunoEmail ?? ""),
    fotoUrl: String(dto.fotoUrl ?? dto.alunoFoto ?? ""),
    curso: String(dto.curso ?? ""),
    instituicao: String(dto.instituicao ?? ""),
    periodo: String(dto.periodo ?? ""),
    totalAulas: Number(dto.totalAulasConcluidas ?? dto.totalAulas ?? 0),
    horasTotais: Number(dto.horasAcumuladas ?? dto.horasTotais ?? 0),
    ultimaAulaData: String(dto.dataUltimaAula ?? dto.ultimaAulaData ?? ""),
    disciplinas: Array.isArray(dto.disciplinasCursadas)
      ? dto.disciplinasCursadas
      : Array.isArray(dto.disciplinas) ? dto.disciplinas : [],
    formatoPreferido: dto.formatoPreferido ?? "ONLINE",
    statusMentoria: dto.statusMentoria ?? "ATIVO",
    ultimaMensagemOuNota: String(dto.ultimaMensagemOuNota ?? ""),
    historicoAulas: Array.isArray(dto.historicoAulas) ? dto.historicoAulas : [],
  }));
  const recorrentes = alunos.filter((aluno) => aluno.totalAulas >= 3).length;

  return {
    alunos,
    resumo: {
      totalAlunos: alunos.length,
      aulasConcluidas: alunos.reduce((total, aluno) => total + aluno.totalAulas, 0),
      taxaRecorrencia: alunos.length ? Math.round((recorrentes / alunos.length) * 100) : 0,
      novosMes: 0,
    },
  };
}
