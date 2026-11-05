/**
 * @file theme.ts
 * @description Design System oficial do Orienta 2.0 [ORI-000].
 * Centraliza os tokens globais de cores, tipografia, espaçamentos, raios de borda,
 * sombras e z-index, com garantia de compatibilidade entre Expo, React Native e React Native Web.
 * 
 * Fonte de verdade única para o design visual do Orienta 2.0.
 */

import { Platform, ViewStyle, TextStyle } from 'react-native';

export const Theme = {
  /**
   * 🎨 PALETA DE CORES
   * Baseada nas 20 telas de referência visual do Orienta 2.0.
   * Contraste validado segundo WCAG 2.1 AA/AAA para legibilidade e acessibilidade.
   */
  colors: {
    // Cores Primárias (Identidade Institucional Laranja)
    primary: '#FF5A1F',
    primaryDark: '#E04810',
    primaryLight: '#FFF2EB',
    primaryMuted: '#FFEDD5',
    primaryHover: '#FA4E10',
    primaryFocus: '#FF5A1F',

    // Gradientes Principais (arrays de strings para expo-linear-gradient)
    gradientPrimary: ['#FF6B35', '#F74400'] as const,
    gradientWarm: ['#FFA366', '#FF5A1F'] as const,
    gradientNavy: ['#1E293B', '#0F172A'] as const,
    gradientCard: ['#FFFFFF', '#F8FAFC'] as const,

    // Cores Secundárias e Corporativas
    secondary: '#1E293B',
    secondaryDark: '#0F172A',
    secondaryLight: '#334155',
    secondaryMuted: '#64748B',

    // Feedback e Semântica
    success: '#10B981',
    successLight: '#ECFDF5',
    successDark: '#059669',
    successBorder: '#A7F3D0',

    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningDark: '#D97706',
    warningBorder: '#FDE68A',

    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    dangerDark: '#DC2626',
    dangerBorder: '#FECACA',

    info: '#2563EB',
    infoLight: '#EFF6FF',
    infoDark: '#1D4ED8',
    infoBorder: '#BFDBFE',

    // Superfícies, Fundos e Estrutura
    background: '#F8FAFC',
    backgroundPure: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfaceMuted: '#F8FAFC',

    // Bordas e Divisores
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderStrong: '#CBD5E1',
    borderFocus: '#FF5A1F',

    // Tipografia e Texto (Alto Contraste)
    textPrimary: '#0F172A',     // Grafite escuro / Quase preto (> 13:1 contraste em branco)
    textSecondary: '#475569',   // Cinza ardósia para subtítulos (> 5.5:1 contraste em branco)
    textMuted: '#64748B',       // Metadados e rótulos secundários (> 4.5:1 contraste)
    textDisabled: '#94A3B8',    // Textos desativados e placeholders
    textInverse: '#FFFFFF',     // Texto branco para fundos escuros e botões primários
    textPrimaryBrand: '#FF5A1F', // Texto em destaque laranja institucional

    // Campos de Formulário
    inputBackground: '#F8FAFC',
    inputBorder: '#E2E8F0',
    inputBorderFocused: '#FF5A1F',
    inputPlaceholder: '#94A3B8',

    // Transparências e Overlays
    overlay: 'rgba(15, 23, 42, 0.5)',
    overlayLight: 'rgba(15, 23, 42, 0.25)',
    shimmer: 'rgba(255, 255, 255, 0.6)',

    // Retrocompatibilidade com telas pré-refatoração (evita quebra de importações antigas)
    card: '#FFFFFF',
    text: '#0F172A',
    input: '#F8FAFC',
  },

  /**
   * ✍️ TIPOGRAFIA
   * Escala tipográfica harmoniosa com pesos padronizados para iOS, Android e Web.
   */
  typography: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      default: 'System',
    }),
    sizes: {
      xxs: 10,
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      hero: 28,
      display: 32,
    },
    lineHeights: {
      xxs: 14,
      xs: 16,
      sm: 20,
      md: 24,
      lg: 26,
      xl: 28,
      xxl: 32,
      hero: 36,
      display: 40,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semiBold: '600' as const,
      bold: '700' as const,
      extraBold: '800' as const,
    },
    letterSpacings: {
      tighter: -0.8,
      tight: -0.4,
      normal: 0,
      wide: 0.3,
      wider: 0.6,
    },
  },

  /**
   * 📏 ESPAÇAMENTOS (Base 4/8px)
   */
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    huge: 48,
  },

  /**
   * 🔘 RAIOS DE BORDA
   */
  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 9999,
    full: 9999,
  },

  /**
   * ☁️ SOMBRAS
   * Configuração multiplataforma para React Native (iOS shadow + Android elevation)
   * e React Native Web.
   */
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    } as ViewStyle,

    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    } as ViewStyle,

    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 2,
    } as ViewStyle,

    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 3,
    } as ViewStyle,

    lg: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 5,
    } as ViewStyle,

    floating: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    } as ViewStyle,

    primaryGlow: {
      shadowColor: '#FF5A1F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 4,
    } as ViewStyle,
  },

  /**
   * 📐 LAYOUT E LIMITES ESTRUTURAIS
   */
  layout: {
    screenPadding: 16,
    headerHeight: 64,
    tabBarHeight: 68,
    maxContentWidth: 480, // Limite ótimo para renderização centralizada em Web Desktop
  },

  /**
   * 📑 CAMADAS DE ELEVAÇÃO (Z-Index)
   */
  zIndex: {
    base: 0,
    card: 1,
    header: 10,
    dropdown: 25,
    modal: 50,
    toast: 100,
  },
} as const;

