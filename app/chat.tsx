/**
 * @file chat.tsx
 * @description Tela de Chat em Tempo Real com Contexto de Aula - Orienta 2.0 [ORI-013].
 * Implementada com total fidelidade à especificação visual Chat.jpeg (IMG-021).
 * 
 * Funcionalidades:
 * - Header com botão voltar, logotipo centralizado da Orienta e menu kebab de opções (⋮)
 * - Card do Interlocutor (Prof. Lucas Rocha) com avatar, dot online, selo verificado, avaliação e botão [Ver perfil]
 * - Banner contextual de aula agendada (Status Confirmada, data, horário e modalidade)
 * - Divisor temporal central "Hoje"
 * - Feed de mensagens em balões estilizados com duplo tique azul (lido) e avatares
 * - Card de evento de sistema no feed ("A aula foi iniciada! Boa aula!")
 * - Faixa horizontal de ações rápidas e anexos (Compartilhar arquivo, Enviar link, Enviar imagem, Dúvida rápida)
 * - Barra de input arredondada com botão +, emoji e envio rápido
 * - Modal integrado de denúncia / segurança
 * - Serviço híbrido resiliente com fallback offline e badge de modo de simulação
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  enviarMensagemChat,
  MensagemChat,
  MOCK_CONVERSA_OFICIAL,
  obterConversaComContexto,
  registrarDenunciaChat,
  ResultadoConversa,
} from "../services/chatService";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const agendamentoId = Number(params.id || params.agendamentoId || 101);

  const [carregando, setCarregando] = useState<boolean>(true);
  const [isSimulado, setIsSimulado] = useState<boolean>(false);
  const [conversa, setConversa] = useState(MOCK_CONVERSA_OFICIAL);
  const [mensagens, setMensagens] = useState<MensagemChat[]>(MOCK_CONVERSA_OFICIAL.mensagens);
  const [textoInput, setTextoInput] = useState<string>("");
  const [enviando, setEnviando] = useState<boolean>(false);

  // Modais de Controle
  const [menuOpcoesVisivel, setMenuOpcoesVisivel] = useState<boolean>(false);
  const [modalDenunciaVisivel, setModalDenunciaVisivel] = useState<boolean>(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState<string>("Conduta Inadequada");
  const [descricaoDenuncia, setDescricaoDenuncia] = useState<string>("");
  const [denunciaEnviando, setDenunciaEnviando] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);

  const carregarDadosChat = useCallback(async () => {
    try {
      const res: ResultadoConversa = await obterConversaComContexto(agendamentoId);
      setConversa(res.conversa);
      setMensagens(res.conversa.mensagens);
      setIsSimulado(res.isSimulado);
    } catch {
      setIsSimulado(true);
    } finally {
      setCarregando(false);
    }
  }, [agendamentoId]);

  useEffect(() => {
    carregarDadosChat();
  }, [carregarDadosChat]);

  const rolarParaFim = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleEnviarMensagem = async (
    conteudoPersonalizado?: string,
    tipo: "TEXTO" | "ARQUIVO" | "LINK" | "IMAGEM" = "TEXTO",
    metaAnexo?: { nomeArquivo?: string; tamanho?: string; url?: string }
  ) => {
    const texto = conteudoPersonalizado || textoInput.trim();
    if (!texto && tipo === "TEXTO") return;

    if (!conteudoPersonalizado) {
      setTextoInput("");
    }
    setEnviando(true);

    try {
      const res = await enviarMensagemChat(agendamentoId, "user-aluno", texto, tipo, metaAnexo);
      setMensagens((prev) => [...prev, res.mensagem]);
      rolarParaFim();
    } catch (e: any) {
      Alert.alert("Erro", "Não foi possível enviar a mensagem.");
    } finally {
      setEnviando(false);
    }
  };

  const handleAcaoRapida = (tipo: string) => {
    switch (tipo) {
      case "arquivo":
        handleEnviarMensagem(
          "Compartilhou um documento: Lista_Exercicios_Calculo_I.pdf",
          "ARQUIVO",
          { nomeArquivo: "Lista_Exercicios_Calculo_I.pdf", tamanho: "1.4 MB" }
        );
        break;
      case "link":
        handleEnviarMensagem(
          "Link da sala complementar: https://meet.google.com/ori-aula-calc",
          "LINK",
          { url: "https://meet.google.com/ori-aula-calc" }
        );
        break;
      case "imagem":
        handleEnviarMensagem(
          "Enviou uma foto da questão para resolução",
          "IMAGEM"
        );
        break;
      case "duvida":
        setTextoInput("Professor, gostaria de tirar uma dúvida sobre a última questão antes da aula.");
        break;
      default:
        break;
    }
  };

  const handleEnviarDenuncia = async () => {
    if (!descricaoDenuncia.trim()) {
      Alert.alert("Atenção", "Por favor, descreva brevemente o ocorrido.");
      return;
    }

    setDenunciaEnviando(true);
    try {
      const res = await registrarDenunciaChat(
        agendamentoId,
        conversa.interlocutor.id,
        motivoDenuncia,
        descricaoDenuncia
      );
      Alert.alert("Sucesso", res.mensagem);
      setModalDenunciaVisivel(false);
      setDescricaoDenuncia("");
    } catch {
      Alert.alert("Erro", "Não foi possível registrar a denúncia no momento.");
    } finally {
      setDenunciaEnviando(false);
    }
  };

  if (carregando) {
    return (
      <View style={[estilos.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF5A1F" />
        <Text style={estilos.loadingTexto}>Carregando mensagens da aula...</Text>
      </View>
    );
  }

  const interlocutor = conversa.interlocutor;
  const aula = conversa.contextoAula;

  return (
    <KeyboardAvoidingView
      style={[estilos.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
      {/* 1. HEADER SUPERIOR COM LOGO E AÇÕES                            */}
      {/* ============================================================== */}
      <View style={estilos.header}>
        <TouchableOpacity
          style={estilos.botaoVoltar}
          onPress={() => router.push("/agenda" as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>

        <View style={estilos.headerLogoContainer}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&h=100&fit=crop" }}
            style={estilos.logoIcone}
          />
          <Text style={estilos.logoTexto}>
            Orienta <Text style={{ color: "#FF5A1F" }}>2.0</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={estilos.botaoOpcoes}
          onPress={() => setMenuOpcoesVisivel(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 2. CARD DO INTERLOCUTOR (PROFESSOR)                           */}
      {/* ============================================================== */}
      <View style={estilos.cardInterlocutor}>
        <View style={estilos.avatarContainer}>
          <Image source={{ uri: interlocutor.avatar }} style={estilos.avatar} />
          {interlocutor.online && <View style={estilos.dotOnline} />}
        </View>

        <View style={estilos.interlocutorInfo}>
          <View style={estilos.nomeLinha}>
            <Text style={estilos.nomeProfessor}>{interlocutor.nome}</Text>
            {interlocutor.verificado && (
              <MaterialIcons name="verified" size={16} color="#0284C7" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={estilos.disciplinaProfessor}>{interlocutor.disciplina}</Text>
          <View style={estilos.avaliacaoLinha}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={estilos.avaliacaoTexto}>
              {" "}{interlocutor.avaliacao.toFixed(1).replace(".", ",")}{" "}
              <Text style={estilos.avaliacaoTotal}>({interlocutor.totalAvaliacoes} avaliações)</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={estilos.botaoVerPerfil}
          onPress={() => router.push("/perfil-professor" as any)}
          activeOpacity={0.8}
        >
          <Feather name="calendar" size={13} color="#0F172A" style={{ marginRight: 4 }} />
          <Text style={estilos.textoBotaoVerPerfil}>Ver perfil</Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 3. BANNER DE CONTEXTO DA AULA AGENDADA                         */}
      {/* ============================================================== */}
      <View style={estilos.bannerAulaContainer}>
        <View style={estilos.bannerAulaLinhaTopo}>
          <View style={estilos.bannerAulaStatusTag}>
            <Ionicons name="calendar-outline" size={14} color="#0284C7" style={{ marginRight: 4 }} />
            <Text style={estilos.bannerAulaLabel}>Aula agendada</Text>
          </View>
          <View style={estilos.badgeConfirmada}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={estilos.textoBadgeConfirmada}>Confirmada</Text>
          </View>
        </View>

        <View style={estilos.bannerAulaDetalhes}>
          <Text style={estilos.bannerAulaInfo}>
            <Text style={{ fontWeight: "700", color: "#0F172A" }}>{aula.dataTexto}</Text>
            {"  •  "}
            {aula.horarioTexto}
          </Text>
          <Text style={estilos.bannerAulaModalidade}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            {" "}{aula.localizacao || "Online (Google Meet)"}
          </Text>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 4. FEED DE MENSAGENS E DIVISOR TEMPORAL                        */}
      {/* ============================================================== */}
      <FlatList
        ref={flatListRef}
        data={mensagens}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={estilos.mensagensListContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={estilos.divisorTemporalContainer}>
            <View style={estilos.divisorLinha} />
            <View style={estilos.divisorPill}>
              <Text style={estilos.divisorTexto}>Hoje</Text>
            </View>
            <View style={estilos.divisorLinha} />
          </View>
        }
        renderItem={({ item }) => {
          // Mensagem de Evento do Sistema
          if (item.tipo === "SISTEMA" || item.remetentePapel === "SISTEMA") {
            return (
              <View style={estilos.cardSistemaFeed}>
                <View style={estilos.iconeSistemaCirculo}>
                  <Ionicons name="checkmark-circle" size={18} color="#0284C7" />
                </View>
                <Text style={estilos.textoSistemaFeed}>{item.conteudo}</Text>
              </View>
            );
          }

          const isAluno = item.remetentePapel === "ALUNO" || item.remetenteId === "user-aluno";

          return (
            <View style={[estilos.linhaMensagem, isAluno ? estilos.linhaAluno : estilos.linhaProfessor]}>
              {!isAluno && (
                <View style={estilos.avatarPequenoContainer}>
                  <Image source={{ uri: item.avatar || interlocutor.avatar }} style={estilos.avatarPequeno} />
                  {interlocutor.online && <View style={estilos.dotOnlinePequeno} />}
                </View>
              )}

              <View style={[estilos.balaoMensagem, isAluno ? estilos.balaoAluno : estilos.balaoProfessor]}>
                {item.metaAnexo && (
                  <View style={estilos.anexoBox}>
                    <Ionicons
                      name={item.tipo === "ARQUIVO" ? "document-text" : item.tipo === "LINK" ? "link" : "image"}
                      size={18}
                      color={isAluno ? "#FF5A1F" : "#0284C7"}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={estilos.anexoNome} numberOfLines={1}>
                      {item.metaAnexo.nomeArquivo || item.metaAnexo.url || "Anexo anexado"}
                    </Text>
                  </View>
                )}

                <Text style={[estilos.textoMensagem, isAluno ? estilos.textoAluno : estilos.textoProfessor]}>
                  {item.conteudo}
                </Text>

                <View style={estilos.metaMensagemLinha}>
                  <Text style={estilos.horarioMensagem}>{item.enviadaEm}</Text>
                  {isAluno && (
                    <Ionicons
                      name="checkmark-done"
                      size={14}
                      color={item.lida ? "#0284C7" : "#94A3B8"}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
              </View>

              {isAluno && (
                <View style={estilos.avatarPequenoContainer}>
                  <Image
                    source={{ uri: item.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces" }}
                    style={estilos.avatarPequeno}
                  />
                </View>
              )}
            </View>
          );
        }}
      />

      {/* ============================================================== */}
      {/* 5. BARRA DE AÇÕES RÁPIDAS & ANEXOS (PILLS HORIZONTAIS)          */}
      {/* ============================================================== */}
      <View style={estilos.acoesRapidasContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.acoesRapidasScroll}
        >
          <TouchableOpacity
            style={estilos.pillAcao}
            onPress={() => handleAcaoRapida("arquivo")}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={14} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.textoPillAcao}>Compartilhar arquivo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.pillAcao}
            onPress={() => handleAcaoRapida("link")}
            activeOpacity={0.8}
          >
            <Ionicons name="link-outline" size={14} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.textoPillAcao}>Enviar link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.pillAcao}
            onPress={() => handleAcaoRapida("imagem")}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={14} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.textoPillAcao}>Enviar imagem</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.pillAcao}
            onPress={() => handleAcaoRapida("duvida")}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle-outline" size={14} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.textoPillAcao}>Dúvida rápida</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ============================================================== */}
      {/* 6. BARRA DE ENTRADA DE MENSAGEM (INPUT BAR)                    */}
      {/* ============================================================== */}
      <View style={[estilos.inputBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={estilos.botaoAnexoMais}
          onPress={() => handleAcaoRapida("arquivo")}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#64748B" />
        </TouchableOpacity>

        <View style={estilos.inputTextoWrapper}>
          <TextInput
            style={estilos.inputTexto}
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#94A3B8"
            value={textoInput}
            onChangeText={setTextoInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={estilos.botaoEmoji}
            onPress={() => setTextoInput((prev) => prev + " 😊")}
            activeOpacity={0.7}
          >
            <Ionicons name="happy-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            estilos.botaoEnviar,
            textoInput.trim().length === 0 && estilos.botaoEnviarDesativado,
          ]}
          onPress={() => handleEnviarMensagem()}
          disabled={textoInput.trim().length === 0 || enviando}
          activeOpacity={0.85}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 7. MODAL DE MENU DE OPÇÕES (KEBAB MENU)                        */}
      {/* ============================================================== */}
      <Modal visible={menuOpcoesVisivel} transparent animationType="fade">
        <TouchableOpacity
          style={estilos.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuOpcoesVisivel(false)}
        >
          <View style={estilos.menuDropdownCard}>
            <TouchableOpacity
              style={estilos.opcaoMenuItem}
              onPress={() => {
                setMenuOpcoesVisivel(false);
                router.push("/perfil-professor" as any);
              }}
            >
              <Ionicons name="person-outline" size={18} color="#0F172A" style={{ marginRight: 10 }} />
              <Text style={estilos.textoOpcaoMenu}>Ver perfil do mentor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.opcaoMenuItem}
              onPress={() => {
                setMenuOpcoesVisivel(false);
                router.push("/agenda" as any);
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#0F172A" style={{ marginRight: 10 }} />
              <Text style={estilos.textoOpcaoMenu}>Ver na minha agenda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[estilos.opcaoMenuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setMenuOpcoesVisivel(false);
                setModalDenunciaVisivel(true);
              }}
            >
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={[estilos.textoOpcaoMenu, { color: "#EF4444" }]}>Denunciar usuário</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================== */}
      {/* 8. MODAL DE DENÚNCIA & SEGURANÇA                               */}
      {/* ============================================================== */}
      <Modal visible={modalDenunciaVisivel} transparent animationType="slide">
        <View style={estilos.modalOverlayCentro}>
          <View style={estilos.modalDenunciaCard}>
            <View style={estilos.modalDenunciaHeader}>
              <View style={estilos.iconeAlerta}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={estilos.tituloDenuncia}>Denunciar Conduta</Text>
                <Text style={estilos.subtituloDenuncia}>Sua denúncia é anônima e protege a comunidade.</Text>
              </View>
            </View>

            <Text style={estilos.labelDenuncia}>Motivo da denúncia:</Text>
            {["Conduta Inadequada", "Não comparecimento à aula", "Linguagem ofensiva", "Cobrança indevida fora do app"].map(
              (motivo) => (
                <TouchableOpacity
                  key={motivo}
                  style={[
                    estilos.radioOpcao,
                    motivoDenuncia === motivo && estilos.radioOpcaoSelecionada,
                  ]}
                  onPress={() => setMotivoDenuncia(motivo)}
                  activeOpacity={0.8}
                >
                  <View style={[estilos.circuloRadio, motivoDenuncia === motivo && estilos.circuloRadioAtivo]}>
                    {motivoDenuncia === motivo && <View style={estilos.dotRadio} />}
                  </View>
                  <Text style={estilos.textoRadio}>{motivo}</Text>
                </TouchableOpacity>
              )
            )}

            <Text style={[estilos.labelDenuncia, { marginTop: 12 }]}>Descreva brevemente o ocorrido:</Text>
            <TextInput
              style={estilos.inputDescricaoDenuncia}
              placeholder="Explique o que aconteceu..."
              placeholderTextColor="#94A3B8"
              value={descricaoDenuncia}
              onChangeText={setDescricaoDenuncia}
              multiline
              numberOfLines={3}
            />

            <View style={estilos.botoesDenunciaLinha}>
              <TouchableOpacity
                style={estilos.botaoCancelarDenuncia}
                onPress={() => setModalDenunciaVisivel(false)}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotaoCancelarDenuncia}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botaoConfirmarDenuncia}
                onPress={handleEnviarDenuncia}
                disabled={denunciaEnviando}
                activeOpacity={0.85}
              >
                {denunciaEnviando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoConfirmarDenuncia}>Enviar denúncia</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  botaoVoltar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcone: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 6,
  },
  logoTexto: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  botaoOpcoes: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  // 2. Card Interlocutor
  cardInterlocutor: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
  },
  dotOnline: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  interlocutorInfo: {
    flex: 1,
  },
  nomeLinha: {
    flexDirection: "row",
    alignItems: "center",
  },
  nomeProfessor: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  disciplinaProfessor: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  avaliacaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  avaliacaoTexto: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  avaliacaoTotal: {
    fontSize: 11,
    fontWeight: "400",
    color: "#94A3B8",
  },
  botaoVerPerfil: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  textoBotaoVerPerfil: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },

  // 3. Banner Contexto Aula
  bannerAulaContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  bannerAulaLinhaTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  bannerAulaStatusTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerAulaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
  },
  badgeConfirmada: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  textoBadgeConfirmada: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  bannerAulaDetalhes: {
    marginTop: 2,
  },
  bannerAulaInfo: {
    fontSize: 13,
    color: "#334155",
  },
  bannerAulaModalidade: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  // 4. Feed de Mensagens
  mensagensListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divisorTemporalContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  divisorLinha: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  divisorPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    marginHorizontal: 8,
  },
  divisorTexto: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  cardSistemaFeed: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginVertical: 10,
    maxWidth: "90%",
  },
  iconeSistemaCirculo: {
    marginRight: 8,
  },
  textoSistemaFeed: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0369A1",
    textAlign: "center",
  },
  linhaMensagem: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 6,
  },
  linhaAluno: {
    justifyContent: "flex-end",
  },
  linhaProfessor: {
    justifyContent: "flex-start",
  },
  avatarPequenoContainer: {
    position: "relative",
    marginHorizontal: 6,
  },
  avatarPequeno: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  dotOnlinePequeno: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  balaoMensagem: {
    maxWidth: "75%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  balaoProfessor: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 4,
  },
  balaoAluno: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderBottomRightRadius: 4,
  },
  textoMensagem: {
    fontSize: 14,
    lineHeight: 20,
  },
  textoProfessor: {
    color: "#0F172A",
  },
  textoAluno: {
    color: "#1E293B",
  },
  metaMensagemLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  horarioMensagem: {
    fontSize: 10,
    color: "#94A3B8",
  },
  anexoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 8,
    marginBottom: 6,
  },
  anexoNome: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },

  // 5. Ações Rápidas
  acoesRapidasContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 8,
  },
  acoesRapidasScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pillAcao: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textoPillAcao: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0F172A",
  },

  // 6. Barra de Input
  inputBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  botaoAnexoMais: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  inputTextoWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 22,
    paddingHorizontal: 14,
    minHeight: 40,
    maxHeight: 100,
  },
  inputTexto: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 8,
  },
  botaoEmoji: {
    padding: 4,
  },
  botaoEnviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  botaoEnviarDesativado: {
    backgroundColor: "#CBD5E1",
  },

  // 7. Menu Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
  },
  menuDropdownCard: {
    width: 210,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  opcaoMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  textoOpcaoMenu: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0F172A",
  },

  // 8. Modal Denúncia
  modalOverlayCentro: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalDenunciaCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
  },
  modalDenunciaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconeAlerta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  tituloDenuncia: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtituloDenuncia: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  labelDenuncia: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  radioOpcao: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  radioOpcaoSelecionada: {
    backgroundColor: "#F8FAFC",
  },
  circuloRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  circuloRadioAtivo: {
    borderColor: "#EF4444",
  },
  dotRadio: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  textoRadio: {
    fontSize: 13,
    color: "#334155",
  },
  inputDescricaoDenuncia: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 70,
    marginBottom: 16,
  },
  botoesDenunciaLinha: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  botaoCancelarDenuncia: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  textoBotaoCancelarDenuncia: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  botaoConfirmarDenuncia: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#EF4444",
  },
  textoBotaoConfirmarDenuncia: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
