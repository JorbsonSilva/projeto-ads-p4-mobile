/**
 * @file CardCategoria.tsx
 * @description Componente de atalho rápido para disciplinas/saberes.
 * Reformulado com maior área de respiro (Negative Space) para evitar que
 * textos longos fiquem espremidos nas bordas do cartão.
 * Sombra suavizada e aprofundada para evitar o visual "esquisito" e dar profundidade real.
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CardCategoriaProps {
  /** Nome da disciplina ou categoria (Ex: "Matemática") */
  nome: string;
  /** Nome do ícone da biblioteca Feather Icons (Padrão: 'book-open') */
  icone?: keyof typeof Feather.glyphMap;
  /** Função de redirecionamento ou filtragem disparada no clique */
  onPress: () => void;
}

export default function CardCategoria({
  nome,
  icone = "book-open",
  onPress,
}: CardCategoriaProps) {
  return (
    <TouchableOpacity
      style={estilos.cardContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Container de destaque visual para o ícone */}
      <View style={estilos.iconeHighlight}>
        <Feather name={icone} size={24} color="#FF6B1A" />
      </View>

      <Text style={estilos.textoCategoria} numberOfLines={2}>
        {nome}
      </Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  cardContainer: {
    width: 125, // Mais largo para acomodar palavras maiores
    minHeight: 115, // Altura mínima ajustável para não amassar o texto
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 18, // Bordas mais suaves (Apple style)
    marginRight: 14, // Mais espaço entre um quadrado e outro no carrossel
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 14,

    // Sombra Reformulada: Mais suave, difusa e com maior alcance para profundidade premium.
    elevation: 4, // Aumentamos sutilmente a elevação
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Sombra mais suave (menor opacidade)
    shadowRadius: 8, // Muito mais difusa e espalhada (maior raio)
  },
  iconeHighlight: {
    backgroundColor: "#FFF0E7", // Laranja bem clarinho
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textoCategoria: {
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
    color: "#333",
    lineHeight: 18, // Espaçamento entre linhas caso a palavra quebre
  },
});
