/**
 * @file historico-alunos.tsx
 * @description Gestão de Alunos Atendidos pelo Professor ("Meus Alunos") [ORI-021].
 * Interface moderna e responsiva alinhada ao Design System Orienta 2.0 com:
 * 1. Header superior com botão voltar para a Home do Professor (/home-professor) e atualização.
 * 2. Badge semântico de resiliência e modo simulação offline.
 * 3. Cards de métricas rápidas no topo (Total de Alunos, Aulas Concluídas, Taxa de Recorrência).
 * 4. Barra de pesquisa em tempo real com contador dinâmico de estudantes.
 * 5. Chips horizontais de filtragem por formato (Todos, Ativos, Presencial, Online, Recorrentes).
 * 6. Cards de estudantes ricos com avatar real, status, curso, disciplinas, horas e data do último encontro.
 * 7. Ações imediatas: botão direto de Chat e botão para abrir a Ficha Completa do Aluno.
 * 8. Modal de Ficha do Aluno com histórico detalhado de encontros e anotações pedagógicas.
 * 9. Barra inferior de 5 abas oficial da persona Professor (RN-001).
 */

import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { useAuth } from "../context/AuthContext";
import {
  AlunoHistorico,
  obterHistoricoAlunos,
  ResultadoHistoricoAlunos,
  MOCK_ALUNOS_OFICIAIS,
} from "../services/historicoAlunosService";

