import { API_URL, apiFetch, extrairDadosLista, extrairDadosObjeto } from "../config/api";

export interface PontoGraficoLinha {
  label: string;
  valor: number;
  aulas: number;
}

export interface SegmentoDistribuicao {
  id: "pagas" | "gratuitas" | "pendentes";
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

export type StatusTransacao = "RECEBIDA" | "CONFIRMADA" | "EM_ANALISE" | "PROCESSANDO";

export interface TransacaoExtrato {
  id: number;
  alunoNome: string;
  alunoFoto: string;
  materia: string;
  data: string;
  horario: string;
  valor: number;
  tipo: string;
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
}

type TransacaoApi = Record<string, any>;

function dataAtual(): Date {
  return new Date();
}

function agruparPorSemana(transacoes: TransacaoApi[], agora: Date): PontoGraficoLinha[] {
  const semanas = [0, 0, 0, 0].map((_, index) => ({
    label: `Sem ${index + 1}`,
    valor: 0,
    aulas: 0,
  }));
  for (const transacao of transacoes) {
    if (!transacao.dataTransacao) continue;
    const data = new Date(transacao.dataTransacao);
    if (data.getFullYear() !== agora.getFullYear() || data.getMonth() !== agora.getMonth()) continue;
    const semana = Math.min(3, Math.floor((data.getDate() - 1) / 7));
    semanas[semana].valor += Number(transacao.valor ?? 0);
    semanas[semana].aulas += transacao.tipoTransacao === "CREDITO_AULA" ? 1 : 0;
  }
  return semanas;
}

export async function obterDadosDesempenho(professorId: number): Promise<DadosDesempenho> {
  const [resumoResponse, extratoResponse] = await Promise.all([
    apiFetch(`${API_URL}/api/v1/professores/${professorId}/financeiro/resumo`),
    apiFetch(`${API_URL}/api/v1/professores/${professorId}/financeiro/extrato`),
  ]);
  const resumo = extrairDadosObjeto<Record<string, any>>(await resumoResponse.json());
  const extrato = extrairDadosLista<TransacaoApi>(await extratoResponse.json());
  const agora = dataAtual();
  const transacoes = extrato.map((item) => {
    const data = item.dataTransacao ? new Date(item.dataTransacao) : null;
    const tipo = String(item.tipoTransacao ?? "");
    return {
      id: Number(item.id),
      alunoNome: "",
      alunoFoto: "",
      materia: String(item.descricao ?? ""),
      data: data?.toLocaleDateString("pt-BR") ?? "",
      horario: data?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "",
      valor: Number(item.valor ?? 0),
      tipo,
      status: "CONFIRMADA" as const,
      descricao: String(item.descricao ?? ""),
    };
  });
  const creditos = extrato.filter((item) => item.tipoTransacao === "CREDITO_AULA");
  const totalCreditos = creditos.length;
  const pendencias = Number(resumo.saldoPendente ?? 0) > 0 ? 1 : 0;
  const totalRegistros = totalCreditos + pendencias;
  const porDescricao = new Map<string, { faturamento: number; aulas: number }>();
  for (const item of creditos) {
    const descricao = String(item.descricao ?? "");
    const atual = porDescricao.get(descricao) ?? { faturamento: 0, aulas: 0 };
    atual.faturamento += Number(item.valor ?? 0);
    atual.aulas += 1;
    porDescricao.set(descricao, atual);
  }
  const volumes = Array.from(porDescricao, ([disciplina, valores], index) => ({
    id: disciplina || String(index),
    disciplina,
    percentual: 0,
    faturamento: valores.faturamento,
    aulas: valores.aulas,
    cor: index === 0 ? "#FF5A1F" : "#2563EB",
  }));
  const faturamentoTotal = volumes.reduce((total, item) => total + item.faturamento, 0);
  volumes.forEach((item) => {
    item.percentual = faturamentoTotal ? (item.faturamento / faturamentoTotal) * 100 : 0;
  });
  const segmentos: SegmentoDistribuicao[] = [
    { id: "pagas", label: "Aulas Pagas", quantidade: totalCreditos, percentual: totalRegistros ? (totalCreditos / totalRegistros) * 100 : 0, cor: "#FF5A1F" },
    { id: "gratuitas", label: "Aulas Gratuitas", quantidade: 0, percentual: 0, cor: "#2563EB" },
    { id: "pendentes", label: "Pendentes / Aguardando", quantidade: pendencias, percentual: totalRegistros ? (pendencias / totalRegistros) * 100 : 0, cor: "#94A3B8" },
  ];

  return {
    periodoReferencia: agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    metricas: {
      aulasMinistradas: Number(resumo.quantidadeAulasRealizadas ?? 0),
      variacaoAulas: "",
      horasDedicadas: 0,
      variacaoHoras: "",
      alunosAtendidos: 0,
      variacaoAlunos: "",
      ganhosMes: Number(resumo.totalGanhosBrutos ?? 0),
      variacaoGanhos: "",
      saldoDisponivelSaque: Number(resumo.saldoDisponivel ?? 0),
      saldoPendente: Number(resumo.saldoPendente ?? 0),
    },
    graficoEvolucao: agruparPorSemana(extrato, agora),
    distribuicaoAulas: segmentos,
    volumePorDisciplina: volumes,
    extratoRecente: transacoes,
  };
}
