/**
 * @file InputCustomizado.tsx
 * @description Componente atômico de caixa de texto padronizada para entrada de dados.
 * Suporta oclusão de senha (olhinho) e adaptação de tipos de teclado (ex: e-mail, numérico).
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  KeyboardTypeOptions,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/colors";

interface InputCustomizadoProps {
  /** Texto de dica exibido quando o campo está vazio */
  placeholder: string;
  /** Valor atual controlado pelo estado do React */
  valor: string;
  /** Callback acionado a cada tecla pressionada */
  aoMudarTexto: (texto: string) => void;
  /** Define se o texto deve ser mascarado (ideal para senhas) */
  seguro?: boolean;
  /** Opcional: Controla a visibilidade atual da senha */
  mostrarSenha?: boolean;
  /** Opcional: Alterna o estado de visibilidade da senha no clique do ícone */
  aoAlternarSenha?: () => void;
  /** Opcional: Define o layout nativo do teclado (e-mail, numérico, url, etc.) */
  keyboardType?: KeyboardTypeOptions;
}

export function InputCustomizado({
  placeholder,
  valor,
  aoMudarTexto,
  seguro = false,
  mostrarSenha = false,
  aoAlternarSenha,
  keyboardType = "default",
}: InputCustomizadoProps) {
  return (
    <View style={estilos.recipienteInput}>
      <TextInput
        style={estilos.input}
        placeholder={placeholder}
        placeholderTextColor="#A6ACAF"
        value={valor}
        onChangeText={aoMudarTexto}
        secureTextEntry={seguro && !mostrarSenha} // Máscara ativada apenas se 'seguro' for true E 'mostrarSenha' for false
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      />

      {/* Renderização condicional do ícone do olho apenas se for um campo de senha */}
      {seguro && (
        <TouchableOpacity onPress={aoAlternarSenha} style={estilos.iconeOlho}>
          <Feather
            name={mostrarSenha ? "eye" : "eye-off"}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  recipienteInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.input,
    borderRadius: 12,
    height: 52,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  iconeOlho: {
    padding: 5,
    marginLeft: 10,
  },
});
