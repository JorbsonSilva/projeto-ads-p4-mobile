/**
 * @file notificacoes.tsx
 * @description Central de Notificações e Alertas do Orienta 2.0 [ORI-016].
 * Construída com estrita fidelidade visual à especificação IMG-006 (Notificações.jpeg).
 * 
 * Funcionalidades:
 * - Cabeçalho com título, contador de não lidas e ação "Marcar todas como lidas"
 * - 5 Chips horizontais de filtragem: Todas, Aulas, Mensagens, Pagamentos e Sistema
 * - Agrupamento temporal das notificações: Hoje, Ontem e Últimos 7 dias
 * - Cards interativos com ícones semânticos circulares e paleta do Design System Orienta
 * - Ponto indicador azul/laranja para notificações não lidas
 * - Navegação contextual direta ao tocar na notificação (Agenda, Chat, Saque, Ganhos)
 * - Serviço híbrido resiliente com fallback offline e badge de modo de simulação
 * - Barra inferior de navegação com 5 abas perfeitamente integrada
 */

import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
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
import {
  CategoriaNotificacao,
  GrupoTemporal,
  marcarComoLida,
  marcarTodasComoLidas,
  NotificacaoItem,
  obterNotificacoes,
  ResultadoNotificacoes,
} from "../services/notificacoesService";

const CATEGORIAS_FILTRO: { id: CategoriaNotificacao; rotulo: string; icone?: string }[] = [
  { id: "TODAS", rotulo: "Todas" },
  { id: "AULAS", rotulo: "Aulas", icone: "calendar" },
  { id: "MENSAGENS", rotulo: "Mensagens", icone: "message-circle" },
  { id: "PAGAMENTOS", rotulo: "Pagamentos", icone: "credit-card" },
  { id: "SISTEMA", rotulo: "Sistema", icone: "shield" },
];

