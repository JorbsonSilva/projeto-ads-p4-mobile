/**
 * @file dashboard.tsx
 * @description Aba Dashboard Analítico do Professor (Especificação de Navegação e Decisão Técnica 19 - Baseline 2.0.1).
 * Exclusiva para o perfil de Professor na barra inferior de 5 abas.
 * Apresenta métricas pedagógicas, histórico de mentorias e projeções demonstrativas sem intermediação financeira real.
 * Rastreabilidade: PROP-BKL-03 e PROP-FIN-02
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Colors, DesignTokens } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  const { nomeUsuario } = useAuth();
  const router = useRouter();
  const [periodoSelecionado, setPeriodoSelecionado] = useState<"mes" | "trimestre" | "ano">("mes");

  // Dados analíticos agregados (demonstrativos)
  const metricas = {
    aulasRealizadas: 18,
    alunosAtendidos: 12,
    mediaAvaliacao: 4.9,
    totalHoras: "27h 30m",
    honorariosProjetados: "R$ 1.375,00",
    taxaPresenca: "96%",
  };

  const dadosGraficoMensal = [
    { mes: "Jan", aulas: 8, altura: 35 },
    { mes: "Fev", aulas: 14, altura: 60 },
    { mes: "Mar", aulas: 22, altura: 95 },
    { mes: "Abr", aulas: 18, altura: 78 },
    { mes: "Mai", aulas: 20, altura: 86 },
    { mes: "Jun", aulas: 16, altura: 70 },
  ];

  const proximasAulas = [
    {
      id: "ag-01",
      aluno: "Lucas Gabriel",
      disciplina: "Estruturas de Dados",
      data: "Hoje, 15:00",
      modalidade: "Online",
      status: "CONFIRMADO",
    },
    {
      id: "ag-02",
      aluno: "Mariana Costa",
      disciplina: "Banco de Dados II",
      data: "Amanhã, 10:30",
      modalidade: "Presencial",
      status: "CONFIRMADO",
    },
    {
      id: "ag-03",
      aluno: "Thiago Rocha",
      disciplina: "Engenharia de Software",
      data: "Quinta, 16:00",
      modalidade: "Online",
      status: "PENDENTE",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />

      {/* Header Corporativo do Professor */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <View style={styles.badgeProfessor}>
              <FontAwesome5 name="chalkboard-teacher" size={12} color="#FFFFFF" />
              <Text style={styles.badgeProfessorText}>PAINEL DO DOCENTE</Text>
            </View>
            <h1 style={styles.headerTitleWeb}>
              <Text style={styles.headerTitle}>Dashboard Analítico</Text>
            </h1>
            <Text style={styles.headerSubtitle}>
              Olá, {nomeUsuario || "Professor"}! Acompanhe suas mentorias
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push("/(tabs)/agenda")}
            accessibilityLabel="Ir para Agenda"
          >
            <FontAwesome5 name="calendar-check" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Seletor de Período */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodBtn,
              periodoSelecionado === "mes" && styles.periodBtnActive,
            ]}
            onPress={() => setPeriodoSelecionado("mes")}
          >
            <Text
              style={[
                styles.periodBtnText,
                periodoSelecionado === "mes" && styles.periodBtnTextActive,
              ]}
            >
              Este Mês
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodBtn,
              periodoSelecionado === "trimestre" && styles.periodBtnActive,
            ]}
            onPress={() => setPeriodoSelecionado("trimestre")}
          >
            <Text
              style={[
                styles.periodBtnText,
                periodoSelecionado === "trimestre" && styles.periodBtnTextActive,
              ]}
            >
              Trimestre
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodBtn,
              periodoSelecionado === "ano" && styles.periodBtnActive,
            ]}
            onPress={() => setPeriodoSelecionado("ano")}
          >
            <Text
              style={[
                styles.periodBtnText,
                periodoSelecionado === "ano" && styles.periodBtnTextActive,
              ]}
            >
              Ano Letivo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Aviso de Transparência Financeira (Decisão Técnica 19) */}
        <View style={styles.avisoTransparencia}>
          <FontAwesome5 name="info-circle" size={16} color={Colors.secondary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.avisoTitulo}>Aviso de Transparência (Decisão 19 — Baseline 2.0.1)</Text>
            <Text style={styles.avisoTexto}>
              Os valores de honorários exibidos são cálculos e projeções estimadas para fins pedagógicos. O Orienta é um projeto acadêmico demonstrativo e não atua como instituição financeira ou intermediador de repasses monetários reais.
            </Text>
          </View>
        </View>

        {/* Grade de Métricas Principais */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Mentorias */}
          <View style={styles.metricCard}>
            <View style={[styles.iconWrapper, { backgroundColor: "#EDE9FE" }]}>
              <FontAwesome5 name="book-reader" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.metricValue}>{metricas.aulasRealizadas}</Text>
            <Text style={styles.metricLabel}>Aulas Realizadas</Text>
          </View>

          {/* Card 2: Alunos Atendidos */}
          <View style={styles.metricCard}>
            <View style={[styles.iconWrapper, { backgroundColor: "#E0F2FE" }]}>
              <FontAwesome5 name="user-graduate" size={18} color="#0284C7" />
            </View>
            <Text style={styles.metricValue}>{metricas.alunosAtendidos}</Text>
            <Text style={styles.metricLabel}>Alunos Únicos</Text>
          </View>

          {/* Card 3: Avaliação Média */}
          <View style={styles.metricCard}>
            <View style={[styles.iconWrapper, { backgroundColor: "#FEF3C7" }]}>
              <FontAwesome5 name="star" size={18} color="#D97706" />
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
              <Text style={styles.metricValue}>{metricas.mediaAvaliacao}</Text>
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>/5.0</Text>
            </View>
            <Text style={styles.metricLabel}>Avaliação Geral</Text>
          </View>

          {/* Card 4: Projeção de Honorários */}
          <View style={styles.metricCard}>
            <View style={[styles.iconWrapper, { backgroundColor: "#DCFCE7" }]}>
              <FontAwesome5 name="chart-line" size={18} color="#16A34A" />
            </View>
            <Text style={[styles.metricValue, { fontSize: 16, color: "#16A34A" }]}>
              {metricas.honorariosProjetados}
            </Text>
            <Text style={styles.metricLabel}>Projeção Estimada</Text>
          </View>
        </View>

        {/* Gráfico de Evolução de Aulas Ministradas */}
        <View style={styles.cardSecao}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitulo}>Evolução Mensal de Aulas</Text>
              <Text style={styles.cardSubtitulo}>Volume de mentorias finalizadas com sucesso</Text>
            </View>
            <View style={styles.badgePresenca}>
              <FontAwesome5 name="check-circle" size={11} color="#16A34A" />
              <Text style={styles.badgePresencaText}>{metricas.taxaPresenca} presença</Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {dadosGraficoMensal.map((item, index) => (
              <View key={index} style={styles.chartBarCol}>
                <Text style={styles.chartBarValue}>{item.aulas}</Text>
                <View style={styles.chartBarTrack}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: item.altura,
                        backgroundColor:
                          item.mes === "Abr" ? Colors.primary : Colors.secondary,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.chartBarLabel,
                    item.mes === "Abr" && { fontWeight: "700", color: Colors.primary },
                  ]}
                >
                  {item.mes}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Próximos Atendimentos */}
        <View style={styles.cardSecao}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitulo}>Próximas Sessões Agendadas</Text>
              <Text style={styles.cardSubtitulo}>Alunos aguardando mentoria nesta semana</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/agenda")}>
              <Text style={styles.linkVerTodos}>Ver Agenda</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10, marginTop: 12 }}>
            {proximasAulas.map((aula) => (
              <View key={aula.id} style={styles.itemAula}>
                <View style={styles.itemAulaIcon}>
                  <FontAwesome5
                    name={aula.modalidade === "Online" ? "laptop" : "map-pin"}
                    size={16}
                    color={Colors.secondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemAulaAluno}>{aula.aluno}</Text>
                  <Text style={styles.itemAulaDisciplina}>{aula.disciplina}</Text>
                  <Text style={styles.itemAulaData}>
                    📅 {aula.data} • {aula.modalidade}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        aula.status === "CONFIRMADO" ? "#DCFCE7" : "#FEF3C7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          aula.status === "CONFIRMADO" ? "#16A34A" : "#D97706",
                      },
                    ]}
                  >
                    {aula.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Card de Ação Rápida */}
        <View style={styles.cardAcao}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardAcaoTitulo}>Configurar Disponibilidade</Text>
            <Text style={styles.cardAcaoTexto}>
              Atualize seus dias e horários para que novos alunos possam agendar.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.botaoConfigurar}
            onPress={() => router.push("/(tabs)/perfil")}
          >
            <Text style={styles.botaoConfigurarTexto}>Ajustar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.secondary,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitleWeb: {
    margin: 0,
    padding: 0,
  },
  badgeProfessor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 6,
  },
  badgeProfessorText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: 10,
    padding: 3,
    marginTop: 14,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
  },
  periodBtnTextActive: {
    color: Colors.secondary,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  avisoTransparencia: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: DesignTokens.borderRadiusCard,
    padding: 12,
  },
  avisoTitulo: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondaryDark,
  },
  avisoTexto: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
    marginTop: 3,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: Colors.card,
    borderRadius: DesignTokens.borderRadiusCard,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  cardSecao: {
    backgroundColor: Colors.card,
    borderRadius: DesignTokens.borderRadiusCard,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  cardSubtitulo: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badgePresenca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePresencaText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
    marginTop: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chartBarCol: {
    alignItems: "center",
    flex: 1,
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 4,
  },
  chartBarTrack: {
    width: 22,
    height: 100,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 6,
  },
  chartBarLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    fontWeight: "500",
  },
  linkVerTodos: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
  },
  itemAula: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  itemAulaIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  itemAulaAluno: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  itemAulaDisciplina: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: "600",
    marginTop: 1,
  },
  itemAulaData: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardAcao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: DesignTokens.borderRadiusCard,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  cardAcaoTitulo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  cardAcaoTexto: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 15,
  },
  botaoConfigurar: {
    backgroundColor: Colors.primary,
    minHeight: DesignTokens.minTouchTarget,
    paddingHorizontal: 14,
    borderRadius: DesignTokens.borderRadiusButton,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoConfigurarTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
