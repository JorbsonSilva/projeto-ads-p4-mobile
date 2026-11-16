import { API_URL, apiFetch, extrairDadosObjeto } from "../config/api";

export type MetodoRecebimento = "PIX" | "TED" | "CARTEIRA";

export interface ResumoFinanceiroProfessor {
  saldoDisponivel: number;
  valorPendente: number;
  ganhosMes: number;
  saquesRealizados: number;
  totalRecebido: number;
  chavePixPadrao: string;
  tipoChavePix: "CPF" | "EMAIL" | "EVP" | "TELEFONE";
  bancoPadrao?: {
    banco: string;
    agencia: string;
    conta: string;
  };
}

export interface SolicitacaoSaqueRequest {
  professorId: number | string;
  valor: number;
  metodo: MetodoRecebimento;
  chavePix?: string;
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
  };
}

export interface SolicitacaoSaqueResponse {
  id: string | number;
  sucesso: boolean;
  mensagem: string;
  protocolo: string;
  valorSolicitado: number;
  taxa: number;
  valorLiquido: number;
  dataHora: string;
  previsaoLiberacao: string;
  metodo: MetodoRecebimento;
  destino: string;
  novoSaldoDisponivel: number;
}

export interface ResultadoResumoFinanceiro {
  resumo: ResumoFinanceiroProfessor;
}

export async function obterResumoSaqueProfessor(professorId: number): Promise<ResultadoResumoFinanceiro> {
  const response = await apiFetch(`${API_URL}/api/v1/professores/${professorId}/financeiro/resumo`);
  const data = extrairDadosObjeto<Record<string, any>>(await response.json());

  return {
    resumo: {
      saldoDisponivel: Number(data.saldoDisponivel ?? 0),
      valorPendente: Number(data.saldoPendente ?? 0),
      ganhosMes: Number(data.totalGanhosBrutos ?? 0),
      saquesRealizados: Number(data.totalSacado ?? 0),
      totalRecebido: Number(data.totalGanhosBrutos ?? 0),
      chavePixPadrao: String(data.chavePixCadastrada ?? ""),
      tipoChavePix: data.tipoChavePixCadastrada ?? "EVP",
    },
  };
}

export async function solicitarSaqueProfessor(
  dados: SolicitacaoSaqueRequest
): Promise<{ resultado: SolicitacaoSaqueResponse }> {
  const professorId = Number(dados.professorId);
  if (!Number.isInteger(professorId) || professorId <= 0) {
    throw new Error("Sua sessão não contém um professor válido. Entre novamente.");
  }

  const response = await apiFetch(`${API_URL}/api/v1/professores/${professorId}/financeiro/saques`, {
    method: "POST",
    body: JSON.stringify({
      valor: dados.valor,
      tipoChavePix: dados.chavePix?.includes("@") ? "EMAIL" : "CPF",
      chavePix: dados.chavePix,
      observacoes: "Solicitação via app móvel Orienta",
    }),
  });
  const data = extrairDadosObjeto<Record<string, any>>(await response.json());

  return {
    resultado: {
      id: data.id,
      sucesso: true,
      mensagem: data.mensagem,
      protocolo: String(data.protocoloSaque ?? data.protocolo ?? ""),
      valorSolicitado: Number(data.valor),
      taxa: Number(data.taxaAplicada ?? 0),
      valorLiquido: Number(data.valorLiquido),
      dataHora: String(data.dataSolicitacao ?? ""),
      previsaoLiberacao: String(data.previsaoLiberacao ?? ""),
      metodo: dados.metodo,
      destino: dados.chavePix ?? "",
      novoSaldoDisponivel: Number(data.novoSaldoDisponivel ?? 0),
    },
  };
}
