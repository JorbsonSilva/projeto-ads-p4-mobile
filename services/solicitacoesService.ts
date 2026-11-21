/**
 * @file solicitacoesService.ts
 * @description Serviço Oficial para Gestão de Solicitações de Aula [ORI-019 / IMG-011].
 * Conecta diretamente aos endpoints REST da API Orienta:
 * - GET /api/v1/agendamentos/professor/{professorId}
 * - PUT /api/v1/agendamentos/{id}/aceitar
 * - PUT /api/v1/agendamentos/{id}/recusar
 */

import { API_URL, apiFetch, extrairDadosLista } from "../config/api";
import { Agendamento, StatusAgendamento } from "../types/agendamento";

export type StatusSolicitacao =
  | "PENDENTE"
  | "AGUARDANDO_PAGAMENTO"
  | "CONFIRMADA"
  | "RECUSADA"
  | "CANCELADA"
  | "CONCLUIDA";
export type FormatoAula = "ONLINE" | "PRESENCIAL";

export interface SolicitacaoAula {
  id: number;
  alunoId: number;
  alunoNome: string;
  alunoEmail: string;
  alunoFoto: string;
  materia: string;
  topico: string;
  formato: FormatoAula;
  localDescricao?: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  valor: number;
  mensagemAluno: string;
  recebidoHa: string;
  status: StatusSolicitacao;
  motivoRecusa?: string;
}

export interface ResultadoSolicitacoes {
  dados: SolicitacaoAula[];
  isSimulado: boolean;
  totais: {
    recebidas: number;
    aguardando: number;
    historico: number;
  };
}

/**
 * Consulta a lista completa de agendamentos e solicitações do professor a partir do banco de dados
 */
export async function obterSolicitacoes(
  professorId: number
): Promise<ResultadoSolicitacoes> {
  if (!Number.isSafeInteger(professorId) || professorId <= 0) {
    throw new Error("Não foi possível identificar o professor da sessão.");
  }

  const calcularTotais = (lista: SolicitacaoAula[]) => ({
    recebidas: lista.filter((s) => s.status === "PENDENTE").length,
    aguardando: lista.filter((s) => s.status === "AGUARDANDO_PAGAMENTO").length,
    historico: lista.filter((s) =>
      ["CONFIRMADA", "CONCLUIDA", "RECUSADA", "CANCELADA"].includes(s.status),
    ).length,
  });

  const response = await apiFetch(`${API_URL}/api/v1/agendamentos/professor/${professorId}`);
  const agendamentos = extrairDadosLista<Agendamento>(await response.json());
  const dados = agendamentos.map((item) => {
    const status = normalizarStatus(item.status);
    const horario = item.hora.substring(0, 5);
    const formato: FormatoAula =
      item.modalidade?.toUpperCase() === "PRESENCIAL" ? "PRESENCIAL" : "ONLINE";

    return {
      id: item.id,
      alunoId: item.alunoId,
      alunoNome: item.alunoNome || `Aluno #${item.alunoId}`,
      alunoEmail: item.alunoEmail || "",
      alunoFoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      materia: item.saberNome || "Mentoria",
      topico: item.assunto || "Mentoria acadêmica",
      formato,
      localDescricao: formato === "PRESENCIAL" ? "Aula presencial" : undefined,
      data: new Date(`${item.data}T12:00:00`).toLocaleDateString("pt-BR"),
      horarioInicio: horario,
      horarioFim: calcularFim(horario),
      valor: item.valorAplicado ?? 0,
      mensagemAluno: item.assunto || "",
      recebidoHa: "Via plataforma",
      status,
      motivoRecusa: item.justificativaCancelamento,
    };
  });
  return {
    dados,
    isSimulado: false,
    totais: calcularTotais(dados),
  };
}

function normalizarStatus(status: StatusAgendamento): StatusSolicitacao {
  switch (status) {
    case "PENDENTE":
      return "PENDENTE";
    case "CONFIRMADO":
      return "CONFIRMADA";
    case "REALIZADA":
    case "EM_ANDAMENTO":
    case "AGUARDANDO_CONFIRMACAO":
      return "CONCLUIDA";
    case "RECUSADO":
      return "RECUSADA";
    case "CANCELADO":
      return "CANCELADA";
  }
}

/**
 * Aceita uma solicitação de aula através do endpoint REST da API
 */
export async function aceitarSolicitacao(
  solicitacaoId: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  const response = await apiFetch(`${API_URL}/api/v1/agendamentos/${solicitacaoId}/aceitar`, {
    method: "PUT",
  });
  const payload = await response.json();
  return {
    sucesso: true,
    mensagem: typeof payload?.message === "string"
      ? payload.message
      : "Solicitação aceita com sucesso.",
  };
}

/**
 * Recusa uma solicitação de aula com justificativa através do endpoint REST da API
 */
export async function recusarSolicitacao(
  solicitacaoId: number,
  motivo: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  const response = await apiFetch(`${API_URL}/api/v1/agendamentos/${solicitacaoId}/recusar`, {
    method: "PUT",
    body: JSON.stringify({ justificativa: motivo }),
  });
  const payload = await response.json();
  return {
    sucesso: true,
    mensagem: typeof payload?.message === "string"
      ? payload.message
      : "Solicitação recusada com justificativa.",
  };
}

function calcularFim(inicio: string): string {
  const [h, m] = inicio.split(":").map(Number);
  if (isNaN(h)) return "15:00";
  const proxima = (h + 1).toString().padStart(2, "0");
  const minutos = (m || 0).toString().padStart(2, "0");
  return `${proxima}:${minutos}`;
}
