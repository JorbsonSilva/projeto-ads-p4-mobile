import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SectionTitleProps {
  titulo: string;
  textoLink?: string; // Opcional (Padrão: "Ver todas ›")
  onPressLink?: () => void;
}

export default function SectionTitle({
  titulo,
  textoLink = "Ver todas ›",
  onPressLink,
}: SectionTitleProps) {
  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>{titulo}</Text>

      {/* Só renderiza o link se passarmos uma função de clique */}
      {onPressLink && (
        <TouchableOpacity onPress={onPressLink}>
          <Text style={estilos.link}>{textoLink}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    marginTop: 32,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end", // Alinha o texto do link com a base do título
  },
  titulo: { fontSize: 20, fontWeight: "bold", color: "#222" },
  link: {
    color: "#FF6B1A",
    fontWeight: "bold",
    fontSize: 14,
    paddingBottom: 2,
  },
});
