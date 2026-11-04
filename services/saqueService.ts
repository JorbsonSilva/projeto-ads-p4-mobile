/**
 * @file saqueService.ts
 * @description Serviço híbrido resiliente para Saque e Carteira do Professor (ORI-014).
 * Segue a referência visual Tela de Solicitação de Saque do Professor.jpeg (IMG-010).
 * Conecta-se às APIs financeiras com fallback offline imediato e seguro.
 */

import { api } from "../config/api";

export type MetodoRecebimento = "PIX" | "TED" | "CARTEIRA";

export interface ResumoFinanceiroProfessor {
  saldoDisponivel: number;
  valorPendente: number;
  ganhosMes: number;
  saquesRealizados: number;
  totalRecebido: number;
  chavePixPadrao: string;
  tipoChavePix: "CPF" | "EMAIL" | "ALEATORIA" | "TELEFONE";
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
  isSimulado: boolean;
}

// ==============================================================================
// BASE DE DADOS MOCKADA OFICIAL (Fiel à imagem IMG-010)
// ==============================================================================
export const MOCK_RESUMO_SAQUE_OFICIAL: ResumoFinanceiroProfessor = {
  saldoDisponivel: 2480.0,
  valorPendente: 230.0,
  ganhosMes: 3250.0,
  saquesRealizados: 1850.0,
  totalRecebido: 8740.0,
  chavePixPadrao: "prof.lucas@orienta.com.br",
  tipoChavePix: "EMAIL",
  bancoPadrao: {
    banco: "001 - Banco do Brasil",
    agencia: "1234-5",
    conta: "98765-4",
  },
};

let mockResumoAtual: ResumoFinanceiroProfessor = JSON.parse(JSON.stringify(MOCK_RESUMO_SAQUE_OFICIAL));

/**
 * Obtém o resumo financeiro para saque do professor
 */
export async function obterResumoSaqueProfessor(professorId: number = 101): Promise<ResultadoResumoFinanceiro> {
  try {
    const res = await api.get(`/api/v1/professores/${professorId}/financeiro/resumo`, {
      timeout: 3000,
    });
    if (res.data && res.data.dados) {
      return { resumo: res.data.dados, isSimulado: false };
    }
    throw new Error("Dados indisponíveis na API");
  } catch {
    return { resumo: mockResumoAtual, isSimulado: true };
  }
}

/**
 * Executa a solicitação de saque
 */
export async function solicitarSaqueProfessor(
  dados: SolicitacaoSaqueRequest
): Promise<{ resultado: SolicitacaoSaqueResponse; isSimulado: boolean }> {
  const agora = new Date();
  const protocolo = `SQ-${agora.getFullYear()}${(agora.getMonth() + 1).toString().padStart(2, "0")}${agora.getDate().toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const taxa = 0.0; // Plataforma sem taxas no Pix
  const valorLiquido = dados.valor - taxa;

  try {
    const res = await api.post(`/api/v1/professores/${dados.professorId}/financeiro/saques`, dados, {
      timeout: 3000,
    });
    if (res.data && res.data.dados) {
      return { resultado: res.data.dados, isSimulado: false };
    }
    throw new Error("Erro na API");
  } catch {
    // Processamento simulado local
    const novoSaldo = Math.max(0, mockResumoAtual.saldoDisponivel - dados.valor);
    mockResumoAtual.saldoDisponivel = novoSaldo;
    mockResumoAtual.saquesRealizados += dados.valor;

    const respostaLocal: SolicitacaoSaqueResponse = {
      id: `saque-${Date.now()}`,
      sucesso: true,
      mensagem: "Solicitação de saque enviada com sucesso!",
      protocolo,
      valorSolicitado: dados.valor,
      taxa,
      valorLiquido,
      dataHora: agora.toLocaleString("pt-BR"),
      previsaoLiberacao: dados.metodo === "PIX" ? "Em até 15 minutos (Instantâneo)" : "Em até 1 dia útil",
      metodo: dados.metodo,
      destino:
        dados.metodo === "PIX"
          ? dados.chavePix || mockResumoAtual.chavePixPadrao
          : dados.metodo === "TED"
          ? "Banco do Brasil (Ag 1234-5 / CC 98765-4)"
          : "Carteira Digital Orienta",
      novoSaldoDisponivel: novoSaldo,
    };

    return { resultado: respostaLocal, isSimulado: true };
  }
}