/**
 * 🔤 PRESETS TIPOGRÁFICOS PRONTOS PARA USO
 * Auxiliares de estilo padronizados para garantir coerência absoluta.
 */
export const TextStyles = {
  hero: {
    fontSize: Theme.typography.sizes.hero,
    lineHeight: Theme.typography.lineHeights.hero,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    letterSpacing: Theme.typography.letterSpacings.tight,
  } as TextStyle,

  title1: {
    fontSize: Theme.typography.sizes.xxl,
    lineHeight: Theme.typography.lineHeights.xxl,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
  } as TextStyle,

  title2: {
    fontSize: Theme.typography.sizes.xl,
    lineHeight: Theme.typography.lineHeights.xl,
    fontWeight: Theme.typography.weights.semiBold,
    color: Theme.colors.textPrimary,
  } as TextStyle,

  title3: {
    fontSize: Theme.typography.sizes.lg,
    lineHeight: Theme.typography.lineHeights.lg,
    fontWeight: Theme.typography.weights.semiBold,
    color: Theme.colors.textPrimary,
  } as TextStyle,

  body: {
    fontSize: Theme.typography.sizes.md,
    lineHeight: Theme.typography.lineHeights.md,
    fontWeight: Theme.typography.weights.regular,
    color: Theme.colors.textPrimary,
  } as TextStyle,

  bodySecondary: {
    fontSize: Theme.typography.sizes.sm,
    lineHeight: Theme.typography.lineHeights.sm,
    fontWeight: Theme.typography.weights.regular,
    color: Theme.colors.textSecondary,
  } as TextStyle,

  caption: {
    fontSize: Theme.typography.sizes.xs,
    lineHeight: Theme.typography.lineHeights.xs,
    fontWeight: Theme.typography.weights.medium,
    color: Theme.colors.textMuted,
  } as TextStyle,

  button: {
    fontSize: Theme.typography.sizes.md,
    lineHeight: Theme.typography.lineHeights.md,
    fontWeight: Theme.typography.weights.semiBold,
    color: Theme.colors.textInverse,
    textAlign: 'center',
  } as TextStyle,

  badge: {
    fontSize: Theme.typography.sizes.xs,
    lineHeight: Theme.typography.lineHeights.xs,
    fontWeight: Theme.typography.weights.semiBold,
  } as TextStyle,
} as const;

/**
 * Exportação direta do Colors apontando para a fonte única da verdade no Theme,
 * eliminando valores duplicados e mantendo 100% de compatibilidade retroativa.
 */
export const Colors = Theme.colors;

export default Theme;
