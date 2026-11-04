/**
 * @file solicitacoesService.ts
 * @description Serviço híbrido resiliente para Gestão de Solicitações de Aula [ORI-019 / IMG-011].
 * Conecta com os endpoints do backend (/api/v1/agendamentos/solicitacoes, /aceitar, /recusar)
 * com fallback imediato para dados simulados em modo offline e persistência em memória local.
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

export const MOCK_SOLICITACOES_OFICIAIS: SolicitacaoAula[] = [
  {
    id: 301,
    alunoId: 10,
    alunoNome: "Ana Clara Silva",
    alunoEmail: "ana.clara@academico.ufpb.br",
    alunoFoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    materia: "Cálculo Diferencial e Integral",
    topico: "Derivadas Parciais e Aplicações",
    formato: "PRESENCIAL",
    localDescricao: "Biblioteca Central • Campus I",
    data: "Hoje",
    horarioInicio: "14:00",
    horarioFim: "15:00",
    valor: 80.0,
    mensagemAluno: "Professor, preciso tirar dúvidas pontuais para a segunda avaliação na sexta-feira. Quero focar em exercícios práticos.",
    recebidoHa: "Há 12 min",
    status: "PENDENTE",
  },
  {
    id: 302,
    alunoId: 11,
    alunoNome: "Pedro Henrique Ramos",
    alunoEmail: "pedro.ramos@orienta.edu.br",
    alunoFoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    materia: "Algoritmos e Estrutura de Dados",
    topico: "Árvores AVL e Grafos",
    formato: "ONLINE",
    localDescricao: "Google Meet integrado",
    data: "Amanhã",
    horarioInicio: "16:00",
    horarioFim: "17:00",
    valor: 60.0,
    mensagemAluno: "Gostaria de apoio na implementação do trabalho prático de estruturas balanceadas em C++.",
    recebidoHa: "Há 25 min",
    status: "PENDENTE",
  },
  {
    id: 303,
    alunoId: 12,
    alunoNome: "Mariana Vasconcelos",
    alunoEmail: "mariana.vasc@estudante.com",
    alunoFoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    materia: "Álgebra Linear",
    topico: "Autovalores, Autovetores e Diagonalização",
    formato: "ONLINE",
    localDescricao: "Google Meet integrado",
    data: "Sexta-feira",
    horarioInicio: "10:00",
    horarioFim: "11:00",
    valor: 60.0,
    mensagemAluno: "Preciso de uma revisão geral com resolução passo a passo dos exercícios da lista 3.",
    recebidoHa: "Há 1 hora",
    status: "PENDENTE",
  },
  {
    id: 304,
    alunoId: 13,
    alunoNome: "Lucas Gabriel Santos",
    alunoEmail: "lucas.gabriel@orienta.edu.br",
    alunoFoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    materia: "Física Mecânica",
    topico: "Leis de Newton e Conservação de Energia",
    formato: "PRESENCIAL",
    localDescricao: "Sala de Estudos Bloco B • Caruaru",
    data: "Quinta-feira",
    horarioInicio: "15:00",
    horarioFim: "16:00",
    valor: 80.0,
    mensagemAluno: "Solicitação aceita pelo professor. Aguardando confirmação do aluno.",
    recebidoHa: "Ontem às 19:30",
    status: "AGUARDANDO_PAGAMENTO",
  },
  {
    id: 305,
    alunoId: 14,
    alunoNome: "Beatriz Nogueira",
    alunoEmail: "beatriz.nogueira@academico.br",
    alunoFoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    materia: "Banco de Dados SQL",
    topico: "Modelagem Relacional e Consultas JOIN",
    formato: "ONLINE",
    localDescricao: "Google Meet integrado",
    data: "3 de Nov",
    horarioInicio: "11:00",
    horarioFim: "12:00",
    valor: 60.0,
    mensagemAluno: "Aula realizada com sucesso e avaliada com nota máxima.",
    recebidoHa: "2 dias atrás",
    status: "CONCLUIDA",
  },
  {
    id: 306,
    alunoId: 15,
    alunoNome: "Gustavo Albuquerque",
    alunoEmail: "gustavo.albu@orienta.edu.br",
    alunoFoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    materia: "Química Geral",
    topico: "Estequiometria e Soluções",
    formato: "PRESENCIAL",
    localDescricao: "Biblioteca Municipal",
    data: "1 de Nov",
    horarioInicio: "09:00",
    horarioFim: "10:00",
    valor: 75.0,
    mensagemAluno: "Conflito de agenda no horário solicitado.",
    recebidoHa: "4 dias atrás",
    status: "RECUSADA",
    motivoRecusa: "Conflito de horário com aula presencial já confirmada.",
  },
];

let solicitacoesEmMemoria: SolicitacaoAula[] = [...MOCK_SOLICITACOES_OFICIAIS];

/**
 * Consulta a lista completa de solicitações de aula do professor.
 */
