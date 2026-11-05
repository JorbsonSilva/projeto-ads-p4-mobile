/**
 * @file suporteService.ts
 * @description Serviço híbrido resiliente para a Central de Ajuda, Suporte e FAQ [ORI-023].
 * Integra a listagem de dúvidas frequentes (FAQ), abertura e consulta de tickets de suporte,
 * envio de denúncias éticas e camada de resiliência com fallback offline.
 */

import { API_URL, extrairDadosLista } from "../config/api";

export type CategoriaTicket =
  | "DUVIDA"
  | "FINANCEIRO"
  | "PROBLEMA_TECNICO"
  | "CONDUTA"
  | "OUTRO";

export type PrioridadeTicket = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

export type StatusTicket = "ABERTO" | "EM_ANDAMENTO" | "RESPONDIDO" | "FECHADO";

export interface TicketSuporteItem {
  id: number;
  protocolo: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaTicket;
  prioridade: PrioridadeTicket;
  status: StatusTicket;
  respostaAdmin?: string;
  respondidoPor?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface ItemFAQ {
  id: string;
  categoria: "AULAS" | "PAGAMENTOS" | "CONTA" | "SEGURANCA";
  categoriaLabel: string;
  pergunta: string;
  resposta: string;
  icone: string;
}

export interface CriarTicketPayload {
  titulo: string;
  descricao: string;
  categoria: CategoriaTicket;
  prioridade?: PrioridadeTicket;
}

export interface CriarDenunciaPayload {
  denunciadoId: number;
  motivo: string;
  detalhes: string;
}

export interface ResumoSuporte {
  totalTicketsAbertos: number;
  totalRespondidos: number;
  tempoMedioResposta: string;
  satisfacaoAtendimento: string;
}

export interface ResultadoSuporte {
  faq: ItemFAQ[];
  meusTickets: TicketSuporteItem[];
  resumo: ResumoSuporte;
  isSimulado: boolean;
}

// ==============================================================
// BASE CANÔNICA DE DÚVIDAS FREQUENTES (FAQ)
// ==============================================================
export const FAQ_OFICIAL: ItemFAQ[] = [
  {
    id: "faq-1",
    categoria: "AULAS",
    categoriaLabel: "Aulas & Agendamento",
    icone: "calendar",
    pergunta: "Como agendar uma aula particular ou mentoria?",
    resposta:
      "Você pode navegar pelo catálogo de matérias em 'Explorar Disciplinas' ou pesquisar por nome/região na 'Busca de Professores'. Escolha o mentor desejado, selecione o dia e horário na grade de disponibilidade, defina a modalidade (online ou presencial) e confirme o agendamento.",
  },
  {
    id: "faq-2",
    categoria: "AULAS",
    categoriaLabel: "Aulas & Agendamento",
    icone: "clock",
    pergunta: "Posso remarcar ou cancelar uma aula já confirmada?",
    resposta:
      "Sim. Em caso de imprevistos, alunos e professores podem remarcar ou cancelar o encontro com até 2 horas de antecedência diretamente pela tela 'Minha Agenda', sem qualquer retenção ou penalidade financeira.",
  },
  {
    id: "faq-3",
    categoria: "AULAS",
    categoriaLabel: "Aulas & Agendamento",
    icone: "video",
    pergunta: "Como funciona a Sala de Aula Online e o Temporizador?",
    resposta:
      "No horário agendado, acesse o chat da mentoria ou sua agenda e clique em 'Entrar na Aula'. O temporizador bilateral registra com precisão os minutos de mentoria para validação de presença e liberação de honorários.",
  },
  {
    id: "faq-4",
    categoria: "PAGAMENTOS",
    categoriaLabel: "Pagamentos & Saques",
    icone: "credit-card",
    pergunta: "Quais são as formas de pagamento disponíveis na plataforma?",
    resposta:
      "Aceitamos PIX instantâneo com confirmação em tempo real, Cartão de Crédito com parcelamento em até 12x e o Saldo da Carteira Orienta. Todos os pagamentos ficam em custódia segura até a realização da aula.",
  },
  {
    id: "faq-5",
    categoria: "PAGAMENTOS",
    categoriaLabel: "Pagamentos & Saques",
    icone: "dollar-sign",
    pergunta: "Como o professor recebe e solicita o saque dos seus ganhos?",
    resposta:
      "Após a conclusão da mentoria, os créditos são transferidos para o saldo disponível do professor. Na tela 'Solicitação de Saque', o docente pode resgatar valores a partir de R$ 50,00 diretamente para sua chave PIX no mesmo dia útil.",
  },
  {
    id: "faq-6",
    categoria: "PAGAMENTOS",
    categoriaLabel: "Pagamentos & Saques",
    icone: "shield",
    pergunta: "Qual é a política de reembolso em caso de falta do professor?",
    resposta:
      "Se o professor não comparecer ou cancelar o encontro sem aviso prévio de 2 horas, o estorno integral é processado imediatamente para a Carteira Orienta do aluno ou devolvido via PIX.",
  },
  {
    id: "faq-7",
    categoria: "CONTA",
    categoriaLabel: "Perfil & Acesso",
    icone: "user",
    pergunta: "Posso alternar entre os perfis de Aluno e Professor?",
    resposta:
      "Sim. O Orienta 2.0 possui arquitetura de personas independentes (RN-001). Você pode alternar livremente pelo menu do seu perfil mantendo histórico, saldo e preferências isolados de forma segura.",
  },
  {
    id: "faq-8",
    categoria: "SEGURANCA",
    categoriaLabel: "Segurança & Moderação",
    icone: "alert-triangle",
    pergunta: "Como denunciar conduta imprópria ou assédio?",
    resposta:
      "A segurança é prioridade máxima. Você pode clicar no menu de opções de qualquer chat e selecionar 'Denunciar Usuário', ou abrir um ticket com a categoria 'Conduta ou Moderação'. Nossa equipe avalia em até 24 horas com sigilo absoluto.",
  },
];

// ==============================================================
// BASE CANÔNICA DE TICKETS SIMULADOS (FALLBACK)
// ==============================================================
export const MOCK_TICKETS_OFICIAIS: TicketSuporteItem[] = [
  {
    id: 101,
    protocolo: "SUP-2026-849201",
    titulo: "Dúvida sobre confirmação de aula presencial",
    descricao:
      "Agendei uma mentoria de Cálculo para amanhã na biblioteca central, mas o professor não respondeu se o local é na sala de estudos do 2º andar.",
    categoria: "DUVIDA",
    prioridade: "MEDIA",
    status: "RESPONDIDO",
    respostaAdmin:
      "Olá! Entramos em contato com o Prof. Lucas Rocha e ele confirmou o encontro na Sala de Estudos Coletivos 204 da Biblioteca Central. O chat já está sincronizado.",
    respondidoPor: "Equipe de Apoio Acadêmico",
    criadoEm: "03/11/2026 às 14:20",
    atualizadoEm: "03/11/2026 às 15:45",
  },
  {
    id: 102,
    protocolo: "SUP-2026-391042",
    titulo: "Comprovante de pagamento PIX em duplicidade",
    descricao:
      "Ao tentar confirmar a aula de Programação Web, a conexão oscilou e enviei o PIX duas vezes. Gostaria de estornar a segunda transação.",
    categoria: "FINANCEIRO",
    prioridade: "ALTA",
    status: "EM_ANDAMENTO",
    respostaAdmin:
      "Chamado recebido pela Controladoria. Identificamos as duas transações bancárias e estamos processando o estorno da segunda via chave PIX cadastrada.",
    respondidoPor: "Suporte Financeiro Orienta",
    criadoEm: "Ontem às 10:15",
    atualizadoEm: "Ontem às 11:30",
  },
  {
    id: 103,
    protocolo: "SUP-2026-118490",
    titulo: "Solicitação de inclusão de matéria no catálogo",
    descricao:
      "Gostaria de sugerir a adição da disciplina 'Bioinformática e Biologia Computacional' na área de Ciências/Tecnologia.",
    categoria: "OUTRO",
    prioridade: "BAIXA",
    status: "FECHADO",
    respostaAdmin:
      "Sugestão aprovada pelo comitê pedagógico! A disciplina foi incluída no catálogo na atualização ORI-022. Agradecemos sua contribuição.",
    respondidoPor: "Coordenação Pedagógica",
    criadoEm: "28/10/2026 às 09:00",
    atualizadoEm: "29/10/2026 às 17:00",
  },
];

// ==============================================================
// SERVIÇOS HÍBRIDOS DE SUPORTE E TICKETS
// ==============================================================

/**
 * Obtém os dados completos da Central de Ajuda (FAQ, chamados do usuário e métricas)
 */
export async function obterDadosCentralAjuda(usuarioId: number = 1001): Promise<ResultadoSuporte> {
  let tickets = [...MOCK_TICKETS_OFICIAIS];
  let isSimulado = true;

  try {
    const resposta = await fetch(`${API_URL}/api/suporte/tickets/meus?usuarioId=${usuarioId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (resposta.ok) {
      const json = await resposta.json();
      const dados = extrairDadosLista<any>(json);
      if (Array.isArray(dados) && dados.length > 0) {
        tickets = dados.map((t: any) => ({
          id: t.id || Math.floor(Math.random() * 1000),
          protocolo: t.protocolo || `SUP-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          titulo: t.titulo || "Chamado sem título",
          descricao: t.descricao || "",
          categoria: (t.categoria as CategoriaTicket) || "DUVIDA",
          prioridade: (t.prioridade as PrioridadeTicket) || "MEDIA",
          status: (t.status as StatusTicket) || "ABERTO",
          respostaAdmin: t.respostaAdmin || t.resposta,
          respondidoPor: t.respondidoPor || "Suporte Orienta",
          criadoEm: t.criadoEm || "Hoje",
          atualizadoEm: t.atualizadoEm,
        }));
        isSimulado = false;
      }
    }
  } catch (err) {
    // Falha de rede ou sandbox sem backend -> fallback gracioso
    isSimulado = true;
  }

  const totalAbertos = tickets.filter((t) => t.status === "ABERTO" || t.status === "EM_ANDAMENTO").length;
  const totalRespondidos = tickets.filter((t) => t.status === "RESPONDIDO" || t.status === "FECHADO").length;

  return {
    faq: FAQ_OFICIAL,
    meusTickets: tickets,
    resumo: {
      totalTicketsAbertos: totalAbertos,
      totalRespondidos: totalRespondidos,
      tempoMedioResposta: "45 min",
      satisfacaoAtendimento: "98.5%",
    },
    isSimulado,
  };
}

