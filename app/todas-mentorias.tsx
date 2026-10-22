/**
 * @file todas-mentorias.tsx
 * @description Tela de gerenciamento global de agendamentos para o perfil Professor.
 * Consome os endpoints de agendamento do Spring Boot, oferecendo filtros por texto,
 * ordenação cronológica e segmentação por abas reativas (Status).
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BarraBusca from "../components/BarraBusca";
import CardAula from "../components/CardAula";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

// ==========================================
// 1. CONTRATOS DE TIPAGEM (INTERFACES)
// ==========================================

interface AlunoVinculado {
  id: number;
  nome: string;
}

interface Agendamento {
  id: number;
  data: string;
  hora: string;
  status: string;
  aluno?: AlunoVinculado;
}

type FiltroStatus = "TODOS" | "PENDENTE" | "CONFIRMADO" | "CANCELADO";

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================
export default function TodasMentorias() {
  const { usuarioId, carregandoAuth } = useAuth() as any;

  // Estados de dados
  const [agendamentosBanco, setAgendamentosBanco] = useState<Agendamento[]>([]);
  const [agendamentosFiltrados, setAgendamentosFiltrados] = useState<
    Agendamento[]
  >([]);
  const [carregando, setCarregando] = useState(true);

  // Estados de controle de filtros
  const [busca, setBusca] = useState("");
  const [statusAtivo, setStatusAtivo] = useState<FiltroStatus>("TODOS");

  /**
   * Captura todos os registros de agendamento associados ao professor.
   * @async
   */
  const buscarTodasMentorias = useCallback(async () => {
    if (!usuarioId) return;
    setCarregando(true);

    try {
      const resposta = await fetch(
        `${API_URL}/agendamentos/professor/${usuarioId}`,
      );
      if (resposta.ok) {
        const dados: Agendamento[] = await resposta.json();

        // Ordena cronologicamente decrescente (mais recentes primeiro)
        const ordenados = dados.sort((a, b) => b.data.localeCompare(a.data));

        setAgendamentosBanco(ordenados);
        setAgendamentosFiltrados(ordenados);
      }
    } catch (error) {
      console.error(
        "Erro fatal ao carregar listagem unificada de mentorias:",
        error,
      );
    } finally {
      setCarregando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    if (!carregandoAuth) {
      buscarTodasMentorias();
    }
  }, [carregandoAuth, buscarTodasMentorias]);

  // ==========================================
  // MOTOR DE FILTRAGEM MULTI-CRITÉRIO (EFECT)
  // ==========================================
  useEffect(() => {
    let resultado = agendamentosBanco;

    // Filtro 1: Abas de Status
    if (statusAtivo !== "TODOS") {
      resultado = resultado.filter((item) => item.status === statusAtivo);
    }

    // Filtro 2: Pesquisa por nome do aluno
    if (busca.trim() !== "") {
      const termo = busca.toLowerCase();
      resultado = resultado.filter((item) =>
        item.aluno?.nome.toLowerCase().includes(termo),
      );
    }

    setAgendamentosFiltrados(resultado);
  }, [busca, statusAtivo, agendamentosBanco]);

  // Funções de callback exigidas pelo CardAula para atualizar o estado após modificação
  const renovarDadosAposAcao = () => {
    buscarTodasMentorias();
  };

  return (
    <SafeAreaView style={estilos.containerGeral} edges={["top", "bottom"]}>
      {/* Header Superior */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeader}>Todas as Mentorias</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Input de Busca de Texto */}
      <View style={{ paddingHorizontal: 20 }}>
        <BarraBusca
          valor={busca}
          aoMudarTexto={setBusca}
          placeholder="Filtrar por nome do aluno..."
          exibirFiltro={false}
        />
      </View>

      {/* Barra Horizontal de Abas de Status (Segmented Control UX) */}
      <View style={estilos.containerAbas}>
        {(
          ["TODOS", "PENDENTE", "CONFIRMADO", "CANCELADO"] as FiltroStatus[]
        ).map((aba) => (
          <TouchableOpacity
            key={aba}
            style={[
              estilos.abaBotao,
              statusAtivo === aba && estilos.abaBotaoAtiva,
            ]}
            onPress={() => setStatusAtivo(aba)}
          >
            <Text
              style={[
                estilos.abaTexto,
                statusAtivo === aba && estilos.abaTextoAtivo,
              ]}
            >
              {aba.charAt(0) + aba.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Renderização Condicional da Listagem */}
      {carregando ? (
        <View style={estilos.containerCentro}>
          <ActivityIndicator size="large" color="#FF6B1A" />
          <Text style={estilos.textoAviso}>Buscando registros...</Text>
        </View>
      ) : agendamentosFiltrados.length === 0 ? (
        <View style={estilos.containerCentro}>
          <Feather name="calendar" size={48} color="#CCC" />
          <Text style={estilos.textoAviso}>
            Nenhuma mentoria encontrada para este filtro.
          </Text>
        </View>
      ) : (
        <FlatList
          data={agendamentosFiltrados}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={estilos.listaContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={estilos.wrapperCard}>
              <CardAula
                id={item.id}
                nome={item.aluno?.nome || "Estudante"}
                materia="Mentoria Particular"
                data={item.data}
                hora={item.hora.substring(0, 5)}
                status={item.status}
                foto={`https://i.pravatar.cc/150?u=${item.aluno?.id || item.id}`}
                onAceitar={async (id) => {
                  await fetch(`${API_URL}/agendamentos/${id}/aceitar`, {
                    method: "PUT",
                  });
                  renovarDadosAposAcao();
                }}
                onRecusar={async (id) => {
                  await fetch(`${API_URL}/agendamentos/${id}/cancelar`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      justificativa: "Recusado pelo painel geral.",
                    }),
                  });
                  renovarDadosAposAcao();
                }}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ==========================================
// 3. INVESTIMENTO EM DESIGN (STYLESHEET)
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
  containerCentro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  textoAviso: {
    fontSize: 15,
    color: "#777",
    textAlign: "center",
  },
  containerAbas: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    gap: 6,
  },
  abaBotao: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  abaBotaoAtiva: {
    backgroundColor: "#FFF0E7",
    borderColor: "#FF6B1A",
  },
  abaTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  abaTextoAtivo: {
    color: "#FF6B1A",
    fontWeight: "700",
  },
  listaContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  wrapperCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
});
