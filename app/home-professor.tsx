/**
 * @file home-professor.tsx
 * @description Tela da Home do Professor - Orienta 2.0 [ORI-015].
 * Implementada com total fidelidade à especificação visual IMG-015 (Home Professor.png).
 * 
 * Funcionalidades:
 * - Alternador de perfil integrado (Aluno / Professor) no topo para testes e alternância de fluxo
 * - Saudação personalizada ao docente com mensagem inspiradora
 * - Card "Resumo geral" com métricas mensais retornadas pela API
 * - 4 Atalhos rápidos circulares (Minha Agenda, Alunos, Saque / Carteira, Chat / Mensagens)
 * - Banner de chamada 3D para gestão de aulas pagas/gratuitas com CTA "Gerenciar aulas"
 * - Feed de próximas aulas reais com status, modalidade e acesso ao chat do agendamento
 */

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import TabBarRN001 from "../components/navigation/TabBarRN001";
import { getApiErrorMessage } from "../config/api";
import {
  DadosHomeProfessor,
  obterDadosHomeProfessor,
} from "../services/professorHomeService";

const DADOS_HOME_INICIAIS: DadosHomeProfessor = {
  metricas: {
    aulasRealizadas: { valor: "—", label: "Aulas realizadas no mês", icone: "calendar" },
    alunosAtendidos: { valor: "—", label: "Alunos atendidos no mês", icone: "users" },
    aulasPendentes: { valor: "—", label: "Aulas pendentes no mês", icone: "clock" },
    ganhosMes: { valor: "—", label: "Ganhos brutos no mês", icone: "dollar-sign" },
  },
  proximasAulas: [],
};

