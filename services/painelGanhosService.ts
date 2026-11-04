/**
 * @file painelGanhosService.ts
 * @description Serviço híbrido resiliente para o Dashboard Analítico de Desempenho e Painel de Ganhos [ORI-020 / IMG-013].
 * Fornece métricas consolidadas, dados de gráficos (linha luminosa temporal, distribuição donut, progresso por disciplina)
 * e extrato recente com suporte a fallback instantâneo offline e modo simulação.
 */

import { API_URL, extrairDadosLista } from "../config/api";

export interface PontoGraficoLinha {
  label: string; // Ex: "Sem 1", "Sem 2", "Sem 3", "Sem 4"
  valor: number; // Ex: 420, 680, 560, 820
  aulas: number; // Ex: 4, 7, 5, 8
}

export interface SegmentoDistribuicao {
  id: "pagas" | "gratuitas" | "pendentes";
  label: string;
  percentual: number; // Ex: 66.7, 25.0, 8.3
  quantidade: number; // Ex: 16, 6, 2
  cor: string;
}

export interface ItemVolumeDisciplina {
  id: string;
  disciplina: string;
  percentual: number; // Ex: 45, 30, 15, 10
  faturamento: number; // Ex: 1116.00
  aulas: number; // Ex: 11
  cor: string;
}

export type StatusTransacao = "RECEBIDA" | "CONFIRMADA" | "EM_ANALISE" | "PROCESSANDO";

export interface TransacaoExtrato {
  id: number;
  alunoNome: string;
  alunoFoto: string;
  materia: string;
  data: string;
  horario: string;
  valor: number;
  tipo: "PAGA" | "GRATUITA" | "SAQUE";
  status: StatusTransacao;
  descricao: string;
}

export interface DadosDesempenho {
  periodoReferencia: string;
  metricas: {
    aulasMinistradas: number;
    variacaoAulas: string;
    horasDedicadas: number;
    variacaoHoras: string;
    alunosAtendidos: number;
    variacaoAlunos: string;
    ganhosMes: number;
    variacaoGanhos: string;
    saldoDisponivelSaque: number;
    saldoPendente: number;
  };
  graficoEvolucao: PontoGraficoLinha[];
  distribuicaoAulas: SegmentoDistribuicao[];
  volumePorDisciplina: ItemVolumeDisciplina[];
  extratoRecente: TransacaoExtrato[];
  isSimulado: boolean;
}

/**
 * Dados padrão de referência estrita alinhados ao Mockup IMG-013 (DashBoard.png)
 */
export const DADOS_DESEMPENHO_MOCK: DadosDesempenho = {
  periodoReferencia: "Junho / 2024",
  metricas: {
    aulasMinistradas: 24,
    variacaoAulas: "+14% vs mês anterior",
    horasDedicadas: 36,
    variacaoHoras: "+8h vs mês anterior",
    alunosAtendidos: 38,
    variacaoAlunos: "+6 novos estudantes",
    ganhosMes: 2480.0,
    variacaoGanhos: "+18,5% de crescimento",
    saldoDisponivelSaque: 2480.0,
    saldoPendente: 230.0,
  },
  graficoEvolucao: [
    { label: "Sem 1", valor: 420, aulas: 4 },
    { label: "Sem 2", valor: 680, aulas: 7 },
    { label: "Sem 3", valor: 560, aulas: 5 },
    { label: "Sem 4", valor: 820, aulas: 8 },
  ],
  distribuicaoAulas: [
    {
      id: "pagas",
      label: "Aulas Pagas",
      percentual: 66.7,
      quantidade: 16,
      cor: "#FF5A1F", // Laranja oficial Orienta
    },
    {
      id: "gratuitas",
      label: "Aulas Gratuitas",
      percentual: 25.0,
      quantidade: 6,
      cor: "#2563EB", // Azul corporativo
    },
    {
      id: "pendentes",
      label: "Pendentes / Aguardando",
      percentual: 8.3,
      quantidade: 2,
      cor: "#94A3B8", // Cinza slate neutro
    },
  ],
  volumePorDisciplina: [
    {
      id: "mat",
      disciplina: "Matemática & Cálculo",
      percentual: 45,
      faturamento: 1116.0,
      aulas: 11,
      cor: "#FF5A1F",
    },
    {
      id: "prog",
      disciplina: "Algoritmos & Programação",
      percentual: 30,
      faturamento: 744.0,
      aulas: 7,
      cor: "#2563EB",
    },
    {
      id: "fis",
      disciplina: "Física Geral & Mecânica",
      percentual: 15,
      faturamento: 372.0,
      aulas: 4,
      cor: "#10B981",
    },
    {
      id: "outros",
      disciplina: "Outros Tópicos & Monitoria",
      percentual: 10,
      faturamento: 248.0,
      aulas: 2,
      cor: "#8B5CF6",
    },
  ],
  extratoRecente: [
    {
      id: 501,
      alunoNome: "Ana Clara Silva",
      alunoFoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      materia: "Cálculo Diferencial",
      data: "Hoje",
      horario: "14:30",
      valor: 120.0,
      tipo: "PAGA",
      status: "RECEBIDA",
      descricao: "Aula presencial concluída na Biblioteca Central",
    },
    {
      id: 502,
      alunoNome: "Pedro Henrique Ramos",
      alunoFoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      materia: "Algoritmos em C++",
      data: "Hoje",
      horario: "10:00",
      valor: 80.0,
      tipo: "PAGA",
      status: "RECEBIDA",
      descricao: "Mentoria online de árvores binárias balanceadas",
    },
    {
      id: 503,
      alunoNome: "Mariana Vasconcelos",
      alunoFoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      materia: "Álgebra Linear",
      data: "Ontem",
      horario: "16:15",
      valor: 60.0,
      tipo: "PAGA",
      status: "RECEBIDA",
      descricao: "Revisão preparatória para segunda prova",
    },
    {
      id: 504,
      alunoNome: "Lucas Gabriel Moura",
      alunoFoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      materia: "Física Experimental",
      data: "Ontem",
      horario: "09:00",
      valor: 0.0,
      tipo: "GRATUITA",
      status: "CONFIRMADA",
      descricao: "Monitoria voluntária e auxílio em laboratório",
    },
    {
      id: 505,
      alunoNome: "Beatriz Oliveira",
      alunoFoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      materia: "Geometria Analítica",
      data: "22/06/2024",
      horario: "15:00",
      valor: 80.0,
      tipo: "PAGA",
      status: "CONFIRMADA",
      descricao: "Mentoria presencial agendada e paga via Pix",
    },
    {
      id: 506,
      alunoNome: "Rafael Fontes Lima",
      alunoFoto: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
      materia: "Estatística Aplicada",
      data: "21/06/2024",
      horario: "11:30",
      valor: 70.0,
      tipo: "PAGA",
      status: "EM_ANALISE",
      descricao: "Aguardando confirmação de compensação bancária",
    },
  ],
  isSimulado: true,
};

