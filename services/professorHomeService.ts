/**
 * @file professorHomeService.ts
 * @description Dados da Home do Professor obtidos dos endpoints autenticados da API.
 */

import {
  API_URL,
  agendamentoApi,
  apiFetch,
  extrairDadosObjeto,
  extrairDadosLista,
  notificacaoApi,
} from "../config/api";
import type { Agendamento, StatusAgendamento } from "../types/agendamento";

export interface MetricaComparativa {
  valor: string | number;
  label: string;
  icone: "calendar" | "users" | "clock" | "dollar-sign";
}

export interface ProximaAulaProfessor {
  id: number;
  alunoNome: string;
  disciplina: string;
  horario: string;
  modalidade: string;
  status: "CONFIRMADO" | "PENDENTE" | "EM_ANDAMENTO";
  valor: number;
}

export interface DadosHomeProfessor {
  metricas: {
    aulasRealizadas: MetricaComparativa;
    alunosAtendidos: MetricaComparativa;
    aulasPendentes: MetricaComparativa;
    ganhosMes: MetricaComparativa;
  };
  proximasAulas: ProximaAulaProfessor[];
}

interface ResumoFinanceiroHome {
  ganhosMes: number;
  aulasRealizadasMes: number;
  alunosAtendidosMes: number;
  aulasPendentesMes: number;
}

function validarNumero(valor: unknown, campo: string): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new TypeError(`A API retornou um valor inválido para ${campo}.`);
  }
  return valor;
}

function statusAtivo(status: StatusAgendamento): status is ProximaAulaProfessor["status"] {
  return status === "PENDENTE" || status === "CONFIRMADO" || status === "EM_ANDAMENTO";
}

function mapearProximaAula(agendamento: Agendamento): ProximaAulaProfessor {
  if (
    !Number.isSafeInteger(agendamento.id) ||
    !agendamento.alunoNome ||
    !agendamento.data ||
    !agendamento.hora ||
    !statusAtivo(agendamento.status)
  ) {
    throw new TypeError("A API retornou um agendamento sem os dados necessários para a Home.");
  }

  const horario = new Date(`${agendamento.data}T${agendamento.hora}`);
  if (Number.isNaN(horario.getTime())) {
    throw new TypeError("A API retornou data ou horário inválido para um agendamento.");
  }

  const modalidade =
    agendamento.modalidade === "ONLINE"
      ? "Online"
      : agendamento.modalidade === "PRESENCIAL"
        ? "Presencial"
        : "Modalidade não informada";

  return {
    id: agendamento.id,
    alunoNome: agendamento.alunoNome,
    disciplina: agendamento.saberNome || agendamento.assunto || "Assunto não informado",
    horario: `${horario.toLocaleDateString("pt-BR")}, ${horario.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    modalidade,
    status: agendamento.status,
    valor: validarNumero(agendamento.valorAplicado, "valor da aula"),
  };
}

export async function obterDadosHomeProfessor(professorId: number): Promise<DadosHomeProfessor> {
  if (!Number.isSafeInteger(professorId) || professorId <= 0) {
    throw new Error("Não foi possível identificar o professor da sessão. Entre novamente.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const [respostaResumo, respostaAgendamentos] = await Promise.all([
      apiFetch(`${API_URL}/api/v1/professores/${professorId}/financeiro/resumo`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Não foi possível carregar o resumo financeiro (HTTP ${response.status}).`);
        }
        return response.json();
      }),
      agendamentoApi.listarPorProfessor(professorId),
    ]);

    const resumo = extrairDadosObjeto<ResumoFinanceiroHome>(respostaResumo);
    const agendamentos = extrairDadosLista<Agendamento>(respostaAgendamentos);
    const ganhosMes = validarNumero(resumo.ganhosMes, "ganhos do mês");
    const aulasRealizadasMes = validarNumero(resumo.aulasRealizadasMes, "aulas realizadas no mês");
    const alunosAtendidosMes = validarNumero(resumo.alunosAtendidosMes, "alunos atendidos no mês");
    const aulasPendentesMes = validarNumero(resumo.aulasPendentesMes, "aulas pendentes no mês");
    const agora = new Date();
    const proximasAulas = agendamentos
      .filter((agendamento) => statusAtivo(agendamento.status))
      .map((agendamento) => {
        const dataHora = new Date(`${agendamento.data}T${agendamento.hora}`);
        if (Number.isNaN(dataHora.getTime())) {
          throw new TypeError("A API retornou data ou horário inválido para um agendamento.");
        }
        return { agendamento, timestamp: dataHora.getTime() };
      })
      .filter(({ timestamp }) => timestamp >= agora.getTime())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 3)
      .map(({ agendamento }) => mapearProximaAula(agendamento));

    return {
      metricas: {
        aulasRealizadas: {
          valor: aulasRealizadasMes,
          label: "Aulas realizadas no mês",
          icone: "calendar",
        },
        alunosAtendidos: {
          valor: alunosAtendidosMes,
          label: "Alunos atendidos no mês",
          icone: "users",
        },
        aulasPendentes: {
          valor: aulasPendentesMes,
          label: "Aulas pendentes no mês",
          icone: "clock",
        },
        ganhosMes: {
          valor: `R$ ${ganhosMes.toFixed(2).replace(".", ",")}`,
          label: "Ganhos brutos no mês",
          icone: "dollar-sign",
        },
      },
      proximasAulas,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function obterContagemNotificacoesNaoLidas(usuarioId: number): Promise<number> {
  const resposta = await notificacaoApi.contarNaoLidas(usuarioId);
  if (
    !resposta.success ||
    !resposta.data ||
    !Number.isSafeInteger(resposta.data.totalNaoLidas) ||
    resposta.data.totalNaoLidas < 0
  ) {
    throw new Error(resposta.message || "A API retornou uma contagem de notificações inválida.");
  }
  return resposta.data.totalNaoLidas;
}
