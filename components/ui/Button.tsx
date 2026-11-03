/**
 * @file Button.tsx
 * @description Componente universal de botão para o Orienta 2.0 [ORI-001].
 * Implementa as diretrizes do Design System (`constants/theme.ts`), com suporte
 * a 5 variantes visuais, 3 tamanhos, ícones, spinner de carregamento e estados interativos,
 * garantindo compatibilidade multiplataforma (Expo, React Native e React Native Web) e acessibilidade.
 */

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Texto ou conteúdo filho do botão */
  children?: React.ReactNode;
  /** Callback acionado ao pressionar o botão */
  onPress?: (event: GestureResponderEvent) => void;
  /** Variante visual de estilo */
  variant?: ButtonVariant;
  /** Dimensão / Tamanho do botão */
  size?: ButtonSize;
  /** Desabilita interações físicas e visuais */
  disabled?: boolean;
  /** Exibe spinner de carregamento e bloqueia cliques */
  loading?: boolean;
  /** Texto opcional exibido junto ao spinner durante carregamento */
  loadingText?: string;
  /** Ícone posicionado antes do rótulo de texto */
  leftIcon?: React.ReactNode;
  /** Ícone posicionado após o rótulo de texto */
  rightIcon?: React.ReactNode;
  /** Se true, expande o botão para ocupar 100% da largura do container */
  fullWidth?: boolean;
  /** Estilização customizada adicional para o container */
  style?: StyleProp<ViewStyle>;
  /** Estilização customizada adicional para o texto */
  textStyle?: StyleProp<TextStyle>;
  /** Rótulo acessível para leitores de tela */
  accessibilityLabel?: string;
  /** Dica de acessibilidade que explica o resultado da ação */
  accessibilityHint?: string;
  /** Identificador para testes automatizados */
  testID?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = (event: GestureResponderEvent) => {
    if (isDisabled) return;
    if (onPress) {
      onPress(event);
    }
  };

  // Resolução da cor do texto e do spinner de acordo com a variante e estado
  const getTextColor = (): string => {
    if (disabled && variant !== 'primary') {
      return Theme.colors.textDisabled;
    }
    switch (variant) {
      case 'primary':
        return Theme.colors.textInverse;
      case 'secondary':
        return Theme.colors.textInverse;
      case 'outline':
        return disabled ? Theme.colors.textDisabled : Theme.colors.primary;
      case 'ghost':
        return disabled ? Theme.colors.textDisabled : Theme.colors.textPrimary;
      case 'link':
        return disabled ? Theme.colors.textDisabled : Theme.colors.primary;
      default:
        return Theme.colors.textInverse;
    }
  };

  const textColor = getTextColor();
  const spinnerColor = variant === 'primary' || variant === 'secondary'
    ? Theme.colors.textInverse
    : Theme.colors.primary;

  // Conteúdo interno (Ícone + Texto + Spinner)
  const renderContent = () => (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={spinnerColor}
          style={loadingText ? styles.spinnerWithText : undefined}
          accessibilityLabel="Carregando..."
        />
      ) : (
        leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>
      )}

      {loading && !loadingText ? null : (
        typeof children === 'string' ? (
          <Text
            style={[
              styles.baseText,
              textSizeStyles[size],
              { color: textColor },
              variant === 'link' && styles.linkText,
              disabled && styles.disabledText,
              textStyle,
            ]}
            numberOfLines={1}
          >
            {loading && loadingText ? loadingText : children}
          </Text>
        ) : (
          children
        )
      )}

      {!loading && rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
    </View>
  );

  // Variante primária com LinearGradient
  if (variant === 'primary') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        testID={testID}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.baseButton,
          sizeContainerStyles[size],
          fullWidth && styles.fullWidth,
          !isDisabled && Theme.shadows.primaryGlow,
          (hovered && !isDisabled) && styles.hoveredScale,
          (pressed && !isDisabled) && styles.pressedScale,
          isDisabled && styles.disabledContainer,
          style,
        ]}
      >
        <LinearGradient
          colors={isDisabled ? ['#CBD5E1', '#94A3B8'] : Theme.colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradientContainer,
            sizePaddingStyles[size],
            sizeBorderRadiusStyles[size],
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </Pressable>
    );
  }

  // Demais variantes (secondary, outline, ghost, link)
  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.baseButton,
        sizeContainerStyles[size],
        sizePaddingStyles[size],
        sizeBorderRadiusStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        (variant === 'secondary' && !isDisabled) && Theme.shadows.sm,
        (hovered && !isDisabled) && styles.hoveredScale,
        (pressed && !isDisabled) && styles.pressedScale,
        isDisabled && styles.disabledContainer,
        style,
      ]}
    >
      {renderContent()}
    </Pressable>
  );
}

// Estilos de container por variante
const variantStyles = StyleSheet.create({
  primary: {},
  secondary: {
    backgroundColor: Theme.colors.secondary,
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: 'auto' as any,
    minHeight: 0,
  },
});

// Alturas e caixas mínimas por tamanho
const sizeContainerStyles = StyleSheet.create({
  sm: {
    minHeight: 36,
  },
  md: {
    minHeight: 48,
  },
  lg: {
    minHeight: 56,
  },
});

// Paddings internos
const sizePaddingStyles = StyleSheet.create({
  sm: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
  },
  md: {
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.sm,
  },
  lg: {
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
  },
});

// Raios de borda
const sizeBorderRadiusStyles = StyleSheet.create({
  sm: {
    borderRadius: Theme.borderRadius.md,
  },
  md: {
    borderRadius: Theme.borderRadius.lg,
  },
  lg: {
    borderRadius: Theme.borderRadius.xl,
  },
});

// Tipografia por tamanho
const textSizeStyles = StyleSheet.create({
  sm: {
    fontSize: Theme.typography.sizes.sm,
    lineHeight: Theme.typography.lineHeights.sm,
    fontWeight: Theme.typography.weights.semiBold,
  },
  md: {
    fontSize: Theme.typography.sizes.md,
    lineHeight: Theme.typography.lineHeights.md,
    fontWeight: Theme.typography.weights.semiBold,
  },
  lg: {
    fontSize: Theme.typography.sizes.lg,
    lineHeight: Theme.typography.lineHeights.lg,
    fontWeight: Theme.typography.weights.bold,
  },
});

const styles = StyleSheet.create({
  baseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
      } as any,
    }),
  },
  gradientContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    textAlign: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  iconLeft: {
    marginRight: Theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    marginLeft: Theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWithText: {
    marginRight: Theme.spacing.sm,
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  hoveredScale: {
    opacity: 0.92,
  },
  pressedScale: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  disabledContainer: {
    opacity: 0.6,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      } as any,
    }),
  },
  disabledText: {
    color: Theme.colors.textDisabled,
  },
});

export default Button;
