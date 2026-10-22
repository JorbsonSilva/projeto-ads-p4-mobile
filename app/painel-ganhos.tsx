/**
 * @file painel-ganhos.tsx
 * @description Central Financeira da Dashboard do Professor.
 * Consome os agendamentos e as aptidões do professor para calcular o faturamento histórico total,
 * receita consolidada do mês corrente e previsões baseadas em aulas agendadas pendentes ou futuras.
 * Implementada validação cronológica para impedir que aulas confirmadas em datas futuras
 * entrem como receita realizada, desviando-as corretamente para a projeção/previsão.
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
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

// ==========================================
// 1. CONTRATOS DE TIPAGEM (INTERFACES TS)
// ==========================================

interface Saber {
  id: number;
  nome: string;
}

interface Aptidao {
  id: number;
  precoHora: number;
  saber: Saber;
}

interface UsuarioProfessor {
  id: number;
  nome: string;
  aptidoes?: Aptidao[];
}

interface AlunoVinculado {
  id: number;
  nome: string;
}

interface Agendamento {
  id: number;
  data: string; // Formato do banco: YYYY-MM-DD
  hora: string;
  status: string; // PENDENTE, CONFIRMADO, CANCELADO
  aluno?: AlunoVinculado;
}

interface TransacaoFinanceira {
  id: number;
  alunoNome: string;
  data: string;
  valor: number;
  status: string;
  ehFutura: boolean;
}

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================
export default function PainelGanhos() {
  const { usuarioId, carregandoAuth } = useAuth() as any;

  // Estados de métricas financeiras
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [totalMesAtual, setTotalMesAtual] = useState(0);
  const [previsaoFutura, setPrevisaoFutura] = useState(0);

  const [extrato, setExtrato] = useState<TransacaoFinanceira[]>([]);
  const [carregando, setCarregando] = useState(true);

  /**
   * Consome os dados e realiza o faturamento dinâmico cruzando status e cronologia.
   * @async
   */
  const calcularMetricasFinanceiras = useCallback(async () => {
    if (!usuarioId) return;
    setCarregando(true);

    try {
      // 1. Busca o valor da hora/aula do professor
      let precoHoraPadrao = 50.0;
      const resProf = await fetch(`${API_URL}/api/usuarios/${usuarioId}`);
      if (resProf.ok) {
        const dadosProf: UsuarioProfessor = await resProf.json();
        if (dadosProf.aptidoes && dadosProf.aptidoes.length > 0) {
          precoHoraPadrao = dadosProf.aptidoes[0].precoHora;
        }
      }

      // 2. Busca todos os agendamentos para rodar o motor de cálculo
      const resAgendamentos = await fetch(
        `${API_URL}/agendamentos/professor/${usuarioId}`,
      );
      if (resAgendamentos.ok) {
        const agendamentos: Agendamento[] = await resAgendamentos.json();

        let acumuladorTotal = 0;
        let acumuladorMes = 0;
        let acumuladorPrevisao = 0;

        const hoje = new Date();
        const anoAtualStr = String(hoje.getFullYear());
        const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, "0");
        const diaAtualStr = String(hoje.getDate()).padStart(2, "0");
        const hojeStr = `${anoAtualStr}-${mesAtualStr}-${diaAtualStr}`;

        const listaTransacoes: TransacaoFinanceira[] = [];

        agendamentos.forEach((aula) => {
          const valorAula = precoHoraPadrao;

          const partesData = aula.data.split("-");
          const anoAula = partesData[0];
          const mesAula = partesData[1];

          const ehFutura = aula.data > hojeStr;

          if (aula.status === "CONFIRMADO") {
            if (ehFutura) {
              acumuladorPrevisao += valorAula;
            } else {
              // Se já aconteceu ou é hoje, computa como caixa realizado
              acumuladorTotal += valorAula;
              if (anoAula === anoAtualStr && mesAula === mesAtualStr) {
                acumuladorMes += valorAula;
              }
            }
          } else if (aula.status === "PENDENTE") {
            // Solicitações pendentes sempre entram como previsão
            acumuladorPrevisao += valorAula;
          }

          // Adiciona ao histórico do extrato informando o estado cronológico
          if (aula.status !== "CANCELADO") {
            listaTransacoes.push({
              id: aula.id,
              alunoNome: aula.aluno?.nome || "Estudante",
              data: aula.data,
              valor: valorAula,
              status: aula.status,
              ehFutura: ehFutura, // Passa a flag para estilização do extrato
            });
          }
        });

        // Despejo atômico nos estados do React
        setTotalHistorico(acumuladorTotal);
        setTotalMesAtual(acumuladorMes);
        setPrevisaoFutura(acumuladorPrevisao);
        setExtrato(
          listaTransacoes.sort((a, b) => b.data.localeCompare(a.data)),
        );
      }
    } catch (error) {
      console.error(
        "Falha no reprocessamento do motor financeiro cronológico:",
        error,
      );
    } finally {
      setCarregando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    if (!carregandoAuth) {
      calcularMetricasFinanceiras();
    }
  }, [carregandoAuth, calcularMetricasFinanceiras]);

  const formatarMoeda = (valor: number) => {
    return `R$ ${valor.toFixed(2).replace(".", ",")}`;
  };

  const formatarDataBR = (dataEstrangeira: string) => {
    const partes = dataEstrangeira.split("-");
    if (partes.length !== 3) return dataEstrangeira;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  return (
    <SafeAreaView style={estilos.containerGeral} edges={["top", "bottom"]}>
      {/* Header Fixo */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeader}>Painel Financeiro</Text>
        <TouchableOpacity onPress={calcularMetricasFinanceiras}>
          <Feather name="refresh-cw" size={20} color="#555" />
        </TouchableOpacity>
      </View>

      {carregando ? (
        <View style={estilos.containerCentro}>
          <ActivityIndicator size="large" color="#FF6B1A" />
          <Text style={estilos.textoCarregando}>
            Sincronizando livro-caixa...
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* BLOCO DE CARDS MÉTRICOS */}
          <View style={estilos.sectionCards}>
            {/* Card 1: Ganhos Totais (Realizados) */}
            <View
              style={[
                estilos.cardMetrico,
                { backgroundColor: "#EFFBF4", borderColor: "#A3E4D7" },
              ]}
            >
              <View style={estilos.rowCardHeader}>
                <Text style={[estilos.tituloCard, { color: "#196F3D" }]}>
                  Ganhos Totais
                </Text>
                <Feather name="trending-up" size={18} color="#196F3D" />
              </View>
              <Text style={[estilos.valorCard, { color: "#111" }]}>
                {formatarMoeda(totalHistorico)}
              </Text>
              <Text style={estilos.subtextoCard}>
                Saldo total líquido realizado
              </Text>
            </View>

            {/* Grid Duplo */}
            <View style={estilos.gridDuplo}>
              {/* Card 2: Faturamento Confirmado Realizado no Mês */}
              <View
                style={[
                  estilos.cardMetricoMetade,
                  { backgroundColor: "#EEF5FF", borderColor: "#B2D1FF" },
                ]}
              >
                <Text style={[estilos.tituloCardMini, { color: "#0057B8" }]}>
                  Este Mês
                </Text>
                <Text style={estilos.valorCardMini}>
                  {formatarMoeda(totalMesAtual)}
                </Text>
                <Text style={estilos.subtextoCard}>Receita em caixa</Text>
              </View>

              {/* Card 3: Previsão Total (Pendentes + Confirmadas Futuras) */}
              <View
                style={[
                  estilos.cardMetricoMetade,
                  { backgroundColor: "#FFF0E7", borderColor: "#FFD3B6" },
                ]}
              >
                <Text style={[estilos.tituloCardMini, { color: "#D35400" }]}>
                  Previsão
                </Text>
                <Text style={[estilos.valorCardMini, { color: "#D35400" }]}>
                  {formatarMoeda(previsaoFutura)}
                </Text>
                <Text style={estilos.subtextoCard}>A receber/futuras</Text>
              </View>
            </View>
          </View>

          {/* LISTAGEM: EXTRATO DE MENTORIAS */}
          <Text style={estilos.labelExtrato}>Extrato de Mentorias</Text>

          <FlatList
            data={extrato}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={estilos.listaContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={estilos.containerVazio}>
                <Feather name="dollar-sign" size={40} color="#CCC" />
                <Text style={estilos.textoVazio}>
                  Nenhum lançamento financeiro registrado.
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const IsPrevisao = item.status === "PENDENTE" || item.ehFutura;
              return (
                <View style={estilos.itemExtrato}>
                  <View style={estilos.iconeMoedaArea}>
                    <Feather
                      name={IsPrevisao ? "clock" : "check-circle"}
                      size={18}
                      color={IsPrevisao ? "#D35400" : "#27AE60"}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={estilos.nomeEstudante} numberOfLines={1}>
                      {item.alunoNome}
                    </Text>
                    <Text style={estilos.dataExtrato}>
                      {formatarDataBR(item.data)}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={[
                        estilos.valorExtrato,
                        { color: IsPrevisao ? "#D35400" : "#27AE60" },
                      ]}
                    >
                      {formatarMoeda(item.valor)}
                    </Text>
                    <Text style={estilos.statusExtrato}>
                      {item.ehFutura && item.status === "CONFIRMADO"
                        ? "futura"
                        : item.status.toLowerCase()}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ==========================================
// 3. ESTILOS LOCAIS (STYLESHEET)
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
  textoCarregando: {
    fontSize: 15,
    color: "#666",
  },
  sectionCards: {
    padding: 20,
    gap: 12,
  },
  cardMetrico: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  rowCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tituloCard: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valorCard: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtextoCard: {
    fontSize: 11,
    color: "#777",
  },
  gridDuplo: {
    flexDirection: "row",
    gap: 12,
  },
  cardMetricoMetade: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  tituloCardMini: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  valorCardMini: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#111",
  },
  labelExtrato: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  listaContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  containerVazio: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  textoVazio: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  itemExtrato: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  iconeMoedaArea: {
    padding: 10,
    backgroundColor: "#F4F6F7",
    borderRadius: 12,
  },
  nomeEstudante: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  dataExtrato: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  valorExtrato: {
    fontSize: 15,
    fontWeight: "bold",
  },
  statusExtrato: {
    fontSize: 10,
    color: "#999",
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: 2,
  },
});
