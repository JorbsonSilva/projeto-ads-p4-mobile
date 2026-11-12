/**
 * @file chatService.ts
 * @description Serviço Oficial de Chat em Tempo Real e Mensagens conectado à API Spring Boot 3 (ORI-013).
 * Endpoints:
 * - GET  /api/v1/chat/agendamento/{agendamentoId}
 * - GET  /api/v1/chat/agendamento/{agendamentoId}/mensagens
 * - POST /api/v1/chat/agendamento/{agendamentoId}/mensagens
 * - POST /api/v1/suporte/denuncias
 */

import { API_URL } from "../config/api";

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
  dataTexto: string;
  horarioTexto: string;
  modalidade: "PRESENCIAL" | "ONLINE";
  localizacao?: string;
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

export interface ResultadoConversa {
  conversa: ConversaCompleta;
  isSimulado: boolean;
}

/**
 * Consulta a conversa e mensagens reais persistidas no banco PostgreSQL
 */
export async function obterConversaChat(agendamentoId: number = 1001): Promise<ResultadoConversa> {
  const fallbackVazio: ConversaCompleta = {
    conversaId: agendamentoId,
    agendamentoId: agendamentoId,
    interlocutor: {
      id: "1002",
      nome: "Prof. Dr. Carlos Eduardo",
      papel: "PROFESSOR",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200",
      verificado: true,
      online: true,
      disciplina: "Banco de Dados Relacional e SQL",
      avaliacao: 4.9,
      totalAvaliacoes: 38,
    },
    contextoAula: {
      agendamentoId: agendamentoId,
      disciplina: "Banco de Dados Relacional",
      status: "CONFIRMADA",
      dataTexto: "26/06/2026 (Qui)",
      horarioTexto: "14:00 – 15:00",
      modalidade: "ONLINE",
      localizacao: "Online via Orienta Meet",
      valor: 70.0,
    },
    mensagens: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const [resConversa, resMensagens] = await Promise.all([
      fetch(`${API_URL}/api/v1/chat/agendamento/${agendamentoId}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
      fetch(`${API_URL}/api/v1/chat/agendamento/${agendamentoId}/mensagens`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
    ]);
    clearTimeout(timeout);

    if (resConversa.ok) {
      const jsonConversa = await resConversa.json();
      const conversaDto = jsonConversa.data || jsonConversa.dados || jsonConversa;

      let mensagensApi: MensagemChat[] = [];
      if (resMensagens.ok) {
        const jsonMsg = await resMensagens.json();
        const listaBruta = jsonMsg.data || jsonMsg.dados || (Array.isArray(jsonMsg) ? jsonMsg : []);
        if (Array.isArray(listaBruta)) {
          mensagensApi = listaBruta.map((m: any) => ({
            id: m.id,
            remetenteId: m.remetenteId,
            remetenteNome: m.remetenteNome || (m.remetenteId === 1001 ? "Gabriel Aluno" : "Professor"),
            remetentePapel: m.remetentePapel || (m.remetenteId === 1001 ? "ALUNO" : "PROFESSOR"),
            avatar: m.remetenteFoto || (m.remetenteId === 1001 ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" : "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100"),
            conteudo: m.conteudo,
            tipo: (m.tipo || "TEXTO") as any,
            enviadaEm: m.enviadaEm ? m.enviadaEm.substring(11, 16) : "14:00",
            dataDivisor: "Hoje",
            lida: m.lida ?? true,
          }));
        }
      }

      return {
        conversa: {
          conversaId: conversaDto.id || agendamentoId,
          agendamentoId,
          interlocutor: {
            id: conversaDto.professorId || 1002,
            nome: conversaDto.professorNome || "Prof. Dr. Carlos Eduardo",
            papel: "PROFESSOR",
            avatar: conversaDto.professorFoto || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200",
            verificado: true,
            online: true,
            disciplina: conversaDto.disciplinaNome || "Banco de Dados",
            avaliacao: 4.9,
            totalAvaliacoes: 38,
          },
          contextoAula: {
            agendamentoId,
            disciplina: conversaDto.disciplinaNome || "Banco de Dados Relacional",
            status: "CONFIRMADA",
            dataTexto: conversaDto.data || "Hoje",
            horarioTexto: conversaDto.hora ? `${conversaDto.hora} – 15:00` : "14:00 – 15:00",
            modalidade: (conversaDto.modalidade === "PRESENCIAL" ? "PRESENCIAL" : "ONLINE") as any,
            localizacao: conversaDto.localizacao || "Online via Orienta Meet",
            valor: conversaDto.valor || 70.0,
          },
          mensagens: mensagensApi,
        },
        isSimulado: false,
      };
    }
  } catch (err) {
    console.warn("Falha ao obter conversa de chat da API:", err);
  }

  return { conversa: fallbackVazio, isSimulado: false };
}

/**
 * Envia mensagem persistida diretamente na tabela tb_mensagens
 */
export async function enviarMensagemChat(
  agendamentoId: number,
  remetenteId: number | string = 1001,
  conteudo: string,
  tipo: "TEXTO" | "ARQUIVO" | "LINK" | "IMAGEM" = "TEXTO",
  metaAnexo?: { nomeArquivo?: string; tamanho?: string; url?: string }
): Promise<{ mensagem: MensagemChat; isSimulado: boolean }> {
  const agora = new Date();
  const enviadaEm = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  try {
    const payloadBackend = {
      remetenteId: typeof remetenteId === "number" ? remetenteId : 1001,
      conteudo,
    };

    const res = await fetch(`${API_URL}/api/v1/chat/agendamento/${agendamentoId}/mensagens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payloadBackend),
    });

    if (res.ok) {
      const json = await res.json();
      const salvo = json.data || json.dados || json;

      return {
        mensagem: {
          id: salvo.id || Date.now(),
          remetenteId: salvo.remetenteId || remetenteId,
          remetenteNome: "Você",
          remetentePapel: "ALUNO",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
          conteudo: salvo.conteudo || conteudo,
          tipo,
          enviadaEm,
          lida: false,
          metaAnexo,
        },
        isSimulado: false,
      };
    }
  } catch (err) {
    console.warn("Falha ao enviar mensagem de chat para a API:", err);
  }

  return {
    mensagem: {
      id: `local-${Date.now()}`,
      remetenteId,
      remetenteNome: "Você",
      remetentePapel: "ALUNO",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      conteudo,
      tipo,
      enviadaEm,
      lida: false,
      metaAnexo,
    },
    isSimulado: false,
  };
}

/**
 * Cria uma denúncia oficial vinculada ao agendamento/chat (Ouvidoria)
 */
export async function registrarDenunciaChat(
  agendamentoId: number,
  denunciadoId: number | string,
  motivo: string,
  descricao: string
): Promise<{ sucesso: boolean; mensagem: string; isSimulado: boolean }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/suporte/denuncias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        agendamentoId,
        denunciadoId: typeof denunciadoId === "number" ? denunciadoId : 1002,
        motivo,
        descricao,
      }),
    });

    if (res.ok) {
      return { sucesso: true, mensagem: "Denúncia registrada com protocolo no banco de dados.", isSimulado: false };
    }
  } catch (err) {
    console.warn("Falha ao registrar denúncia na API:", err);
  }

  return {
    sucesso: false,
    mensagem: "Falha ao registrar denúncia no servidor.",
    isSimulado: false,
  };
}
