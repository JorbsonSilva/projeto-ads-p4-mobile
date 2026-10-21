/**
 * @file historico-alunos.tsx
 * @description Tela de listagem e controle do histórico de alunos atendidos pelo professor.
 * Agrupa os agendamentos da API para consolidar métricas individuais de cada estudante,
 * como total de aulas assistidas e data do último encontro.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BarraBusca from "../components/BarraBusca";
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

/** Interface consolidada localmente para exibição do histórico unificado do aluno */
interface HistoricoAluno {
  id: number;
  nome: string;
  totalAulas: number;
  ultimaAulaData: string;
  fotoUrl: string;
}

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================
export default function HistoricoAlunos() {
  const { usuarioId, carregandoAuth } = useAuth() as any;

  const [alunosConsolidados, setAlunosConsolidados] = useState<
    HistoricoAluno[]
  >([]);
  const [alunosFiltrados, setAlunosFiltrados] = useState<HistoricoAluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  /**
   * Consome o histórico de agendamentos do professor e realiza a união de registros repetidos.
   * @async
   */
  const carregarHistorico = useCallback(async () => {
    if (!usuarioId) return;
    setCarregando(true);

    try {
      const resposta = await fetch(
        `${API_URL}/agendamentos/professor/${usuarioId}`,
      );
      if (resposta.ok) {
        const agendamentos: Agendamento[] = await resposta.json();

        // Mapa utilitário temporário para agrupar as aulas por ID de Aluno
        const mapaAlunos: Record<number, HistoricoAluno> = {};

        agendamentos.forEach((agendamento) => {
          if (!agendamento.aluno) return;

          const aluno = agendamento.aluno;
          const estaConfirmado = agendamento.status === "CONFIRMADO";

          if (!mapaAlunos[aluno.id]) {
            mapaAlunos[aluno.id] = {
              id: aluno.id,
              nome: aluno.nome,
              totalAulas: estaConfirmado ? 1 : 0,
              ultimaAulaData: agendamento.data,
              fotoUrl: `https://i.pravatar.cc/150?u=${aluno.id}`,
            };
          } else {
            // Se o aluno já existe no mapa, incrementa as aulas caso esteja confirmado
            if (estaConfirmado) {
              mapaAlunos[aluno.id].totalAulas += 1;
            }
            // Atualiza a data se for um agendamento mais recente cronologicamente
            if (agendamento.data > mapaAlunos[aluno.id].ultimaAulaData) {
              mapaAlunos[aluno.id].ultimaAulaData = agendamento.data;
            }
          }
        });

        // Transforma o mapa em vetor ordenado alfabeticamente pelo nome do estudante
        const listaFinal = Object.values(mapaAlunos).sort((a, b) =>
          a.nome.localeCompare(b.nome),
        );

        setAlunosConsolidados(listaFinal);
        setAlunosFiltrados(listaFinal);
      }
    } catch (error) {
      console.error("Erro ao computar dados de histórico de alunos:", error);
    } finally {
      setCarregando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    if (!carregandoAuth) {
      carregarHistorico();
    }
  }, [carregandoAuth, carregarHistorico]);

  // Filtro dinâmico em tempo real à medida que o professor digita na busca
  useEffect(() => {
    if (busca.trim() === "") {
      setAlunosFiltrados(alunosConsolidados);
    } else {
      const termo = busca.toLowerCase();
      const filtrados = alunosConsolidados.filter((aluno) =>
        aluno.nome.toLowerCase().includes(termo),
      );
      setAlunosFiltrados(filtrados);
    }
  }, [busca, alunosConsolidados]);

  return (
    <SafeAreaView style={estilos.containerGeral} edges={["top", "bottom"]}>
      {/* Header Superior */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeader}>Meus Alunos</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Caixa de Entrada para Pesquisa */}
      <View style={{ paddingHorizontal: 20 }}>
        <BarraBusca
          valor={busca}
          aoMudarTexto={setBusca}
          placeholder="Pesquisar por nome do aluno..."
          exibirFiltro={false}
        />
      </View>

      {/* Exibição Condicional de Estados de Carregamento e Dados */}
      {carregando ? (
        <View style={estilos.containerAviso}>
          <ActivityIndicator size="large" color="#FF6B1A" />
          <Text style={estilos.textoAviso}>Processando histórico...</Text>
        </View>
      ) : alunosFiltrados.length === 0 ? (
        <View style={estilos.containerAviso}>
          <Feather name="users" size={44} color="#CCC" />
          <Text style={estilos.textoAviso}>Nenhum aluno encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={alunosFiltrados}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={estilos.listaContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <Text style={estilos.textoContador}>
              {alunosFiltrados.length}{" "}
              {alunosFiltrados.length === 1
                ? "aluno vinculado"
                : "alunos vinculados"}
            </Text>
          )}
          renderItem={({ item }) => (
            <View style={estilos.cardAluno}>
              <Image
                source={{ uri: item.fotoUrl }}
                style={estilos.fotoPerfil}
              />

              <View style={estilos.containerInformacoes}>
                <Text style={estilos.nomeAluno} numberOfLines={1}>
                  {item.nome}
                </Text>

                <Text style={estilos.subtextoCard}>
                  📅 Último encontro: {item.ultimaAulaData}
                </Text>

                <View style={estilos.tagAulasRealizadas}>
                  <Feather
                    name="award"
                    size={12}
                    color="#008A46"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={estilos.textoTagAulas}>
                    {item.totalAulas}{" "}
                    {item.totalAulas === 1
                      ? "aula concluída"
                      : "aulas concluídas"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={estilos.botaoMensagem}
                onPress={() =>
                  console.log("Abrir chat com o aluno id: ", item.id)
                }
              >
                <Feather name="message-square" size={20} color="#0057B8" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ==========================================
// 3. ESTILOS LOCAIS
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
  containerAviso: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  textoAviso: {
    fontSize: 15,
    color: "#777",
  },
  listaContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  textoContador: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 12,
  },
  cardAluno: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  fotoPerfil: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E1F0FF",
    marginRight: 14,
  },
  containerInformacoes: {
    flex: 1,
    justifyContent: "center",
  },
  nomeAluno: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 2,
  },
  subtextoCard: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  tagAulasRealizadas: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DDF8E8",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  textoTagAulas: {
    fontSize: 11,
    color: "#008A46",
    fontWeight: "700",
  },
  botaoMensagem: {
    padding: 10,
    backgroundColor: "#EEF5FF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});
