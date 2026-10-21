/**
 * @file BotaoCustomizado.tsx
 * @description Componente atômico de botão primário utilizado em formulários e chamadas de ação (Call to Action).
 * Suporta estado de carregamento assíncrono, exibindo um ActivityIndicator e bloqueando múltiplos cliques.
 */

import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { Colors } from "../constants/colors";

interface BotaoCustomizadoProps {
  /** Texto exibido no centro do botão quando inativo */
  text: string;
  /** Função de callback executada quando o botão é pressionado */
  aoClicar: () => void;
  /** Define se o botão está processando uma ação. Se true, exibe um spinner e bloqueia novos toques. */
  carregando?: boolean;
}

export function BotaoCustomizado({
  text,
  aoClicar,
  carregando = false,
}: BotaoCustomizadoProps) {
  return (
    <TouchableOpacity
      style={[estilos.botao, carregando && estilos.botaoCarregando]}
      onPress={aoClicar}
      activeOpacity={0.8}
      disabled={carregando} // Desabilita fisicamente o botão se estiver carregando
    >
      {/*  Alterna entre o Spinner e o Texto dependendo do estado */}
      {carregando ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={estilos.textBotao}>{text}</Text>
      )}
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  botao: {
    backgroundColor: Colors.secondary,
    height: 55,
    width: "100%",
    borderRadius: 30,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  botaoCarregando: {
    backgroundColor: "#6699CC", //  Fica levemente mais claro/opaco para indicar que está processando
    elevation: 0, // Tira a sombra para dar aspecto de pressionado
  },
  textBotao: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