export default function NotificacoesScreen() {
  const insets = useSafeAreaInsets();
  const { perfilAtivo } = useAuth() as any;

  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaNotificacao>("TODAS");
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [isSimulado, setIsSimulado] = useState<boolean>(false);
  const [totalNaoLidas, setTotalNaoLidas] = useState<number>(0);

  const carregarDados = useCallback(async () => {
    try {
      const res: ResultadoNotificacoes = await obterNotificacoes(101);
      setNotificacoes(res.notificacoes);
      setTotalNaoLidas(res.totalNaoLidas);
      setIsSimulado(res.isSimulado);
    } catch {
      setIsSimulado(true);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarDados();
  };

  const handleMarcarTodasLidas = async () => {
    await marcarTodasComoLidas(101);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    setTotalNaoLidas(0);
  };

  const handleTocarNotificacao = async (item: NotificacaoItem) => {
    if (!item.lida) {
      await marcarComoLida(item.id, 101);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, lida: true } : n))
      );
      setTotalNaoLidas((prev) => Math.max(0, prev - 1));
    }

    if (item.rotaDestino) {
      router.push(item.rotaDestino as any);
    }
  };

  // Filtragem
  const notificacoesFiltradas = notificacoes.filter((n) => {
    if (categoriaAtiva === "TODAS") return true;
    return n.categoria === categoriaAtiva;
  });

  // Agrupamento temporal
  const grupos: GrupoTemporal[] = ["Hoje", "Ontem", "Últimos 7 dias", "Anteriores"];
  const gruposComItens = grupos.filter((g) =>
    notificacoesFiltradas.some((n) => n.agrupamento === g)
  );

  const renderIconeSemantico = (item: NotificacaoItem) => {
    if (item.iconeTipo === "ionicons") {
      return <Ionicons name={item.icone as any} size={20} color={item.corIcone} />;
    }
    return <Feather name={item.icone as any} size={18} color={item.corIcone} />;
  };

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 0. BANNER DISCRETO DE SIMULAÇÃO OFFLINE                        */}
      {/* ============================================================== */}
      {isSimulado && (
        <View style={estilos.bannerSimulacao}>
          <Ionicons name="information-circle" size={14} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={estilos.textoBannerSimulacao}>
            ⚠️ Modo Simulação: Dados offline em exibição
          </Text>
        </View>
      )}

      {/* ============================================================== */}
      {/* 1. HEADER SUPERIOR COM TÍTULO E AÇÃO MARCAR COMO LIDAS (IMG-006)*/}
      {/* ============================================================== */}
      <View style={estilos.header}>
        <View style={estilos.headerTituloArea}>
          <TouchableOpacity
            style={estilos.botaoVoltar}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push(perfilAtivo === "Professor" ? "/home-professor" as any : "/(tabs)" as any);
              }
            }}
            accessibilityLabel="Voltar"
          >
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={estilos.headerTitulo}>Notificações</Text>
            {totalNaoLidas > 0 && (
              <View style={estilos.badgeHeaderTotal}>
                <Text style={estilos.textoBadgeHeaderTotal}>{totalNaoLidas}</Text>
              </View>
            )}
          </View>
        </View>

        {totalNaoLidas > 0 && (
          <TouchableOpacity
            style={estilos.botaoMarcarTodas}
            onPress={handleMarcarTodasLidas}
            activeOpacity={0.7}
            accessibilityLabel="Marcar todas como lidas"
          >
            <Feather name="check" size={14} color="#FF5A1F" style={{ marginRight: 4 }} />
            <Text style={estilos.textoMarcarTodas}>Marcar lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ============================================================== */}
      {/* 2. CHIPS HORIZONTAIS DE FILTRAGEM (IMG-006)                    */}
      {/* ============================================================== */}
      <View style={estilos.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.scrollChips}
        >
          {CATEGORIAS_FILTRO.map((cat) => {
            const isAtivo = categoriaAtiva === cat.id;
            const count =
              cat.id === "TODAS"
                ? notificacoes.length
                : notificacoes.filter((n) => n.categoria === cat.id).length;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[estilos.chipItem, isAtivo && estilos.chipItemAtivo]}
                onPress={() => setCategoriaAtiva(cat.id)}
                activeOpacity={0.8}
              >
                {cat.icone && (
                  <Feather
                    name={cat.icone as any}
                    size={14}
                    color={isAtivo ? "#FFFFFF" : "#64748B"}
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text style={[estilos.chipTexto, isAtivo && estilos.chipTextoAtivo]}>
                  {cat.rotulo}
                </Text>
                <View
                  style={[
                    estilos.chipBadge,
                    isAtivo ? estilos.chipBadgeAtivo : estilos.chipBadgeInativo,
                  ]}
                >
                  <Text
                    style={[
                      estilos.chipBadgeTexto,
                      isAtivo ? estilos.chipBadgeTextoAtivo : estilos.chipBadgeTextoInativo,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ============================================================== */}
      {/* 3. FEED DE NOTIFICAÇÕES AGRUPADO POR TEMPO (IMG-006)           */}
      {/* ============================================================== */}
      {carregando ? (
        <View style={estilos.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5A1F" />
          <Text style={estilos.loadingTexto}>Carregando notificações...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={estilos.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={onRefresh}
              colors={["#FF5A1F"]}
              tintColor="#FF5A1F"
            />
          }
        >
          {gruposComItens.length === 0 ? (
            <View style={estilos.emptyStateContainer}>
              <View style={estilos.emptyStateIconeWrap}>
                <Feather name="bell-off" size={32} color="#94A3B8" />
              </View>
              <Text style={estilos.emptyStateTitulo}>Nenhuma notificação</Text>
              <Text style={estilos.emptyStateSubtitulo}>
                Não há notificações para a categoria selecionada no momento.
              </Text>
            </View>
          ) : (
            gruposComItens.map((grupo) => {
              const itensDoGrupo = notificacoesFiltradas.filter(
                (n) => n.agrupamento === grupo
              );

              return (
                <View key={grupo} style={estilos.secaoGrupoTemporal}>
                  <Text style={estilos.tituloGrupoTemporal}>{grupo}</Text>

                  <View style={estilos.listaCardsContainer}>
                    {itensDoGrupo.map((item) => (
                      <TouchableOpacity
                        key={`notif-${item.id}`}
                        style={[
                          estilos.cardNotificacao,
                          !item.lida && estilos.cardNotificacaoNaoLida,
                        ]}
                        onPress={() => handleTocarNotificacao(item)}
                        activeOpacity={0.85}
                      >
                        {/* Ícone Semântico Circular */}
                        <View
                          style={[
                            estilos.iconeCircularWrap,
                            { backgroundColor: item.bgIcone },
                          ]}
                        >
                          {renderIconeSemantico(item)}
                        </View>

                        {/* Textos da Notificação */}
                        <View style={estilos.conteudoCard}>
                          <View style={estilos.linhaTituloNotificacao}>
                            <Text
                              style={[
                                estilos.tituloNotificacao,
                                !item.lida && estilos.tituloNotificacaoNaoLida,
                              ]}
                              numberOfLines={1}
                            >
                              {item.titulo}
                            </Text>

                            {!item.lida && <View style={estilos.pontoAzulNaoLido} />}
                          </View>

                          <Text style={estilos.mensagemNotificacao} numberOfLines={2}>
                            {item.mensagem}
                          </Text>

                          <View style={estilos.linhaRodapeCard}>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Feather
                                name="clock"
                                size={11}
                                color="#94A3B8"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={estilos.tempoRelativoTexto}>
                                {item.tempoRelativo}
                              </Text>
                            </View>

                            {item.rotaDestino && (
                              <View style={estilos.acaoVerMais}>
                                <Text style={estilos.textoAcaoVerMais}>Ver detalhes</Text>
                                <Feather name="chevron-right" size={13} color="#FF5A1F" />
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* 4. BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS - RN-001)       */}
      {/* ============================================================== */}
      <TabBarRN001 abaAtiva="notificacoes" />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  bannerSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  textoBannerSimulacao: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },

  // 1. Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTituloArea: {
    flexDirection: "row",
    alignItems: "center",
  },
  botaoVoltar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  badgeHeaderTotal: {
    backgroundColor: "#FF5A1F",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  textoBadgeHeaderTotal: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  botaoMarcarTodas: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
  },
  textoMarcarTodas: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // 2. Chips
  chipsContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 10,
  },
  scrollChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipItemAtivo: {
    backgroundColor: "#FF5A1F",
    borderColor: "#FF5A1F",
  },
  chipTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipTextoAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chipBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  chipBadgeInativo: {
    backgroundColor: "#E2E8F0",
  },
  chipBadgeAtivo: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  chipBadgeTexto: {
    fontSize: 10,
    fontWeight: "700",
  },
  chipBadgeTextoInativo: {
    color: "#475569",
  },
  chipBadgeTextoAtivo: {
    color: "#FFFFFF",
  },

  // 3. Feed
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingTexto: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateIconeWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyStateTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptyStateSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },

  secaoGrupoTemporal: {
    marginBottom: 20,
  },
  tituloGrupoTemporal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  listaCardsContainer: {
    gap: 10,
  },
  cardNotificacao: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardNotificacaoNaoLida: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FED7AA",
    borderLeftWidth: 4,
    borderLeftColor: "#FF5A1F",
  },
  iconeCircularWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  conteudoCard: {
    flex: 1,
  },
  linhaTituloNotificacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  tituloNotificacao: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  tituloNotificacaoNaoLida: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  pontoAzulNaoLido: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5A1F",
    marginLeft: 8,
  },
  mensagemNotificacao: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 8,
  },
  linhaRodapeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tempoRelativoTexto: {
    fontSize: 11,
    color: "#94A3B8",
  },
  acaoVerMais: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoAcaoVerMais: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF5A1F",
    marginRight: 2,
  },

  // 4. Tab Bar (RN-001)
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
