/**
 * @file colors.ts
 * @description Centraliza o dicionário de cores semânticas e tokens de design do aplicativo Orienta.
 * Em conformidade com o Design System e Especificação de Telas — Orienta 2.0.1 (PROP-BKL-01).
 * Garante contraste WCAG 2.1 AA e alvos de toque mínimos de 44x44dp.
 */

export const Colors = {
  /** Cor primária utilizada para destaques e botões de chamada secundária (Laranja institucional) */
  primary: "#FF6B1A",
  /** Primária escura para estados pressed / hover acessíveis */
  primaryDark: "#D95207",
  /** Cor secundária utilizada para fundos de destaque e seletores ativos (Azul corporativo) */
  secondary: "#0057B8",
  /** Secundária escura para texto de alto contraste */
  secondaryDark: "#003E85",

  /** Cor de fundo padrão de telas para manter o visual limpo e minimalista */
  background: "#F8FAFC",
  /** Fundo branco puro para cartões elevados e superfícies */
  card: "#FFFFFF",
  /** Cor padrão para títulos e textos de ênfase máxima (contraste > 7:1) */
  text: "#0F172A",
  /** Cor para textos secundários e legendas de apoio */
  textMuted: "#64748B",
  /** Cor de preenchimento para campos de entrada de texto */
  input: "#F1F5F9",
  /** Cor cinza suave para bordas, divisores visuais e contornos de cartões */
  border: "#E2E8F0",

  /** Paleta Semafórica de Estados (Design System 2.0.1) */
  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  error: "#DC2626",
  errorLight: "#FEE2E2",
  info: "#0284C7",
  infoLight: "#E0F2FE",

  /** Cores Específicas dos 3 Canais de Conversa (Especificação 2.0.1 § 3) */
  canal1Mensagens: "#0057B8",
  canal2Assistente: "#7C3AED",
  canal2AssistenteLight: "#EDE9FE",
  canal3Suporte: "#D97706",
  canal3SuporteLight: "#FFFBEB",

  /** Status do Agendamento e Aulas */
  statusPendente: "#D97706",
  statusConfirmado: "#0284C7",
  statusEmAndamento: "#DC2626",
  statusAguardando: "#7C3AED",
  statusRealizada: "#16A34A",
  statusCancelada: "#64748B",
  statusRecusada: "#94A3B8",
};

/**
 * Tokens de Dimensões e Acessibilidade (Design System 2.0.1)
 */
export const DesignTokens = {
  /** Alvo mínimo de toque para botões e links navegáveis (WCAG 2.1 AA) */
  minTouchTarget: 44,
  /** Raio de borda padrão para cards e modais */
  borderRadiusCard: 14,
  /** Raio de borda para botões e chips interativos */
  borderRadiusButton: 10,
  /** Espaçamento interno padrão de containers */
  containerPadding: 16,
};
