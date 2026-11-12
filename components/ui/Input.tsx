/**
 * @file Input.tsx
 * @description Componente universal e reutilizável de campo de texto para o Orienta 2.0 [ORI-002].
 * Segue estritamente os tokens do Design System (`constants/theme.ts`) e o padrão visual
 * das telas de referência IMG-014 (Login) e IMG-012 (Cadastro).
 * 
 * Suporta:
 * - Labels superiores acessíveis e textos auxiliares / erro
 * - Ícone à esquerda e ações/ícones à direita
 * - Alternância nativa de visibilidade de senha (eye / eye-off)
 * - Estados de foco, erro, desabilitado e preenchido
 * - Máscaras inteligentes para CPF e Data (DD/MM/AAAA)
 * - Compatibilidade completa com React Native e React Native Web (sem outline feio do navegador)
 * - Acessibilidade WCAG AA (labels, aria-invalid, contrastes)
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

// =============================================================================
// FUNÇÕES AUXILIARES DE MÁSCARA
// =============================================================================

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function formatCPF(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Aplica máscara de Data: DD/MM/AAAA
 */
export function formatDate(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Remove qualquer caractere não numérico
 */
export function unmask(value: string): string {
  return value ? value.replace(/\D/g, '') : '';
}

// =============================================================================
// TIPAGEM DE PROPRIEDADES DO COMPONENTE
// =============================================================================

export type InputMaskType = 'cpf' | 'date' | ((val: string) => string);
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Rótulo exibido acima do campo de entrada */
  label?: string;
  /** Mensagem de erro que altera a borda para tom avermelhado e é exibida abaixo do campo */
  error?: string;
  /** Texto auxiliar informativo exibido abaixo do campo quando não há erro */
  helperText?: string;
  /** Ícone renderizado no início (à esquerda) do campo */
  leftIcon?: React.ReactNode;
  /** Ícone ou ação customizada renderizada no final (à direita) do campo */
  rightIcon?: React.ReactNode;
  /** Se true, transforma o campo em senha com alternador de visibilidade automático */
  isPassword?: boolean;
  /** Máscara pré-configurada ('cpf' | 'date') ou função customizada de formatação */
  mask?: InputMaskType;
  /** Desabilita o campo para edição física e altera sua estilização visual */
  disabled?: boolean;
  /** Dimensão do campo ('sm' = 42px, 'md' = 50px, 'lg' = 56px) */
  size?: InputSize;
  /** Estilização customizada para o container externo que envolve o label, input e mensagens */
  containerStyle?: StyleProp<ViewStyle>;
  /** Estilização customizada para a caixa (borda/fundo) do input */
  inputBoxStyle?: StyleProp<ViewStyle>;
  /** Estilização customizada aplicada diretamente ao elemento de texto nativo */
  inputStyle?: StyleProp<TextStyle>;
  /** Estilização customizada para o texto do rótulo */
  labelStyle?: StyleProp<TextStyle>;
  /** Identificador para testes automatizados */
  testID?: string;
}

