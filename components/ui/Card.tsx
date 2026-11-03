/**
 * @file Card.tsx
 * @description Componente universal de Card para o Orienta 2.0 [ORI-003].
 * Implementa contêiner modular para listagens, indicadores, perfis e navegação,
 * com suporte a 4 variantes visuais, níveis customizáveis de padding e raio,
 * e suporte nativo a estados interativos com acessibilidade plena.
 */

import React from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  GestureResponderEvent,
  AccessibilityRole,
} from 'react-native';
import { Theme } from '../../constants/theme';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | number;
export type CardRadius = 'none' | 'sm' | 'md' | 'lg' | 'full' | number;

export interface CardProps {
  /** Conteúdo interno do Card */
  children?: React.ReactNode;
  /** Variante visual de estilo */
  variant?: CardVariant;
  /** Espaçamento interno */
  padding?: CardPadding;
  /** Raio de arredondamento das bordas */
  radius?: CardRadius;
  /** Callback acionado ao pressionar o Card (torna-o interativo) */
  onPress?: (event: GestureResponderEvent) => void;
  /** Desabilita interações físicas quando o card é clicável */
  disabled?: boolean;
  /** Estilização customizada adicional */
  style?: StyleProp<ViewStyle>;
  /** Rótulo acessível para leitores de tela */
  accessibilityLabel?: string;
  /** Dica de acessibilidade */
  accessibilityHint?: string;
  /** Papel de acessibilidade */
  accessibilityRole?: AccessibilityRole;
  /** Identificador para testes automatizados */
  testID?: string;
}

const resolvePadding = (padding: CardPadding): number => {
  if (typeof padding === 'number') return padding;
  switch (padding) {
    case 'none':
      return 0;
    case 'sm':
      return Theme.spacing.sm; // 8
    case 'md':
      return Theme.spacing.base; // 16
    case 'lg':
      return Theme.spacing.xl; // 24
    default:
      return Theme.spacing.base;
  }
};

const resolveRadius = (radius: CardRadius): number => {
  if (typeof radius === 'number') return radius;
  switch (radius) {
    case 'none':
      return 0;
    case 'sm':
      return Theme.borderRadius.sm; // 8
    case 'md':
      return Theme.borderRadius.md; // 12
    case 'lg':
      return Theme.borderRadius.lg; // 16
    case 'full':
      return Theme.borderRadius.full; // 9999
    default:
      return Theme.borderRadius.lg;
  }
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  radius = 'lg',
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  testID,
}: CardProps) {
  const isInteractive = Boolean(onPress) || variant === 'interactive';
  const paddingValue = resolvePadding(padding);
  const borderRadiusValue = resolveRadius(radius);

  const containerStyle: ViewStyle = {
    padding: paddingValue,
    borderRadius: borderRadiusValue,
  };

  if (isInteractive) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole || 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        testID={testID}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.baseCard,
          variantStyles[variant],
          containerStyle,
          isInteractive && styles.interactiveCursor,
          (hovered && !disabled) && styles.hoveredCard,
          (pressed && !disabled) && styles.pressedCard,
          disabled && styles.disabledCard,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.baseCard,
        variantStyles[variant],
        containerStyle,
        style,
      ]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </View>
  );
}

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.sm,
  },
  outlined: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderStrong,
  },
  elevated: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    ...Theme.shadows.card,
  },
  interactive: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.sm,
  },
});

const styles = StyleSheet.create({
  baseCard: {
    width: '100%',
    overflow: 'hidden',
  },
  interactiveCursor: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
      } as any,
    }),
  },
  hoveredCard: {
    ...Theme.shadows.md,
    ...Platform.select({
      web: {
        transform: 'translateY(-2px)',
      } as any,
    }),
  },
  pressedCard: {
    opacity: 0.9,
    ...Platform.select({
      web: {
        transform: 'scale(0.99)',
      } as any,
      default: {
        transform: [{ scale: 0.99 }],
      },
    }),
  },
  disabledCard: {
    opacity: 0.55,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      } as any,
    }),
  },
});

export default Card;