export default function HistoricoAlunosScreen() {
  const insets = useSafeAreaInsets();
  const { usuarioId } = useAuth() as any;

  // Estados de dados e carregamento
  const [dados, setDados] = useState<ResultadoHistoricoAlunos>({
    alunos: MOCK_ALUNOS_OFICIAIS,
    resumo: {
      totalAlunos: 38,
      aulasConcluidas: 24,
      taxaRecorrencia: 72,
      novosMes: 6,
    },
    isSimulado: true,
  });
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // Estados de pesquisa e filtros
  const [busca, setBusca] = useState("");
  const [filtroFormato, setFiltroFormato] = useState<"TODOS" | "ATIVOS" | "PRESENCIAL" | "ONLINE" | "RECORRENTES">("TODOS");

  // Estado do Modal de Ficha do Aluno
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoHistorico | null>(null);
  const [modalFichaVisivel, setModalFichaVisivel] = useState(false);

  /**
   * Carrega os dados de histórico de alunos via serviço híbrido
   */
  const carregarAlunos = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    try {
      const res = await obterHistoricoAlunos(usuarioId ? Number(usuarioId) : undefined);
      setDados(res);
    } catch {
      // Fallback gracioso
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    carregarAlunos();
  }, [carregarAlunos]);

  /**
   * Filtragem em memória combinando o termo de busca com os chips de segmento
   */
  const alunosFiltrados = useMemo(() => {
    let lista = dados.alunos;

    // Filtro por texto (nome, curso, instituição ou disciplinas)
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (a) =>
          a.nome.toLowerCase().includes(termo) ||
          a.curso.toLowerCase().includes(termo) ||
          a.instituicao.toLowerCase().includes(termo) ||
          a.disciplinas.some((d) => d.toLowerCase().includes(termo))
      );
    }

    // Filtro por segmento
    if (filtroFormato === "ATIVOS") {
      lista = lista.filter((a) => a.statusMentoria === "ATIVO");
    } else if (filtroFormato === "PRESENCIAL") {
      lista = lista.filter((a) => a.formatoPreferido === "PRESENCIAL" || a.formatoPreferido === "HIBRIDO");
    } else if (filtroFormato === "ONLINE") {
      lista = lista.filter((a) => a.formatoPreferido === "ONLINE" || a.formatoPreferido === "HIBRIDO");
    } else if (filtroFormato === "RECORRENTES") {
      lista = lista.filter((a) => a.totalAulas >= 3);
    }

    return lista;
  }, [dados.alunos, busca, filtroFormato]);

  // Abertura da Ficha do Aluno
  const abrirFicha = (aluno: AlunoHistorico) => {
    setAlunoSelecionado(aluno);
    setModalFichaVisivel(true);
  };

  // Navegar para o chat com o aluno
  const iniciarChat = (aluno: AlunoHistorico) => {
    setModalFichaVisivel(false);
    router.push({
      pathname: "/chat",
      params: { alunoId: aluno.id, nome: aluno.nome },
    } as any);
  };

  return (
    <SafeAreaView style={estilos.container} edges={["top"]}>
      {/* ============================================================== */}
      {/* 1. HEADER FIXO COM NAVEGAÇÃO CONTEXTUAL E CONTROLE             */}
      {/* ============================================================== */}
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => router.push("/home-professor" as any)}
          style={estilos.botaoVoltar}
          activeOpacity={0.7}
          accessibilityLabel="Voltar para a Home do Professor"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={estilos.headerInfo}>
          <Text style={estilos.headerTitulo}>Meus Alunos</Text>
          <Text style={estilos.headerSubtitulo}>
            {dados.resumo.totalAlunos} estudantes vinculados
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => carregarAlunos(true)}
          style={estilos.botaoRefresh}
          activeOpacity={0.7}
          disabled={atualizando}
          accessibilityLabel="Atualizar lista de alunos"
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
          name={dados.isSimulado ? "information-circle-outline" : "checkmark-circle-outline"}
          size={14}
          color={dados.isSimulado ? "#D97706" : "#059669"}
          style={{ marginRight: 6 }}
        />
        <Text style={[estilos.textoModoSimulacao, { color: dados.isSimulado ? "#92400E" : "#065F46" }]}>
          {dados.isSimulado
            ? "⚠️ Modo Simulação: Dados offline em exibição (ORI-021)"
            : "✅ Alunos sincronizados em tempo real com a API"}
        </Text>
      </View>

      {/* ============================================================== */}
      {/* 3. CONTEÚDO SCROLLÁVEL: MÉTRICAS, BUSCA, FILTROS E ALUNOS      */}
      {/* ============================================================== */}
      <ScrollView
        style={estilos.scrollArea}
        contentContainerStyle={[
          estilos.scrollContent,
          { paddingBottom: insets.bottom + 85 }, // Espaço para a Tab Bar fixa
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => carregarAlunos(true)}
            colors={["#FF5A1F"]}
            tintColor="#FF5A1F"
          />
        }
      >
        {/* CARDS DE RESUMO DE ATENDIMENTO (3 COLUNAS) */}
        <View style={estilos.gridMetricasAlunos}>
          {/* Card 1: Total de Alunos */}
          <View style={estilos.cardMetricaAluno}>
            <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "#FFF7ED" }]}>
              <Feather name="users" size={16} color="#FF5A1F" />
            </View>
            <Text style={estilos.valorMetrica}>{dados.resumo.totalAlunos}</Text>
            <Text style={estilos.labelMetrica}>Alunos Atendidos</Text>
            <View style={estilos.tagNovoMes}>
              <Text style={estilos.textoTagNovoMes}>+{dados.resumo.novosMes} este mês</Text>
            </View>
          </View>

          {/* Card 2: Aulas Concluídas */}
          <View style={estilos.cardMetricaAluno}>
            <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "#EFF6FF" }]}>
              <FontAwesome5 name="chalkboard-teacher" size={14} color="#2563EB" />
            </View>
            <Text style={estilos.valorMetrica}>{dados.resumo.aulasConcluidas}</Text>
            <Text style={estilos.labelMetrica}>Aulas Ministradas</Text>
            <Text style={estilos.subMetrica}>No período ativo</Text>
          </View>

          {/* Card 3: Taxa de Recorrência */}
          <View style={estilos.cardMetricaAluno}>
            <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "#ECFDF5" }]}>
              <MaterialCommunityIcons name="repeat" size={16} color="#10B981" />
            </View>
            <Text style={[estilos.valorMetrica, { color: "#059669" }]}>
              {dados.resumo.taxaRecorrencia}%
            </Text>
            <Text style={estilos.labelMetrica}>Recorrência</Text>
            <Text style={estilos.subMetrica}>2+ encontros</Text>
          </View>
        </View>

        {/* CAMPO DE BUSCA INTELIGENTE */}
        <View style={estilos.containerBarraBusca}>
          <Feather name="search" size={18} color="#64748B" style={estilos.iconeBusca} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome, curso ou disciplina..."
            placeholderTextColor="#94A3B8"
            style={estilos.inputBusca}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca("")} style={estilos.botaoLimparBusca}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* CHIPS HORIZONTAIS DE FILTRAGEM */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.containerFiltrosHorizontal}
        >
          {(
            [
              { id: "TODOS", label: "Todos", count: dados.alunos.length },
              { id: "ATIVOS", label: "Ativos", count: dados.alunos.filter((a) => a.statusMentoria === "ATIVO").length },
              { id: "PRESENCIAL", label: "Presencial", count: dados.alunos.filter((a) => a.formatoPreferido === "PRESENCIAL" || a.formatoPreferido === "HIBRIDO").length },
              { id: "ONLINE", label: "100% Online", count: dados.alunos.filter((a) => a.formatoPreferido === "ONLINE" || a.formatoPreferido === "HIBRIDO").length },
              { id: "RECORRENTES", label: "Recorrentes (3+ aulas)", count: dados.alunos.filter((a) => a.totalAulas >= 3).length },
            ] as const
          ).map((chip) => {
            const isActive = filtroFormato === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setFiltroFormato(chip.id)}
                style={[estilos.chipFiltro, isActive && estilos.chipFiltroAtivo]}
                activeOpacity={0.7}
              >
                <Text style={[estilos.textoChipFiltro, isActive && estilos.textoChipFiltroAtivo]}>
                  {chip.label}
                </Text>
                <View style={[estilos.badgeContadorChip, isActive && estilos.badgeContadorChipAtivo]}>
                  <Text style={[estilos.textoBadgeContador, isActive && estilos.textoBadgeContadorAtivo]}>
                    {chip.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CONTADOR DE RESULTADOS */}
        <View style={estilos.linhaContador}>
          <Text style={estilos.textoResultadosContador}>
            Exibindo <Text style={{ fontWeight: "700", color: "#0F172A" }}>{alunosFiltrados.length}</Text>{" "}
            {alunosFiltrados.length === 1 ? "estudante" : "estudantes"}
          </Text>
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca("")}>
              <Text style={estilos.linkLimparFiltros}>Limpar busca</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* LISTA DE CARDS DE ALUNOS */}
        {carregando ? (
          <View style={estilos.loadingContainer}>
            <ActivityIndicator size="large" color="#FF5A1F" />
            <Text style={estilos.loadingText}>Carregando histórico de alunos...</Text>
          </View>
        ) : alunosFiltrados.length === 0 ? (
          <View style={estilos.emptyStateContainer}>
            <Feather name="user-x" size={44} color="#CBD5E1" />
            <Text style={estilos.emptyStateTitulo}>Nenhum aluno encontrado</Text>
            <Text style={estilos.emptyStateSubtitulo}>
              Tente alterar os termos da busca ou selecione outro filtro para visualizar seus alunos.
            </Text>
            <TouchableOpacity onPress={() => { setBusca(""); setFiltroFormato("TODOS"); }} style={estilos.botaoResetarFiltros}>
              <Text style={estilos.textoBotaoResetar}>Ver todos os alunos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={estilos.listaCardsContainer}>
            {alunosFiltrados.map((aluno) => (
              <View key={aluno.id} style={estilos.cardAluno}>
                {/* TOPO DO CARD: AVATAR, STATUS E IDENTIFICAÇÃO */}
                <View style={estilos.cardAlunoTopo}>
                  <View style={estilos.avatarContainer}>
                    <Image source={{ uri: aluno.fotoUrl }} style={estilos.avatarFoto} />
                    {aluno.onlineAgora && <View style={estilos.dotOnline} />}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={estilos.linhaNomeAluno}>
                      <Text style={estilos.nomeAluno} numberOfLines={1}>
                        {aluno.nome}
                      </Text>
                      <View
                        style={[
                          estilos.badgeStatusAluno,
                          aluno.statusMentoria === "ATIVO"
                            ? estilos.badgeAtivo
                            : aluno.statusMentoria === "CONCLUIDO"
                            ? estilos.badgeConcluido
                            : estilos.badgeAguardando,
                        ]}
                      >
                        <Text
                          style={[
                            estilos.textoStatusAluno,
                            aluno.statusMentoria === "ATIVO"
                              ? estilos.textoAtivo
                              : aluno.statusMentoria === "CONCLUIDO"
                              ? estilos.textoConcluido
                              : estilos.textoAguardando,
                          ]}
                        >
                          {aluno.statusMentoria === "ATIVO"
                            ? "Ativo"
                            : aluno.statusMentoria === "CONCLUIDO"
                            ? "Concluído"
                            : "Aguardando"}
                        </Text>
                      </View>
                    </View>

                    <Text style={estilos.cursoInstituicaoAluno} numberOfLines={1}>
                      {aluno.curso} • {aluno.instituicao}
                    </Text>

                    <Text style={estilos.emailAluno} numberOfLines={1}>
                      {aluno.email}
                    </Text>
                  </View>
                </View>

                {/* TAGS DAS DISCIPLINAS CURSADAS */}
                <View style={estilos.containerTagsDisciplinas}>
                  {aluno.disciplinas.map((disc, idx) => (
                    <View key={idx} style={estilos.tagDisciplina}>
                      <FontAwesome5 name="book-reader" size={10} color="#FF5A1F" style={{ marginRight: 4 }} />
                      <Text style={estilos.textoTagDisciplina}>{disc}</Text>
                    </View>
                  ))}
                </View>

                {/* MÉTRICAS INDIVIDUAIS: AULAS CONCLUÍDAS, HORAS E ÚLTIMA AULA */}
                <View style={estilos.gridEstatisticasAluno}>
                  <View style={estilos.itemEstatisticaAluno}>
                    <Text style={estilos.valorEstatistica}>{aluno.totalAulas}</Text>
                    <Text style={estilos.labelEstatistica}>
                      {aluno.totalAulas === 1 ? "aula feita" : "aulas feitas"}
                    </Text>
                  </View>

                  <View style={estilos.divisorEstatistica} />

                  <View style={estilos.itemEstatisticaAluno}>
                    <Text style={estilos.valorEstatistica}>{aluno.horasTotais}h</Text>
                    <Text style={estilos.labelEstatistica}>horas ded.</Text>
                  </View>

                  <View style={estilos.divisorEstatistica} />

                  <View style={[estilos.itemEstatisticaAluno, { flex: 1.4 }]}>
                    <Text style={estilos.valorEstatistica} numberOfLines={1}>
                      {aluno.ultimaAulaData}
                    </Text>
                    <Text style={estilos.labelEstatistica}>último encontro</Text>
                  </View>
                </View>

                {/* NOTA PEDAGÓGICA OU RESUMO RECENTE */}
                {aluno.ultimaMensagemOuNota && (
                  <View style={estilos.blocoNotaRecente}>
                    <MaterialCommunityIcons name="notebook-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={estilos.textoNotaRecente} numberOfLines={2}>
                      "{aluno.ultimaMensagemOuNota}"
                    </Text>
                  </View>
                )}

                {/* BOTÕES DE AÇÃO IMEDIATA */}
                <View style={estilos.botoesAcaoAluno}>
                  {/* Botão Chat */}
                  <TouchableOpacity
                    style={estilos.botaoAcaoChat}
                    onPress={() => iniciarChat(aluno)}
                    activeOpacity={0.8}
                    accessibilityLabel={`Conversar no chat com ${aluno.nome}`}
                  >
                    <Feather name="message-square" size={15} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={estilos.textoBotaoChat}>Chat</Text>
                  </TouchableOpacity>

                  {/* Botão Ver Ficha Completa */}
                  <TouchableOpacity
                    style={estilos.botaoAcaoFicha}
                    onPress={() => abrirFicha(aluno)}
                    activeOpacity={0.8}
                    accessibilityLabel={`Abrir ficha pedagógica de ${aluno.nome}`}
                  >
                    <Feather name="file-text" size={15} color="#FF5A1F" style={{ marginRight: 6 }} />
                    <Text style={estilos.textoBotaoFicha}>Ficha do Aluno</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* 4. MODAL: FICHA DO ALUNO & HISTÓRICO PEDAGÓGICO                */}
      {/* ============================================================== */}
      <Modal
        visible={modalFichaVisivel}
        animationType="slide"
        transparent
        onRequestClose={() => setModalFichaVisivel(false)}
      >
        <View style={estilos.modalOverlay}>
          <View style={[estilos.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            {/* Header do Modal */}
            <View style={estilos.modalHeader}>
              <View>
                <Text style={estilos.modalTitulo}>Ficha Pedagógica do Aluno</Text>
                <Text style={estilos.modalSubtitulo}>Histórico de acompanhamento e evolução</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalFichaVisivel(false)}
                style={estilos.botaoFecharModal}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            {alunoSelecionado && (
              <ScrollView style={estilos.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Perfil do Estudante no Modal */}
                <View style={estilos.modalPerfilHeader}>
                  <Image source={{ uri: alunoSelecionado.fotoUrl }} style={estilos.modalAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.modalNomeAluno}>{alunoSelecionado.nome}</Text>
                    <Text style={estilos.modalCursoAluno}>
                      {alunoSelecionado.curso} • {alunoSelecionado.periodo}
                    </Text>
                    <Text style={estilos.modalInstituicaoAluno}>{alunoSelecionado.instituicao}</Text>
                    <Text style={estilos.modalEmailAluno}>{alunoSelecionado.email}</Text>
                  </View>
                </View>

                {/* Métricas Consolidadas do Estudante */}
                <View style={estilos.modalGridMetricas}>
                  <View style={estilos.modalCardMetrica}>
                    <Text style={estilos.modalMetricaValor}>{alunoSelecionado.totalAulas}</Text>
                    <Text style={estilos.modalMetricaLabel}>Aulas Realizadas</Text>
                  </View>
                  <View style={estilos.modalCardMetrica}>
                    <Text style={estilos.modalMetricaValor}>{alunoSelecionado.horasTotais}h</Text>
                    <Text style={estilos.modalMetricaLabel}>Horas Dedicadas</Text>
                  </View>
                  <View style={estilos.modalCardMetrica}>
                    <Text style={estilos.modalMetricaValor}>{alunoSelecionado.formatoPreferido}</Text>
                    <Text style={estilos.modalMetricaLabel}>Formato Preferido</Text>
                  </View>
                </View>

                {/* Disciplinas em Andamento */}
                <Text style={estilos.modalSecaoTitulo}>Disciplinas Mentoradas</Text>
                <View style={estilos.containerTagsDisciplinas}>
                  {alunoSelecionado.disciplinas.map((d, i) => (
                    <View key={i} style={estilos.tagDisciplina}>
                      <Text style={estilos.textoTagDisciplina}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Histórico Cronológico de Aulas */}
                <Text style={[estilos.modalSecaoTitulo, { marginTop: 18 }]}>
                  Histórico de Encontros ({alunoSelecionado.historicoAulas.length})
                </Text>

                <View style={estilos.listaHistoricoAulasModal}>
                  {alunoSelecionado.historicoAulas.map((aula, i) => (
                    <View key={aula.id || i} style={estilos.itemHistoricoAula}>
                      <View style={estilos.linhaTopoAula}>
                        <View style={estilos.badgeDataAula}>
                          <Feather name="calendar" size={11} color="#FF5A1F" style={{ marginRight: 4 }} />
                          <Text style={estilos.textoDataAula}>
                            {aula.data} às {aula.hora}
                          </Text>
                        </View>
                        <View style={estilos.badgeFormatoAula}>
                          <Text style={estilos.textoFormatoAula}>{aula.formato}</Text>
                        </View>
                      </View>

                      <Text style={estilos.temaAula}>{aula.tema}</Text>

                      {aula.notaDocente && (
                        <View style={estilos.blocoNotaDocente}>
                          <Text style={estilos.labelNotaDocente}>Anotação pedagógica:</Text>
                          <Text style={estilos.textoNotaDocente}>{aula.notaDocente}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Ações Inferiores do Modal */}
                <View style={estilos.modalBotoesAcao}>
                  <TouchableOpacity
                    style={estilos.botaoModalChat}
                    onPress={() => iniciarChat(alunoSelecionado)}
                    activeOpacity={0.85}
                  >
                    <Feather name="message-square" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={estilos.textoBotaoModalChat}>Abrir Conversa no Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={estilos.botaoModalAgenda}
                    onPress={() => {
                      setModalFichaVisivel(false);
                      router.push("/agenda" as any);
                    }}
                    activeOpacity={0.85}
                  >
                    <FontAwesome5 name="calendar-plus" size={14} color="#FF5A1F" style={{ marginRight: 8 }} />
                    <Text style={estilos.textoBotaoModalAgenda}>Ver Agenda de Aulas</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 5. BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS PROFESSOR - RN) */}
      {/* ============================================================== */}
      <View
        style={[
          estilos.tabBarContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/home-professor" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Home Professor"
        >
          <FontAwesome5 name="home" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/notificacoes" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Notícias"
        >
          <Feather name="bell" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Notícias</Text>
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
          onPress={() => router.push("/painel-ganhos" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Ganhos"
        >
          <FontAwesome5 name="chart-line" size={19} color="#64748B" />
          <Text style={estilos.tabLabel}>Ganhos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/perfil?persona=professor" as any)}
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
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitulo: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  botaoRefresh: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 11.5,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // GRID DE MÉTRICAS
  gridMetricasAlunos: {
    flexDirection: "row",
    gap: 10,
  },
  cardMetricaAluno: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  iconeMetricaWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  valorMetrica: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  labelMetrica: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  tagNovoMes: {
    marginTop: 5,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  textoTagNovoMes: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  subMetrica: {
    fontSize: 9.5,
    color: "#94A3B8",
    marginTop: 5,
  },

  // BARRA DE PESQUISA
  containerBarraBusca: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconeBusca: {
    marginRight: 10,
  },
  inputBusca: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    height: "100%",
  },
  botaoLimparBusca: {
    padding: 4,
  },

  // FILTROS HORIZONTAIS
  containerFiltrosHorizontal: {
    gap: 8,
    paddingVertical: 2,
  },
  chipFiltro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  chipFiltroAtivo: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  textoChipFiltro: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  textoChipFiltroAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  badgeContadorChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  badgeContadorChipAtivo: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  textoBadgeContador: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  textoBadgeContadorAtivo: {
    color: "#FFFFFF",
  },

  // LINHA CONTADOR
  linhaContador: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
    marginTop: 2,
  },
  textoResultadosContador: {
    fontSize: 12,
    color: "#64748B",
  },
  linkLimparFiltros: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#FF5A1F",
  },

  // LISTAGEM DE ALUNOS
  listaCardsContainer: {
    gap: 12,
  },
  cardAluno: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    gap: 12,
  },
  cardAlunoTopo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarFoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
  },
  dotOnline: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  linhaNomeAluno: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nomeAluno: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 6,
  },
  badgeStatusAluno: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeAtivo: {
    backgroundColor: "#ECFDF5",
  },
  badgeConcluido: {
    backgroundColor: "#EFF6FF",
  },
  badgeAguardando: {
    backgroundColor: "#FEF3C7",
  },
  textoStatusAluno: {
    fontSize: 10,
    fontWeight: "700",
  },
  textoAtivo: {
    color: "#047857",
  },
  textoConcluido: {
    color: "#1D4ED8",
  },
  textoAguardando: {
    color: "#B45309",
  },
  cursoInstituicaoAluno: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "500",
    marginTop: 2,
  },
  emailAluno: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 1,
  },

  // TAGS DISCIPLINAS
  containerTagsDisciplinas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagDisciplina: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  textoTagDisciplina: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#C2410C",
  },

  // ESTATÍSTICAS DO ALUNO
  gridEstatisticasAluno: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  itemEstatisticaAluno: {
    flex: 1,
    alignItems: "center",
  },
  divisorEstatistica: {
    width: 1,
    height: 22,
    backgroundColor: "#E2E8F0",
  },
  valorEstatistica: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  labelEstatistica: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 1,
  },

  // NOTA RECENTE
  blocoNotaRecente: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 9,
  },
  textoNotaRecente: {
    fontSize: 11,
    color: "#475569",
    fontStyle: "italic",
    flex: 1,
  },

  // BOTÕES AÇÃO CARD
  botoesAcaoAluno: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  botaoAcaoChat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 9,
    borderRadius: 10,
  },
  textoBotaoChat: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  botaoAcaoFicha: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD3B6",
    paddingVertical: 9,
    borderRadius: 10,
  },
  textoBotaoFicha: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // EMPTY STATE & LOADING
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12.5,
    color: "#64748B",
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyStateTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  emptyStateSubtitulo: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  botaoResetarFiltros: {
    marginTop: 8,
    backgroundColor: "#FF5A1F",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  textoBotaoResetar: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // MODAL FICHA DO ALUNO
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 14,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitulo: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  botaoFecharModal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    paddingVertical: 14,
  },
  modalPerfilHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E2E8F0",
  },
  modalNomeAluno: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCursoAluno: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#FF5A1F",
    marginTop: 1,
  },
  modalInstituicaoAluno: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 1,
  },
  modalEmailAluno: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalGridMetricas: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 14,
  },
  modalCardMetrica: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalMetricaValor: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalMetricaLabel: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  modalSecaoTitulo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  listaHistoricoAulasModal: {
    gap: 10,
  },
  itemHistoricoAula: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  linhaTopoAula: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeDataAula: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoDataAula: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  badgeFormatoAula: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  textoFormatoAula: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#4338CA",
  },
  temaAula: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  blocoNotaDocente: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 2,
  },
  labelNotaDocente: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
  },
  textoNotaDocente: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
  },
  modalBotoesAcao: {
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  botaoModalChat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5A1F",
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#FF5A1F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  textoBotaoModalChat: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  botaoModalAgenda: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFD3B6",
    paddingVertical: 12,
    borderRadius: 12,
  },
  textoBotaoModalAgenda: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // TAB BAR DOCKADA
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
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 3,
  },
});
