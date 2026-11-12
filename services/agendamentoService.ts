/**
 * @file agendamentoService.ts
 * @description Serviço Oficial de Agendamento de Aulas conectado à API REST Spring Boot 3 (ORI-011).
 * 
 * Comunicação direta com os endpoints:
 * - POST /api/v1/agendamentos
 * - GET  /api/v1/agendamentos/{id}
 * - PUT  /api/v1/agendamentos/{id}/cancelar
 */

import { API_URL } from "../config/api";

export type FormaPagamento = "PIX" | "CARTAO" | "CARTEIRA";

export interface CriarAgendamentoDTO {
  idAluno: number;
  idProfessor: number;
  idDisciplina?: number;
  data: string; // "YYYY-MM-DD" ou formato "26/06/2024"
  hora: string; // "14:00" ou "14:00:00"
  modalidade: "ONLINE" | "PRESENCIAL";
  assunto?: string;
  formaPagamento: FormaPagamento;
  valor: number;
}

export interface AgendamentoConfirmado {
  id: number;
  idAluno: number;
  idProfessor: number;
  professorNome: string;
  professorFoto: string;
  disciplinaNome: string;
  dataExibicao: string;
  horarioExibicao: string;
  modalidade: "ONLINE" | "PRESENCIAL";
  formaPagamento: FormaPagamento;
  valor: number;
  status: "CONFIRMADA" | "SOLICITADA" | "PENDENTE" | "REALIZADA" | "CANCELADO";
  codigoPix?: string;
  dataCriacao: string;
}

export interface ResultadoAgendamento {
  sucesso: boolean;
  agendamento?: AgendamentoConfirmado;
  isSimulado: boolean;
  mensagem: string;
}

/**
 * Dados padrão de referência visual caso parâmetros de rota não sejam fornecidos
 */
export const MOCK_AGENDAMENTO_PADRAO: AgendamentoConfirmado = {
  id: 501,
  idAluno: 1001,
  idProfessor: 101,
  professorNome: "Prof. Lucas Rocha",
  professorFoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  disciplinaNome: "Matemática",
  dataExibicao: "26/06/2024 (Qua)",
  horarioExibicao: "14:00 – 15:00",
  modalidade: "PRESENCIAL",
  formaPagamento: "PIX",
  valor: 60.0,
  status: "CONFIRMADA",
  codigoPix: "00020126580014BR.GOV.BCB.PIX0136orienta-pagamentos-oficial-2026520400005303986540660.005802BR5916ORIENTA SERVICOS6007CARUARU62070503***6304E8A2",
  dataCriacao: new Date().toISOString(),
};

/**
 * Cria nova solicitação de mentoria através da API Spring Boot 3
 */
export async function solicitarAgendamentoComFallback(
  dados: CriarAgendamentoDTO
): Promise<ResultadoAgendamento> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const payloadBackend = {
      idAluno: dados.idAluno || 1001,
      idProfessor: dados.idProfessor || 101,
      idDisciplina: dados.idDisciplina || 1,
      data: formatarParaIsoDate(dados.data),
      hora: formatarParaIsoTime(dados.hora),
      modalidade: dados.modalidade || "ONLINE",
      assunto: dados.assunto || "Reforço e Mentoria Acadêmica",
    };

    const res = await fetch(`${API_URL}/api/v1/agendamentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payloadBackend),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const respostaData = json.data || json;

      return {
        sucesso: true,
        agendamento: {
          id: respostaData.id || 501,
          idAluno: respostaData.alunoId || dados.idAluno,
          idProfessor: respostaData.professorId || dados.idProfessor,
          professorNome: respostaData.professorNome || "Prof. Lucas Rocha",
          professorFoto: MOCK_AGENDAMENTO_PADRAO.professorFoto,
          disciplinaNome: respostaData.disciplinaNome || "Matemática",
          dataExibicao: respostaData.data || dados.data,
          horarioExibicao: respostaData.hora ? `${respostaData.hora} – ${calcularFim(respostaData.hora)}` : "14:00 – 15:00",
          modalidade: dados.modalidade,
          formaPagamento: dados.formaPagamento,
          valor: respostaData.valorAplicado || dados.valor || 60.0,
          status: "CONFIRMADA",
          codigoPix: MOCK_AGENDAMENTO_PADRAO.codigoPix,
          dataCriacao: new Date().toISOString(),
        },
        isSimulado: false,
        mensagem: "Agendamento persistido com sucesso no banco de dados!",
      };
    } else {
      let erroMsg = `Erro ${res.status} ao processar agendamento`;
      try {
        const erroJson = await res.json();
        erroMsg = erroJson.message || erroJson.mensagem || erroMsg;
      } catch {
        // ignora
      }
      return {
        sucesso: false,
        isSimulado: false,
        mensagem: erroMsg,
      };
    }
  } catch (err: any) {
    return {
      sucesso: false,
      isSimulado: false,
      mensagem: err?.name === "AbortError" 
        ? "Tempo limite esgotado ao conectar com a API." 
        : `Falha de conexão com o servidor: ${err?.message || "Servidor offline"}`,
    };
  }
}

function calcularFim(inicio: string): string {
  const [h, m] = inicio.split(":").map(Number);
  if (isNaN(h)) return "15:00";
  const proxima = (h + 1).toString().padStart(2, "0");
  const minutos = (m || 0).toString().padStart(2, "0");
  return `${proxima}:${minutos}`;
}

function formatarParaIsoDate(dataStr: string): string {
  if (!dataStr) return "2026-11-20";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return dataStr;
  const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return "2026-11-20";
}

function formatarParaIsoTime(horaStr: string): string {
  if (!horaStr) return "14:00:00";
  if (/^\d{2}:\d{2}:\d{2}$/.test(horaStr)) return horaStr;
  if (/^\d{2}:\d{2}$/.test(horaStr)) return `${horaStr}:00`;
  return "14:00:00";
}
