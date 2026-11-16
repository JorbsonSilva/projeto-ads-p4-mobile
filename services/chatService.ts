/**
 * @file chatService.ts
 * @description Serviço Oficial de Chat em Tempo Real e Mensagens conectado à API Spring Boot 3 (ORI-013).
 * Endpoints:
 * - GET  /api/v1/chat/agendamento/{agendamentoId}
 * - GET  /api/v1/chat/agendamento/{agendamentoId}/mensagens
 * - POST /api/v1/chat/agendamento/{agendamentoId}/mensagens
 * - POST /api/v1/suporte/denuncias
 */

import { agendamentoApi, chatApi, suporteApi } from "../config/api";
import type { StatusAgendamento } from "../types/agendamento";

export interface InterlocutorChat {
  id: string | number;
  nome: string;
  papel: "PROFESSOR" | "ALUNO";
  avatar?: string;
  verificado?: boolean;
  online?: boolean;
  disciplina: string;
  avaliacao?: number;
  totalAvaliacoes?: number;
}

export interface ContextoAulaChat {
  agendamentoId: number;
  disciplina: string;
  status: StatusAgendamento;
  dataTexto: string;
  horarioTexto: string;
  modalidade?: "PRESENCIAL" | "ONLINE";
  localizacao?: string;
  linkMeet?: string;
  valor?: number;
}

export interface MensagemChat {
  id: string | number;
  remetenteId: string | number;
  remetenteNome: string;
  remetentePapel: "PROFESSOR" | "ALUNO" | "SISTEMA";
  avatar?: string;
  conteudo: string;
  tipo: "TEXTO" | "SISTEMA" | "ARQUIVO" | "LINK" | "IMAGEM";
  enviadaEm: string;
  dataDivisor?: string;
  lida: boolean;
  metaAnexo?: {
    nomeArquivo?: string;
    tamanho?: string;
    url?: string;
  };
}

export interface ConversaCompleta {
  conversaId: number;
  agendamentoId: number;
  interlocutor: InterlocutorChat;
  contextoAula: ContextoAulaChat;
  mensagens: MensagemChat[];
}

export interface ConversaInboxItem {
  conversaId: number;
  agendamentoId: number;
  interlocutor: Pick<InterlocutorChat, "id" | "nome" | "papel" | "avatar">;
  disciplina?: string;
  ultimaMensagem?: string;
  dataHoraUltimaMensagem?: string;
  mensagensNaoLidas: number;
}

export async function listarConversasChat(usuarioId: number): Promise<ConversaInboxItem[]> {
  const resposta = await chatApi.listarConversas(usuarioId);
  if (!resposta.success || !Array.isArray(resposta.data)) {
    throw new Error(resposta.message || "Não foi possível carregar a caixa de entrada.");
  }

  return resposta.data.map((item: any) => {
    const interlocutorValido =
      (item.papelInterlocutor === "ALUNO" || item.papelInterlocutor === "PROFESSOR") &&
      item.interlocutorId &&
      item.nomeInterlocutor;
    if (
      !Number.isSafeInteger(item.id) ||
      !Number.isSafeInteger(item.agendamentoId) ||
      !interlocutorValido
    ) {
      throw new Error("A API retornou uma conversa sem os dados necessários.");
    }

    return {
      conversaId: item.id,
      agendamentoId: item.agendamentoId,
      interlocutor: {
        id: item.interlocutorId,
        nome: item.nomeInterlocutor,
        papel: item.papelInterlocutor,
        avatar: item.fotoUrlInterlocutor || undefined,
      },
      disciplina: item.disciplinaNome || undefined,
      ultimaMensagem: item.ultimaMensagem || undefined,
      dataHoraUltimaMensagem: item.dataHoraUltimaMensagem || undefined,
      mensagensNaoLidas: Number.isSafeInteger(item.mensagensNaoLidas)
        ? item.mensagensNaoLidas
        : 0,
    };
  });
}

/**
 * Consulta a conversa e mensagens reais persistidas no banco PostgreSQL
 */
