/**
 * @file notificacoesService.ts
 * @description Serviço Oficial para a Central de Notificações conectado à API Spring Boot 3 [ORI-016 / IMG-006].
 * Endpoints:
 * - GET   /api/v1/notificacoes?usuarioId={id}
 * - GET   /api/v1/notificacoes/nao-lidas/count?usuarioId={id}
 * - PATCH /api/v1/notificacoes/{id}/lida?usuarioId={id}
 * - PATCH /api/v1/notificacoes/marcar-todas-lidas?usuarioId={id}
 */

import { API_URL } from "../config/api";

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
  isSimulado: boolean;
}

/**
 * Consulta a lista de notificações do usuário a partir da tabela tb_notificacoes
 */
export async function obterNotificacoes(
  usuarioId: number = 1001,
  categoriaFiltro: CategoriaNotificacao = "TODAS"
): Promise<ResultadoNotificacoes> {
  let notificacoesMapeadas: NotificacaoItem[] = [];

  try {
    const res = await fetch(`${API_URL}/api/v1/notificacoes?usuarioId=${usuarioId}`, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const json = await res.json();
      const listaApi = json.data || (Array.isArray(json) ? json : []);

      if (Array.isArray(listaApi)) {
        notificacoesMapeadas = listaApi.map((item: any) => {
          const tipo = (item.tipo || "SISTEMA").toUpperCase() as TipoNotificacao;
          let categoria: CategoriaNotificacao = "SISTEMA";
          let icone = "bell";
          let corIcone = "#3B82F6";
          let bgIcone = "#EFF6FF";
          let rotaDestino = "/(tabs)";

          if (tipo === "AGENDAMENTO" || tipo === "AVALIACAO") {
            categoria = "AULAS";
            icone = "calendar";
            corIcone = "#10B981";
            bgIcone = "#ECFDF5";
            rotaDestino = "/agenda";
          } else if (tipo === "CHAT") {
            categoria = "MENSAGENS";
            icone = "message-circle";
            corIcone = "#8B5CF6";
            bgIcone = "#F5F3FF";
            rotaDestino = "/chat";
          } else if (tipo === "PAGAMENTO" || tipo === "SAQUE") {
            categoria = "PAGAMENTOS";
            icone = "credit-card";
            corIcone = "#F59E0B";
            bgIcone = "#FFFBEB";
            rotaDestino = "/painel-ganhos";
          }

          return {
            id: item.id,
            usuarioId: item.usuarioId || usuarioId,
            titulo: item.titulo || "Notificação Orienta",
            mensagem: item.mensagem || "",
            tipo,
            lida: item.lida ?? false,
            dataHora: item.dataHora || new Date().toISOString(),
            tempoRelativo: "Recentemente",
            agrupamento: "Hoje" as GrupoTemporal,
            categoria,
            icone,
            iconeTipo: "feather",
            corIcone,
            bgIcone,
            rotaDestino,
            referenciaId: item.referenciaId,
          };
        });
      }
    }
  } catch (err) {
    console.warn("Falha ao obter notificações da API:", err);
  }

  if (categoriaFiltro !== "TODAS") {
    notificacoesMapeadas = notificacoesMapeadas.filter((n) => n.categoria === categoriaFiltro);
  }

  const totalNaoLidas = notificacoesMapeadas.filter((n) => !n.lida).length;

  return {
    notificacoes: notificacoesMapeadas,
    totalNaoLidas,
    isSimulado: false,
  };
}

/**
 * Marca uma notificação específica como lida no servidor
 */
export async function marcarComoLida(
  notificacaoId: number,
  usuarioId: number = 1001
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/notificacoes/${notificacaoId}/lida?usuarioId=${usuarioId}`, {
      method: "PATCH",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Marca todas as notificações do usuário como lidas
 */
export async function marcarTodasComoLidas(usuarioId: number = 1001): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/notificacoes/marcar-todas-lidas?usuarioId=${usuarioId}`, {
      method: "PATCH",
    });
    return res.ok;
  } catch {
    return false;
  }
}