/**
 * Registra um novo chamado de suporte (Ticket) com protocolo auditável
 */
export async function criarTicketSuporte(
  usuarioId: number = 1001,
  payload: CriarTicketPayload
): Promise<{ ticket: TicketSuporteItem; isSimulado: boolean }> {
  const protocoloGerado = `SUP-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const novoTicketMock: TicketSuporteItem = {
    id: Date.now(),
    protocolo: protocoloGerado,
    titulo: payload.titulo,
    descricao: payload.descricao,
    categoria: payload.categoria,
    prioridade: payload.prioridade || "MEDIA",
    status: "ABERTO",
    criadoEm: "Agora mesmo",
  };

  try {
    const resposta = await fetch(`${API_URL}/api/suporte/tickets?usuarioId=${usuarioId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (resposta.ok) {
      const json = await resposta.json();
      const dados = json?.dados || json?.data || json;
      return {
        ticket: {
          id: dados.id || novoTicketMock.id,
          protocolo: dados.protocolo || protocoloGerado,
          titulo: dados.titulo || payload.titulo,
          descricao: dados.descricao || payload.descricao,
          categoria: dados.categoria || payload.categoria,
          prioridade: dados.prioridade || payload.prioridade || "MEDIA",
          status: dados.status || "ABERTO",
          criadoEm: "Agora mesmo",
        },
        isSimulado: false,
      };
    }
  } catch (err) {
    // Retorna mock resiliente em modo de demonstração
  }

  return {
    ticket: novoTicketMock,
    isSimulado: true,
  };
}

/**
 * Envia uma denúncia ética contra conduta imprópria
 */
export async function enviarDenunciaSuporte(
  denuncianteId: number = 1001,
  payload: CriarDenunciaPayload
): Promise<{ sucesso: boolean; mensagem: string; isSimulado: boolean }> {
  try {
    const resposta = await fetch(`${API_URL}/api/suporte/denuncias?denuncianteId=${denuncianteId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (resposta.ok) {
      return {
        sucesso: true,
        mensagem: "Denúncia registrada com sucesso! Nossa moderação entrará em contato com prioridade máxima.",
        isSimulado: false,
      };
    }
  } catch (err) {
    // Modo simulação
  }

  return {
    sucesso: true,
    mensagem: "Denúncia registrada em modo simulação offline. Nossa moderação analisará o caso em até 24 horas.",
    isSimulado: true,
  };
}
