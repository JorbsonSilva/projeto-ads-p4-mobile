/**
 * Serviço da agenda conectado aos endpoints REST autenticados da API Orienta.
 */

import { API_URL, apiFetch, extrairDadosLista } from "../config/api";
import {
  Agendamento,
  RemarcarAgendamentoRequest,
  StatusAgendamento,
} from "../types/agendamento";

export type PerfilAgenda = "ALUNO" | "PROFESSOR";
export type ModalidadeAgenda = "Presencial" | "Online" | "Não informada";

export interface SolicitacaoAula {
  id: number;
  alunoNome: string;
  materia: string;
  modalidade: ModalidadeAgenda;
  horario: string;
  dataIso: string;
  status: StatusAgendamento;
  online: boolean;
}

export interface CompromissoAgenda {
  id: number;
  nome: string;
  foto: string | null;
  materia: string;
  horario: string;
  dataIso: string;
  modalidade: ModalidadeAgenda;
  localizacao?: string;
  status: StatusAgendamento;
  online: boolean;
}

export interface AgendaCompleta {
  perfil: PerfilAgenda;
  solicitacoes: SolicitacaoAula[];
  aulasProfessor: CompromissoAgenda[];
  aulasAluno: CompromissoAgenda[];
}

function formatarDataHora(data: string, hora: string): string {
  if (!data || !hora) {
    throw new Error("A API retornou um agendamento sem data ou horário.");
  }
  const [ano, mes, dia] = data.split("-").map(Number);
  const dataFormatada =
    ano && mes && dia
      ? new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : data;
  return `${dataFormatada} • ${hora.slice(0, 5)}`;
}

function normalizarStatus(status: StatusAgendamento | string): StatusAgendamento {
  const statuses: StatusAgendamento[] = [
    "PENDENTE",
    "CONFIRMADO",
    "RECUSADO",
    "CANCELADO",
    "EM_ANDAMENTO",
    "AGUARDANDO_CONFIRMACAO",
    "REALIZADA",
  ];
  if (!statuses.includes(status as StatusAgendamento)) {
    throw new Error(`Status de agendamento inválido recebido da API: ${status}`);
  }
  return status as StatusAgendamento;
}

function mapearCompromisso(
  item: Agendamento,
  perfil: PerfilAgenda,
): CompromissoAgenda {
  const modalidade: ModalidadeAgenda =
    item.modalidade?.toUpperCase() === "PRESENCIAL"
      ? "Presencial"
      : item.modalidade?.toUpperCase() === "ONLINE"
        ? "Online"
        : "Não informada";
  const data = item.data ?? "";
  const hora = item.hora ?? "";
  const status = normalizarStatus(item.status);

  return {
    id: item.id,
    nome: perfil === "PROFESSOR"
      ? item.alunoNome || `Aluno #${item.alunoId}`
      : item.professorNome || `Professor #${item.professorId}`,
    foto: null,
    materia: item.saberNome || item.assunto || "Aula",
    horario: formatarDataHora(data, hora),
    dataIso: data,
    modalidade,
    localizacao:
      modalidade === "Presencial"
        ? "Presencial"
        : modalidade === "Online"
          ? "Online via Plataforma"
          : "Modalidade não informada",
    status,
    online: modalidade === "Online",
  };
}

export async function obterAgenda(
  perfil: PerfilAgenda,
  usuarioId: number,
): Promise<AgendaCompleta> {
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error("Não foi possível identificar o usuário da sessão.");
  }

  const papel = perfil === "PROFESSOR" ? "professor" : "aluno";
  const response = await apiFetch(`${API_URL}/api/v1/agendamentos/${papel}/${usuarioId}`);
  const agendamentos = extrairDadosLista<Agendamento>(await response.json());

  const agenda: AgendaCompleta = {
    perfil,
    solicitacoes: [],
    aulasProfessor: [],
    aulasAluno: [],
  };

  for (const agendamento of agendamentos) {
    const status = normalizarStatus(agendamento.status);
    if (perfil === "PROFESSOR" && status === "PENDENTE") {
      const modalidade: ModalidadeAgenda =
        agendamento.modalidade?.toUpperCase() === "PRESENCIAL"
          ? "Presencial"
          : agendamento.modalidade?.toUpperCase() === "ONLINE"
            ? "Online"
            : "Não informada";
      agenda.solicitacoes.push({
        id: agendamento.id,
        alunoNome: agendamento.alunoNome || `Aluno #${agendamento.alunoId}`,
        materia: agendamento.saberNome || agendamento.assunto || "Aula",
        modalidade,
        horario: formatarDataHora(agendamento.data, agendamento.hora),
        dataIso: agendamento.data,
        status,
        online: modalidade === "Online",
      });
      continue;
    }

    const compromisso = mapearCompromisso(agendamento, perfil);
    if (perfil === "PROFESSOR") {
      agenda.aulasProfessor.push(compromisso);
    } else {
      agenda.aulasAluno.push(compromisso);
    }
  }

  return agenda;
}

export async function aceitarSolicitacao(id: number): Promise<void> {
  await apiFetch(`${API_URL}/api/v1/agendamentos/${id}/aceitar`, { method: "PUT" });
}

export async function recusarSolicitacao(id: number, justificativa: string): Promise<void> {
  await apiFetch(`${API_URL}/api/v1/agendamentos/${id}/recusar`, {
    method: "PUT",
    body: JSON.stringify({ justificativa }),
  });
}

export async function cancelarAgendamento(id: number, justificativa: string): Promise<void> {
  await apiFetch(`${API_URL}/api/v1/agendamentos/${id}/cancelar`, {
    method: "PUT",
    body: JSON.stringify({ justificativa }),
  });
}

export async function remarcarAgendamento(
  id: number,
  dados: RemarcarAgendamentoRequest,
): Promise<void> {
  await apiFetch(`${API_URL}/api/v1/agendamentos/${id}/remarcar`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}
