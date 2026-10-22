import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface BotaoRapidoProps {
  icon: any;
  texto: string;
  onPress?: () => void;
}

export default function BotaoRapido({
  icon,
  texto,
  onPress,
}: BotaoRapidoProps) {
  return (
    <TouchableOpacity
      style={estilos.botaoRapidoCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Feather name={icon} size={24} color="#0057B8" />
      <Text style={estilos.botaoRapidoTexto}>{texto}</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  botaoRapidoCard: {
    width: "23%",
    height: 78,
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  botaoRapidoTexto: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
    color: "#333",
  },
});