export async function obterConversaChat(
  agendamentoId: number,
  usuarioId: number
): Promise<ConversaCompleta> {
  const [conversaResposta, mensagensResposta, agendamentoResposta] = await Promise.all([
    chatApi.obterConversa(agendamentoId, usuarioId),
    chatApi.listarMensagens(agendamentoId, usuarioId),
    agendamentoApi.buscarPorId(agendamentoId),
  ]);

  if (!conversaResposta.success || !conversaResposta.data) {
    throw new Error(conversaResposta.message || "Não foi possível carregar a conversa.");
  }
  if (!mensagensResposta.success || !Array.isArray(mensagensResposta.data)) {
    throw new Error(mensagensResposta.message || "A API retornou um formato inválido para as mensagens.");
  }
  if (!agendamentoResposta.success || !agendamentoResposta.data) {
    throw new Error(agendamentoResposta.message || "Não foi possível carregar o agendamento.");
  }

  const conversaDto = conversaResposta.data;
  const agendamento = agendamentoResposta.data;
  const usuarioEhProfessor = agendamento.professorId === usuarioId;
  const interlocutorNome = conversaDto.nomeInterlocutor ||
    (usuarioEhProfessor ? agendamento.alunoNome : agendamento.professorNome);
  const interlocutorId = conversaDto.interlocutorId ??
    (usuarioEhProfessor ? agendamento.alunoId : agendamento.professorId);
  if (!conversaDto.id || !interlocutorId || !interlocutorNome) {
    throw new Error("A API não retornou os dados necessários para identificar esta conversa.");
  }
  const disciplina = agendamento.saberNome || agendamento.assunto || "";
  const [ano, mes, dia] = agendamento.data.split("-");
  const dataTexto = ano && mes && dia ? `${dia}/${mes}/${ano}` : agendamento.data;

  return {
    conversaId: conversaDto.id,
    agendamentoId,
    interlocutor: {
      id: interlocutorId,
      nome: interlocutorNome,
      papel: usuarioEhProfessor ? "ALUNO" : "PROFESSOR",
      avatar: conversaDto.fotoUrlInterlocutor || undefined,
      disciplina,
    },
    contextoAula: {
      agendamentoId,
      disciplina,
      status: agendamento.status,
      dataTexto,
      horarioTexto: agendamento.hora.slice(0, 5),
      modalidade: agendamento.modalidade === "ONLINE" || agendamento.modalidade === "PRESENCIAL"
        ? agendamento.modalidade
        : undefined,
      valor: agendamento.valorAplicado,
    },
    mensagens: mensagensResposta.data.map((mensagem: any) => ({
      id: mensagem.id,
      remetenteId: mensagem.remetenteId,
      remetenteNome: mensagem.remetenteNome || "Participante",
      remetentePapel: mensagem.remetentePapel === "ALUNO" || mensagem.remetentePapel === "PROFESSOR"
        ? mensagem.remetentePapel
        : "SISTEMA",
      avatar: mensagem.remetenteFotoUrl || undefined,
      conteudo: mensagem.conteudo,
      tipo: ["TEXTO", "SISTEMA", "ARQUIVO", "LINK", "IMAGEM"].includes(mensagem.tipo)
        ? mensagem.tipo
        : "TEXTO",
      enviadaEm: mensagem.enviadaEm || "",
      lida: Boolean(mensagem.lida),
      metaAnexo: mensagem.anexoUrl
        ? {
            nomeArquivo: mensagem.nomeArquivo,
            tamanho: mensagem.tamanhoArquivo,
            url: mensagem.anexoUrl,
          }
        : undefined,
    })),
  };
}

/**
 * Envia mensagem persistida diretamente na tabela tb_mensagens
 */
export async function enviarMensagemChat(
  agendamentoId: number,
  remetenteId: number,
  conteudo: string,
  tipo: "TEXTO" | "ARQUIVO" | "LINK" | "IMAGEM" = "TEXTO",
  metaAnexo?: { nomeArquivo?: string; tamanho?: string; url?: string }
): Promise<MensagemChat> {
  if (tipo !== "TEXTO" || metaAnexo) {
    throw new Error("O backend ainda não oferece envio de anexos.");
  }

  const resposta = await chatApi.enviarMensagem(agendamentoId, remetenteId, conteudo);
  if (!resposta.success || !resposta.data) {
    throw new Error(resposta.message || "A API não confirmou o envio da mensagem.");
  }
  const mensagem = resposta.data;
  return {
    id: mensagem.id,
    remetenteId: mensagem.remetenteId,
    remetenteNome: mensagem.remetenteNome || "Você",
    remetentePapel: mensagem.remetentePapel === "ALUNO" || mensagem.remetentePapel === "PROFESSOR"
      ? mensagem.remetentePapel
      : "SISTEMA",
    avatar: mensagem.remetenteFotoUrl || undefined,
    conteudo: mensagem.conteudo,
    tipo: mensagem.tipo === "TEXTO" ? "TEXTO" : "SISTEMA",
    enviadaEm: mensagem.enviadaEm || "",
    lida: Boolean(mensagem.lida),
  };
}

/**
 * Cria uma denúncia oficial vinculada ao agendamento/chat (Ouvidoria)
 */
export async function registrarDenunciaChat(
  agendamentoId: number,
  denuncianteId: number,
  denunciadoId: number,
  motivo: string,
  descricao: string
): Promise<{ sucesso: true; mensagem: string }> {
  const resposta = await suporteApi.enviarDenuncia(denuncianteId, {
    denunciadoId,
    agendamentoId,
    motivo,
    descricao,
  });
  if (!resposta.success || !resposta.data?.protocolo) {
    throw new Error(resposta.message || "A API não retornou o protocolo da denúncia.");
  }
  return {
    sucesso: true,
    mensagem: `Denúncia registrada. Protocolo: ${resposta.data.protocolo}`,
  };
}
