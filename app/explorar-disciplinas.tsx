/**
 * @file explorar-disciplinas.tsx
 * @description Catálogo Geral de Disciplinas e Áreas de Ensino [ORI-022].
 * Apresenta a árvore de saberes acadêmicos, métricas do catálogo, busca inteligente
 * em tempo real com contador dinâmico, chips horizontais de macro-áreas, seção de disciplinas
 * em alta, modal de ementa com tópicos demandados, integração com a busca de professores
 * e barra de navegação inferior dockada de 5 abas (Persona Aluno - RN-001).
 */

import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CategoriaAgrupada,
  CONFIG_CATEGORIAS,
  obterCatalogoDisciplinas,
  ResultadoCatalogo,
  SaberItem,
} from "../services/disciplinasService";

export default function ExplorarDisciplinas() {
  const insets = useSafeAreaInsets();

  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [catalogo, setCatalogo] = useState<ResultadoCatalogo>({
    categorias: [],
    todasDisciplinas: [],
    resumo: {
      totalDisciplinas: 0,
      totalCategorias: 0,
      totalProfessores: 0,
      disciplinasEmAlta: [],
    },
    isSimulado: true,
  });

  const [busca, setBusca] = useState<string>("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("TODAS");
  const [disciplinaModal, setDisciplinaModal] = useState<SaberItem | null>(null);

  // Carregar dados iniciais
  const carregarDados = async (isRefresh = false) => {
    if (isRefresh) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    try {
      const resultado = await obterCatalogoDisciplinas();
      setCatalogo(resultado);
    } catch (err) {
      console.warn("Erro ao buscar catálogo de saberes:", err);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Lista de macro-áreas para os chips de filtragem
  const macroAreasChips = useMemo(() => {
    return [
      { id: "TODAS", label: "Todas as Áreas", total: catalogo.todasDisciplinas.length },
      ...catalogo.categorias.map((c) => ({
        id: c.nome,
        label: c.nome,
        total: c.disciplinas.length,
      })),
    ];
  }, [catalogo]);

  // Filtro inteligente de disciplinas
  const disciplinasFiltradas = useMemo(() => {
    let lista = [...catalogo.todasDisciplinas];

    // Filtro por macro-área
    if (categoriaSelecionada !== "TODAS") {
      lista = lista.filter(
        (d) => d.categoria.toLowerCase() === categoriaSelecionada.toLowerCase()
      );
    }

    // Filtro por termo de busca
    if (busca.trim().length > 0) {
      const termo = busca.toLowerCase().trim();
      lista = lista.filter((d) => {
        const noNome = d.nome.toLowerCase().includes(termo);
        const naDescricao = d.descricao.toLowerCase().includes(termo);
        const naCategoria = d.categoria.toLowerCase().includes(termo);
        const nosTopicos = d.topicosPopulares.some((t) =>
          t.toLowerCase().includes(termo)
        );
        return noNome || naDescricao || naCategoria || nosTopicos;
      });
    }

    return lista;
  }, [catalogo.todasDisciplinas, categoriaSelecionada, busca]);

  // Agrupamento das disciplinas filtradas por categoria para exibição em seções
  const secoesAgrupadas = useMemo(() => {
    const mapa: Record<string, SaberItem[]> = {};

    disciplinasFiltradas.forEach((item) => {
      const cat = item.categoria || "Geral";
      if (!mapa[cat]) {
        mapa[cat] = [];
      }
      mapa[cat].push(item);
    });

    return Object.entries(mapa).map(([nomeCat, itens]) => {
      const config = CONFIG_CATEGORIAS[nomeCat] || CONFIG_CATEGORIAS["Geral"];
      return {
        nome: nomeCat,
        config,
        itens,
      };
    });
  }, [disciplinasFiltradas]);

  // Navegar para busca de professores filtrada
  const irParaBusca = (materiaOuCategoria: string, tipo: "materia" | "categoria" = "materia") => {
    if (disciplinaModal) setDisciplinaModal(null);
    router.push({
      pathname: "/busca-professores",
      params: tipo === "materia" ? { materia: materiaOuCategoria } : { categoria: materiaOuCategoria },
    } as any);
  };

  return (
    <SafeAreaView style={estilos.container} edges={["top"]}>
      {/* ============================================================== */}
      {/* 1. HEADER FIXO COM NAVEGAÇÃO E CONTROLE                        */}
      {/* ============================================================== */}
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={estilos.botaoVoltar}
          activeOpacity={0.7}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={estilos.headerInfo}>
          <Text style={estilos.headerTitulo}>Explorar Disciplinas</Text>
          <Text style={estilos.headerSubtitulo}>
            Catálogo completo de áreas e matérias
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => carregarDados(true)}
          style={estilos.botaoRefresh}
          activeOpacity={0.7}
          disabled={atualizando}
          accessibilityLabel="Atualizar catálogo"
        >
          {atualizando ? (
            <ActivityIndicator size="small" color="#FF5A1F" />
          ) : (
            <Feather name="refresh-cw" size={19} color="#475569" />
          )}
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 2. BADGE DE RESILIÊNCIA / MODO SIMULAÇÃO                       */}
      {/* ============================================================== */}
      <View style={estilos.faixaModoSimulacao}>
        <Ionicons
          name={catalogo.isSimulado ? "information-circle-outline" : "checkmark-circle-outline"}
          size={14}
          color={catalogo.isSimulado ? "#D97706" : "#059669"}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            estilos.textoModoSimulacao,
            { color: catalogo.isSimulado ? "#92400E" : "#065F46" },
          ]}
        >
          {catalogo.isSimulado
            ? "⚠️ Modo Simulação: Dados offline em exibição (ORI-022)"
            : "✅ Catálogo sincronizado em tempo real com a API"}
        </Text>
      </View>

      {/* ============================================================== */}
      {/* 3. CONTEÚDO PRINCIPAL SCROLLÁVEL                               */}
      {/* ============================================================== */}
      {carregando ? (
        <View style={estilos.containerCarregando}>
          <ActivityIndicator size="large" color="#FF5A1F" />
          <Text style={estilos.textoCarregando}>Carregando catálogo de saberes...</Text>
        </View>
      ) : (
        <ScrollView
          style={estilos.scrollArea}
          contentContainerStyle={[
            estilos.scrollContent,
            { paddingBottom: insets.bottom + 90 }, // Espaço para a Tab Bar fixa
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() => carregarDados(true)}
              colors={["#FF5A1F"]}
              tintColor="#FF5A1F"
            />
          }
        >
          {/* CARDS DE RESUMO DO CATÁLOGO (3 COLUNAS) */}
          <View style={estilos.gridMetricasCatalogo}>
            <View style={estilos.cardMetricaCatalogo}>
              <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="book" size={18} color="#2563EB" />
              </View>
              <Text style={estilos.valorMetrica}>{catalogo.resumo.totalDisciplinas}</Text>
              <Text style={estilos.labelMetrica}>Disciplinas</Text>
            </View>

            <View style={estilos.cardMetricaCatalogo}>
              <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "#FFF7ED" }]}>
                <Feather name="layers" size={18} color="#FF5A1F" />
              </View>
              <Text style={estilos.valorMetrica}>{catalogo.resumo.totalCategorias}</Text>
              <Text style={estilos.labelMetrica}>Macro-Áreas</Text>
            </View>

            <View style={estilos.cardMetricaCatalogo}>
              <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "#ECFDF5" }]}>
                <FontAwesome5 name="chalkboard-teacher" size={16} color="#059669" />
              </View>
              <Text style={estilos.valorMetrica}>{catalogo.resumo.totalProfessores}+</Text>
              <Text style={estilos.labelMetrica}>Especialistas</Text>
            </View>
          </View>

          {/* BARRA DE BUSCA EM TEMPO REAL */}
          <View style={estilos.containerBusca}>
            <Feather name="search" size={20} color="#94A3B8" style={estilos.iconeLupa} />
            <TextInput
              style={estilos.inputBusca}
              placeholder="Buscar por matéria, tópico ou área..."
              placeholderTextColor="#94A3B8"
              value={busca}
              onChangeText={setBusca}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {busca.length > 0 && (
              <TouchableOpacity
                onPress={() => setBusca("")}
                style={estilos.botaoLimparBusca}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* CONTADOR DE RESULTADOS */}
          <View style={estilos.linhaContador}>
            <Text style={estilos.textoContador}>
              Mostrando <Text style={estilos.textoContadorDestaque}>{disciplinasFiltradas.length}</Text> disciplinas
              {categoriaSelecionada !== "TODAS" ? ` em ${categoriaSelecionada}` : ""}
            </Text>
          </View>

          {/* CHIPS HORIZONTAIS DE MACRO-ÁREAS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.scrollChips}
            style={estilos.containerChips}
          >
            {macroAreasChips.map((chip) => {
              const ativo = categoriaSelecionada === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[estilos.chipCategoria, ativo && estilos.chipCategoriaAtivo]}
                  onPress={() => setCategoriaSelecionada(chip.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[estilos.textoChip, ativo && estilos.textoChipAtivo]}>
                    {chip.label}
                  </Text>
                  <View style={[estilos.badgeChipCount, ativo && estilos.badgeChipCountAtivo]}>
                    <Text style={[estilos.textoChipCount, ativo && estilos.textoChipCountAtivo]}>
                      {chip.total}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ============================================================== */}
          {/* SEÇÃO "EM ALTA NO SEMESTRE" (QUANDO SEM BUSCA ESPECÍFICA)      */}
          {/* ============================================================== */}
          {busca.trim().length === 0 && categoriaSelecionada === "TODAS" && (
            <View style={estilos.secaoEmAlta}>
              <View style={estilos.headerSecao}>
                <View style={estilos.tituloComIcone}>
                  <Text style={estilos.iconeFogo}>🔥</Text>
                  <Text style={estilos.tituloSecao}>Mais Buscadas no Semestre</Text>
                </View>
                <Text style={estilos.subtituloSecao}>Alta demanda de monitoria</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={estilos.scrollEmAlta}
              >
                {catalogo.resumo.disciplinasEmAlta.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={estilos.cardEmAlta}
                    onPress={() => setDisciplinaModal(item)}
                    activeOpacity={0.85}
                  >
                    <View style={estilos.topoCardEmAlta}>
                      <View style={estilos.tagAreaEmAlta}>
                        <Text style={estilos.textoTagAreaEmAlta}>{item.categoria}</Text>
                      </View>
                      <Text style={estilos.precoEmAlta}>R$ {item.mediaPreco.toFixed(0)}/h</Text>
                    </View>

                    <Text style={estilos.nomeEmAlta} numberOfLines={2}>
                      {item.nome}
                    </Text>

                    <Text style={estilos.professoresEmAlta}>
                      👨‍🏫 {item.totalProfessores} mentores disponíveis
                    </Text>

                    <View style={estilos.rodapeCardEmAlta}>
                      <Text style={estilos.linkVerEmenta}>Ver ementa</Text>
                      <Feather name="arrow-right" size={14} color="#FF5A1F" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ============================================================== */}
          {/* SEÇÕES CATEGORIZADAS DE DISCIPLINAS                            */}
          {/* ============================================================== */}
          {secoesAgrupadas.length === 0 ? (
            <View style={estilos.containerVazio}>
              <Feather name="search" size={48} color="#CBD5E1" />
              <Text style={estilos.tituloVazio}>Nenhuma disciplina encontrada</Text>
              <Text style={estilos.subtituloVazio}>
                Tente ajustar os termos da busca ou selecionar outra macro-área no filtro.
              </Text>
              <TouchableOpacity
                style={estilos.botaoResetFiltros}
                onPress={() => {
                  setBusca("");
                  setCategoriaSelecionada("TODAS");
                }}
              >
                <Text style={estilos.textoBotaoReset}>Limpar filtros</Text>
              </TouchableOpacity>
            </View>
          ) : (
            secoesAgrupadas.map(({ nome, config, itens }) => (
              <View key={nome} style={estilos.blocoCategoriaSecao}>
                {/* CABEÇALHO DA ÁREA */}
                <View style={estilos.headerCategoriaBloco}>
                  <View style={[estilos.iconeAreaBox, { backgroundColor: config.bg }]}>
                    <Feather name={config.icone as any} size={20} color={config.cor} />
                  </View>
                  <View style={estilos.textosAreaBox}>
                    <View style={estilos.linhaTituloArea}>
                      <Text style={estilos.tituloArea}>{nome}</Text>
                      <View style={estilos.badgeAreaItens}>
                        <Text style={estilos.textoBadgeAreaItens}>{itens.length} matérias</Text>
                      </View>
                    </View>
                    <Text style={estilos.descArea} numberOfLines={1}>
                      {config.desc}
                    </Text>
                  </View>
                </View>

                {/* GRADE DE DISCIPLINAS DA ÁREA */}
                <View style={estilos.gridDisciplinasArea}>
                  {itens.map((disciplina) => (
                    <TouchableOpacity
                      key={disciplina.id}
                      style={estilos.cardDisciplina}
                      activeOpacity={0.8}
                      onPress={() => setDisciplinaModal(disciplina)}
                    >
                      <View style={estilos.cardDisciplinaHeader}>
                        <Text style={estilos.cardDisciplinaNome} numberOfLines={2}>
                          {disciplina.nome}
                        </Text>
                        <TouchableOpacity
                          onPress={() => irParaBusca(disciplina.nome, "materia")}
                          style={estilos.botaoAtalhoLupa}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Buscar professores desta matéria"
                        >
                          <Feather name="chevron-right" size={18} color="#FF5A1F" />
                        </TouchableOpacity>
                      </View>

                      <Text style={estilos.cardDisciplinaDesc} numberOfLines={2}>
                        {disciplina.descricao}
                      </Text>

                      {/* TÓPICOS EM DESTAQUE (CHIPS MENORES) */}
                      <View style={estilos.tagsTopicosWrapper}>
                        {disciplina.topicosPopulares.slice(0, 2).map((topico, idx) => (
                          <View key={idx} style={estilos.chipMiniTopico}>
                            <Text style={estilos.textoMiniTopico} numberOfLines={1}>
                              {topico}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* RODAPÉ DO CARD: PROFESSORES E PREÇO */}
                      <View style={estilos.cardDisciplinaFooter}>
                        <View style={estilos.infoProfessoresMini}>
                          <FontAwesome5 name="user-graduate" size={12} color="#059669" />
                          <Text style={estilos.textoProfessoresMini}>
                            {disciplina.totalProfessores} mentores
                          </Text>
                        </View>
                        <Text style={estilos.textoPrecoMedio}>
                          a partir de R$ {disciplina.mediaPreco.toFixed(0)}/h
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* 4. MODAL: FICHA E EMENTA COMPLETA DA DISCIPLINA               */}
      {/* ============================================================== */}
      <Modal
        visible={!!disciplinaModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDisciplinaModal(null)}
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContainer}>
            {disciplinaModal && (
              <>
                <View style={estilos.modalHeader}>
                  <View style={estilos.modalHeaderTituloBloco}>
                    <View style={estilos.tagAreaModal}>
                      <Text style={estilos.textoTagAreaModal}>{disciplinaModal.categoria}</Text>
                    </View>
                    <Text style={estilos.modalTitulo}>{disciplinaModal.nome}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDisciplinaModal(null)}
                    style={estilos.botaoFecharModal}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={estilos.modalCorpo}>
                  {/* Descrição / Ementa */}
                  <Text style={estilos.labelSecaoModal}>Ementa e Conteúdo Programático</Text>
                  <Text style={estilos.textoDescricaoModal}>{disciplinaModal.descricao}</Text>

                  {/* Métricas Rápidas */}
                  <View style={estilos.gridMetricasModal}>
                    <View style={estilos.boxMetricaModal}>
                      <Text style={estilos.valorMetricaModal}>{disciplinaModal.totalProfessores}</Text>
                      <Text style={estilos.labelMetricaModal}>Mentores Ativos</Text>
                    </View>
                    <View style={estilos.boxMetricaModal}>
                      <Text style={estilos.valorMetricaModal}>R$ {disciplinaModal.mediaPreco.toFixed(2)}</Text>
                      <Text style={estilos.labelMetricaModal}>Preço Médio / h</Text>
                    </View>
                    <View style={estilos.boxMetricaModal}>
                      <Text style={estilos.valorMetricaModal}>4.9 ★</Text>
                      <Text style={estilos.labelMetricaModal}>Avaliação Média</Text>
                    </View>
                  </View>

                  {/* Tópicos Mais Solicitados para Mentoria */}
                  <Text style={estilos.labelSecaoModal}>Tópicos com Maior Demanda</Text>
                  <View style={estilos.containerTopicosModal}>
                    {disciplinaModal.topicosPopulares.map((topico, idx) => (
                      <View key={idx} style={estilos.chipTopicoModal}>
                        <Feather name="check" size={12} color="#059669" style={{ marginRight: 6 }} />
                        <Text style={estilos.textoTopicoModal}>{topico}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Dica Pedagógica */}
                  <View style={estilos.boxDicaModal}>
                    <Ionicons name="bulb-outline" size={18} color="#FF5A1F" style={{ marginRight: 8 }} />
                    <Text style={estilos.textoDicaModal}>
                      Você pode solicitar aulas particulares online ou presenciais, focadas em dúvidas de listas ou revisão para provas.
                    </Text>
                  </View>
                </ScrollView>

                {/* Ações Inferiores do Modal */}
                <View style={estilos.modalRodapeAcoes}>
                  <TouchableOpacity
                    style={estilos.botaoBuscarProfessoresModal}
                    onPress={() => irParaBusca(disciplinaModal.nome, "materia")}
                    activeOpacity={0.85}
                  >
                    <FontAwesome5 name="search" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={estilos.textoBotaoBuscarModal}>Buscar Professores Desta Matéria</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={estilos.botaoVoltarModal}
                    onPress={() => setDisciplinaModal(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={estilos.textoBotaoVoltarModal}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 5. BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS ALUNO - RN-001) */}
      {/* ============================================================== */}
      <View
        style={[
          estilos.tabBarContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/(tabs)" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Home Aluno"
        >
          <FontAwesome5 name="home" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/busca-professores" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Buscar Professores"
        >
          <FontAwesome5 name="search" size={20} color="#FF5A1F" />
          <Text style={[estilos.tabLabel, estilos.tabLabelAtivo]}>Buscar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/chat" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Mensagens"
        >
          <Feather name="message-square" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/agenda" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Agenda"
        >
          <FontAwesome5 name="calendar-alt" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/perfil" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Perfil"
        >
          <FontAwesome5 name="user-alt" size={19} color="#64748B" />
          <Text style={estilos.tabLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==============================================================
// ESTILOS E TOKENS DE DESIGN (DESIGN SYSTEM ORIENTA 2.0)
// ==============================================================
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  botaoVoltar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerTitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitulo: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  botaoRefresh: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  faixaModoSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  textoModoSimulacao: {
    fontSize: 11,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  containerCarregando: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  textoCarregando: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },

  // CARDS DE RESUMO (MÉTRICAS DO CATÁLOGO)
  gridMetricasCatalogo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  cardMetricaCatalogo: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconeMetricaWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  valorMetrica: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  labelMetrica: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },

  // CAMPO DE BUSCA
  containerBusca: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  iconeLupa: {
    marginRight: 10,
  },
  inputBusca: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },
  botaoLimparBusca: {
    padding: 4,
  },
  linhaContador: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  textoContador: {
    fontSize: 12,
    color: "#64748B",
  },
  textoContadorDestaque: {
    fontWeight: "700",
    color: "#0F172A",
  },

  // CHIPS HORIZONTAIS
  containerChips: {
    marginBottom: 16,
  },
  scrollChips: {
    paddingRight: 8,
    gap: 8,
  },
  chipCategoria: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipCategoriaAtivo: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  textoChip: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  textoChipAtivo: {
    color: "#FFFFFF",
  },
  badgeChipCount: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  badgeChipCountAtivo: {
    backgroundColor: "#334155",
  },
  textoChipCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  textoChipCountAtivo: {
    color: "#F8FAFC",
  },

  // SEÇÃO EM ALTA NO SEMESTRE
  secaoEmAlta: {
    marginBottom: 20,
  },
  headerSecao: {
    marginBottom: 10,
  },
  tituloComIcone: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconeFogo: {
    fontSize: 16,
    marginRight: 6,
  },
  tituloSecao: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtituloSecao: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  scrollEmAlta: {
    paddingRight: 8,
    gap: 12,
  },
  cardEmAlta: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topoCardEmAlta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tagAreaEmAlta: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  textoTagAreaEmAlta: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  precoEmAlta: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  nomeEmAlta: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 36,
  },
  professoresEmAlta: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 12,
  },
  rodapeCardEmAlta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  linkVerEmenta: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // BLOCO DE CATEGORIA
  blocoCategoriaSecao: {
    marginBottom: 24,
  },
  headerCategoriaBloco: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconeAreaBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textosAreaBox: {
    flex: 1,
  },
  linhaTituloArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tituloArea: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  badgeAreaItens: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  textoBadgeAreaItens: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  descArea: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  // GRADE DE DISCIPLINAS
  gridDisciplinasArea: {
    gap: 10,
  },
  cardDisciplina: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  cardDisciplinaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardDisciplinaNome: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
  },
  botaoAtalhoLupa: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  cardDisciplinaDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginBottom: 10,
  },
  tagsTopicosWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  chipMiniTopico: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textoMiniTopico: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "500",
  },
  cardDisciplinaFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  infoProfessoresMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  textoProfessoresMini: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  textoPrecoMedio: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // ESTADO VAZIO
  containerVazio: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tituloVazio: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 14,
  },
  subtituloVazio: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  botaoResetFiltros: {
    marginTop: 16,
    backgroundColor: "#FF5A1F",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  textoBotaoReset: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // MODAL EMENTA DA DISCIPLINA
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    maxHeight: "85%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTituloBloco: {
    flex: 1,
    marginRight: 10,
  },
  tagAreaModal: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  textoTagAreaModal: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
  },
  botaoFecharModal: {
    padding: 4,
  },
  modalCorpo: {
    padding: 18,
  },
  labelSecaoModal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  textoDescricaoModal: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 16,
  },
  gridMetricasModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  boxMetricaModal: {
    flex: 1,
    alignItems: "center",
  },
  valorMetricaModal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  labelMetricaModal: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  containerTopicosModal: {
    gap: 8,
    marginBottom: 18,
  },
  chipTopicoModal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textoTopicoModal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  boxDicaModal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  textoDicaModal: {
    fontSize: 12,
    color: "#9A3412",
    lineHeight: 16,
    flex: 1,
  },
  modalRodapeAcoes: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  botaoBuscarProfessoresModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5A1F",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#FF5A1F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  textoBotaoBuscarModal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  botaoVoltarModal: {
    alignItems: "center",
    paddingVertical: 8,
  },
  textoBotaoVoltarModal: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  // BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS ALUNO - RN-001)
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
  },
  tabLabelAtivo: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
});
