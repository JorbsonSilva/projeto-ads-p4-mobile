/**
 * Serviço da central de notificações conectado à API autenticada.
 */

import { API_URL, apiFetch, extrairDadosLista } from "../config/api";

export type CategoriaNotificacao =
  | "TODAS"
  | "AULAS"
  | "MENSAGENS"
  | "PAGAMENTOS"
  | "SISTEMA";

export type TipoNotificacao =
  | "AGENDAMENTO"
  | "CHAT"
  | "SUPORTE"
  | "SISTEMA"
  | "AVALIACAO"
  | "PAGAMENTO"
  | "SAQUE";

export type GrupoTemporal = "Hoje" | "Ontem" | "Últimos 7 dias" | "Anteriores";

export interface NotificacaoItem {
  id: number;
  usuarioId?: number;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  lida: boolean;
  dataHora: string;
  tempoRelativo: string;
  agrupamento: GrupoTemporal;
  categoria: CategoriaNotificacao;
  icone: string;
  iconeTipo: "feather" | "font-awesome" | "ionicons" | "material";
  corIcone: string;
  bgIcone: string;
  rotaDestino?: string;
  referenciaId?: number;
}

export interface ResultadoNotificacoes {
  notificacoes: NotificacaoItem[];
  totalNaoLidas: number;
}

interface NotificacaoApi {
  id: number;
  usuarioId: number;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  lida: boolean;
  dataHora: string;
  referenciaId?: number;
}

function agruparData(valor: string): { agrupamento: GrupoTemporal; tempoRelativo: string } {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new Error("A API retornou uma data inválida para uma notificação.");
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dia = new Date(data);
  dia.setHours(0, 0, 0, 0);
  const dias = Math.floor((hoje.getTime() - dia.getTime()) / 86400000);

  if (dias <= 0) {
    return {
      agrupamento: "Hoje",
      tempoRelativo: data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  }
  if (dias === 1) return { agrupamento: "Ontem", tempoRelativo: "Ontem" };
  if (dias < 7) return { agrupamento: "Últimos 7 dias", tempoRelativo: `${dias} dias atrás` };
  return {
    agrupamento: "Anteriores",
    tempoRelativo: data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  };
}

function mapearNotificacao(item: NotificacaoApi): NotificacaoItem {
  const categorias: Record<TipoNotificacao, CategoriaNotificacao> = {
    AGENDAMENTO: "AULAS",
    AVALIACAO: "AULAS",
    CHAT: "MENSAGENS",
    PAGAMENTO: "PAGAMENTOS",
    SAQUE: "PAGAMENTOS",
    SUPORTE: "SISTEMA",
    SISTEMA: "SISTEMA",
  };
  const icones: Record<TipoNotificacao, string> = {
    AGENDAMENTO: "calendar",
    AVALIACAO: "star",
    CHAT: "message-circle",
    PAGAMENTO: "credit-card",
    SAQUE: "credit-card",
    SUPORTE: "help-circle",
    SISTEMA: "bell",
  };
  const cores: Record<CategoriaNotificacao, { cor: string; fundo: string }> = {
    TODAS: { cor: "#3B82F6", fundo: "#EFF6FF" },
    AULAS: { cor: "#10B981", fundo: "#ECFDF5" },
    MENSAGENS: { cor: "#8B5CF6", fundo: "#F5F3FF" },
    PAGAMENTOS: { cor: "#F59E0B", fundo: "#FFFBEB" },
    SISTEMA: { cor: "#3B82F6", fundo: "#EFF6FF" },
  };
  const categoria = categorias[item.tipo];
  const cor = cores[categoria];
  const destinos: Partial<Record<TipoNotificacao, string>> = {
    AGENDAMENTO: "/(tabs)/agenda",
    AVALIACAO: "/(tabs)/agenda",
    CHAT: "/chat",
    PAGAMENTO: "/painel-ganhos",
    SAQUE: "/painel-ganhos",
  };

  return {
    ...item,
    categoria,
    icone: icones[item.tipo],
    iconeTipo: "feather",
    corIcone: cor.cor,
    bgIcone: cor.fundo,
    rotaDestino: destinos[item.tipo],
    ...agruparData(item.dataHora),
  };
}

export async function obterNotificacoes(
  usuarioId: number,
  categoriaFiltro: CategoriaNotificacao = "TODAS",
): Promise<ResultadoNotificacoes> {
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error("Não foi possível identificar o usuário da sessão.");
  }

  const response = await apiFetch(
    `${API_URL}/api/v1/notificacoes?usuarioId=${usuarioId}`,
  );
  const registros = extrairDadosLista<NotificacaoApi>(await response.json());
  const notificacoes = registros.map(mapearNotificacao);
  const totalNaoLidas = notificacoes.filter((item) => !item.lida).length;

  return {
    notificacoes: categoriaFiltro === "TODAS"
      ? notificacoes
      : notificacoes.filter((item) => item.categoria === categoriaFiltro),
    totalNaoLidas,
  };
}

export async function marcarComoLida(
  notificacaoId: number,
  usuarioId: number,
): Promise<void> {
  await apiFetch(
    `${API_URL}/api/v1/notificacoes/${notificacaoId}/lida?usuarioId=${usuarioId}`,
    { method: "PATCH" },
  );
}

export async function marcarTodasComoLidas(usuarioId: number): Promise<void> {
  await apiFetch(
    `${API_URL}/api/v1/notificacoes/marcar-todas-lidas?usuarioId=${usuarioId}`,
    { method: "PATCH" },
  );
}
