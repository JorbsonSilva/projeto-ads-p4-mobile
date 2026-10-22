import { Feather } from "@expo/vector-icons";
import React from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface BarraBuscaProps {
  valor: string;
  aoMudarTexto: (texto: string) => void;
  placeholder?: string;
  exibirFiltro?: boolean; // Define se o botão lateral aparece
  aoPressionarFiltro?: () => void;
}

export default function BarraBusca({
  valor,
  aoMudarTexto,
  placeholder = "Pesquisar...",
  exibirFiltro = false,
  aoPressionarFiltro,
}: BarraBuscaProps) {
  return (
    <View style={estilos.container}>
      {/* Área do Input de Texto */}
      <View style={estilos.inputArea}>
        <Feather name="search" size={22} color="#999" style={estilos.icone} />
        <TextInput
          value={valor}
          onChangeText={aoMudarTexto}
          placeholder={placeholder}
          placeholderTextColor="#AAA"
          style={estilos.input}
        />
      </View>

      {/* Botão de Filtro Condicional (Só aparece se exibirFiltro for true) */}
      {exibirFiltro && (
        <TouchableOpacity
          style={estilos.botaoFiltro}
          onPress={aoPressionarFiltro}
        >
          <View style={estilos.conteudoFiltro}>
            <Feather name="sliders" size={18} color="#222" />
            <Text style={estilos.textoFiltro}>Filtros</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginTop: 28,
    gap: 12,
  },
  inputArea: {
    flex: 1,
    height: 58,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  icone: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: "#222" },

  botaoFiltro: {
    height: 58,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  conteudoFiltro: { flexDirection: "row", alignItems: "center", gap: 6 },
  textoFiltro: { fontSize: 16, color: "#222" },
});
