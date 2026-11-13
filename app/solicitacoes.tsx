/**
 * @file solicitacoes.tsx
 * @description Gestão de Solicitações de Aula do Professor [ORI-019 / IMG-011].
 * Implementação fiel à referência visual oficial "Tela de Solicitações de Aula.jpeg":
 * - Abas de controle: Recebidas (com badge), Aguardando confirmação e Histórico
 * - Cards com avatar do aluno, matéria, formato (Presencial/Online), horário proposto, valor e dúvida
 * - Ações bilaterais imediatas: [Aceitar] em verde sólido e [Recusar] em outline
 * - Modal de confirmação de aceite com link para a agenda
 * - Modal de recusa com seleção rápida de justificativa
 * - Barra inferior dockada com as 5 abas da versão Professor (RN-001)
 * - Serviço híbrido com fallback offline e badge de modo de simulação
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  aceitarSolicitacao,
  obterSolicitacoes,
  recusarSolicitacao,
  ResultadoSolicitacoes,
  SolicitacaoAula,
} from "../services/solicitacoesService";

export default function SolicitacoesScreen() {
  const insets = useSafeAreaInsets();
  const { usuarioId } = useAuth() as any;

  // Estado das Abas de Controle (Recebidas / Aguardando / Histórico)
  const [abaAtiva, setAbaAtiva] = useState<"recebidas" | "aguardando" | "historico">("recebidas");

  // Dados e estados de carregamento
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAula[]>([]);
  const [totais, setTotais] = useState({ recebidas: 0, aguardando: 0, historico: 0 });
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [isSimulado, setIsSimulado] = useState<boolean>(false);
  const [filtroTexto, setFiltroTexto] = useState<string>("");

  // Modais Funcionais
  const [solicitacaoAtiva, setSolicitacaoAtiva] = useState<SolicitacaoAula | null>(null);
  const [modalAceitarVisivel, setModalAceitarVisivel] = useState<boolean>(false);
  const [modalRecusarVisivel, setModalRecusarVisivel] = useState<boolean>(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>("Conflito de horário na agenda");
  const [motivoPersonalizado, setMotivoPersonalizado] = useState<string>("");
  const [processandoAcao, setProcessandoAcao] = useState<boolean>(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const res: ResultadoSolicitacoes = await obterSolicitacoes(usuarioId || 2);
      setSolicitacoes(res.dados);
      setTotais(res.totais);
      setIsSimulado(res.isSimulado);
    } catch {
      setIsSimulado(true);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarDados();
  };

  // Filtragem por aba e texto
  const solicitacoesFiltradas = solicitacoes.filter((item) => {
    if (abaAtiva === "recebidas" && item.status !== "PENDENTE") return false;
    if (abaAtiva === "aguardando" && item.status !== "AGUARDANDO_PAGAMENTO") return false;
    if (abaAtiva === "historico" && item.status === "PENDENTE") return false;

    if (filtroTexto.trim() !== "") {
      const q = filtroTexto.toLowerCase();
      const matchNome = item.alunoNome.toLowerCase().includes(q);
      const matchMateria = item.materia.toLowerCase().includes(q);
      const matchTopico = item.topico.toLowerCase().includes(q);
      return matchNome || matchMateria || matchTopico;
    }
    return true;
  });

  const abrirModalAceitar = (item: SolicitacaoAula) => {
    setSolicitacaoAtiva(item);
    setModalAceitarVisivel(true);
  };

  const abrirModalRecusar = (item: SolicitacaoAula) => {
    setSolicitacaoAtiva(item);
    setMotivoSelecionado("Conflito de horário na agenda");
    setMotivoPersonalizado("");
    setModalRecusarVisivel(true);
  };

  const confirmarAceite = async () => {
    if (!solicitacaoAtiva) return;
    setProcessandoAcao(true);
    try {
      const res = await aceitarSolicitacao(solicitacaoAtiva.id);
      setModalAceitarVisivel(false);
      setFeedbackSucesso(res.mensagem);
      carregarDados();
    } finally {
      setProcessandoAcao(false);
    }
  };

  const confirmarRecusa = async () => {
    if (!solicitacaoAtiva) return;
    setProcessandoAcao(true);
    try {
      const motivoFinal = motivoPersonalizado.trim() ? motivoPersonalizado : motivoSelecionado;
      const res = await recusarSolicitacao(solicitacaoAtiva.id, motivoFinal);
      setModalRecusarVisivel(false);
      setFeedbackSucesso(res.mensagem);
      carregarDados();
    } finally {
      setProcessandoAcao(false);
    }
  };

  const MOTIVOS_RECUSA = [
    "Conflito de horário na agenda",
    "Matéria fora do meu escopo atual",
    "Local presencial fora do meu raio",
    "Limite de alunos na semana atingido",
    "Outro motivo",
  ];

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 0. BANNER DISCRETO DE MODO SIMULAÇÃO (OFFLINE)                 */}
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
      {/* 1. HEADER SUPERIOR COM TÍTULO E ATALHO DE AGENDA               */}
      {/* ============================================================== */}
      <View style={estilos.header}>
        <TouchableOpacity
          style={estilos.botaoHeaderCircular}
          onPress={() => router.push("/home-professor" as any)}
          activeOpacity={0.7}
          accessibilityLabel="Voltar para a Home do Professor"
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={estilos.headerTituloContainer}>
          <Text style={estilos.headerTitulo}>Solicitações de Aula</Text>
          <Text style={estilos.headerSubtitulo}>Painel de decisão do docente</Text>
        </View>

        <TouchableOpacity
          style={estilos.botaoHeaderCircular}
          onPress={() => router.push("/agenda" as any)}
          activeOpacity={0.7}
          accessibilityLabel="Ir para Minha Agenda"
        >
          <FontAwesome5 name="calendar-alt" size={16} color="#FF5A1F" />
        </TouchableOpacity>
      </View>

      {/* FEEDBACK DE SUCESSO (DISPARADO APÓS ACEITAR / RECUSAR) */}
      {feedbackSucesso && (
        <View style={estilos.bannerFeedbackSucesso}>
          <Ionicons name="checkmark-circle" size={16} color="#065F46" style={{ marginRight: 6 }} />
          <Text style={estilos.textoFeedbackSucesso}>{feedbackSucesso}</Text>
          <TouchableOpacity onPress={() => setFeedbackSucesso(null)}>
            <Feather name="x" size={16} color="#065F46" />
          </TouchableOpacity>
        </View>
      )}

      {/* ============================================================== */}
      {/* 2. ABAS DE CONTROLE (IMG-011)                                  */}
      {/* ============================================================== */}
      <View style={estilos.abasControleContainer}>
        <TouchableOpacity
          style={[
            estilos.abaBotao,
            abaAtiva === "recebidas" && estilos.abaBotaoAtiva,
          ]}
          onPress={() => setAbaAtiva("recebidas")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              estilos.abaTexto,
              abaAtiva === "recebidas" && estilos.abaTextoAtivo,
            ]}
          >
            Recebidas
          </Text>
          <View
            style={[
              estilos.badgeAba,
              abaAtiva === "recebidas" ? estilos.badgeAbaAtiva : estilos.badgeAbaInativa,
            ]}
          >
            <Text
              style={[
                estilos.textoBadgeAba,
                abaAtiva === "recebidas" ? estilos.textoBadgeAbaAtiva : estilos.textoBadgeAbaInativa,
              ]}
            >
              {totais.recebidas}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            estilos.abaBotao,
            abaAtiva === "aguardando" && estilos.abaBotaoAtiva,
          ]}
          onPress={() => setAbaAtiva("aguardando")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              estilos.abaTexto,
              abaAtiva === "aguardando" && estilos.abaTextoAtivo,
            ]}
          >
            Aguardando
          </Text>
          <View
            style={[
              estilos.badgeAba,
              abaAtiva === "aguardando" ? estilos.badgeAbaAtiva : estilos.badgeAbaInativa,
            ]}
          >
            <Text
              style={[
                estilos.textoBadgeAba,
                abaAtiva === "aguardando" ? estilos.textoBadgeAbaAtiva : estilos.textoBadgeAbaInativa,
              ]}
            >
              {totais.aguardando}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            estilos.abaBotao,
            abaAtiva === "historico" && estilos.abaBotaoAtiva,
          ]}
          onPress={() => setAbaAtiva("historico")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              estilos.abaTexto,
              abaAtiva === "historico" && estilos.abaTextoAtivo,
            ]}
          >
            Histórico
          </Text>
          <View
            style={[
              estilos.badgeAba,
              abaAtiva === "historico" ? estilos.badgeAbaAtiva : estilos.badgeAbaInativa,
            ]}
          >
            <Text
              style={[
                estilos.textoBadgeAba,
                abaAtiva === "historico" ? estilos.textoBadgeAbaAtiva : estilos.textoBadgeAbaInativa,
              ]}
            >
              {totais.historico}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 3. CAMPO DE BUSCA RÁPIDA DE ALUNO OU MATÉRIA                   */}
      {/* ============================================================== */}
      <View style={estilos.linhaBusca}>
        <Feather name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={estilos.inputBusca}
          placeholder="Filtrar por aluno, matéria ou tópico..."
          placeholderTextColor="#94A3B8"
          value={filtroTexto}
          onChangeText={setFiltroTexto}
        />
        {filtroTexto.length > 0 && (
          <TouchableOpacity onPress={() => setFiltroTexto("")}>
            <Feather name="x" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* ============================================================== */}
      {/* 4. LISTA SCROLLÁVEL DE CARDS DE SOLICITAÇÃO (IMG-011)          */}
      {/* ============================================================== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={estilos.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            colors={["#FF5A1F"]}
            tintColor="#FF5A1F"
          />
        }
      >
        {carregando ? (
          <View style={estilos.loadingBox}>
            <ActivityIndicator size="large" color="#FF5A1F" />
            <Text style={estilos.loadingTexto}>Carregando solicitações...</Text>
          </View>
        ) : solicitacoesFiltradas.length === 0 ? (
          <View style={estilos.vazioBox}>
            <View style={estilos.iconeVazioWrap}>
              <FontAwesome5 name="clipboard-check" size={28} color="#94A3B8" />
            </View>
            <Text style={estilos.tituloVazio}>Nenhuma solicitação encontrada</Text>
            <Text style={estilos.subtituloVazio}>
              {abaAtiva === "recebidas"
                ? "Você respondeu a todas as solicitações pendentes no momento."
                : abaAtiva === "aguardando"
                ? "Nenhuma aula aguardando confirmação do aluno no momento."
                : "Seu histórico de solicitações aparecerá aqui conforme suas respostas."}
            </Text>
          </View>
        ) : (
          solicitacoesFiltradas.map((item) => (
            <View key={item.id} style={estilos.cardSolicitacao}>
              {/* TOPO DO CARD: FOTO, NOME, EMAIL E TEMPO */}
              <View style={estilos.cardTopo}>
                <Image source={{ uri: item.alunoFoto }} style={estilos.avatarAluno} />
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={estilos.nomeAluno}>{item.alunoNome}</Text>
                  <Text style={estilos.emailAluno} numberOfLines={1}>
                    {item.alunoEmail}
                  </Text>
                </View>
                <View style={estilos.tempoTag}>
                  <Feather name="clock" size={11} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoTempoTag}>{item.recebidoHa}</Text>
                </View>
              </View>

              {/* MATÉRIA E TÓPICO */}
              <View style={estilos.blocoMateria}>
                <Text style={estilos.tituloMateria}>{item.materia}</Text>
                <Text style={estilos.topicoMateria}>{item.topico}</Text>
              </View>

              {/* GRID DE INFORMAÇÕES: FORMATO, HORÁRIO E VALOR */}
              <View style={estilos.gridChipsInfo}>
                {/* Formato */}
                <View
                  style={[
                    estilos.chipInfo,
                    item.formato === "PRESENCIAL"
                      ? estilos.chipPresencial
                      : estilos.chipOnline,
                  ]}
                >
                  <Feather
                    name={item.formato === "PRESENCIAL" ? "map-pin" : "video"}
                    size={11}
                    color={item.formato === "PRESENCIAL" ? "#B45309" : "#1D4ED8"}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      estilos.textoChipInfo,
                      { color: item.formato === "PRESENCIAL" ? "#B45309" : "#1D4ED8" },
                    ]}
                  >
                    {item.formato === "PRESENCIAL" ? "Presencial" : "100% Online"}
                  </Text>
                </View>

                {/* Data e Horário */}
                <View style={estilos.chipInfo}>
                  <Feather name="calendar" size={11} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoChipInfo}>
                    {item.data}, {item.horarioInicio} – {item.horarioFim}
                  </Text>
                </View>

                {/* Valor */}
                <View style={[estilos.chipInfo, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                  <Text style={[estilos.textoChipInfo, { color: "#065F46", fontWeight: "700" }]}>
                    R$ {item.valor.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* LOCALIZAÇÃO QUANDO PRESENCIAL */}
              {item.localDescricao && (
                <View style={estilos.linhaLocal}>
                  <Ionicons name="location-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoLocal}>{item.localDescricao}</Text>
                </View>
              )}

              {/* MENSAGEM / DÚVIDA DO ALUNO */}
              {item.mensagemAluno ? (
                <View style={estilos.blocoMensagemAluno}>
                  <FontAwesome5 name="quote-left" size={10} color="#94A3B8" style={{ marginBottom: 4 }} />
                  <Text style={estilos.textoMensagemAluno}>"{item.mensagemAluno}"</Text>
                </View>
              ) : null}

              {/* MOTIVO DE RECUSA (SE APLICÁVEL NO HISTÓRICO) */}
              {item.motivoRecusa && (
                <View style={estilos.blocoMotivoRecusa}>
                  <Text style={estilos.labelMotivoRecusa}>Justificativa de recusa:</Text>
                  <Text style={estilos.textoMotivoRecusa}>{item.motivoRecusa}</Text>
                </View>
              )}

              {/* AÇÕES BILATERAIS IMEDIATAS (CONFORME ABA) */}
              <View style={estilos.cardAcoesLinha}>
                {item.status === "PENDENTE" ? (
                  <>
                    <TouchableOpacity
                      style={estilos.botaoRecusar}
                      onPress={() => abrirModalRecusar(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="x" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text style={estilos.textoBotaoRecusar}>Recusar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={estilos.botaoAceitar}
                      onPress={() => abrirModalAceitar(item)}
                      activeOpacity={0.85}
                    >
                      <Feather name="check" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={estilos.textoBotaoAceitar}>Aceitar Aula</Text>
                    </TouchableOpacity>
                  </>
                ) : item.status === "AGUARDANDO_PAGAMENTO" ? (
                  <View style={estilos.linhaStatusAguardando}>
                    <View style={estilos.tagAguardando}>
                      <Ionicons name="time" size={13} color="#D97706" style={{ marginRight: 4 }} />
                      <Text style={estilos.textoTagAguardando}>Aguardando pagamento do aluno</Text>
                    </View>
                    <TouchableOpacity
                      style={estilos.botaoChatPequeno}
                      onPress={() => router.push("/chat" as any)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color="#FF5A1F" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={estilos.linhaStatusHistorico}>
                    <View
                      style={[
                        estilos.badgeHistorico,
                        item.status === "CONFIRMADA" || item.status === "CONCLUIDA"
                          ? estilos.badgeConfirmadoHist
                          : estilos.badgeRecusadoHist,
                      ]}
                    >
                      <Text
                        style={[
                          estilos.textoBadgeHist,
                          item.status === "CONFIRMADA" || item.status === "CONCLUIDA"
                            ? estilos.textoConfirmadoHist
                            : estilos.textoRecusadoHist,
                        ]}
                      >
                        {item.status === "CONFIRMADA"
                          ? "Confirmada na Agenda"
                          : item.status === "CONCLUIDA"
                          ? "Aula Concluída"
                          : "Solicitação Recusada"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={estilos.botaoVerNaAgenda}
                      onPress={() => router.push("/agenda" as any)}
                    >
                      <Text style={estilos.textoVerNaAgenda}>Ver na agenda &gt;</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* 5. BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS PROFESSOR)      */}
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
          accessibilityLabel="Aba Perfil Professor"
        >
          <FontAwesome5 name="user-tie" size={19} color="#64748B" />
          <Text style={estilos.tabLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* MODAL 1: CONFIRMAR ACEITE DE SOLICITAÇÃO                       */}
      {/* ============================================================== */}
      <Modal visible={modalAceitarVisivel} transparent animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCard}>
            <View style={[estilos.modalIconeWrap, { backgroundColor: "#D1FAE5" }]}>
              <Feather name="check" size={24} color="#059669" />
            </View>

            <Text style={estilos.modalTitulo}>Aceitar Solicitação de Aula</Text>
            <Text style={estilos.modalDescricao}>
              Ao aceitar, a aula será automaticamente inserida na sua agenda e o estudante será notificado.
            </Text>

            {solicitacaoAtiva && (
              <View style={estilos.resumoCardModal}>
                <Text style={estilos.resumoModalAluno}>{solicitacaoAtiva.alunoNome}</Text>
                <Text style={estilos.resumoModalMateria}>{solicitacaoAtiva.materia}</Text>
                <Text style={estilos.resumoModalData}>
                  📅 {solicitacaoAtiva.data} • {solicitacaoAtiva.horarioInicio} às {solicitacaoAtiva.horarioFim}
                </Text>
                <Text style={estilos.resumoModalValor}>
                  💰 R$ {solicitacaoAtiva.valor.toFixed(2)} ({solicitacaoAtiva.formato === "PRESENCIAL" ? "Presencial" : "Online"})
                </Text>
              </View>
            )}

            <View style={estilos.modalBotoesLinha}>
              <TouchableOpacity
                style={estilos.botaoModalVoltar}
                onPress={() => setModalAceitarVisivel(false)}
                disabled={processandoAcao}
              >
                <Text style={estilos.textoBotaoVoltar}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botaoModalConfirmarAceite, { backgroundColor: "#10B981" }]}
                onPress={confirmarAceite}
                disabled={processandoAcao}
              >
                {processandoAcao ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoConfirmar}>Confirmar e Agendar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: CONFIRMAR RECUSA COM JUSTIFICATIVA                    */}
      {/* ============================================================== */}
      <Modal visible={modalRecusarVisivel} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={[estilos.modalCard, { paddingBottom: 24 }]}>
            <View style={[estilos.modalIconeWrap, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="x" size={24} color="#EF4444" />
            </View>

            <Text style={estilos.modalTitulo}>Recusar Solicitação</Text>
            <Text style={estilos.modalDescricao}>
              Selecione o motivo da recusa para enviarmos uma resposta cordial ao estudante:
            </Text>

            <View style={estilos.listaMotivos}>
              {MOTIVOS_RECUSA.map((m, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    estilos.itemMotivo,
                    motivoSelecionado === m && estilos.itemMotivoSelecionado,
                  ]}
                  onPress={() => setMotivoSelecionado(m)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      estilos.radioCircle,
                      motivoSelecionado === m && estilos.radioCircleSelected,
                    ]}
                  >
                    {motivoSelecionado === m && <View style={estilos.radioDot} />}
                  </View>
                  <Text
                    style={[
                      estilos.textoItemMotivo,
                      motivoSelecionado === m && estilos.textoItemMotivoSelecionado,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {motivoSelecionado === "Outro motivo" && (
              <TextInput
                style={estilos.inputMotivoCustom}
                placeholder="Escreva brevemente o motivo..."
                placeholderTextColor="#94A3B8"
                value={motivoPersonalizado}
                onChangeText={setMotivoPersonalizado}
                multiline
                numberOfLines={2}
              />
            )}

            <View style={estilos.modalBotoesLinha}>
              <TouchableOpacity
                style={estilos.botaoModalVoltar}
                onPress={() => setModalRecusarVisivel(false)}
                disabled={processandoAcao}
              >
                <Text style={estilos.textoBotaoVoltar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botaoModalConfirmarAceite, { backgroundColor: "#EF4444" }]}
                onPress={confirmarRecusa}
                disabled={processandoAcao}
              >
                {processandoAcao ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoConfirmar}>Confirmar Recusa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==============================================================================
// ESTILOS VISUAIS (DESIGN SYSTEM OFICIAL ORIENTA 2.0)
// ==============================================================================

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  bannerSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  textoBannerSimulacao: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
  bannerFeedbackSucesso: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#D1FAE5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
  },
  textoFeedbackSucesso: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
    marginRight: 8,
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
  headerTituloContainer: {
    alignItems: "center",
  },
  headerTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitulo: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  botaoHeaderCircular: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  abasControleContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  abaBotao: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    gap: 6,
  },
  abaBotaoAtiva: {
    backgroundColor: "#0F172A",
  },
  abaTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  abaTextoAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  badgeAba: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeAbaAtiva: {
    backgroundColor: "#FF5A1F",
  },
  badgeAbaInativa: {
    backgroundColor: "#E2E8F0",
  },
  textoBadgeAba: {
    fontSize: 10,
    fontWeight: "700",
  },
  textoBadgeAbaAtiva: {
    color: "#FFFFFF",
  },
  textoBadgeAbaInativa: {
    color: "#64748B",
  },
  linhaBusca: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  inputBusca: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTexto: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
  },
  vazioBox: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconeVazioWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  tituloVazio: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  subtituloVazio: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  cardSolicitacao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardTopo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarAluno: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  nomeAluno: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  emailAluno: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  tempoTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoTempoTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  blocoMateria: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FF5A1F",
  },
  tituloMateria: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  topicoMateria: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  gridChipsInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  chipInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipPresencial: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  chipOnline: {
    backgroundColor: "#EFF6FF",
    borderColor: "#DBEAFE",
  },
  textoChipInfo: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  linhaLocal: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  textoLocal: {
    fontSize: 11,
    color: "#64748B",
  },
  blocoMensagemAluno: {
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    marginBottom: 12,
  },
  textoMensagemAluno: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#78350F",
    lineHeight: 17,
  },
  blocoMotivoRecusa: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  labelMotivoRecusa: {
    fontSize: 10,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 2,
  },
  textoMotivoRecusa: {
    fontSize: 11,
    color: "#B91C1C",
  },
  cardAcoesLinha: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  botaoRecusar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    backgroundColor: "#FFFFFF",
  },
  textoBotaoRecusar: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
  botaoAceitar: {
    flex: 1.6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#10B981",
    elevation: 2,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  textoBotaoAceitar: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  linhaStatusAguardando: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tagAguardando: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  textoTagAguardando: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  botaoChatPequeno: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF0E7",
    alignItems: "center",
    justifyContent: "center",
  },
  linhaStatusHistorico: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeHistorico: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeConfirmadoHist: {
    backgroundColor: "#D1FAE5",
  },
  badgeRecusadoHist: {
    backgroundColor: "#FEE2E2",
  },
  textoBadgeHist: {
    fontSize: 11,
    fontWeight: "700",
  },
  textoConfirmadoHist: {
    color: "#065F46",
  },
  textoRecusadoHist: {
    color: "#991B1B",
  },
  botaoVerNaAgenda: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  textoVerNaAgenda: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF5A1F",
  },
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    paddingHorizontal: 8,
    elevation: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalIconeWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  modalDescricao: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  resumoCardModal: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    gap: 4,
  },
  resumoModalAluno: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  resumoModalMateria: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF5A1F",
  },
  resumoModalData: {
    fontSize: 11,
    color: "#475569",
  },
  resumoModalValor: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  listaMotivos: {
    width: "100%",
    gap: 8,
    marginBottom: 12,
  },
  itemMotivo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemMotivoSelecionado: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FECACA",
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: "#EF4444",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  textoItemMotivo: {
    fontSize: 12,
    color: "#334155",
    flex: 1,
  },
  textoItemMotivoSelecionado: {
    fontWeight: "600",
    color: "#991B1B",
  },
  inputMotivoCustom: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: "#0F172A",
    marginBottom: 12,
    textAlignVertical: "top",
  },
  modalBotoesLinha: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  botaoModalVoltar: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotaoVoltar: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  botaoModalConfirmarAceite: {
    flex: 1.6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoConfirmar: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
