import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ResumoProfessorProps {
  icon: any;
  titulo: string;
  valor: string;
  fundo: string;
}

export default function ResumoProfessor({
  icon,
  titulo,
  valor,
  fundo,
}: ResumoProfessorProps) {
  return (
    <View style={[estilos.metricaCard, { backgroundColor: fundo }]}>
      <Feather name={icon} size={22} color="#FF6B1A" />
      <Text style={estilos.metricaTitulo}>{titulo}</Text>
      <Text style={estilos.metricaValor}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  metricaCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  metricaTitulo: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
  },
  metricaValor: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 6,
    color: "#111",
  },
});
