import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CabecalhoProps {
  nome: string;
  fraseInicio: string;
  palavraDestaque?: string;
  fraseFim?: string;
  onNotificationPress?: () => void;
}

export default function CabecalhoBoasVindas({
  nome,
  fraseInicio,
  palavraDestaque,
  fraseFim,
  onNotificationPress,
}: CabecalhoProps) {
  return (
    <View style={estilos.cabecalho}>
      <View style={estilos.areaSaudacao}>
        <Text style={estilos.textoSaudacaoBase}>
          Seja bem-vindo(a), {nome}.
        </Text>

        {/* Agora o texto flui naturalmente na tela. A quebra só acontece se o espaço acabar */}
        <Text style={estilos.fraseEfeito}>
          {fraseInicio}
          {palavraDestaque && (
            <Text style={estilos.corDestaque}>{palavraDestaque}</Text>
          )}
          {fraseFim}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onNotificationPress}
        style={estilos.botaoNotificacao}
      >
        <Ionicons name="notifications-outline" size={28} color="#222" />
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: {
    marginTop: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  areaSaudacao: { flex: 1, paddingRight: 15 },
  textoSaudacaoBase: { fontSize: 16, color: "#555" },
  fraseEfeito: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 8,
    lineHeight: 30,
    color: "#222",
  },
  corDestaque: { color: "#FF6B1A" },
  botaoNotificacao: { padding: 5 },
});
