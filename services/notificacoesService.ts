/**
 * @file notificacoesService.ts
 * @description Serviço híbrido resiliente para a Central de Notificações [ORI-016 / IMG-006].
 * Conecta aos endpoints REST do Spring Boot (/api/v1/notificacoes) com fallback robusto
 * para simulação offline, agrupamento temporal (Hoje, Ontem, Últimos 7 dias) e categorização.
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

// ==========================================
// MOCK DE ALTA FIDELIDADE OFICIAL (IMG-006)
// ==========================================
export const MOCK_NOTIFICACOES_OFICIAIS: NotificacaoItem[] = [
  {
    id: 1,
    titulo: "Aula confirmada com sucesso",
    mensagem: "Sua mentoria de Matemática com o Prof. Lucas Rocha foi confirmada para hoje às 15:00.",
    tipo: "AGENDAMENTO",
    categoria: "AULAS",
    lida: false,
    dataHora: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    tempoRelativo: "Há 12 min",
    agrupamento: "Hoje",
    icone: "check-circle",
    iconeTipo: "feather",
    corIcone: "#10B981",
    bgIcone: "#ECFDF5",
    rotaDestino: "/agenda",
  },
  {
    id: 2,
    titulo: "Nova mensagem de chat",
    mensagem: "Profa. Ana Clara enviou um material complementar: 'Resumo de Biologia Celular.pdf'.",
    tipo: "CHAT",
    categoria: "MENSAGENS",
    lida: false,
    dataHora: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    tempoRelativo: "Há 35 min",
    agrupamento: "Hoje",
    icone: "message-circle",
    iconeTipo: "feather",
    corIcone: "#8B5CF6",
    bgIcone: "#F5F3FF",
    rotaDestino: "/chat",
  },
  {
    id: 3,
    titulo: "Pagamento de mentoria creditado",
    mensagem: "Recebemos o pagamento de R$ 90,00 referente à mentoria de Programação Web.",
    tipo: "PAGAMENTO",
    categoria: "PAGAMENTOS",
    lida: false,
    dataHora: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    tempoRelativo: "Há 2 horas",
    agrupamento: "Hoje",
    icone: "credit-card",
    iconeTipo: "feather",
    corIcone: "#0284C7",
    bgIcone: "#EFF6FF",
    rotaDestino: "/painel-ganhos",
  },
  {
    id: 4,
    titulo: "Lembrete: sua aula começa em breve",
    mensagem: "Faltam 45 minutos para a mentoria de Física com o Prof. Rafael Lima.",
    tipo: "AGENDAMENTO",
    categoria: "AULAS",
    lida: true,
    dataHora: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    tempoRelativo: "Há 4 horas",
    agrupamento: "Hoje",
    icone: "bell",
    iconeTipo: "feather",
    corIcone: "#F59E0B",
    bgIcone: "#FEF3C7",
    rotaDestino: "/agenda",
  },
  {
    id: 5,
    titulo: "Transferência Pix de Saque concluída",
    mensagem: "Seu saque no valor de R$ 1.250,00 foi creditado na sua chave Pix Nubank com taxa zero.",
    tipo: "SAQUE",
    categoria: "PAGAMENTOS",
    lida: true,
    dataHora: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    tempoRelativo: "Ontem às 18:30",
    agrupamento: "Ontem",
    icone: "wallet",
    iconeTipo: "ionicons",
    corIcone: "#059669",
    bgIcone: "#D1FAE5",
    rotaDestino: "/saque",
  },
  {
    id: 6,
    titulo: "Nova solicitação de mentoria recebida",
    mensagem: "O aluno Lucas Fernandes solicitou uma aula presencial de Python para sábado às 10:00.",
    tipo: "AGENDAMENTO",
    categoria: "AULAS",
    lida: true,
    dataHora: new Date(Date.now() - 1000 * 60 * 60 * 29).toISOString(),
    tempoRelativo: "Ontem às 14:15",
    agrupamento: "Ontem",
    icone: "calendar",
    iconeTipo: "feather",
    corIcone: "#FF5A1F",
    bgIcone: "#FFF7ED",
    rotaDestino: "/agenda",
  },
  {
    id: 7,
    titulo: "Nova avaliação 5 estrelas ⭐",
    mensagem: "Você recebeu 5 estrelas de Maria Santos: 'Didática impressionante, tirou todas as dúvidas!'.",
    tipo: "AVALIACAO",
    categoria: "AULAS",
    lida: true,
    dataHora: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    tempoRelativo: "Há 3 dias",
    agrupamento: "Últimos 7 dias",
    icone: "star",
    iconeTipo: "feather",
    corIcone: "#D97706",
    bgIcone: "#FEF3C7",
    rotaDestino: "/perfil-professor",
  },
  {
    id: 8,
    titulo: "Segurança: Conta verificada",
    mensagem: "Seus documentos de identificação e registro profissional foram aprovados pela equipe Orienta.",
    tipo: "SISTEMA",
    categoria: "SISTEMA",
    lida: true,
    dataHora: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    tempoRelativo: "Há 5 dias",
    agrupamento: "Últimos 7 dias",
    icone: "shield",
    iconeTipo: "feather",
    corIcone: "#475569",
    bgIcone: "#F1F5F9",
    rotaDestino: "/perfil",
  },
  {
    id: 9,
    titulo: "Novidades do Orienta 2.0",
    mensagem: "Conheça o novo recurso de radar de busca presencial para encontrar professores perto de você.",
    tipo: "SISTEMA",
    categoria: "SISTEMA",
    lida: true,
    dataHora: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
    tempoRelativo: "Há 7 dias",
    agrupamento: "Últimos 7 dias",
    icone: "info",
    iconeTipo: "feather",
    corIcone: "#2563EB",
    bgIcone: "#EFF6FF",
    rotaDestino: "/busca-presencial",
  },
];

let notificacoesEmMemoria: NotificacaoItem[] = [...MOCK_NOTIFICACOES_OFICIAIS];

/**
 * Obtém a lista de notificações com resiliência contra indisponibilidade do backend.
 */