export default function HomeProfessorScreen({
  exibirBarraInferior = true,
}: {
  exibirBarraInferior?: boolean;
} = {}) {
  const insets = useSafeAreaInsets();
  const { nomeUsuario, usuarioId } = useAuth();

  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [dados, setDados] = useState<DadosHomeProfessor>(DADOS_HOME_INICIAIS);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const carregarDashboard = useCallback(async () => {
    try {
      const idProfessor = Number(usuarioId);
      const resultado = await obterDadosHomeProfessor(idProfessor);
      setDados(resultado);
      setErroCarregamento(null);
    } catch (error) {
      setDados(DADOS_HOME_INICIAIS);
      setErroCarregamento(getApiErrorMessage(error));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarDashboard();
  };

  if (carregando) {
    return (
      <View style={[estilos.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF5A1F" />
        <Text style={estilos.loadingTexto}>Carregando painel do professor...</Text>
      </View>
    );
  }

  const { metricas, proximasAulas } = dados;

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[estilos.scrollContent, { paddingBottom: 28 }]}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            colors={["#FF5A1F"]}
            tintColor="#FF5A1F"
          />
        }
      >
        {erroCarregamento && (
          <View style={estilos.erroCarregamento}>
            <Text style={estilos.textoErroCarregamento}>
              Não foi possível carregar os dados da Home: {erroCarregamento}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setAtualizando(true);
                carregarDashboard();
              }}
              accessibilityRole="button"
            >
              <Text style={estilos.botaoTentarNovamente}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================== */}
        {/* 2. SAUDAÇÃO PERSONALIZADA (IMG-015)                            */}
        {/* ============================================================== */}
        <View style={estilos.saudacaoContainer}>
          <Text style={estilos.saudacaoTitulo}>
            Olá, {nomeUsuario || "Professor"}! 👋
          </Text>
          <Text style={estilos.saudacaoSubtitulo}>
            Gerencie suas aulas, inspire e transforme vidas.
          </Text>
        </View>

        {/* ============================================================== */}
        {/* 4. CARD RESUMO GERAL COM MÉTRICAS MENSAIS DA API              */}
        {/* ============================================================== */}
        <View style={estilos.cardResumoGeral}>
          <View style={estilos.resumoGeralHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="bar-chart-2" size={18} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={estilos.resumoGeralTitulo}>Resumo geral</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/painel-ganhos" as any)}
              activeOpacity={0.7}
            >
              <Text style={estilos.linkVerRelatorio}>Ver relatório →</Text>
            </TouchableOpacity>
          </View>

          <View style={estilos.gridMetricas2x2}>
            {/* 1. Aulas realizadas */}
            <View style={estilos.blocoMetricaItem}>
              <View style={estilos.blocoMetricaCabecalho}>
                <View style={estilos.iconeMetricaWrapperAzul}>
                  <Feather name="calendar" size={14} color="#0284C7" />
                </View>
              </View>
              <Text style={estilos.valorMetricaGrande}>
                {metricas.aulasRealizadas.valor}
              </Text>
              <Text style={estilos.labelMetrica}>
                {metricas.aulasRealizadas.label}
              </Text>
            </View>

            {/* 2. Alunos atendidos */}
            <View style={estilos.blocoMetricaItem}>
              <View style={estilos.blocoMetricaCabecalho}>
                <View style={estilos.iconeMetricaWrapperVerde}>
                  <Feather name="users" size={14} color="#10B981" />
                </View>
              </View>
              <Text style={estilos.valorMetricaGrande}>
                {metricas.alunosAtendidos.valor}
              </Text>
              <Text style={estilos.labelMetrica}>
                {metricas.alunosAtendidos.label}
              </Text>
            </View>

            {/* 3. Aulas pendentes */}
            <View style={estilos.blocoMetricaItem}>
              <View style={estilos.blocoMetricaCabecalho}>
                <View style={estilos.iconeMetricaWrapperRoxo}>
                  <Feather name="clock" size={14} color="#8B5CF6" />
                </View>
              </View>
              <Text style={estilos.valorMetricaGrande}>
                {metricas.aulasPendentes.valor}
              </Text>
              <Text style={estilos.labelMetrica}>
                {metricas.aulasPendentes.label}
              </Text>
            </View>

            {/* 4. Ganhos no mês */}
            <View style={estilos.blocoMetricaItem}>
              <View style={estilos.blocoMetricaCabecalho}>
                <View style={estilos.iconeMetricaWrapperLaranja}>
                  <Feather name="dollar-sign" size={14} color="#FF5A1F" />
                </View>
              </View>
              <Text style={estilos.valorMetricaGrandeLaranja}>
                {metricas.ganhosMes.valor}
              </Text>
              <Text style={estilos.labelMetrica}>
                {metricas.ganhosMes.label}
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 5. 4 ATALHOS RÁPIDOS CIRCULARES (IMG-015)                       */}
        {/* ============================================================== */}
        <View style={estilos.secaoAtalhosRapidos}>
          <Text style={estilos.secaoTitulo}>Ações Rápidas</Text>

          <View style={estilos.linhaAtalhosCirculares}>
            {/* 1. Minha Agenda */}
            <TouchableOpacity
              style={estilos.itemAtalhoCircular}
              onPress={() => router.push("/(tabs)/agenda" as any)}
              activeOpacity={0.8}
            >
              <View style={[estilos.circuloAtalho, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="calendar" size={24} color="#0284C7" />
              </View>
              <Text style={estilos.labelAtalhoCircular}>Minha Agenda</Text>
            </TouchableOpacity>

            {/* 2. Alunos */}
            <TouchableOpacity
              style={estilos.itemAtalhoCircular}
              onPress={() => router.push("/historico-alunos" as any)}
              activeOpacity={0.8}
            >
              <View style={[estilos.circuloAtalho, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="people" size={24} color="#10B981" />
              </View>
              <Text style={estilos.labelAtalhoCircular}>Alunos</Text>
            </TouchableOpacity>

            {/* 3. Saque / Carteira */}
            <TouchableOpacity
              style={estilos.itemAtalhoCircular}
              onPress={() => router.push("/saque" as any)}
              activeOpacity={0.8}
            >
              <View style={[estilos.circuloAtalho, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="wallet" size={24} color="#FF5A1F" />
              </View>
              <Text style={estilos.labelAtalhoCircular}>Ganhos / Saque</Text>
            </TouchableOpacity>

            {/* 4. Chat */}
            <TouchableOpacity
              style={estilos.itemAtalhoCircular}
              onPress={() => router.push("/chat" as any)}
              activeOpacity={0.8}
            >
              <View style={[estilos.circuloAtalho, { backgroundColor: "#F5F3FF" }]}>
                <Ionicons name="chatbubbles" size={24} color="#8B5CF6" />
              </View>
              <Text style={estilos.labelAtalhoCircular}>Mensagens</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 6. BANNER DE CHAMADA 3D (GESTÃO DE AULAS - IMG-015)            */}
        {/* ============================================================== */}
        <View style={estilos.bannerChamadaCard}>
          <View style={estilos.bannerConteudoTexto}>
            <View style={estilos.tagGratisPagas}>
              <MaterialCommunityIcons name="star-four-points" size={14} color="#FF5A1F" style={{ marginRight: 4 }} />
              <Text style={estilos.textoTagGratisPagas}>Flexibilidade Pedagógica</Text>
            </View>
            <Text style={estilos.bannerTitulo}>
              Defina suas aulas como pagas ou gratuitas
            </Text>
            <Text style={estilos.bannerDescricao}>
              Você decide o valor do seu conhecimento e sua modalidade de ensino.
            </Text>

            <TouchableOpacity
              style={estilos.botaoGerenciarAulas}
              onPress={() => router.push("/(tabs)/perfil?persona=professor" as any)}
              activeOpacity={0.85}
            >
              <Text style={estilos.textoBotaoGerenciarAulas}>Gerenciar aulas →</Text>
            </TouchableOpacity>
          </View>

          <View style={estilos.iconeEstilizadoWrapper}>
            <Ionicons name="sparkles" size={54} color="#FED7AA" />
          </View>
        </View>

        {/* ============================================================== */}
        {/* 7. PRÓXIMAS AULAS DO PROFESSOR (IMG-015)                       */}
        {/* ============================================================== */}
        <View style={estilos.secaoProximasAulas}>
          <View style={estilos.secaoHeaderRow}>
            <Text style={estilos.secaoTitulo}>Próximas aulas</Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/agenda" as any)}
              activeOpacity={0.7}
            >
              <Text style={estilos.linkVerTodas}>Ver todas →</Text>
            </TouchableOpacity>
          </View>

          <View style={estilos.listaAulasCards}>
            {proximasAulas.map((aula) => (
              <TouchableOpacity
                key={`aula-${aula.id}`}
                style={estilos.cardAulaItem}
                onPress={() => router.push(`/chat/${aula.id}` as any)}
                activeOpacity={0.85}
              >
                {/* Faixa Marcadora Laranja Lateral */}
                <View style={estilos.faixaMarcadoraLaranja} />

                <View style={estilos.corpoCardAula}>
                  <View style={estilos.avatarContainer}>
                    <Feather name="user" size={22} color="#64748B" />
                  </View>

                  <View style={estilos.infoAlunoColuna}>
                    <View style={estilos.nomeStatusLinha}>
                      <Text style={estilos.nomeAlunoTexto}>{aula.alunoNome}</Text>
                      <View
                        style={[
                          estilos.badgeStatusAula,
                          aula.status === "PENDENTE" ? estilos.badgePendente : estilos.badgeConfirmado,
                        ]}
                      >
                        <Text
                          style={[
                            estilos.textoStatusAula,
                            aula.status === "PENDENTE" ? estilos.textoPendente : estilos.textoConfirmado,
                          ]}
                        >
                          {aula.status === "PENDENTE"
                            ? "Pendente"
                            : aula.status === "EM_ANDAMENTO"
                              ? "Em andamento"
                              : "Confirmada"}
                        </Text>
                      </View>
                    </View>

                    <View style={estilos.metaLinha}>
                      <Feather name="book-open" size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={estilos.metaTexto}>{aula.disciplina}</Text>
                      <Text style={estilos.metaPonto}>•</Text>
                      <Ionicons
                        name={aula.modalidade === "Online" ? "videocam-outline" : "location-outline"}
                        size={12}
                        color="#64748B"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={estilos.metaTexto}>
                        {aula.modalidade}
                      </Text>
                    </View>

                    <View style={estilos.horarioPrecoLinha}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Feather name="clock" size={12} color="#0F172A" style={{ marginRight: 4 }} />
                        <Text style={estilos.horarioTexto}>{aula.horario}</Text>
                      </View>
                      <Text style={estilos.precoAulaTexto}>
                        R$ {aula.valor.toFixed(2).replace(".", ",")}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {proximasAulas.length === 0 && !erroCarregamento && (
              <Text style={estilos.semAulasTexto}>Nenhuma aula próxima agendada.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ============================================================== */}
      {/* 8. BARRA DE NAVEGAÇÃO INFERIOR DO PROFESSOR (5 ABAS - RN-001)  */}
      {/* ============================================================== */}
      {exibirBarraInferior && (
        <TabBarRN001 abaAtiva="home" perfilForcado="Professor" />
      )}

    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingTexto: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  erroCarregamento: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  textoErroCarregamento: {
    color: "#991B1B",
    fontSize: 13,
  },
  botaoTentarNovamente: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },

  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // 2. Saudação
  saudacaoContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  saudacaoTitulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  saudacaoSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
  },

  // 4. Card Resumo Geral
  cardResumoGeral: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  resumoGeralHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  resumoGeralTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  linkVerRelatorio: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  gridMetricas2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  blocoMetricaItem: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  blocoMetricaCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconeMetricaWrapperAzul: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconeMetricaWrapperVerde: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  iconeMetricaWrapperRoxo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconeMetricaWrapperLaranja: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  valorMetricaGrande: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  valorMetricaGrandeLaranja: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF5A1F",
  },
  labelMetrica: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  // 5. Ações Rápidas Circulares
  secaoAtalhosRapidos: {
    marginTop: 4,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  linhaAtalhosCirculares: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemAtalhoCircular: {
    alignItems: "center",
    width: "23%",
  },
  circuloAtalho: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    position: "relative",
  },
  labelAtalhoCircular: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },

  // 6. Banner de Chamada 3D
  bannerChamadaCard: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FED7AA",
    position: "relative",
    overflow: "hidden",
  },
  bannerConteudoTexto: {
    flex: 1,
    zIndex: 2,
  },
  tagGratisPagas: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  textoTagGratisPagas: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  bannerTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 4,
  },
  bannerDescricao: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 14,
  },
  botaoGerenciarAulas: {
    alignSelf: "flex-start",
    backgroundColor: "#FF5A1F",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  textoBotaoGerenciarAulas: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  iconeEstilizadoWrapper: {
    position: "absolute",
    right: -10,
    bottom: -10,
    opacity: 0.6,
    zIndex: 1,
  },

  // 7. Próximas Aulas
  secaoProximasAulas: {
    marginTop: 4,
  },
  secaoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  linkVerTodas: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  listaAulasCards: {
    gap: 12,
  },
  semAulasTexto: {
    color: "#64748B",
    fontSize: 13,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardAulaItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  faixaMarcadoraLaranja: {
    width: 5,
    backgroundColor: "#FF5A1F",
  },
  corpoCardAula: {
    flex: 1,
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoAlunoColuna: {
    flex: 1,
  },
  nomeStatusLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nomeAlunoTexto: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  badgeStatusAula: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeConfirmado: {
    backgroundColor: "#DCFCE7",
  },
  badgePendente: {
    backgroundColor: "#FEF3C7",
  },
  textoStatusAula: {
    fontSize: 11,
    fontWeight: "700",
  },
  textoConfirmado: {
    color: "#15803D",
  },
  textoPendente: {
    color: "#B45309",
  },
  metaLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaTexto: {
    fontSize: 12,
    color: "#64748B",
  },
  metaPonto: {
    marginHorizontal: 6,
    color: "#CBD5E1",
    fontSize: 12,
  },
  horarioPrecoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  horarioTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  precoAulaTexto: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF5A1F",
  },
  // 8. Barra de Navegação Inferior (RN-001)
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    height: 64,
    paddingTop: 8,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 3,
  },
  tabLabelAtivo: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
  tabIndicadorAtivo: {
    position: "absolute",
    bottom: -4,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FF5A1F",
  },
  badgeDotTab: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5A1F",
  },
});
