/**
 * @file Chip.tsx
 * @description Componente universal de Chip para o Orienta 2.0 [ORI-003].
 * Utilizado para filtros interativos, tags de seleção, categorias e tags removíveis.
 * Suporta estados selecionado/não selecionado, ícone opcional à esquerda,
 * botão de remoção à direita (removable), 3 variantes e 2 tamanhos padronizados.
 */

import React from 'react';
import {
  Pressable,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

export type ChipVariant = 'subtle' | 'filled' | 'outlined';
export type ChipSize = 'sm' | 'md';

export interface ChipProps {
  /** Rótulo textual ou conteúdo do Chip */
  label: React.ReactNode;
  /** Estado de seleção ativa */
  selected?: boolean;
  /** Callback acionado ao tocar no Chip */
  onPress?: (event: GestureResponderEvent) => void;
  /** Callback opcional de remoção; se presente, exibe o botão 'X' */
  onRemove?: () => void;
  /** Desabilita interação */
  disabled?: boolean;
  /** Ícone exibido antes do rótulo */
  icon?: React.ReactNode;
  /** Variante visual de exibição */
  variant?: ChipVariant;
  /** Tamanho do chip */
  size?: ChipSize;
  /** Estilização customizada do contêiner */
  style?: StyleProp<ViewStyle>;
  /** Estilização customizada do texto */
  textStyle?: StyleProp<TextStyle>;
  /** Rótulo para acessibilidade */
  accessibilityLabel?: string;
  /** Identificador para testes automatizados */
  testID?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  onRemove,
  disabled = false,
  icon,
  variant = 'subtle',
  size = 'md',
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ChipProps) {
  const isInteractive = Boolean(onPress) && !disabled;
  const isSmall = size === 'sm';

  // Cores de acordo com variante e estado selecionado
  const getColors = () => {
    if (disabled) {
      return {
        bg: Theme.colors.surfaceSubtle,
        border: Theme.colors.border,
        text: Theme.colors.textDisabled,
        iconColor: Theme.colors.textDisabled,
      };
    }

    if (selected) {
      switch (variant) {
        case 'filled':
          return {
            bg: Theme.colors.primary,
            border: Theme.colors.primary,
            text: Theme.colors.textInverse,
            iconColor: Theme.colors.textInverse,
          };
        case 'outlined':
        case 'subtle':
        default:
          return {
            bg: Theme.colors.primaryLight,
            border: Theme.colors.primary,
            text: Theme.colors.primary,
            iconColor: Theme.colors.primary,
          };
      }
    }

    switch (variant) {
      case 'filled':
        return {
          bg: Theme.colors.surfaceSubtle,
          border: 'transparent',
          text: Theme.colors.textPrimary,
          iconColor: Theme.colors.textSecondary,
        };
      case 'outlined':
        return {
          bg: 'transparent',
          border: Theme.colors.borderStrong,
          text: Theme.colors.textSecondary,
          iconColor: Theme.colors.textSecondary,
        };
      case 'subtle':
      default:
        return {
          bg: '#F8FAFC',
          border: Theme.colors.border,
          text: Theme.colors.textSecondary,
          iconColor: Theme.colors.textSecondary,
        };
    }
  };

  const colors = getColors();

  const handlePress = (event: GestureResponderEvent) => {
    if (!isInteractive) return;
    onPress?.(event);
  };

  const handleRemove = (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    if (disabled) return;
    onRemove?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={
        accessibilityLabel || (typeof label === 'string' ? label : undefined)
      }
      testID={testID}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.baseChip,
        isSmall ? styles.sizeSm : styles.sizeMd,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        isInteractive && styles.interactiveCursor,
        (hovered && isInteractive) && styles.hoveredChip,
        (pressed && isInteractive) && styles.pressedChip,
        disabled && styles.disabledChip,
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}

      {typeof label === 'string' ? (
        <Text
          style={[
            styles.baseText,
            isSmall ? styles.textSm : styles.textMd,
            { color: colors.text },
            selected && styles.selectedText,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : (
        label
      )}

      {onRemove && (
        <TouchableOpacity
          onPress={handleRemove as any}
          disabled={disabled}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeButton}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${typeof label === 'string' ? label : 'item'}`}
        >
          <Feather
            name="x"
            size={isSmall ? 12 : 14}
            color={colors.iconColor}
          />
        </TouchableOpacity>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sizeSm: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  sizeMd: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  interactiveCursor: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.15s ease',
      } as any,
    }),
  },
  hoveredChip: {
    opacity: 0.9,
  },
  pressedChip: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  disabledChip: {
    opacity: 0.5,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      } as any,
    }),
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: Theme.typography.weights.medium,
  },
  selectedText: {
    fontWeight: Theme.typography.weights.semiBold,
  },
  textSm: {
    fontSize: 12,
    lineHeight: 16,
  },
  textMd: {
    fontSize: 14,
    lineHeight: 18,
  },
  removeButton: {
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.full,
    padding: 2,
  },
});

export default Chip;
