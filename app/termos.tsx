/**
 * @file termos.tsx
 * @description Tela Unificada de Termos de Uso, Política de Privacidade e Sobre o App [ORI-024].
 * Oferece 3 visões institucionais e regulatórias:
 * 1. Termos de Serviço (regras contratuais, preço congelado, cancelamento bilateral de 2h, taxa de 10%).
 * 2. Política de Privacidade & LGPD (coleta mínima, geolocalização pontual por Haversine, sigilo bancário).
 * 3. Sobre a Plataforma (missão educacional, engenharia de software e comitê da banca ADS P4).
 * Inclui registro auditável de consentimento, envio de cópia por e-mail e barra de 5 abas (RN-001).
 */

import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import {
  enviarCopiaTermosEmail,
  obterDocumentosLegais,
  ResultadoTermos,
  SecaoTermo,
} from "../services/termosService";

export default function TermosScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const perfilAtivo = auth?.perfilAtivo || "Aluno";

  const [abaAtiva, setAbaAtiva] = useState<"termos" | "privacidade" | "sobre">("termos");
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [modalEmailAberto, setModalEmailAberto] = useState<boolean>(false);
  const [emailDestino, setEmailDestino] = useState<string>("aluno.banca@orienta.edu.br");
  const [enviandoEmail, setEnviandoEmail] = useState<boolean>(false);

  const [documentos, setDocumentos] = useState<ResultadoTermos | null>(null);

  const carregarDados = async (isRefresh = false) => {
    if (isRefresh) setAtualizando(true);
    else setCarregando(true);

    try {
      const res = await obterDocumentosLegais();
      setDocumentos(res);
    } catch (err) {
      console.warn("Erro ao buscar documentos legais:", err);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleEnviarEmail = async () => {
    if (!emailDestino.trim()) {
      Alert.alert("E-mail inválido", "Informe um e-mail válido para receber a cópia dos termos.");
      return;
    }

    setEnviandoEmail(true);
    try {
      const res = await enviarCopiaTermosEmail(emailDestino.trim());
      Alert.alert("Documento Enviado!", res.mensagem);
      setModalEmailAberto(false);
    } catch (err) {
      Alert.alert("Erro", "Falha ao enviar documento.");
    } finally {
      setEnviandoEmail(false);
    }
  };

  const documentoAtual =
    abaAtiva === "termos"
      ? documentos?.termosUso
      : abaAtiva === "privacidade"
      ? documentos?.privacidade
      : documentos?.sobre;

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
          <Text style={estilos.headerTitulo}>Termos & Privacidade</Text>
          <Text style={estilos.headerSubtitulo}>Contratos, LGPD e diretrizes oficiais</Text>
        </View>

        <TouchableOpacity
          onPress={() => setModalEmailAberto(true)}
          style={estilos.botaoExportar}
          activeOpacity={0.7}
          accessibilityLabel="Enviar cópia por e-mail"
        >
          <Feather name="mail" size={19} color="#FF5A1F" />
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 2. BADGE DE RESILIÊNCIA / MODO SIMULAÇÃO                       */}
      {/* ============================================================== */}
      <View style={estilos.faixaModoSimulacao}>
        <Ionicons
          name="checkmark-circle-outline"
          size={14}
          color="#059669"
          style={{ marginRight: 6 }}
        />
        <Text style={estilos.textoModoSimulacao}>
          {documentos?.isSimulado
            ? "⚠️ Modo Simulação: Dados offline em exibição (ORI-024)"
            : "✅ Minuta contratual e diretrizes jurídicas homologadas"}
        </Text>
      </View>

      {/* ============================================================== */}
      {/* 3. SELETOR DE ABAS PRINCIPAIS (SEGMENTED CONTROL)              */}
      {/* ============================================================== */}
      <View style={estilos.seletorAbasContainer}>
        <TouchableOpacity
          style={[estilos.abaBotao, abaAtiva === "termos" && estilos.abaBotaoAtiva]}
          onPress={() => setAbaAtiva("termos")}
          activeOpacity={0.8}
        >
          <Feather
            name="file-text"
            size={14}
            color={abaAtiva === "termos" ? "#FF5A1F" : "#64748B"}
            style={{ marginRight: 5 }}
          />
          <Text style={[estilos.textoAba, abaAtiva === "termos" && estilos.textoAbaAtiva]}>
            Termos de Uso
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.abaBotao, abaAtiva === "privacidade" && estilos.abaBotaoAtiva]}
          onPress={() => setAbaAtiva("privacidade")}
          activeOpacity={0.8}
        >
          <Feather
            name="shield"
            size={14}
            color={abaAtiva === "privacidade" ? "#FF5A1F" : "#64748B"}
            style={{ marginRight: 5 }}
          />
          <Text style={[estilos.textoAba, abaAtiva === "privacidade" && estilos.textoAbaAtiva]}>
            Privacidade & LGPD
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.abaBotao, abaAtiva === "sobre" && estilos.abaBotaoAtiva]}
          onPress={() => setAbaAtiva("sobre")}
          activeOpacity={0.8}
        >
          <Feather
            name="info"
            size={14}
            color={abaAtiva === "sobre" ? "#FF5A1F" : "#64748B"}
            style={{ marginRight: 5 }}
          />
          <Text style={[estilos.textoAba, abaAtiva === "sobre" && estilos.textoAbaAtiva]}>
            Sobre o App
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 4. CONTEÚDO SCROLLÁVEL                                         */}
      {/* ============================================================== */}
      {carregando ? (
        <View style={estilos.containerCentralizado}>
          <ActivityIndicator size="large" color="#FF5A1F" />
          <Text style={estilos.textoCarregando}>Carregando documentos legais...</Text>
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
          {/* CARDS DE CONFORMIDADE LEGAL (3 COLUNAS) */}
          <View style={estilos.gridConformidade}>
            <View style={estilos.cardConformidade}>
              <View style={[estilos.iconeConformidadeBox, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="check-square" size={16} color="#2563EB" />
              </View>
              <Text style={estilos.valorConformidade}>{documentoAtual?.versao}</Text>
              <Text style={estilos.labelConformidade}>Versão Vigente</Text>
            </View>

            <View style={estilos.cardConformidade}>
              <View style={[estilos.iconeConformidadeBox, { backgroundColor: "#ECFDF5" }]}>
                <Feather name="shield" size={16} color="#059669" />
              </View>
              <Text style={estilos.valorConformidade}>100% LGPD</Text>
              <Text style={estilos.labelConformidade}>Conformidade</Text>
            </View>

            <View style={estilos.cardConformidade}>
              <View style={[estilos.iconeConformidadeBox, { backgroundColor: "#FFF7ED" }]}>
                <Feather name="award" size={16} color="#FF5A1F" />
              </View>
              <Text style={estilos.valorConformidade}>Auditado</Text>
              <Text style={estilos.labelConformidade}>Pela Banca</Text>
            </View>
          </View>

          {/* BANNER DE CONSENTIMENTO REGISTRADO */}
          {documentos?.consentimento && (
            <View style={estilos.bannerConsentimento}>
              <View style={estilos.iconeConsentimentoWrapper}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.tituloConsentimento}>Termos Aceitos pelo Usuário</Text>
                <Text style={estilos.descConsentimento}>
                  Aceito em {documentos.consentimento.dataAceite} • Protocolo:{" "}
                  <Text style={{ fontWeight: "700" }}>{documentos.consentimento.protocoloConsentimento}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* CABEÇALHO DO DOCUMENTO ATUAL */}
          <View style={estilos.cabecalhoDocumento}>
            <Text style={estilos.tituloDocumento}>{documentoAtual?.titulo}</Text>
            <Text style={estilos.subtituloDocumento}>
              Data de vigência oficial: {documentoAtual?.dataVigencia} • Versão {documentoAtual?.versao}
            </Text>
          </View>

          {/* SEÇÕES DO DOCUMENTO */}
          {documentoAtual?.secoes.map((secao: SecaoTermo) => (
            <View key={secao.id} style={estilos.cardSecaoTermo}>
              <View style={estilos.headerSecaoTermo}>
                {secao.icone && (
                  <View style={estilos.iconeSecaoWrapper}>
                    <Feather name={secao.icone as any} size={16} color="#FF5A1F" />
                  </View>
                )}
                <Text style={estilos.tituloSecaoTermo}>{secao.titulo}</Text>
              </View>

              <Text style={estilos.conteudoSecaoTermo}>{secao.conteudo}</Text>

              {secao.itens && secao.itens.length > 0 && (
                <View style={estilos.listaItensSecao}>
                  {secao.itens.map((item, idx) => (
                    <View key={idx} style={estilos.itemBulletSecao}>
                      <Feather name="check" size={13} color="#059669" style={{ marginTop: 2, marginRight: 8 }} />
                      <Text style={estilos.textoItemBulletSecao}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {secao.destaque && (
                <View style={estilos.destaqueSecaoBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#FF5A1F" style={{ marginRight: 6 }} />
                  <Text style={estilos.textoDestaqueSecao}>{secao.destaque}</Text>
                </View>
              )}
            </View>
          ))}

          {/* CARD DE SOLICITAÇÃO DE CÓPIA EM PDF */}
          <View style={estilos.cardDownloadCopia}>
            <View style={estilos.textosDownloadCopia}>
              <Text style={estilos.tituloDownloadCopia}>Precisa de uma cópia formal?</Text>
              <Text style={estilos.descDownloadCopia}>
                Enviaremos a íntegra destes termos e diretrizes em formato PDF para seu e-mail cadastrado.
              </Text>
            </View>
            <TouchableOpacity
              style={estilos.botaoSolicitarCopia}
              onPress={() => setModalEmailAberto(true)}
              activeOpacity={0.85}
            >
              <Feather name="send" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={estilos.textoBotaoSolicitarCopia}>Enviar PDF</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL PARA ENVIO DE CÓPIA POR E-MAIL                        */}
      {/* ============================================================== */}
      <Modal
        visible={modalEmailAberto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalEmailAberto(false)}
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardEmail}>
            <View style={estilos.headerModalEmail}>
              <View style={estilos.iconeEmailHeaderBox}>
                <Feather name="file-text" size={20} color="#FF5A1F" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={estilos.tituloModalEmail}>Enviar Documento por E-mail</Text>
                <Text style={estilos.subtituloModalEmail}>Cópia autêntica em formato PDF</Text>
              </View>
              <TouchableOpacity onPress={() => setModalEmailAberto(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={estilos.labelEmailModal}>Confirmar E-mail de Envio:</Text>
            <TextInput
              style={estilos.inputEmailModal}
              placeholder="seu-email@universidade.edu.br"
              placeholderTextColor="#94A3B8"
              value={emailDestino}
              onChangeText={setEmailDestino}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={estilos.avisoModalEmail}>
              <Feather name="info" size={13} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={estilos.textoAvisoModalEmail}>
                O arquivo contém carimbo de data/hora oficial e o protocolo do seu consentimento LGPD.
              </Text>
            </View>

            <View style={estilos.botoesModalEmailLinha}>
              <TouchableOpacity
                style={estilos.botaoCancelarModalEmail}
                onPress={() => setModalEmailAberto(false)}
              >
                <Text style={estilos.textoCancelarModalEmail}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botaoConfirmarModalEmail, enviandoEmail && { opacity: 0.7 }]}
                onPress={handleEnviarEmail}
                disabled={enviandoEmail}
              >
                {enviandoEmail ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoConfirmarModalEmail}>Enviar PDF Agora</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 6. BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS - RN-001)       */}
      {/* ============================================================== */}
      <View
        style={[
          estilos.tabBarContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        {perfilAtivo === "Professor" ? (
          <>
            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/home-professor" as any)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="home" size={20} color="#64748B" />
              <Text style={estilos.tabLabel}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/notificacoes" as any)}
              activeOpacity={0.8}
            >
              <Feather name="bell" size={20} color="#64748B" />
              <Text style={estilos.tabLabel}>Notícias</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/agenda" as any)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="calendar-alt" size={20} color="#64748B" />
              <Text style={estilos.tabLabel}>Agenda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/painel-ganhos" as any)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="chart-line" size={19} color="#64748B" />
              <Text style={estilos.tabLabel}>Ganhos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/perfil?persona=professor" as any)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="user-alt" size={19} color="#FF5A1F" />
              <Text style={[estilos.tabLabel, { color: "#FF5A1F", fontWeight: "700" }]}>Perfil</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/(tabs)" as any)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="home" size={20} color="#64748B" />
              <Text style={estilos.tabLabel}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/busca-professores" as any)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="search" size={20} color="#64748B" />
              <Text style={estilos.tabLabel}>Buscar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/chat" as any)}
              activeOpacity={0.8}
            >
              <Feather name="message-square" size={20} color="#64748B" />
              <Text style={estilos.tabLabel}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/agenda" as any)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="calendar-alt" size={20} color="#64748B" />
              <Text style={estilos.tabLabel}>Agenda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.tabItem}
              onPress={() => router.push("/perfil" as any)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="user-alt" size={19} color="#FF5A1F" />
              <Text style={[estilos.tabLabel, { color: "#FF5A1F", fontWeight: "700" }]}>Perfil</Text>
            </TouchableOpacity>
          </>
        )}
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
  botaoExportar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD8B5",
  },
  faixaModoSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
  },
  textoModoSimulacao: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
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

  // GRID CONFORMIDADE
  gridConformidade: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  cardConformidade: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconeConformidadeBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  valorConformidade: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  labelConformidade: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },

  // BANNER CONSENTIMENTO
  bannerConsentimento: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 16,
  },
  iconeConsentimentoWrapper: {
    marginRight: 10,
  },
  tituloConsentimento: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  descConsentimento: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 2,
  },

  // CABEÇALHO DO DOCUMENTO
  cabecalhoDocumento: {
    marginBottom: 14,
  },
  tituloDocumento: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtituloDocumento: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  // SEÇÃO CARD TERMO
  cardSecaoTermo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  headerSecaoTermo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconeSecaoWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  tituloSecaoTermo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  conteudoSecaoTermo: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 10,
  },
  listaItensSecao: {
    gap: 6,
    marginBottom: 10,
  },
  itemBulletSecao: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  textoItemBulletSecao: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
    flex: 1,
  },
  destaqueSecaoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    marginTop: 4,
  },
  textoDestaqueSecao: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9A3412",
    flex: 1,
    lineHeight: 16,
  },

  // DOWNLOAD / EMAIL CARD
  cardDownloadCopia: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 6,
    marginBottom: 16,
  },
  textosDownloadCopia: {
    flex: 1,
    marginRight: 10,
  },
  tituloDownloadCopia: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  descDownloadCopia: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  botaoSolicitarCopia: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF5A1F",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  textoBotaoSolicitarCopia: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // MODAL EMAIL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCardEmail: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  headerModalEmail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  iconeEmailHeaderBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  tituloModalEmail: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtituloModalEmail: {
    fontSize: 11,
    color: "#64748B",
  },
  labelEmailModal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  inputEmailModal: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 12,
  },
  avisoModalEmail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  textoAvisoModalEmail: {
    fontSize: 11,
    color: "#1E40AF",
    flex: 1,
    lineHeight: 16,
  },
  botoesModalEmailLinha: {
    flexDirection: "row",
    gap: 10,
  },
  botaoCancelarModalEmail: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  textoCancelarModalEmail: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  botaoConfirmarModalEmail: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FF5A1F",
  },
  textoConfirmarModalEmail: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
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