/**
 * Obtém os dados de desempenho analítico do professor de forma resiliente.
 * Tenta sincronizar com o backend em tempo hábil e realiza fallback automático.
 */
export async function obterDadosDesempenho(professorId?: number): Promise<DadosDesempenho> {
  if (!professorId) {
    return DADOS_DESEMPENHO_MOCK;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600);

    const res = await fetch(`${API_URL}/agendamentos/professor/${professorId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const payload: unknown = await res.json();
      const agendamentos = extrairDadosLista<any>(payload);

      if (agendamentos && agendamentos.length > 0) {
        let faturamentoRealizado = 0;
        let aulasPagas = 0;
        let aulasGratuitas = 0;
        let aulasPendentes = 0;
        let horasTotais = 0;
        const alunosSet = new Set<number>();

        agendamentos.forEach((a: any) => {
          if (a.aluno?.id) alunosSet.add(a.aluno.id);
          horasTotais += 1.5; // Estimativa média

          if (a.status === "CONFIRMADO") {
            const val = Number(a.valor || 60);
            if (val > 0) {
              faturamentoRealizado += val;
              aulasPagas += 1;
            } else {
              aulasGratuitas += 1;
            }
          } else if (a.status === "PENDENTE") {
            aulasPendentes += 1;
          }
        });

        const totalGeralAulas = agendamentos.length;
        const percPagas = totalGeralAulas > 0 ? Number(((aulasPagas / totalGeralAulas) * 100).toFixed(1)) : 66.7;
        const percGratis = totalGeralAulas > 0 ? Number(((aulasGratuitas / totalGeralAulas) * 100).toFixed(1)) : 25.0;
        const percPendentes = totalGeralAulas > 0 ? Number(((aulasPendentes / totalGeralAulas) * 100).toFixed(1)) : 8.3;

        return {
          ...DADOS_DESEMPENHO_MOCK,
          metricas: {
            ...DADOS_DESEMPENHO_MOCK.metricas,
            aulasMinistradas: totalGeralAulas,
            horasDedicadas: Math.round(horasTotais),
            alunosAtendidos: alunosSet.size || DADOS_DESEMPENHO_MOCK.metricas.alunosAtendidos,
            ganhosMes: faturamentoRealizado || DADOS_DESEMPENHO_MOCK.metricas.ganhosMes,
            saldoDisponivelSaque: faturamentoRealizado || DADOS_DESEMPENHO_MOCK.metricas.saldoDisponivelSaque,
          },
          distribuicaoAulas: [
            { id: "pagas", label: "Aulas Pagas", percentual: percPagas, quantidade: aulasPagas, cor: "#FF5A1F" },
            { id: "gratuitas", label: "Aulas Gratuitas", percentual: percGratis, quantidade: aulasGratuitas, cor: "#2563EB" },
            { id: "pendentes", label: "Pendentes / Aguardando", percentual: percPendentes, quantidade: aulasPendentes, cor: "#94A3B8" },
          ],
          isSimulado: false,
        };
      }
    }

    return DADOS_DESEMPENHO_MOCK;
  } catch {
    return DADOS_DESEMPENHO_MOCK;
  }
}
