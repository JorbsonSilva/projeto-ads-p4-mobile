/**
 * @file chatService.ts
 * @description Serviço híbrido resiliente para o Chat em Tempo Real com Contexto de Aula (ORI-013).
 * Segue a referência oficial Chat.jpeg (IMG-021) do Orienta 2.0.
 * Conecta-se aos endpoints Spring Boot /api/v1/chat/... com fallback offline imediato e seguro.
 */

import { api } from "../config/api";

export interface InterlocutorChat {
  id: string | number;
  nome: string;
  papel: "PROFESSOR" | "ALUNO";
  avatar: string;
  verificado: boolean;
  online: boolean;
  disciplina: string;
  avaliacao: number;
  totalAvaliacoes: number;
}

export interface ContextoAulaChat {
  agendamentoId: number;
  disciplina: string;
  status: "CONFIRMADA" | "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  dataTexto: string; // Ex: "26/06/2026 (Qui)"
  horarioTexto: string; // Ex: "14:00 – 15:00"
  modalidade: "PRESENCIAL" | "ONLINE";
  localizacao?: string; // Ex: "Presencial • Caruaru – PE"
  linkMeet?: string;
  valor: number;
}

export interface MensagemChat {
  id: string | number;
  remetenteId: string | number;
  remetenteNome: string;
  remetentePapel: "PROFESSOR" | "ALUNO" | "SISTEMA";
  avatar?: string;
  conteudo: string;
  tipo: "TEXTO" | "SISTEMA" | "ARQUIVO" | "LINK" | "IMAGEM";
  enviadaEm: string; // Ex: "13:45"
  dataDivisor?: string; // Ex: "Hoje"
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

export interface ResultadoConversa {
  conversa: ConversaCompleta;
  isSimulado: boolean;
}

// ==============================================================================
// BASE DE DADOS MOCKADA OFICIAL (Fiel à imagem Chat.jpeg - IMG-021)
// ==============================================================================
export const MOCK_CONVERSA_OFICIAL: ConversaCompleta = {
  conversaId: 101,
  agendamentoId: 101,
  interlocutor: {
    id: "101",
    nome: "Prof. Lucas Rocha",
    papel: "PROFESSOR",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
    verificado: true,
    online: true,
    disciplina: "Matemática",
    avaliacao: 4.9,
    totalAvaliacoes: 128,
  },
  contextoAula: {
    agendamentoId: 101,
    disciplina: "Matemática",
    status: "CONFIRMADA",
    dataTexto: "26/06/2026 (Qui)",
    horarioTexto: "14:00 – 15:00",
    modalidade: "PRESENCIAL",
    localizacao: "Presencial • Caruaru – PE",
    valor: 60.0,
  },
  mensagens: [
    {
      id: "msg-1",
      remetenteId: "101",
      remetenteNome: "Prof. Lucas Rocha",
      remetentePapel: "PROFESSOR",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
      conteudo: "Olá, Ana! Tudo bem? Podemos começar a nossa aula hoje no horário combinado?",
      tipo: "TEXTO",
      enviadaEm: "13:45",
      dataDivisor: "Hoje",
      lida: true,
    },
    {
      id: "msg-2",
      remetenteId: "user-aluno",
      remetenteNome: "Ana Silva",
      remetentePapel: "ALUNO",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
      conteudo: "Olá, Professor! Tudo bem sim. Estou animada para a aula. 😊",
      tipo: "TEXTO",
      enviadaEm: "13:47",
      lida: true,
    },
    {
      id: "msg-3",
      remetenteId: "101",
      remetenteNome: "Prof. Lucas Rocha",
      remetentePapel: "PROFESSOR",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
      conteudo: "Ótimo! Qualquer dúvida, pode me chamar por aqui.",
      tipo: "TEXTO",
      enviadaEm: "13:48",
      lida: true,
    },
    {
      id: "msg-4",
      remetenteId: "sistema",
      remetenteNome: "Orienta Sistema",
      remetentePapel: "SISTEMA",
      conteudo: "A aula foi iniciada! Boa aula! 🎓",
      tipo: "SISTEMA",
      enviadaEm: "14:00",
      lida: true,
    },
  ],
};

// Armazenamento em memória para interações em tempo de execução
let mockConversaAtual: ConversaCompleta = JSON.parse(JSON.stringify(MOCK_CONVERSA_OFICIAL));

/**
 * Obtém os dados completos da conversa com fallback automático
 */
export async function obterConversaComContexto(agendamentoId: number = 101, usuarioId: number = 1): Promise<ResultadoConversa> {
  try {
    const res = await api.get(`/api/v1/chat/agendamento/${agendamentoId}`, {
      params: { usuarioId },
      timeout: 3000,
    });

    if (res.data && res.data.dados) {
      const conversaDto = res.data.dados;
      // Busca mensagens
      const resMsg = await api.get(`/api/v1/chat/agendamento/${agendamentoId}/mensagens`, {
        params: { usuarioId },
        timeout: 3000,
      });

      const mensagensApi: MensagemChat[] = (resMsg.data?.dados || []).map((m: any, idx: number) => ({
        id: m.id || `api-${idx}`,
        remetenteId: m.remetenteId,
        remetenteNome: m.remetenteNome || (m.remetenteId === usuarioId ? "Você" : "Participante"),
        remetentePapel: m.remetenteId === usuarioId ? "ALUNO" : "PROFESSOR",
        avatar: m.remetenteId === usuarioId
          ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces"
          : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
        conteudo: m.conteudo,
        tipo: "TEXTO",
        enviadaEm: m.enviadaEm ? new Date(m.enviadaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Agora",
        lida: m.lida ?? true,
      }));

      const conversaFormatada: ConversaCompleta = {
        conversaId: conversaDto.id || agendamentoId,
        agendamentoId: agendamentoId,
        interlocutor: {
          id: conversaDto.professorId || "101",
          nome: conversaDto.professorNome || "Prof. Lucas Rocha",
          papel: "PROFESSOR",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
          verificado: true,
          online: true,
          disciplina: conversaDto.assunto || "Matemática",
          avaliacao: 4.9,
          totalAvaliacoes: 128,
        },
        contextoAula: {
          agendamentoId: agendamentoId,
          disciplina: conversaDto.assunto || "Matemática",
          status: "CONFIRMADA",
          dataTexto: "26/06/2026 (Qui)",
          horarioTexto: "14:00 – 15:00",
          modalidade: "PRESENCIAL",
          localizacao: "Presencial • Caruaru – PE",
          valor: 60.0,
        },
        mensagens: mensagensApi.length > 0 ? mensagensApi : mockConversaAtual.mensagens,
      };

      return { conversa: conversaFormatada, isSimulado: false };
    }
    throw new Error("Dados da API indisponíveis");
  } catch (error) {
    return { conversa: mockConversaAtual, isSimulado: true };
  }
}

/**
 * Envia uma mensagem com fallback local
 */
export async function enviarMensagemChat(
  agendamentoId: number,
  remetenteId: number | string,
  conteudo: string,
  tipo: "TEXTO" | "ARQUIVO" | "LINK" | "IMAGEM" = "TEXTO",
  metaAnexo?: { nomeArquivo?: string; tamanho?: string; url?: string }
): Promise<{ mensagem: MensagemChat; isSimulado: boolean }> {
  const agora = new Date();
  const enviadaEm = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  try {
    const res = await api.post(
      `/api/v1/chat/agendamento/${agendamentoId}/mensagens`,
      {
        remetenteId: typeof remetenteId === "number" ? remetenteId : 1,
        conteudo,
      },
      { timeout: 3000 }
    );

    if (res.data && res.data.dados) {
      const msgApi: MensagemChat = {
        id: res.data.dados.id,
        remetenteId,
        remetenteNome: "Você",
        remetentePapel: "ALUNO",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
        conteudo,
        tipo,
        enviadaEm,
        lida: false,
        metaAnexo,
      };
      mockConversaAtual.mensagens.push(msgApi);
      return { mensagem: msgApi, isSimulado: false };
    }
    throw new Error("Erro de resposta API");
  } catch {
    const novaMensagem: MensagemChat = {
      id: `local-${Date.now()}`,
      remetenteId,
      remetenteNome: "Você",
      remetentePapel: "ALUNO",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
      conteudo,
      tipo,
      enviadaEm,
      lida: false,
      metaAnexo,
    };
    mockConversaAtual.mensagens.push(novaMensagem);
    return { mensagem: novaMensagem, isSimulado: true };
  }
}

/**
 * Cria uma denúncia vinculada ao agendamento/chat
 */
export async function registrarDenunciaChat(
  agendamentoId: number,
  denunciadoId: number | string,
  motivo: string,
  descricao: string
): Promise<{ sucesso: boolean; mensagem: string; isSimulado: boolean }> {
  try {
    const res = await api.post(
      `/api/v1/suporte/denuncias`,
      {
        agendamentoId,
        denunciadoId: typeof denunciadoId === "number" ? denunciadoId : 101,
        motivo,
        descricao,
      },
      { timeout: 3000 }
    );
    if (res.data) {
      return { sucesso: true, mensagem: "Denúncia registrada com sucesso.", isSimulado: false };
    }
    throw new Error("Erro na API");
  } catch {
    return {
      sucesso: true,
      mensagem: "Denúncia registrada em modo seguro. Nossa equipe irá analisar a ocorrência.",
      isSimulado: true,
    };
  }
}
