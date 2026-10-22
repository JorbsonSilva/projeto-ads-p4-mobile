/**
 * @file explorar-disciplinas.tsx
 * @description Tela de catálogo dedicada à exploração de todas as disciplinas (Saberes) cadastradas.
 * Organiza as matérias em seções (agrupadas por categoria do banco de dados) e atua como
 * um atalho pré-filtrado para a tela de Busca de Professores.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../config/api";

// ==========================================
// 1. CONTRATOS DE TIPAGEM
// ==========================================
interface Saber {
  id: number;
  nome: string;
  categoria: string;
}

// Tipo utilitário para agrupar os saberes por chave (string)
type SaberesAgrupados = Record<string, Saber[]>;

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================
export default function ExplorarDisciplinas() {
  const [saberesAgrupados, setSaberesAgrupados] = useState<SaberesAgrupados>(
    {},
  );
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let montado = true;

    const buscarTodasAsDisciplinas = async () => {
      try {
        const resposta = await fetch(`${API_URL}/api/saberes`);
        if (resposta.ok) {
          const dados: Saber[] = await resposta.json();

          // Lógica de agrupamento: Separa o array do backend em um objeto dividido por 'categoria'
          const agrupados = dados.reduce((acumulador, saber) => {
            const cat = saber.categoria || "Outras";
            if (!acumulador[cat]) {
              acumulador[cat] = [];
            }
            acumulador[cat].push(saber);
            return acumulador;
          }, {} as SaberesAgrupados);

          if (montado) {
            setSaberesAgrupados(agrupados);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar o catálogo de disciplinas:", error);
      } finally {
        if (montado) setCarregando(false);
      }
    };

    buscarTodasAsDisciplinas();

    return () => {
      montado = false;
    };
  }, []);

  // Mapeamento visual estético de ícones baseados no nome da categoria
  const obterIconePorCategoria = (
    categoria: string,
  ): keyof typeof Feather.glyphMap => {
    const catLower = categoria.toLowerCase();
    if (catLower.includes("exata") || catLower.includes("matemática"))
      return "pie-chart";
    if (catLower.includes("humana") || catLower.includes("história"))
      return "globe";
    if (catLower.includes("biol") || catLower.includes("saúde"))
      return "activity";
    if (catLower.includes("idioma") || catLower.includes("língua"))
      return "message-circle";
    if (catLower.includes("tecno") || catLower.includes("comp")) return "cpu";
    if (catLower.includes("arte") || catLower.includes("música"))
      return "music";
    return "book"; // Ícone padrão
  };

  return (
    <SafeAreaView style={estilos.containerGeral} edges={["top", "bottom"]}>
      {/* Header Clássico de Navegação */}
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeader}>Explorar Disciplinas</Text>

        {/* 🟢 CORREÇÃO DO ERRO: Espaçador sem textos ou chaves soltas do lado de fora */}
        <View style={{ width: 26 }} />
      </View>

      {/* Área de Conteúdo */}
      {carregando ? (
        <View style={estilos.containerCentralizado}>
          <ActivityIndicator size="large" color="#FF6B1A" />
          <Text style={estilos.textoCarregando}>Organizando catálogo...</Text>
        </View>
      ) : Object.keys(saberesAgrupados).length === 0 ? (
        <View style={estilos.containerCentralizado}>
          <Feather name="folder-minus" size={48} color="#CCC" />
          <Text style={estilos.textoVazio}>
            Nenhuma disciplina cadastrada no sistema.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={estilos.scrollContent}
        >
          <Text style={estilos.textoIntro}>
            Escolha uma matéria abaixo para ver os professores especialistas
            disponíveis.
          </Text>

          {/* Renderização Dinâmica das Categorias */}
          {Object.entries(saberesAgrupados).map(
            ([categoriaNome, listaSaberes]) => (
              <View key={categoriaNome} style={estilos.secaoCategoria}>
                {/* Título da Categoria com Ícone */}
                <View style={estilos.headerCategoria}>
                  <Feather
                    name={obterIconePorCategoria(categoriaNome)}
                    size={20}
                    color="#FF6B1A"
                  />
                  <Text style={estilos.tituloCategoria}>{categoriaNome}</Text>
                </View>

                {/* Grid (Grade) de Matérias com 2 colunas */}
                <View style={estilos.gridDisciplinas}>
                  {listaSaberes.map((saber) => (
                    <TouchableOpacity
                      key={saber.id}
                      style={estilos.cardDisciplina}
                      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: "/busca-professores",
                          params: { categoria: saber.nome },
                        })
                      }
                    >
                      <Text
                        style={estilos.textoNomeDisciplina}
                        numberOfLines={2}
                      >
                        {saber.nome}
                      </Text>
                      <Feather name="chevron-right" size={16} color="#BBB" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ),
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ==========================================
// 3. ESTILOS
// ==========================================
const estilos = StyleSheet.create({
  containerGeral: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tituloHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  containerCentralizado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textoCarregando: {
    marginTop: 12,
    color: "#777",
    fontSize: 15,
  },
  textoVazio: {
    marginTop: 16,
    color: "#999",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  textoIntro: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    marginBottom: 24,
  },
  secaoCategoria: {
    marginBottom: 28,
  },
  headerCategoria: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  tituloCategoria: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  gridDisciplinas: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Distribui as 2 colunas
    gap: 12, // Espaço entre os itens da grade
  },
  cardDisciplina: {
    width: "48%", // Aproximadamente metade da tela para formar 2 colunas
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  textoNomeDisciplina: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    paddingRight: 8,
  },
});