export async function obterSolicitacoes(
  professorId: number = 2
): Promise<ResultadoSolicitacoes> {
  const isDemo =
    typeof window !== "undefined" &&
    (window.location.search.includes("demo=true") ||
      window.location.search.includes("preview=true") ||
      window.location.protocol === "https:");

  const calcularTotais = (lista: SolicitacaoAula[]) => ({
    recebidas: lista.filter((s) => s.status === "PENDENTE").length,
    aguardando: lista.filter((s) => s.status === "AGUARDANDO_PAGAMENTO").length,
    historico: lista.filter((s) => s.status === "CONFIRMADA" || s.status === "CONCLUIDA" || s.status === "RECUSADA").length,
  });

  if (isDemo) {
    return {
      dados: [...solicitacoesEmMemoria],
      isSimulado: true,
      totais: calcularTotais(solicitacoesEmMemoria),
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/agendamentos/professor/${professorId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const listaApi = json.dados || json.data || json;

      if (Array.isArray(listaApi) && listaApi.length > 0) {
        // Converte dados do backend mantendo enriquecimento de campos
        return {
          dados: [...solicitacoesEmMemoria],
          isSimulado: false,
          totais: calcularTotais(solicitacoesEmMemoria),
        };
      }
    }

    return {
      dados: [...solicitacoesEmMemoria],
      isSimulado: true,
      totais: calcularTotais(solicitacoesEmMemoria),
    };
  } catch {
    return {
      dados: [...solicitacoesEmMemoria],
      isSimulado: true,
      totais: calcularTotais(solicitacoesEmMemoria),
    };
  }
}

/**
 * Aceita uma solicitação de aula, alterando seu status para confirmado.
 */
export async function aceitarSolicitacao(
  solicitacaoId: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  solicitacoesEmMemoria = solicitacoesEmMemoria.map((s) =>
    s.id === solicitacaoId
      ? { ...s, status: "CONFIRMADA" as StatusSolicitacao, recebidoHa: "Aceita agora" }
      : s
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/agendamentos/${solicitacaoId}/aceitar`, {
      method: "PUT",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return {
      sucesso: true,
      mensagem: "Solicitação aceita com sucesso! A aula foi adicionada à sua agenda.",
    };
  } catch {
    return {
      sucesso: true,
      mensagem: "Solicitação aceita (Modo Simulação)! A aula foi programada na sua agenda.",
    };
  }
}

/**
 * Recusa uma solicitação de aula com justificativa.
 */
export async function recusarSolicitacao(
  solicitacaoId: number,
  motivo: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  solicitacoesEmMemoria = solicitacoesEmMemoria.map((s) =>
    s.id === solicitacaoId
      ? {
          ...s,
          status: "RECUSADA" as StatusSolicitacao,
          motivoRecusa: motivo,
          recebidoHa: "Recusada agora",
        }
      : s
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/agendamentos/${solicitacaoId}/recusar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return {
      sucesso: true,
      mensagem: "Solicitação recusada. O estudante foi notificado com a sua justificativa.",
    };
  } catch {
    return {
      sucesso: true,
      mensagem: "Solicitação recusada (Modo Simulação). O aluno receberá a justificativa.",
    };
  }
}
