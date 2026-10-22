import { Feather, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CardProfessorProps {
  nome: string;
  materia: string;
  nota: number;
  avaliacoes: number;
  precoHora: number;
  fotoUrl: string;
  verificado?: boolean;
  onPress: () => void;
  onPressFavorito?: () => void;
}

export default function CardProfessor({
  nome,
  materia,
  nota,
  avaliacoes,
  precoHora,
  fotoUrl,
  verificado = true,
  onPress,
  onPressFavorito,
}: CardProfessorProps) {
  const precoFormatado = precoHora.toFixed(2).replace(".", ",");
  const notaFormatada = nota.toString().replace(".", ",");

  return (
    <TouchableOpacity
      style={estilos.cardContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Coluna 1: Foto */}
      <View style={estilos.avatarContainer}>
        <Image source={{ uri: fotoUrl }} style={estilos.avatarFoto} />
      </View>

      {/* Coluna 2: Informações do Professor */}
      <View style={estilos.infoContainer}>
        {/* Linha 1: Nome, Verificado e Coração */}
        <View style={estilos.linhaTopo}>
          <View style={estilos.nomeContainer}>
            <Text style={estilos.textoNome} numberOfLines={1}>
              {nome}
            </Text>
            {verificado && (
              <MaterialIcons
                name="verified"
                size={16}
                color="#0057B8"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          <TouchableOpacity
            onPress={onPressFavorito}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="heart" size={20} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Linha 2: Matéria */}
        <Text style={estilos.textoMateria}>{materia}</Text>

        {/* Linha 3: Avaliações */}
        <View style={estilos.linhaAvaliacao}>
          <MaterialIcons name="star" size={16} color="#F5A623" />
          <Text style={estilos.textoNota}>
            {notaFormatada}{" "}
            <Text style={estilos.textoAvaliacoes}>
              ({avaliacoes} avaliações)
            </Text>
          </Text>
        </View>

        {/* Linha 4: Preço */}
        <View style={estilos.linhaBase}>
          <View style={estilos.precoContainer}>
            <Text style={estilos.textoA_Partir}>A partir de</Text>
            <Text style={estilos.textoPreco}>
              R$ {precoFormatado}{" "}
              <Text style={estilos.textoUnidadeHora}>/h</Text>
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  avatarContainer: { marginRight: 14, justifyContent: "center" },
  avatarFoto: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: "#E1F0FF",
  },

  infoContainer: { flex: 1, justifyContent: "space-between" },

  linhaTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nomeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  textoNome: { fontSize: 16, fontWeight: "bold", color: "#111" },

  textoMateria: { fontSize: 14, color: "#444", marginTop: 2 },

  linhaAvaliacao: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  textoNota: { fontSize: 13, fontWeight: "bold", color: "#444", marginLeft: 4 },
  textoAvaliacoes: { fontWeight: "normal", color: "#888" },

  linhaBase: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },

  precoContainer: { alignItems: "flex-end" },
  textoA_Partir: { fontSize: 10, color: "#777", marginBottom: -2 },
  textoPreco: { fontSize: 18, fontWeight: "bold", color: "#FF6B1A" },
  textoUnidadeHora: { fontSize: 12, fontWeight: "normal", color: "#555" },
});
