import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Tipagem das propriedades que o banner vai receber
interface BannerProps {
  tituloLinha1: string;
  tituloLinha2?: string; // Opcional: só usado pelo professor
  palavraDestaque: string;
  subtitulo: string;
  textoBotao: string;
  iconeDestaque: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}

export default function BannerCallToAction({
  tituloLinha1,
  tituloLinha2,
  palavraDestaque,
  subtitulo,
  textoBotao,
  iconeDestaque,
  onPress,
}: BannerProps) {
  return (
    <View style={estilos.bannerLaranja}>
      <View style={estilos.bannerTextoArea}>
        {/* Lógica condicional: Se tiver a linha 2, quebra a frase. Se não, faz na mesma linha. */}
        <Text style={estilos.bannerTitulo}>
          {tituloLinha1}
          {!tituloLinha2 && (
            <Text style={estilos.corDestaque}> {palavraDestaque}</Text>
          )}
        </Text>

        {tituloLinha2 && (
          <Text style={estilos.bannerTitulo}>
            {tituloLinha2}{" "}
            <Text style={estilos.corDestaque}>{palavraDestaque}</Text>
          </Text>
        )}

        <Text style={estilos.bannerSubtitulo}>{subtitulo}</Text>

        <TouchableOpacity onPress={onPress} style={estilos.botaoBannerLaranja}>
          <Text style={estilos.textoBotaoBannerLaranja}>{textoBotao}</Text>
        </TouchableOpacity>
      </View>

      <View style={estilos.bannerIconeArea}>
        <MaterialIcons
          name={iconeDestaque}
          size={70}
          color="#FF6B1A"
          style={{ opacity: 0.9 }}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bannerLaranja: {
    marginTop: 28,
    backgroundColor: "#FFF0E7",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  bannerTextoArea: { flex: 1, paddingRight: 10 },
  bannerTitulo: { fontSize: 20, fontWeight: "bold", lineHeight: 26 },
  corDestaque: { color: "#FF6B1A" },
  bannerSubtitulo: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
    color: "#444",
  },
  botaoBannerLaranja: {
    backgroundColor: "#FF6B1A",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 15,
    alignSelf: "flex-start",
  },
  textoBotaoBannerLaranja: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  bannerIconeArea: { justifyContent: "center", alignItems: "center" },
});