// =============================================================================
// COMPONENTE INPUT
// =============================================================================

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      isPassword = false,
      mask,
      disabled = false,
      size = 'md',
      containerStyle,
      inputBoxStyle,
      inputStyle,
      labelStyle,
      value,
      onChangeText,
      onFocus,
      onBlur,
      placeholderTextColor = '#94A3B8',
      keyboardType,
      secureTextEntry,
      accessibilityLabel,
      accessibilityHint,
      testID,
      ...restProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Tratamento de foco
    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    // Aplicação da máscara no onChangeText
    const handleChangeText = (text: string) => {
      let formatted = text;
      if (mask === 'cpf') {
        formatted = formatCPF(text);
      } else if (mask === 'date') {
        formatted = formatDate(text);
      } else if (typeof mask === 'function') {
        formatted = mask(text);
      }
      onChangeText?.(formatted);
    };

    // Determina o teclado padrão para máscaras numéricas
    const computedKeyboardType =
      keyboardType ||
      (mask === 'cpf' || mask === 'date' ? 'numeric' : 'default');

    // Determina se o texto deve estar oculto
    const computedSecureTextEntry = isPassword
      ? !isPasswordVisible
      : secureTextEntry;

    // Altura base conforme o tamanho selecionado
    const getHeightBySize = () => {
      switch (size) {
        case 'sm':
          return 38;
        case 'lg':
          return 52;
        case 'md':
        default:
          return 46;
      }
    };

    // Determina o estado das bordas
    const hasError = Boolean(error);
    const getBorderColor = () => {
      if (hasError) return Theme.colors.danger;
      if (isFocused) return Theme.colors.primary;
      return '#E2E8F0'; // Cinza claro padrão do design
    };

    const getBackgroundColor = () => {
      if (disabled) return '#F8FAFC';
      return '#FFFFFF';
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Rótulo superior */}
        {label && (
          <Text
            style={[
              styles.label,
              disabled && styles.labelDisabled,
              hasError && styles.labelError,
              labelStyle,
            ]}
          >
            {label}
          </Text>
        )}

        {/* Caixa de Entrada (Input Box) */}
        <View
          style={[
            styles.inputBox,
            {
              minHeight: getHeightBySize(),
              borderColor: getBorderColor(),
              backgroundColor: getBackgroundColor(),
              borderWidth: isFocused || hasError ? 1.5 : 1,
            },
            isFocused && styles.inputBoxFocused,
            disabled && styles.inputBoxDisabled,
            inputBoxStyle,
          ]}
        >
          {/* Ícone à esquerda */}
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

          {/* Campo de texto nativo com suporte a Web e Mobile */}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            placeholderTextColor={placeholderTextColor}
            keyboardType={computedKeyboardType}
            secureTextEntry={computedSecureTextEntry}
            style={[
              styles.input,
              {
                fontSize: size === 'sm' ? 13 : 13.5,
                color: disabled ? '#94A3B8' : '#1E293B',
              },
              Platform.select({
                web: {
                  outlineStyle: 'none',
                } as any,
              }),
              inputStyle,
            ]}
            accessibilityLabel={accessibilityLabel || label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{
              disabled: !!disabled,
              selected: isFocused,
            }}
            testID={testID}
            {...restProps}
          />

          {/* Alternador de senha ou ícone customizado à direita */}
          {isPassword ? (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              activeOpacity={0.7}
              disabled={disabled}
              style={styles.rightActionContainer}
              accessibilityRole="button"
              accessibilityLabel={
                isPasswordVisible ? 'Ocultar senha' : 'Exibir senha'
              }
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={isFocused ? Theme.colors.primary : '#94A3B8'}
              />
            </TouchableOpacity>
          ) : rightIcon ? (
            <View style={styles.rightActionContainer}>{rightIcon}</View>
          ) : null}
        </View>

        {/* Mensagem de Erro ou Texto Auxiliar */}
        {hasError ? (
          <View style={styles.feedbackContainer}>
            <Feather
              name="alert-circle"
              size={13}
              color={Theme.colors.danger}
              style={styles.feedbackIcon}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : helperText ? (
          <View style={styles.feedbackContainer}>
            <Text style={styles.helperText}>{helperText}</Text>
          </View>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

// =============================================================================
// ESTILOS
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155', // Slate 700
    marginBottom: 5,
    letterSpacing: 0.1,
  },
  labelDisabled: {
    color: '#94A3B8',
  },
  labelError: {
    color: Theme.colors.danger,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.lg, // 12px conforme o design
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderStyle: 'solid',
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: '150ms',
  } as ViewStyle,
  inputBoxFocused: {
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 0 3px rgba(255, 90, 31, 0.15)',
        } as any)
      : {
          elevation: 2,
        }),
  },
  inputBoxDisabled: {
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  leftIconContainer: {
    marginRight: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActionContainer: {
    marginLeft: 9,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: 'system-ui, -apple-system, sans-serif',
    }),
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingHorizontal: 2,
  },
  feedbackIcon: {
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    color: Theme.colors.danger,
    fontWeight: '500',
    lineHeight: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B', // Slate 500
    lineHeight: 16,
  },
});
