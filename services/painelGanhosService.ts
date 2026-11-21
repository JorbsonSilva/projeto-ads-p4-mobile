import { API_URL, apiFetch, extrairDadosLista, extrairDadosObjeto } from "../config/api";

export interface PontoGraficoLinha {
  label: string;
  valor: number;
  aulas: number;
}

export interface SegmentoDistribuicao {
  id: "realizadas" | "pendentes";
  label: string;
  percentual: number;
  quantidade: number;
  cor: string;
}

export interface ItemVolumeDisciplina {
  id: string;
  disciplina: string;
  percentual: number;
  faturamento: number;
  aulas: number;
  cor: string;
}

export type TipoTransacao =
  | "CREDITO_AULA"
  | "RETENCAO_TAXA_INSTITUICAO"
  | "SAQUE_DEBITO"
  | "REEMBOLSO_ALUNO";

export interface TransacaoExtrato {
  id: number;
  alunoNome: string;
  materia: string;
  data: string;
  horario: string;
  valor: number;
  tipo: TipoTransacao;
  descricao: string;
}

export interface DadosDesempenho {
  periodoReferencia: string;
  metricas: {
    aulasMinistradas: number;
    aulasPendentes: number;
    alunosAtendidos: number;
    ganhosMes: number;
    saldoDisponivelSaque: number;
    saldoPendente: number;
  };
  graficoEvolucao: PontoGraficoLinha[];
  distribuicaoAulas: SegmentoDistribuicao[];
  volumePorDisciplina: ItemVolumeDisciplina[];
  extratoRecente: TransacaoExtrato[];
}

interface TransacaoApi {
  id: number;
  tipoTransacao: TipoTransacao;
  valor: number;
  descricao: string | null;
  dataTransacao: string | null;
  alunoNome: string | null;
  materia: string | null;
}

interface ResumoFinanceiroApi {
  saldoDisponivel: number;
  saldoPendente: number;
  ganhosMes: number;
  aulasRealizadasMes: number;
  alunosAtendidosMes: number;
  aulasPendentesMes: number;
  graficoEvolucao?: PontoGraficoLinha[];
}

function dataAtual(): Date {
  return new Date();
}

function criarGraficoSemanal(transacoes: TransacaoApi[], agora: Date): PontoGraficoLinha[] {
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  const semanas = Array.from({ length: 5 }, (_, index) => {
    const inicio = index * 7 + 1;
    return {
      label: `${inicio}-${Math.min(inicio + 6, diasNoMes)}`,
      valor: 0,
      aulas: 0,
    };
  });
  for (const transacao of transacoes) {
    if (transacao.tipoTransacao !== "CREDITO_AULA" || !transacao.dataTransacao) continue;
    const data = new Date(transacao.dataTransacao);
    if (
      Number.isNaN(data.getTime()) ||
      data.getFullYear() !== agora.getFullYear() ||
      data.getMonth() !== agora.getMonth()
    ) continue;
    const semana = Math.min(4, Math.floor((data.getDate() - 1) / 7));
    semanas[semana].valor += Number(transacao.valor ?? 0);
    semanas[semana].aulas += 1;
  }
  return semanas;
}

function criarDistribuicao(
  realizadas: number,
  pendentes: number,
): SegmentoDistribuicao[] {
  const total = realizadas + pendentes;
  return [
    {
      id: "realizadas",
      label: "Aulas realizadas",
      quantidade: realizadas,
      percentual: total > 0 ? (realizadas / total) * 100 : 0,
      cor: "#FF5A1F",
    },
    {
      id: "pendentes",
      label: "Aulas agendadas ou em andamento",
      quantidade: pendentes,
      percentual: total > 0 ? (pendentes / total) * 100 : 0,
      cor: "#2563EB",
    },
  ];
}

export async function obterDadosDesempenho(professorId: number): Promise<DadosDesempenho> {
  const [resumoResponse, extratoResponse] = await Promise.all([
    apiFetch(`${API_URL}/api/v1/professores/${professorId}/financeiro/resumo`),
    apiFetch(`${API_URL}/api/v1/professores/${professorId}/financeiro/extrato`),
  ]);
  const resumo = extrairDadosObjeto<ResumoFinanceiroApi>(await resumoResponse.json());
  const extrato = extrairDadosLista<TransacaoApi>(await extratoResponse.json());
  const agora = dataAtual();
  const transacoes = extrato.map((item) => {
    const data = item.dataTransacao ? new Date(item.dataTransacao) : null;
    return {
      id: Number(item.id),
      alunoNome: String(item.alunoNome ?? ""),
      materia: String(item.materia ?? ""),
      data: data && !Number.isNaN(data.getTime()) ? data.toLocaleDateString("pt-BR") : "",
      horario: data && !Number.isNaN(data.getTime())
        ? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "",
      valor: Number(item.valor ?? 0),
      tipo: item.tipoTransacao,
      descricao: String(item.descricao ?? ""),
    };
  });

  const creditosDoMes = extrato.filter((item) => {
    if (item.tipoTransacao !== "CREDITO_AULA" || !item.dataTransacao) return false;
    const data = new Date(item.dataTransacao);
    return !Number.isNaN(data.getTime())
      && data.getFullYear() === agora.getFullYear()
      && data.getMonth() === agora.getMonth();
  });
  const porDisciplina = new Map<string, { faturamento: number; aulas: number }>();
  for (const item of creditosDoMes) {
    const disciplina = item.materia?.trim() || "Disciplina não informada";
    const atual = porDisciplina.get(disciplina) ?? { faturamento: 0, aulas: 0 };
    atual.faturamento += Number(item.valor ?? 0);
    atual.aulas += 1;
    porDisciplina.set(disciplina, atual);
  }
  const faturamentoCreditos = Array.from(porDisciplina.values())
    .reduce((total, item) => total + item.faturamento, 0);
  const volumes = Array.from(porDisciplina, ([disciplina, valores], index) => ({
    id: disciplina,
    disciplina,
    percentual: faturamentoCreditos > 0 ? (valores.faturamento / faturamentoCreditos) * 100 : 0,
    faturamento: valores.faturamento,
    aulas: valores.aulas,
    cor: index === 0 ? "#FF5A1F" : "#2563EB",
  }));
  const aulasRealizadasMes = Number(resumo.aulasRealizadasMes ?? 0);
  const aulasPendentesMes = Number(resumo.aulasPendentesMes ?? 0);

  return {
    periodoReferencia: agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    metricas: {
      aulasMinistradas: aulasRealizadasMes,
      aulasPendentes: aulasPendentesMes,
      alunosAtendidos: Number(resumo.alunosAtendidosMes ?? 0),
      ganhosMes: Number(resumo.ganhosMes ?? 0),
      saldoDisponivelSaque: Number(resumo.saldoDisponivel ?? 0),
      saldoPendente: Number(resumo.saldoPendente ?? 0),
    },
    graficoEvolucao: resumo.graficoEvolucao ?? criarGraficoSemanal(extrato, agora),
    distribuicaoAulas: criarDistribuicao(aulasRealizadasMes, aulasPendentesMes),
    volumePorDisciplina: volumes,
    extratoRecente: transacoes,
  };
}
