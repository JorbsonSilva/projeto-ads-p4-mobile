/**
 * @file Badge.tsx
 * @description Componente universal de Badge para o Orienta 2.0 [ORI-003].
 * Utilizado para exibir status, contadores, tags informativas e validações (ex: verificado, online).
 * Suporta 6 variantes semânticas, 2 tamanhos, ponto indicador (dot) e ícones incorporados.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Theme } from '../../constants/theme';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** Texto ou elemento do Badge */
  children?: React.ReactNode;
  /** Rótulo textual alternativo para simplificar chamadas declarativas */
  label?: string;
  /** Variante semântica visual */
  variant?: BadgeVariant;
  /** Tamanho do badge */
  size?: BadgeSize;
  /** Exibe um pequeno ponto indicador de status colorido */
  dot?: boolean;
  /** Ícone opcional exibido antes do texto */
  icon?: React.ReactNode;
  /** Estilo adicional para o contêiner */
  style?: StyleProp<ViewStyle>;
  /** Estilo adicional para o texto interno */
  textStyle?: StyleProp<TextStyle>;
  /** Rótulo para acessibilidade */
  accessibilityLabel?: string;
  /** Identificador para testes automatizados */
  testID?: string;
}

interface VariantColorConfig {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}

const variantColors: Record<BadgeVariant, VariantColorConfig> = {
  primary: {
    backgroundColor: Theme.colors.primaryLight,
    textColor: Theme.colors.primary,
    borderColor: Theme.colors.primaryMuted,
    dotColor: Theme.colors.primary,
  },
  success: {
    backgroundColor: Theme.colors.successLight,
    textColor: Theme.colors.successDark,
    borderColor: Theme.colors.successBorder,
    dotColor: Theme.colors.success,
  },
  warning: {
    backgroundColor: Theme.colors.warningLight,
    textColor: Theme.colors.warningDark,
    borderColor: Theme.colors.warningBorder,
    dotColor: Theme.colors.warning,
  },
  danger: {
    backgroundColor: Theme.colors.dangerLight,
    textColor: Theme.colors.dangerDark,
    borderColor: Theme.colors.dangerBorder,
    dotColor: Theme.colors.danger,
  },
  info: {
    backgroundColor: Theme.colors.infoLight,
    textColor: Theme.colors.info,
    borderColor: Theme.colors.infoBorder,
    dotColor: Theme.colors.info,
  },
  neutral: {
    backgroundColor: Theme.colors.surfaceSubtle,
    textColor: Theme.colors.textSecondary,
    borderColor: Theme.colors.border,
    dotColor: Theme.colors.textMuted,
  },
};

export function Badge({
  children,
  label,
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: BadgeProps) {
  const content = label || children;
  const colors = variantColors[variant] || variantColors.neutral;

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.baseBadge,
        isSmall ? styles.sizeSm : styles.sizeMd,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || (typeof content === 'string' ? content : undefined)}
      testID={testID}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            isSmall ? styles.dotSm : styles.dotMd,
            { backgroundColor: colors.dotColor },
          ]}
        />
      )}

      {icon && <View style={styles.iconContainer}>{icon}</View>}

      {typeof content === 'string' ? (
        <Text
          style={[
            styles.baseText,
            isSmall ? styles.textSm : styles.textMd,
            { color: colors.textColor },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {content}
        </Text>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  baseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sizeSm: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 4,
  },
  sizeMd: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 5,
  },
  dot: {
    borderRadius: Theme.borderRadius.full,
  },
  dotSm: {
    width: 6,
    height: 6,
  },
  dotMd: {
    width: 7,
    height: 7,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: Theme.typography.weights.semiBold,
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textMd: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default Badge;
