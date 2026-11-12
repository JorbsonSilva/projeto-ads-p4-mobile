/**
 * @file solicitacoesService.ts
 * @description Serviço Oficial para Gestão de Solicitações de Aula [ORI-019 / IMG-011].
 * Conecta diretamente aos endpoints REST da API Orienta:
 * - GET /api/v1/agendamentos/professor/{professorId}
 * - PUT /api/v1/agendamentos/{id}/aceitar
 * - PUT /api/v1/agendamentos/{id}/recusar
 */

import { API_URL } from "../config/api";

export type StatusSolicitacao = "PENDENTE" | "AGUARDANDO_PAGAMENTO" | "CONFIRMADA" | "RECUSADA" | "CONCLUIDA";
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
  professorId: number = 1002
): Promise<ResultadoSolicitacoes> {
  const calcularTotais = (lista: SolicitacaoAula[]) => ({
    recebidas: lista.filter((s) => s.status === "PENDENTE").length,
    aguardando: lista.filter((s) => s.status === "AGUARDANDO_PAGAMENTO").length,
    historico: lista.filter((s) => s.status === "CONFIRMADA" || s.status === "CONCLUIDA" || s.status === "RECUSADA").length,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_URL}/api/v1/agendamentos/professor/${professorId}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const listaApi = json.dados || json.data || (Array.isArray(json) ? json : []);

      if (Array.isArray(listaApi)) {
        const itensMapeados: SolicitacaoAula[] = listaApi.map((item: any) => {
          const statusRaw = (item.status || "").toUpperCase();
          let statusNormalizado: StatusSolicitacao = "PENDENTE";
          if (statusRaw === "CONFIRMADO") statusNormalizado = "CONFIRMADA";
          else if (statusRaw === "REALIZADA") statusNormalizado = "CONCLUIDA";
          else if (statusRaw === "CANCELADO" || statusRaw === "RECUSADA") statusNormalizado = "RECUSADA";

          return {
            id: item.id,
            alunoId: item.alunoId || 1001,
            alunoNome: item.alunoNome || `Aluno #${item.alunoId}`,
            alunoEmail: item.alunoEmail || `aluno.${item.alunoId}@orienta.edu.br`,
            alunoFoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
            materia: item.disciplinaNome || "Mentoria",
            topico: item.assunto || "Tópicos de estudo",
            formato: (item.modalidade === "PRESENCIAL" ? "PRESENCIAL" : "ONLINE") as FormatoAula,
            localDescricao: item.regiaoOuLocalReferencia || (item.modalidade === "PRESENCIAL" ? "Presencial" : "Online"),
            data: item.data || "Hoje",
            horarioInicio: item.hora ? item.hora.substring(0, 5) : "14:00",
            horarioFim: item.hora ? calcularFim(item.hora.substring(0, 5)) : "15:00",
            valor: item.valorAplicado || 60.0,
            mensagemAluno: item.assunto || "Solicitação de mentoria acadêmica",
            recebidoHa: "Via plataforma",
            status: statusNormalizado,
            motivoRecusa: item.justificativaCancelamento,
          };
        });

        return {
          dados: itensMapeados,
          isSimulado: false,
          totais: calcularTotais(itensMapeados),
        };
      }
    }
  } catch (err) {
    console.warn("Falha ao obter solicitações da API:", err);
  }

  return {
    dados: [],
    isSimulado: false,
    totais: { recebidas: 0, aguardando: 0, historico: 0 },
  };
}

/**
 * Aceita uma solicitação de aula através do endpoint REST da API
 */
export async function aceitarSolicitacao(
  solicitacaoId: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/agendamentos/${solicitacaoId}/aceitar`, {
      method: "PUT",
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      return {
        sucesso: true,
        mensagem: "Solicitação aceita com sucesso no banco de dados!",
      };
    }
    return {
      sucesso: false,
      mensagem: "Erro ao aceitar a solicitação no servidor.",
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Falha de conexão com a API: ${err?.message || "Servidor offline"}`,
    };
  }
}

/**
 * Recusa uma solicitação de aula com justificativa através do endpoint REST da API
 */
export async function recusarSolicitacao(
  solicitacaoId: number,
  motivo: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/agendamentos/${solicitacaoId}/recusar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ motivo }),
    });

    if (res.ok) {
      return {
        sucesso: true,
        mensagem: "Solicitação recusada com justificativa persistida.",
      };
    }
    return {
      sucesso: false,
      mensagem: "Erro ao recusar a solicitação no servidor.",
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Falha de conexão com a API: ${err?.message || "Servidor offline"}`,
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
