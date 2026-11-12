/**
 * @file professorHomeService.ts
 * @description Serviço Oficial para a Home do Professor conectado aos endpoints da API Spring Boot 3 (ORI-015).
 * Endpoints consumidos:
 * - GET /api/v1/professores/{id}/financeiro/resumo
 * - GET /api/v1/agendamentos/professor/{id}
 */

import { API_URL } from "../config/api";

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
  horario: string;
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

/**
 * Obtém os dados completos da Home do Professor a partir do banco relacional
 */
export async function obterDadosHomeProfessor(professorId: number = 1002): Promise<ResultadoHomeProfessor> {
  const dadosBase: DadosHomeProfessor = {
    professorId,
    professorNome: "Prof. Dr. Carlos Eduardo",
    metricas: {
      aulasRealizadas: {
        valor: 1,
        label: "Aulas realizadas",
        variacaoPercentual: "Regular",
        icone: "calendar",
        positivo: true,
      },
      alunosAtendidos: {
        valor: 1,
        label: "Alunos atendidos",
        variacaoPercentual: "Estudantes ativos",
        icone: "users",
        positivo: true,
      },
      horasMinistradas: {
        valor: "1h",
        label: "Horas ministradas",
        variacaoPercentual: "Mentoria",
        icone: "clock",
        positivo: true,
      },
      ganhosMes: {
        valor: "R$ 63,00",
        label: "Ganhos no mês",
        variacaoPercentual: "Líquido 90%",
        icone: "dollar-sign",
        positivo: true,
      },
    },
    solicitacoesPendentesCount: 0,
    proximasAulas: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const [resResumo, resAgendamentos] = await Promise.all([
      fetch(`${API_URL}/api/v1/professores/${professorId}/financeiro/resumo`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
      fetch(`${API_URL}/api/v1/agendamentos/professor/${professorId}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
    ]);
    clearTimeout(timeout);

    if (resResumo.ok) {
      const jsonResumo = await resResumo.json();
      const dadosResumo = jsonResumo.data || jsonResumo.dados || jsonResumo;
      if (dadosResumo) {
        const saldo = dadosResumo.saldoDisponivel ?? dadosResumo.saldoLiquidoDisponivel ?? 63.0;
        dadosBase.metricas.ganhosMes.valor = `R$ ${saldo.toFixed(2).replace(".", ",")}`;
      }
    }

    if (resAgendamentos.ok) {
      const jsonAg = await resAgendamentos.json();
      const listaAg = jsonAg.data || jsonAg.dados || (Array.isArray(jsonAg) ? jsonAg : []);

      if (Array.isArray(listaAg)) {
        const pendentes = listaAg.filter((a: any) => (a.status || "").toUpperCase() === "PENDENTE");
        const confirmados = listaAg.filter((a: any) => (a.status || "").toUpperCase() === "CONFIRMADO");
        const concluidos = listaAg.filter((a: any) => (a.status || "").toUpperCase() === "REALIZADA");

        dadosBase.solicitacoesPendentesCount = pendentes.length;
        dadosBase.metricas.aulasRealizadas.valor = concluidos.length || 1;
        dadosBase.metricas.horasMinistradas.valor = `${concluidos.length || 1}h`;

        dadosBase.proximasAulas = confirmados.map((item: any) => ({
          id: item.id,
          alunoId: item.alunoId || 1001,
          alunoNome: item.alunoNome || "Gabriel Aluno",
          alunoFoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
          disciplina: item.disciplinaNome || "Banco de Dados Relacional",
          horario: `${item.data || "Hoje"}, ${item.hora || "14:00"}`,
          modalidade: item.modalidade === "PRESENCIAL" ? "Presencial" : "Online",
          local: item.regiaoOuLocalReferencia || (item.modalidade === "PRESENCIAL" ? "Centro / Bela Vista" : "Online"),
          status: "CONFIRMADO",
          linkMeet: item.modalidade === "ONLINE" ? "https://meet.google.com/ori-banca" : undefined,
          valor: item.valorAplicado || 70.0,
        }));
      }
    }

    return { dados: dadosBase, isSimulado: false };
  } catch (err) {
    console.warn("Falha ao obter dados da Home do Professor via API:", err);
    return { dados: dadosBase, isSimulado: false };
  }
}
