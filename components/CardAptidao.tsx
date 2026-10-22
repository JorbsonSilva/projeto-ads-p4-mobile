/**
 * @file CardAptidao.tsx
 * @description Componente atômico para listagem e seleção de disciplinas (Aptidões) do professor.
 * Atua visualmente como um "Radio Button", destacando-se quando o aluno o seleciona
 * para atualizar dinamicamente o valor da hora/aula na tela de perfil.
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CardAptidaoProps {
  nomeSaber: string;
  preco: number;
  selecionado: boolean;
  onPress: () => void;
}

export default function CardAptidao({
  nomeSaber,
  preco,
  selecionado,
  onPress,
}: CardAptidaoProps) {
  return (
    <TouchableOpacity
      style={[estilos.card, selecionado && estilos.cardSelecionado]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          estilos.iconeContainer,
          selecionado && estilos.iconeSelecionado,
        ]}
      >
        <Feather
          name="book-open"
          size={18}
          color={selecionado ? "#FFF" : "#FF6B1A"}
        />
      </View>

      <View style={estilos.infoAptidao}>
        <Text style={estilos.nomeSaberAptidao} numberOfLines={1}>
          {nomeSaber}
        </Text>
        <Text style={estilos.precoAptidao}>
          R$ {preco.toFixed(2).replace(".", ",")}{" "}
          <Text style={estilos.textoUnidadeHora}>/h</Text>
        </Text>
      </View>

      {/* Indicador visual de seleção (estilo Radio Button) */}
      <View style={[estilos.radioBase, selecionado && estilos.radioAtivo]}>
        {selecionado && <Feather name="check" size={14} color="#FFF" />}
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardSelecionado: {
    borderColor: "#FF6B1A",
    backgroundColor: "#FFF0E7", // Fundo levemente laranja
  },
  iconeContainer: {
    padding: 10,
    backgroundColor: "#FFF0E7",
    borderRadius: 12,
  },
  iconeSelecionado: {
    backgroundColor: "#FF6B1A",
  },
  infoAptidao: {
    marginLeft: 14,
    flex: 1,
  },
  nomeSaberAptidao: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  precoAptidao: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FF6B1A",
    marginTop: 4,
  },
  textoUnidadeHora: {
    fontSize: 12,
    color: "#888",
    fontWeight: "normal",
  },
  radioBase: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#DDD",
    alignItems: "center",
    justifyContent: "center",
  },
  radioAtivo: {
    backgroundColor: "#008A46",
    borderColor: "#008A46",
  },
});
