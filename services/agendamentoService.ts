import { API_URL, apiFetch, extrairDadosObjeto } from "../config/api";

export interface CriarAgendamentoDTO {
  idAluno: number;
  idProfessor: number;
  idDisciplina: number;
  data: string;
  hora: string;
  modalidade: "ONLINE" | "PRESENCIAL";
  assunto: string;
}

export interface AgendamentoSolicitado {
  id: number;
  alunoId: number;
  professorId: number;
  professorNome: string;
  saberId: number | null;
  saberNome: string | null;
  data: string;
  hora: string;
  modalidade: "ONLINE" | "PRESENCIAL";
  valorAplicado: number;
  status: string;
}

export async function solicitarAgendamento(
  dados: CriarAgendamentoDTO,
): Promise<AgendamentoSolicitado> {
  const resposta = await apiFetch(`${API_URL}/api/v1/agendamentos`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
  const payload: unknown = await resposta.json();
  return extrairDadosObjeto<AgendamentoSolicitado>(payload);
}