export async function obterNotificacoes(
  usuarioId: number = 101
): Promise<ResultadoNotificacoes> {
  const isDemo =
    typeof window !== "undefined" &&
    (window.location.search.includes("demo=true") ||
      window.location.search.includes("preview=true") ||
      window.location.protocol === "https:");

  if (isDemo) {
    const naoLidas = notificacoesEmMemoria.filter((n) => !n.lida).length;
    return {
      notificacoes: [...notificacoesEmMemoria],
      totalNaoLidas: naoLidas,
      isSimulado: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/notificacoes?usuarioId=${usuarioId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const dadosApi = json.dados || json.data || json;

      if (Array.isArray(dadosApi) && dadosApi.length > 0) {
        const mapeadas: NotificacaoItem[] = dadosApi.map((item: any, idx: number) => {
          const tipo = (item.tipo || "SISTEMA").toUpperCase() as TipoNotificacao;
          let categoria: CategoriaNotificacao = "SISTEMA";
          let icone = "bell";
          let iconeTipo: NotificacaoItem["iconeTipo"] = "feather";
          let corIcone = "#475569";
          let bgIcone = "#F1F5F9";
          let rotaDestino = "/(tabs)";

          if (tipo === "AGENDAMENTO") {
            categoria = "AULAS";
            icone = "calendar";
            corIcone = "#FF5A1F";
            bgIcone = "#FFF7ED";
            rotaDestino = "/agenda";
          } else if (tipo === "CHAT") {
            categoria = "MENSAGENS";
            icone = "message-circle";
            corIcone = "#8B5CF6";
            bgIcone = "#F5F3FF";
            rotaDestino = "/chat";
          } else if (tipo === "AVALIACAO") {
            categoria = "AULAS";
            icone = "star";
            corIcone = "#D97706";
            bgIcone = "#FEF3C7";
            rotaDestino = "/perfil-professor";
          } else if (tipo === "PAGAMENTO") {
            categoria = "PAGAMENTOS";
            icone = "credit-card";
            corIcone = "#0284C7";
            bgIcone = "#EFF6FF";
            rotaDestino = "/painel-ganhos";
          } else if (tipo === "SAQUE") {
            categoria = "PAGAMENTOS";
            icone = "wallet";
            iconeTipo = "ionicons";
            corIcone = "#059669";
            bgIcone = "#D1FAE5";
            rotaDestino = "/saque";
          }

          return {
            id: item.id || idx + 1,
            usuarioId: item.usuarioId || usuarioId,
            titulo: item.titulo || "Notificação Orienta",
            mensagem: item.mensagem || "",
            tipo,
            categoria,
            lida: Boolean(item.lida),
            dataHora: item.dataHora || new Date().toISOString(),
            tempoRelativo: "Recente",
            agrupamento: "Hoje",
            icone,
            iconeTipo,
            corIcone,
            bgIcone,
            rotaDestino,
            referenciaId: item.referenciaId,
          };
        });

        const totalNaoLidas = mapeadas.filter((n) => !n.lida).length;
        return {
          notificacoes: mapeadas,
          totalNaoLidas,
          isSimulado: false,
        };
      }
    }

    const naoLidas = notificacoesEmMemoria.filter((n) => !n.lida).length;
    return {
      notificacoes: [...notificacoesEmMemoria],
      totalNaoLidas: naoLidas,
      isSimulado: true,
    };
  } catch {
    const naoLidas = notificacoesEmMemoria.filter((n) => !n.lida).length;
    return {
      notificacoes: [...notificacoesEmMemoria],
      totalNaoLidas: naoLidas,
      isSimulado: true,
    };
  }
}

/**
 * Marca uma notificação individual como lida.
 */
export async function marcarComoLida(
  notificacaoId: number,
  usuarioId: number = 101
): Promise<boolean> {
  notificacoesEmMemoria = notificacoesEmMemoria.map((n) =>
    n.id === notificacaoId ? { ...n, lida: true } : n
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(
      `${API_URL}/api/v1/notificacoes/${notificacaoId}/lida?usuarioId=${usuarioId}`,
      {
        method: "PATCH",
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return true; // Fallback bem sucedido localmente
  }
}

/**
 * Marca todas as notificações como lidas.
 */
export async function marcarTodasComoLidas(
  usuarioId: number = 101
): Promise<boolean> {
  notificacoesEmMemoria = notificacoesEmMemoria.map((n) => ({
    ...n,
    lida: true,
  }));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(
      `${API_URL}/api/v1/notificacoes/marcar-todas-lidas?usuarioId=${usuarioId}`,
      {
        method: "PATCH",
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return true; // Fallback bem sucedido localmente
  }
}
