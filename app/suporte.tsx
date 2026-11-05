/**
 * @file suporte.tsx
 * @description Central de Ajuda, Suporte ao Usuário e FAQ Interativo [ORI-023].
 * Oferece 3 abas principais:
 * 1. Perguntas Frequentes (FAQ interativo com accordion, busca em tempo real e categorias).
 * 2. Meus Chamados (Histórico auditável com protocolos, status dinâmicos e respostas do suporte).
 * 3. Novo Chamado (Formulário completo com categorias, prioridades e emissão de protocolo).
 * Inclui canal de denúncias éticas, suporte offline resiliente e barra de 5 abas (RN-001).
 */

import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import TabBarRN001 from "../components/navigation/TabBarRN001";
import {
  CategoriaTicket,
  criarTicketSuporte,
  enviarDenunciaSuporte,
  ItemFAQ,
  obterDadosCentralAjuda,
  PrioridadeTicket,
  ResultadoSuporte,
  TicketSuporteItem,
} from "../services/suporteService";
import ModalSuporteTicket from "../components/ModalSuporteTicket";

export default function SuporteScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const perfilAtivo = auth?.perfilAtivo || "Aluno";

  const [abaAtiva, setAbaAtiva] = useState<"faq" | "meus" | "novo">("faq");
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [enviandoTicket, setEnviandoTicket] = useState<boolean>(false);
  const [modalTicketAberto, setModalTicketAberto] = useState<boolean>(false);

  const [dadosSuporte, setDadosSuporte] = useState<ResultadoSuporte>({
    faq: [],
    meusTickets: [],
    resumo: {
      totalTicketsAbertos: 0,
      totalRespondidos: 0,
      tempoMedioResposta: "45 min",
      satisfacaoAtendimento: "98%",
    },
    isSimulado: true,
  });

  // Estado da Busca no FAQ
  const [buscaFaq, setBuscaFaq] = useState<string>("");
  const [categoriaFaqSelecionada, setCategoriaFaqSelecionada] = useState<string>("TODAS");
  const [itemFaqAberto, setItemFaqAberto] = useState<string | null>("faq-1");

  // Estado do Formulário de Novo Chamado
  const [formTitulo, setFormTitulo] = useState<string>("");
  const [formCategoria, setFormCategoria] = useState<CategoriaTicket>("DUVIDA");
  const [formPrioridade, setFormPrioridade] = useState<PrioridadeTicket>("MEDIA");
  const [formDescricao, setFormDescricao] = useState<string>("");
  const [ticketCriadoSucesso, setTicketCriadoSucesso] = useState<TicketSuporteItem | null>(null);

  // Estado do Modal de Denúncia
  const [modalDenunciaAberto, setModalDenunciaAberto] = useState<boolean>(false);
  const [denunciaMotivo, setDenunciaMotivo] = useState<string>("");
  const [denunciaDetalhes, setDenunciaDetalhes] = useState<string>("");

  const carregarDados = async (isRefresh = false) => {
    if (isRefresh) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    try {
      const res = await obterDadosCentralAjuda(1001);
      setDadosSuporte(res);
    } catch (err) {
      console.warn("Erro ao buscar dados de suporte:", err);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtro inteligente do FAQ
  const faqFiltrado = useMemo(() => {
    let lista = [...dadosSuporte.faq];

    if (categoriaFaqSelecionada !== "TODAS") {
      lista = lista.filter((item) => item.categoria === categoriaFaqSelecionada);
    }

    if (buscaFaq.trim().length > 0) {
      const termo = buscaFaq.toLowerCase().trim();
      lista = lista.filter(
        (item) =>
          item.pergunta.toLowerCase().includes(termo) ||
          item.resposta.toLowerCase().includes(termo) ||
          item.categoriaLabel.toLowerCase().includes(termo)
      );
    }

    return lista;
  }, [dadosSuporte.faq, categoriaFaqSelecionada, buscaFaq]);

  // Submissão de novo ticket
  const submeterNovoTicket = async () => {
    if (!formTitulo.trim() || !formDescricao.trim()) {
      Alert.alert("Campos obrigatórios", "Por favor, preencha o assunto e descreva sua solicitação.");
      return;
    }

    setEnviandoTicket(true);
    try {
      const { ticket } = await criarTicketSuporte(1001, {
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim(),
        categoria: formCategoria,
        prioridade: formPrioridade,
      });

      setTicketCriadoSucesso(ticket);
      setDadosSuporte((prev) => ({
        ...prev,
        meusTickets: [ticket, ...prev.meusTickets],
        resumo: {
          ...prev.resumo,
          totalTicketsAbertos: prev.resumo.totalTicketsAbertos + 1,
        },
      }));

      // Limpar formulário
      setFormTitulo("");
      setFormDescricao("");
      setFormCategoria("DUVIDA");
      setFormPrioridade("MEDIA");
    } catch (err) {
      Alert.alert("Erro", "Não foi possível registrar o chamado. Tente novamente.");
    } finally {
      setEnviandoTicket(false);
    }
  };

  // Submissão de denúncia
  const submeterDenuncia = async () => {
    if (!denunciaMotivo.trim() || !denunciaDetalhes.trim()) {
      Alert.alert("Campos obrigatórios", "Por favor, informe o motivo e os detalhes da denúncia.");
      return;
    }

    try {
      const res = await enviarDenunciaSuporte(1001, {
        denunciadoId: 1002,
        motivo: denunciaMotivo.trim(),
        detalhes: denunciaDetalhes.trim(),
      });

      Alert.alert("Denúncia Recebida", res.mensagem);
      setModalDenunciaAberto(false);
      setDenunciaMotivo("");
      setDenunciaDetalhes("");
    } catch (err) {
      Alert.alert("Erro", "Falha ao registrar denúncia.");
    }
  };

  // Helpers visuais de categoria
  const obterCorCategoria = (cat: CategoriaTicket) => {
    switch (cat) {
      case "FINANCEIRO":
        return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
      case "PROBLEMA_TECNICO":
        return { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" };
      case "CONDUTA":
        return { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" };
      default:
        return { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
    }
  };

  const obterCorStatus = (status: string) => {
    switch (status) {
      case "RESPONDIDO":
        return { bg: "#ECFDF5", text: "#047857", label: "Respondido" };
      case "EM_ANDAMENTO":
        return { bg: "#EFF6FF", text: "#1D4ED8", label: "Em Análise" };
      case "FECHADO":
        return { bg: "#F1F5F9", text: "#64748B", label: "Finalizado" };
      default:
        return { bg: "#FEF3C7", text: "#92400E", label: "Aberto" };
    }
  };

  return (
    <SafeAreaView style={estilos.container} edges={["top"]}>
      {/* ============================================================== */}
      {/* 1. HEADER FIXO INSTITUCIONAL                                   */}
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
          <Text style={estilos.headerTitulo}>Central de Ajuda</Text>
          <Text style={estilos.headerSubtitulo}>Suporte, FAQ e mediação de chamados</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => setModalTicketAberto(true)}
            style={estilos.botaoTicketRapido}
            activeOpacity={0.7}
            accessibilityLabel="Abrir Ticket Rápido"
          >
            <Feather name="plus-circle" size={18} color="#FF5A1F" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => carregarDados(true)}
            style={estilos.botaoRefresh}
            activeOpacity={0.7}
            disabled={atualizando}
            accessibilityLabel="Atualizar suporte"
          >
            {atualizando ? (
              <ActivityIndicator size="small" color="#FF5A1F" />
            ) : (
              <Feather name="refresh-cw" size={18} color="#475569" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 2. BADGE DE RESILIÊNCIA / MODO SIMULAÇÃO                       */}
      {/* ============================================================== */}
      <View style={estilos.faixaModoSimulacao}>
        <Ionicons
          name={dadosSuporte.isSimulado ? "information-circle-outline" : "checkmark-circle-outline"}
          size={14}
          color={dadosSuporte.isSimulado ? "#D97706" : "#059669"}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            estilos.textoModoSimulacao,
            { color: dadosSuporte.isSimulado ? "#92400E" : "#065F46" },
          ]}
        >
          {dadosSuporte.isSimulado
            ? "⚠️ Modo Simulação: Dados offline em exibição (ORI-023)"
            : "✅ Canal de suporte sincronizado com a central de atendimento"}
        </Text>
      </View>

      {/* ============================================================== */}
      {/* 3. SELETOR DE ABAS PRINCIPAIS (SEGMENTED CONTROL)              */}
      {/* ============================================================== */}
      <View style={estilos.seletorAbasContainer}>
        <TouchableOpacity
          style={[estilos.abaBotao, abaAtiva === "faq" && estilos.abaBotaoAtiva]}
          onPress={() => setAbaAtiva("faq")}
          activeOpacity={0.8}
        >
          <Feather
            name="help-circle"
            size={15}
            color={abaAtiva === "faq" ? "#FF5A1F" : "#64748B"}
            style={{ marginRight: 6 }}
          />
          <Text style={[estilos.textoAba, abaAtiva === "faq" && estilos.textoAbaAtiva]}>
            FAQ & Dúvidas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.abaBotao, abaAtiva === "meus" && estilos.abaBotaoAtiva]}
          onPress={() => setAbaAtiva("meus")}
          activeOpacity={0.8}
        >
          <Feather
            name="inbox"
            size={15}
            color={abaAtiva === "meus" ? "#FF5A1F" : "#64748B"}
            style={{ marginRight: 6 }}
          />
          <Text style={[estilos.textoAba, abaAtiva === "meus" && estilos.textoAbaAtiva]}>
            Meus Chamados
          </Text>
          {dadosSuporte.meusTickets.length > 0 && (
            <View
              style={[
                estilos.badgeAbaContador,
                abaAtiva === "meus" && estilos.badgeAbaContadorAtivo,
              ]}
            >
              <Text
                style={[
                  estilos.textoBadgeAbaContador,
                  abaAtiva === "meus" && estilos.textoBadgeAbaContadorAtivo,
                ]}
              >
                {dadosSuporte.meusTickets.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.abaBotao, abaAtiva === "novo" && estilos.abaBotaoAtiva]}
          onPress={() => setAbaAtiva("novo")}
          activeOpacity={0.8}
        >
          <Feather
            name="plus-circle"
            size={15}
            color={abaAtiva === "novo" ? "#FF5A1F" : "#64748B"}
            style={{ marginRight: 6 }}
          />
          <Text style={[estilos.textoAba, abaAtiva === "novo" && estilos.textoAbaAtiva]}>
            Abrir Ticket
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 4. CONTEÚDO SCROLLÁVEL CONFORME A ABA ATIVA                    */}
      {/* ============================================================== */}
      {carregando ? (
        <View style={estilos.containerCentralizado}>
          <ActivityIndicator size="large" color="#FF5A1F" />
          <Text style={estilos.textoCarregando}>Carregando central de atendimento...</Text>
        </View>
      ) : (
        <ScrollView
          style={estilos.scrollArea}
          contentContainerStyle={[
            estilos.scrollContent,
            { paddingBottom: insets.bottom + 95 },
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
          {/* ========================================================== */}
          {/* ABA 1: FAQ & BASE DE CONHECIMENTO                          */}
          {/* ========================================================== */}
          {abaAtiva === "faq" && (
            <>
              {/* CARDS DE RESUMO RÁPIDO (3 COLUNAS) */}
              <View style={estilos.gridResumoSuporte}>
                <View style={estilos.cardResumoSuporte}>
                  <View style={[estilos.iconeResumoBox, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="clock" size={16} color="#2563EB" />
                  </View>
                  <Text style={estilos.valorResumo}>{dadosSuporte.resumo.tempoMedioResposta}</Text>
                  <Text style={estilos.labelResumo}>Tempo Médio</Text>
                </View>

                <View style={estilos.cardResumoSuporte}>
                  <View style={[estilos.iconeResumoBox, { backgroundColor: "#ECFDF5" }]}>
                    <Feather name="check-circle" size={16} color="#059669" />
                  </View>
                  <Text style={estilos.valorResumo}>{dadosSuporte.resumo.satisfacaoAtendimento}</Text>
                  <Text style={estilos.labelResumo}>Satisfação</Text>
                </View>

                <View style={estilos.cardResumoSuporte}>
                  <View style={[estilos.iconeResumoBox, { backgroundColor: "#FFF7ED" }]}>
                    <Feather name="shield" size={16} color="#FF5A1F" />
                  </View>
                  <Text style={estilos.valorResumo}>24/7</Text>
                  <Text style={estilos.labelResumo}>Mediação</Text>
                </View>
              </View>

              {/* CAMPO DE BUSCA NO FAQ */}
              <View style={estilos.containerBuscaFaq}>
                <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                <TextInput
                  style={estilos.inputBuscaFaq}
                  placeholder="Pesquisar por dúvidas, regras ou pagamentos..."
                  placeholderTextColor="#94A3B8"
                  value={buscaFaq}
                  onChangeText={setBuscaFaq}
                  autoCapitalize="none"
                />
                {buscaFaq.length > 0 && (
                  <TouchableOpacity onPress={() => setBuscaFaq("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* CHIPS DE FILTRO DO FAQ */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.scrollChipsFaq}>
                {[
                  { id: "TODAS", label: "Todas as Dúvidas" },
                  { id: "AULAS", label: "Aulas & Agendamento" },
                  { id: "PAGAMENTOS", label: "Pagamentos & Saques" },
                  { id: "CONTA", label: "Perfil & Conta" },
                  { id: "SEGURANCA", label: "Segurança & Ética" },
                ].map((chip) => {
                  const ativo = categoriaFaqSelecionada === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[estilos.chipFaq, ativo && estilos.chipFaqAtivo]}
                      onPress={() => setCategoriaFaqSelecionada(chip.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[estilos.textoChipFaq, ativo && estilos.textoChipFaqAtivo]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* LISTA DE ACCORDION FAQ */}
              <View style={estilos.secaoFaqLista}>
                <Text style={estilos.tituloSecaoFaq}>
                  Perguntas Mais Frequentes ({faqFiltrado.length})
                </Text>

                {faqFiltrado.length === 0 ? (
                  <View style={estilos.containerFaqVazio}>
                    <Feather name="help-circle" size={40} color="#CBD5E1" />
                    <Text style={estilos.tituloFaqVazio}>Nenhum artigo encontrado</Text>
                    <Text style={estilos.subtituloFaqVazio}>
                      Não encontrou o que precisava? Abra um chamado direto com nossa equipe.
                    </Text>
                    <TouchableOpacity
                      style={estilos.botaoIrParaNovoTicket}
                      onPress={() => setAbaAtiva("novo")}
                    >
                      <Text style={estilos.textoBotaoIrParaNovoTicket}>Abrir Chamado Agora</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  faqFiltrado.map((item) => {
                    const aberto = itemFaqAberto === item.id;
                    return (
                      <View key={item.id} style={estilos.cardFaqAccordion}>
                        <TouchableOpacity
                          style={estilos.headerFaqAccordion}
                          onPress={() => setItemFaqAberto(aberto ? null : item.id)}
                          activeOpacity={0.8}
                        >
                          <View style={estilos.iconeFaqWrapper}>
                            <Feather name={item.icone as any} size={16} color="#FF5A1F" />
                          </View>
                          <Text style={estilos.perguntaFaqTexto}>{item.pergunta}</Text>
                          <Feather
                            name={aberto ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#94A3B8"
                          />
                        </TouchableOpacity>

                        {aberto && (
                          <View style={estilos.corpoFaqAccordion}>
                            <Text style={estilos.respostaFaqTexto}>{item.resposta}</Text>
                            <View style={estilos.rodapeFaqFeedback}>
                              <Text style={estilos.textoFeedbackAjuda}>Esta resposta foi útil?</Text>
                              <View style={estilos.botoesFeedbackLinha}>
                                <TouchableOpacity
                                  style={estilos.botaoFeedback}
                                  onPress={() => Alert.alert("Obrigado!", "Seu feedback nos ajuda a melhorar.")}
                                >
                                  <Text style={estilos.textoBotaoFeedback}>👍 Sim</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={estilos.botaoFeedback}
                                  onPress={() => setAbaAtiva("novo")}
                                >
                                  <Text style={estilos.textoBotaoFeedback}>👎 Preciso de ajuda</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {/* CARD DE OUVIDORIA / DENÚNCIA RÁPIDA */}
              <View style={estilos.cardOuvidoria}>
                <View style={estilos.iconeOuvidoriaBox}>
                  <Feather name="shield" size={22} color="#DC2626" />
                </View>
                <View style={estilos.textosOuvidoriaBox}>
                  <Text style={estilos.tituloOuvidoria}>Canal de Ética & Moderação</Text>
                  <Text style={estilos.descOuvidoria}>
                    Presenciou assédio, descumprimento de regras ou conduta irregular? Reporte com sigilo garantido.
                  </Text>
                  <TouchableOpacity
                    style={estilos.botaoRegistrarDenuncia}
                    onPress={() => setModalDenunciaAberto(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={estilos.textoBotaoRegistrarDenuncia}>Registrar Denúncia Formal</Text>
                    <Feather name="arrow-right" size={14} color="#DC2626" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ========================================================== */}
          {/* ABA 2: MEUS CHAMADOS (HISTÓRICO DE TICKETS)                 */}
          {/* ========================================================== */}
          {abaAtiva === "meus" && (
            <View style={estilos.containerMeusChamados}>
              <View style={estilos.topoMeusChamadosLinha}>
                <Text style={estilos.tituloMeusChamados}>
                  Seus Chamados Registrados ({dadosSuporte.meusTickets.length})
                </Text>
                <TouchableOpacity
                  style={estilos.botaoMiniNovoChamado}
                  onPress={() => setAbaAtiva("novo")}
                >
                  <Feather name="plus" size={14} color="#FF5A1F" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoMiniNovoChamado}>Novo Chamado</Text>
                </TouchableOpacity>
              </View>

              {dadosSuporte.meusTickets.length === 0 ? (
                <View style={estilos.containerVazioTickets}>
                  <Feather name="inbox" size={48} color="#CBD5E1" />
                  <Text style={estilos.tituloVazioTickets}>Nenhum chamado aberto</Text>
                  <Text style={estilos.subtituloVazioTickets}>
                    Você ainda não abriu nenhum ticket de suporte. Caso tenha alguma dúvida ou problema, clique no botão abaixo.
                  </Text>
                  <TouchableOpacity
                    style={estilos.botaoCriarPrimeiroTicket}
                    onPress={() => setAbaAtiva("novo")}
                  >
                    <Text style={estilos.textoBotaoCriarPrimeiroTicket}>Abrir meu primeiro chamado</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                dadosSuporte.meusTickets.map((ticket) => {
                  const st = obterCorStatus(ticket.status);
                  const catStyle = obterCorCategoria(ticket.categoria);
                  return (
                    <View key={ticket.id} style={estilos.cardTicketItem}>
                      {/* TOPO DO CARD: PROTOCOLO E STATUS */}
                      <View style={estilos.cardTicketTopo}>
                        <View style={estilos.protocoloBadge}>
                          <Feather name="tag" size={11} color="#FF5A1F" style={{ marginRight: 4 }} />
                          <Text style={estilos.textoProtocolo}>{ticket.protocolo}</Text>
                        </View>
                        <View style={[estilos.statusBadge, { backgroundColor: st.bg }]}>
                          <Text style={[estilos.textoStatus, { color: st.text }]}>{st.label}</Text>
                        </View>
                      </View>

                      {/* TÍTULO E CATEGORIA */}
                      <Text style={estilos.tituloTicket}>{ticket.titulo}</Text>

                      <View style={estilos.tagsTicketLinha}>
                        <View style={[estilos.chipCategoriaTicket, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
                          <Text style={[estilos.textoChipCategoriaTicket, { color: catStyle.text }]}>
                            {ticket.categoria}
                          </Text>
                        </View>
                        <Text style={estilos.dataCriacaoTicket}>Aberto em: {ticket.criadoEm}</Text>
                      </View>

                      {/* DESCRIÇÃO REGISTRADA */}
                      <Text style={estilos.descricaoTicket}>{ticket.descricao}</Text>

                      {/* PARECER / RESPOSTA DA ADMINISTRAÇÃO */}
                      {ticket.respostaAdmin ? (
                        <View style={estilos.blocoRespostaAdmin}>
                          <View style={estilos.topoRespostaAdmin}>
                            <Feather name="message-square" size={14} color="#059669" style={{ marginRight: 6 }} />
                            <Text style={estilos.autorRespostaAdmin}>{ticket.respondidoPor || "Suporte Orienta"}</Text>
                            {ticket.atualizadoEm && (
                              <Text style={estilos.dataRespostaAdmin}>• {ticket.atualizadoEm}</Text>
                            )}
                          </View>
                          <Text style={estilos.textoRespostaAdmin}>{ticket.respostaAdmin}</Text>
                        </View>
                      ) : (
                        <View style={estilos.blocoAguardandoResposta}>
                          <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 8 }} />
                          <Text style={estilos.textoAguardandoResposta}>
                            Chamado na fila de atendimento. Tempo estimado: 45 min.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ========================================================== */}
          {/* ABA 3: NOVO CHAMADO (FORMULÁRIO AUDITÁVEL)                  */}
          {/* ========================================================== */}
          {abaAtiva === "novo" && (
            <View style={estilos.containerFormNovoTicket}>
              <View style={estilos.topoFormLinha}>
                <Text style={estilos.tituloFormNovo}>Abertura de Chamado</Text>
                <Text style={estilos.subtituloFormNovo}>
                  Preencha os dados abaixo. Um protocolo único de atendimento será emitido.
                </Text>
              </View>

              {/* CAMPO ASSUNTO / TÍTULO */}
              <View style={estilos.grupoCampo}>
                <Text style={estilos.labelCampo}>Assunto da Solicitação *</Text>
                <TextInput
                  style={estilos.inputTexto}
                  placeholder="Ex: Dúvida sobre pagamento da aula de Cálculo"
                  placeholderTextColor="#94A3B8"
                  value={formTitulo}
                  onChangeText={setFormTitulo}
                />
              </View>

              {/* SELETOR DE CATEGORIA */}
              <View style={estilos.grupoCampo}>
                <Text style={estilos.labelCampo}>Categoria do Chamado *</Text>
                <View style={estilos.gridCategoriasForm}>
                  {[
                    { id: "DUVIDA" as CategoriaTicket, label: "Dúvida Geral" },
                    { id: "FINANCEIRO" as CategoriaTicket, label: "Financeiro / PIX" },
                    { id: "PROBLEMA_TECNICO" as CategoriaTicket, label: "Problema Técnico" },
                    { id: "CONDUTA" as CategoriaTicket, label: "Conduta / Moderação" },
                    { id: "OUTRO" as CategoriaTicket, label: "Outro Motivo" },
                  ].map((cat) => {
                    const selecionado = formCategoria === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[estilos.botaoCategoriaForm, selecionado && estilos.botaoCategoriaFormAtivo]}
                        onPress={() => setFormCategoria(cat.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[estilos.textoCategoriaForm, selecionado && estilos.textoCategoriaFormAtivo]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* SELETOR DE PRIORIDADE */}
              <View style={estilos.grupoCampo}>
                <Text style={estilos.labelCampo}>Nível de Urgência</Text>
                <View style={estilos.linhaPrioridadesForm}>
                  {[
                    { id: "BAIXA" as PrioridadeTicket, label: "Baixa" },
                    { id: "MEDIA" as PrioridadeTicket, label: "Média (Padrão)" },
                    { id: "ALTA" as PrioridadeTicket, label: "Alta" },
                    { id: "URGENTE" as PrioridadeTicket, label: "Urgente" },
                  ].map((prio) => {
                    const ativo = formPrioridade === prio.id;
                    return (
                      <TouchableOpacity
                        key={prio.id}
                        style={[estilos.chipPrioridadeForm, ativo && estilos.chipPrioridadeFormAtivo]}
                        onPress={() => setFormPrioridade(prio.id)}
                      >
                        <Text style={[estilos.textoPrioridadeForm, ativo && estilos.textoPrioridadeFormAtivo]}>
                          {prio.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* DESCRIÇÃO DO PROBLEMA */}
              <View style={estilos.grupoCampo}>
                <Text style={estilos.labelCampo}>Descrição Detalhada *</Text>
                <TextInput
                  style={[estilos.inputTexto, estilos.textAreaDescricao]}
                  placeholder="Descreva detalhadamente o ocorrido, informando datas, nomes e detalhes relevantes..."
                  placeholderTextColor="#94A3B8"
                  value={formDescricao}
                  onChangeText={setFormDescricao}
                  multiline={true}
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              {/* BANNER INFORMATIVO */}
              <View style={estilos.bannerSegurancaForm}>
                <Feather name="shield" size={16} color="#059669" style={{ marginRight: 8 }} />
                <Text style={estilos.textoBannerSegurancaForm}>
                  Seu chamado será analisado por nossos mediadores acadêmicos. Garantimos confidencialidade e resposta rápida.
                </Text>
              </View>

              {/* BOTÃO DE SUBMISSÃO */}
              <TouchableOpacity
                style={[estilos.botaoEnviarTicket, enviandoTicket && { opacity: 0.7 }]}
                onPress={submeterNovoTicket}
                disabled={enviandoTicket}
                activeOpacity={0.85}
              >
                {enviandoTicket ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={estilos.textoBotaoEnviarTicket}>Emitir Protocolo e Enviar Chamado</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL DE CONFIRMAÇÃO DO TICKET CRIADO                      */}
      {/* ============================================================== */}
      <Modal
        visible={!!ticketCriadoSucesso}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTicketCriadoSucesso(null)}
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardSucesso}>
            <View style={estilos.iconeSucessoWrapper}>
              <Feather name="check" size={28} color="#059669" />
            </View>

            <Text style={estilos.tituloModalSucesso}>Chamado Registrado!</Text>
            <Text style={estilos.descModalSucesso}>
              Sua solicitação foi registrada com sucesso na central de moderação.
            </Text>

            <View style={estilos.boxProtocoloModal}>
              <Text style={estilos.labelProtocoloModal}>NÚMERO DO PROTOCOLO</Text>
              <Text style={estilos.numeroProtocoloModal}>{ticketCriadoSucesso?.protocolo}</Text>
            </View>

            <Text style={estilos.notaProtocoloModal}>
              Guarde este protocolo para acompanhar a resolução na aba 'Meus Chamados'.
            </Text>

            <TouchableOpacity
              style={estilos.botaoVerMeusChamadosModal}
              onPress={() => {
                setTicketCriadoSucesso(null);
                setAbaAtiva("meus");
              }}
            >
              <Text style={estilos.textoBotaoVerMeusChamadosModal}>Ver Meus Chamados</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.botaoFecharModalSucesso}
              onPress={() => setTicketCriadoSucesso(null)}
            >
              <Text style={estilos.textoBotaoFecharModalSucesso}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 6. MODAL DE DENÚNCIA FORMAL (ÉTICA E CONDUTA)                  */}
      {/* ============================================================== */}
      <Modal
        visible={modalDenunciaAberto}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalDenunciaAberto(false)}
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardDenuncia}>
            <View style={estilos.headerModalDenuncia}>
              <View style={estilos.iconeDenunciaHeaderBox}>
                <Feather name="alert-octagon" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={estilos.tituloModalDenuncia}>Canal de Denúncia</Text>
                <Text style={estilos.subtituloModalDenuncia}>Comitê de Conduta & Ouvidoria</Text>
              </View>
              <TouchableOpacity onPress={() => setModalDenunciaAberto(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              <Text style={estilos.labelCampo}>Motivo da Denúncia *</Text>
              <TextInput
                style={estilos.inputTexto}
                placeholder="Ex: Linguagem ofensiva, assédio, descumprimento de horário..."
                placeholderTextColor="#94A3B8"
                value={denunciaMotivo}
                onChangeText={setDenunciaMotivo}
              />

              <Text style={[estilos.labelCampo, { marginTop: 14 }]}>Relato dos Fatos *</Text>
              <TextInput
                style={[estilos.inputTexto, estilos.textAreaDescricao]}
                placeholder="Descreva o que aconteceu em detalhes. Sua identidade é protegida..."
                placeholderTextColor="#94A3B8"
                value={denunciaDetalhes}
                onChangeText={setDenunciaDetalhes}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={estilos.avisoSigiloDenuncia}>
                <Feather name="lock" size={14} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={estilos.textoAvisoSigiloDenuncia}>
                  Relato 100% confidencial. O denunciado não será notificado sobre quem abriu o caso.
                </Text>
              </View>
            </ScrollView>

            <View style={estilos.rodapeModalDenuncia}>
              <TouchableOpacity
                style={estilos.botaoEnviarDenuncia}
                onPress={submeterDenuncia}
                activeOpacity={0.85}
              >
                <Feather name="shield" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={estilos.textoBotaoEnviarDenuncia}>Enviar Denúncia para Moderação</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 7. MODAL DE SUPORTE E TICKETS COM PROTOCOLO (ORI-028)          */}
      {/* ============================================================== */}
      <ModalSuporteTicket
        visible={modalTicketAberto}
        onClose={() => setModalTicketAberto(false)}
        usuarioId={auth?.usuarioId ? Number(auth.usuarioId) : 1}
        onTicketCriado={() => carregarDados(true)}
      />

      {/* ============================================================== */}
      {/* 8. BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS - RN-001)       */}
      {/* ============================================================== */}
      <TabBarRN001 />
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
  botaoTicketRapido: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD8B5",
    alignItems: "center",
    justifyContent: "center",
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

  // SELETOR DE ABAS
  seletorAbasContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  abaBotaoAtiva: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD8B5",
  },
  textoAba: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  textoAbaAtiva: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
  badgeAbaContador: {
    backgroundColor: "#CBD5E1",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 5,
  },
  badgeAbaContadorAtivo: {
    backgroundColor: "#FF5A1F",
  },
  textoBadgeAbaContador: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  textoBadgeAbaContadorAtivo: {
    color: "#FFFFFF",
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  containerCentralizado: {
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

  // GRID RESUMO
  gridResumoSuporte: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  cardResumoSuporte: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconeResumoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  valorResumo: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  labelResumo: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  // BUSCA FAQ
  containerBuscaFaq: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 10,
  },
  inputBuscaFaq: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  scrollChipsFaq: {
    gap: 6,
    paddingBottom: 12,
  },
  chipFaq: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipFaqAtivo: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  textoChipFaq: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  textoChipFaqAtivo: {
    color: "#FFFFFF",
  },

  // SEÇÃO FAQ
  secaoFaqLista: {
    marginBottom: 20,
  },
  tituloSecaoFaq: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  cardFaqAccordion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  headerFaqAccordion: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  iconeFaqWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  perguntaFaqTexto: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 18,
    paddingRight: 6,
  },
  corpoFaqAccordion: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  respostaFaqTexto: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  rodapeFaqFeedback: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  textoFeedbackAjuda: {
    fontSize: 11,
    color: "#94A3B8",
  },
  botoesFeedbackLinha: {
    flexDirection: "row",
    gap: 8,
  },
  botaoFeedback: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoBotaoFeedback: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  containerFaqVazio: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tituloFaqVazio: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
  },
  subtituloFaqVazio: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  botaoIrParaNovoTicket: {
    backgroundColor: "#FF5A1F",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textoBotaoIrParaNovoTicket: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  // CARD OUVIDORIA
  cardOuvidoria: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 16,
  },
  iconeOuvidoriaBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textosOuvidoriaBox: {
    flex: 1,
  },
  tituloOuvidoria: {
    fontSize: 15,
    fontWeight: "700",
    color: "#991B1B",
  },
  descOuvidoria: {
    fontSize: 12,
    color: "#7F1D1D",
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 10,
  },
  botaoRegistrarDenuncia: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoBotaoRegistrarDenuncia: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },

  // ABA MEUS CHAMADOS
  containerMeusChamados: {
    marginBottom: 20,
  },
  topoMeusChamadosLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tituloMeusChamados: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  botaoMiniNovoChamado: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  textoMiniNovoChamado: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  cardTicketItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTicketTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  protocoloBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoProtocolo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoStatus: {
    fontSize: 10,
    fontWeight: "700",
  },
  tituloTicket: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  tagsTicketLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chipCategoriaTicket: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  textoChipCategoriaTicket: {
    fontSize: 10,
    fontWeight: "700",
  },
  dataCriacaoTicket: {
    fontSize: 11,
    color: "#94A3B8",
  },
  descricaoTicket: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 12,
  },
  blocoRespostaAdmin: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  topoRespostaAdmin: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  autorRespostaAdmin: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  dataRespostaAdmin: {
    fontSize: 10,
    color: "#16A34A",
    marginLeft: 4,
  },
  textoRespostaAdmin: {
    fontSize: 12,
    color: "#14532D",
    lineHeight: 17,
  },
  blocoAguardandoResposta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  textoAguardandoResposta: {
    fontSize: 11,
    color: "#92400E",
    flex: 1,
  },
  containerVazioTickets: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tituloVazioTickets: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
  },
  subtituloVazioTickets: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  botaoCriarPrimeiroTicket: {
    backgroundColor: "#FF5A1F",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  textoBotaoCriarPrimeiroTicket: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // ABA NOVO CHAMADO (FORMULÁRIO)
  containerFormNovoTicket: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  topoFormLinha: {
    marginBottom: 14,
  },
  tituloFormNovo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtituloFormNovo: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  grupoCampo: {
    marginBottom: 14,
  },
  labelCampo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  inputTexto: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  textAreaDescricao: {
    minHeight: 100,
  },
  gridCategoriasForm: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  botaoCategoriaForm: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  botaoCategoriaFormAtivo: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  textoCategoriaForm: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  textoCategoriaFormAtivo: {
    color: "#FFFFFF",
  },
  linhaPrioridadesForm: {
    flexDirection: "row",
    gap: 6,
  },
  chipPrioridadeForm: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipPrioridadeFormAtivo: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FF5A1F",
  },
  textoPrioridadeForm: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  textoPrioridadeFormAtivo: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
  bannerSegurancaForm: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 16,
  },
  textoBannerSegurancaForm: {
    fontSize: 11,
    color: "#065F46",
    flex: 1,
    lineHeight: 16,
  },
  botaoEnviarTicket: {
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
  textoBotaoEnviarTicket: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // MODAL SUCESSO TICKET
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCardSucesso: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconeSucessoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  tituloModalSucesso: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  descModalSucesso: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 19,
  },
  boxProtocoloModal: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    width: "100%",
  },
  labelProtocoloModal: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  numeroProtocoloModal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF5A1F",
    marginTop: 2,
  },
  notaProtocoloModal: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 18,
  },
  botaoVerMeusChamadosModal: {
    backgroundColor: "#FF5A1F",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  textoBotaoVerMeusChamadosModal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  botaoFecharModalSucesso: {
    paddingVertical: 8,
  },
  textoBotaoFecharModalSucesso: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  // MODAL DENÚNCIA
  modalCardDenuncia: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  headerModalDenuncia: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  iconeDenunciaHeaderBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  tituloModalDenuncia: {
    fontSize: 16,
    fontWeight: "700",
    color: "#991B1B",
  },
  subtituloModalDenuncia: {
    fontSize: 11,
    color: "#64748B",
  },
  avisoSigiloDenuncia: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  textoAvisoSigiloDenuncia: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
  },
  rodapeModalDenuncia: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 14,
  },
  botaoEnviarDenuncia: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    paddingVertical: 13,
    borderRadius: 10,
  },
  textoBotaoEnviarDenuncia: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS - RN-001)
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
});
