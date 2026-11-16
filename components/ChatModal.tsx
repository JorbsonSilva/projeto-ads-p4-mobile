/**
 * @file ChatModal.tsx
 * @description Modal de Chat em Tempo Real e Canal de Denúncias - Orienta 2.0 [ORI-027].
 * Padrão Visual: Design System Claro Oficial (Light Theme Standard).
 * 
 * Funcionalidades:
 * - Header do Modal com dados do participante, avatar com status online esmeralda, badge verificado e atalho para denúncia.
 * - Feed de mensagens em tempo real com balões do usuário (Laranja #FF5A1F) e destinatário (Cinza #F1F5F9), hora e duplo tique.
 * - Barra de entrada com menu de anexos (+), envio de fotos/documentos e botão enviar institucional.
 * - Canal de denúncias e moderação com 5 categorias, justificativa e protocolo auditável (DEN-2026-XXXXX).
 * - Mensagens, denúncias e erros tratados conforme a resposta real da API.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { FontAwesome5, Feather, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { chatApi, suporteApi } from "../config/api";
import { Theme } from "../constants/theme";

export interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  agendamentoId: number;
  usuarioId: number;
  outroUsuarioId: number;
  outroUsuarioNome?: string;
  outroParticipanteNome?: string;
  assunto?: string;
  disciplinaNome?: string;
  agendamentoStatus?: string;
  avatarIniciais?: string;
}

export interface MensagemItem {
  id: number;
  remetenteId: number;
  remetenteNome: string;
  conteudo: string;
  lida: boolean;
  enviadaEm: string;
  anexoTipo?: "imagem" | "documento" | "link";
  anexoNome?: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  agendamentoId,
  usuarioId,
  outroUsuarioId,
  outroUsuarioNome,
  outroParticipanteNome,
  assunto,
  disciplinaNome,
  agendamentoStatus = "Aula",
  avatarIniciais = "",
}) => {
  const nomeExibicao = outroUsuarioNome || outroParticipanteNome || "Participante";
  const assuntoExibicao = assunto || disciplinaNome || "Aula";

  const [mensagens, setMensagens] = useState<MensagemItem[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erroMensagens, setErroMensagens] = useState<string | null>(null);
  const [menuAnexosAberto, setMenuAnexosAberto] = useState(false);

  // Estados do Canal de Denúncias
  const [modalDenunciaVisivel, setModalDenunciaVisivel] = useState(false);
  const [categoriaDenuncia, setCategoriaDenuncia] = useState<string>("conduta");
  const [descricaoDenuncia, setDescricaoDenuncia] = useState<string>("");
  const [protocoloGerado, setProtocoloGerado] = useState<string | null>(null);
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const carregarMensagens = useCallback(async () => {
    try {
      const res = await chatApi.listarMensagens(agendamentoId, usuarioId);
      if (!res.success || !Array.isArray(res.data)) {
        throw new Error(res.message || "A API retornou um formato inesperado para as mensagens.");
      }
      setMensagens(res.data);
      setErroMensagens(null);
    } catch (error) {
      setErroMensagens(
        error instanceof Error ? error.message : "Não foi possível carregar as mensagens."
      );
    } finally {
      setCarregando(false);
    }
  }, [agendamentoId, usuarioId]);

  useEffect(() => {
    if (visible && agendamentoId) {
      setCarregando(true);
      carregarMensagens();
      const interval = setInterval(() => {
        carregarMensagens();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [visible, agendamentoId, carregarMensagens]);

  const handleEnviar = async () => {
    if (!novoTexto.trim() || enviando) return;
    const textoParaEnviar = novoTexto.trim();
    setEnviando(true);

    try {
      const res = await chatApi.enviarMensagem(agendamentoId, usuarioId, textoParaEnviar);
      if (!res.success || !res.data) {
        throw new Error(res.message || "A API não confirmou o envio da mensagem.");
      }
      setMensagens((prev) => [...prev, res.data]);
      setNovoTexto("");
      setErroMensagens(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      Alert.alert(
        "Falha no envio",
        error instanceof Error ? error.message : "Não foi possível enviar a mensagem."
      );
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarAnexo = () => {
    setMenuAnexosAberto(false);
    Alert.alert(
      "Anexos indisponíveis",
      "O backend ainda não oferece upload de arquivos. Nenhum anexo foi enviado."
    );
  };

  const handleEnviarDenuncia = async () => {
    if (!descricaoDenuncia.trim()) {
      Alert.alert("Atenção", "Por favor, detalhe os fatos ocorridos na denúncia.");
      return;
    }

    setEnviandoDenuncia(true);
    try {
      const resposta = await suporteApi.enviarDenuncia(usuarioId, {
        denunciadoId: outroUsuarioId,
        agendamentoId,
        motivo: categoriaDenuncia,
        descricao: descricaoDenuncia,
      });
      if (!resposta.success || !resposta.data?.protocolo) {
        throw new Error(resposta.message || "A API não retornou o protocolo da denúncia.");
      }
      setProtocoloGerado(resposta.data.protocolo);
    } catch (error) {
      Alert.alert(
        "Falha ao registrar denúncia",
        error instanceof Error ? error.message : "Não foi possível registrar a denúncia."
      );
    } finally {
      setEnviandoDenuncia(false);
    }
  };

  const formatarHora = (isoDate: string) => {
    if (!isoDate) return "";
    try {
      const d = new Date(isoDate);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const categoriasDenunciaList = [
    { id: "conduta", titulo: "Conduta Inadequada ou Linguagem Ofensiva" },
    { id: "ausencia", titulo: "Atraso Reiterado ou Ausência sem Justificativa" },
    { id: "cobranca", titulo: "Tentativa de Pagamento ou Cobrança por Fora" },
    { id: "conteudo", titulo: "Conteúdo Impróprio ou Quebra de Acordo" },
    { id: "outro", titulo: "Outro Motivo Ético ou Operacional" },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* HEADER DO CHAT (LIGHT THEME) */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.botaoVoltar} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.avatarContainer}>
              <View style={styles.avatarCirculo}>
                <Text style={styles.avatarTexto}>{avatarIniciais || "?"}</Text>
              </View>
            </View>

            <View style={styles.headerInfo}>
              <View style={styles.headerNomeRow}>
                <Text style={styles.headerTitulo} numberOfLines={1}>
                  {nomeExibicao}
                </Text>
              </View>
              <Text style={styles.headerSubtitulo} numberOfLines={1}>
                {assuntoExibicao}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setProtocoloGerado(null);
                setDescricaoDenuncia("");
                setModalDenunciaVisivel(true);
              }}
              style={styles.botaoDenuncia}
              accessibilityLabel="Denunciar conduta"
              activeOpacity={0.7}
            >
              <Feather name="shield" size={15} color="#DC2626" />
            </TouchableOpacity>
          </View>

          {/* CONTEXTO DA CONVERSA */}
          <View style={styles.faixaContexto}>
            <View style={styles.faixaContextoEsquerda}>
              <Feather name="calendar" size={13} color="#059669" />
              <Text style={styles.faixaContextoTexto}>
                Aula #{agendamentoId} • <Text style={{ fontWeight: "700" }}>{agendamentoStatus}</Text>
              </Text>
            </View>
          </View>

          {erroMensagens && (
            <View style={styles.erroMensagens}>
              <Feather name="alert-triangle" size={13} color="#B91C1C" />
              <Text style={styles.erroMensagensTexto}>{erroMensagens}</Text>
            </View>
          )}

          {/* LISTA DE MENSAGENS */}
          {carregando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Theme.colors.primary} />
              <Text style={styles.loadingTexto}>Carregando mensagens...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={mensagens}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listaMensagens}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBox}>
                    <Feather name="message-circle" size={32} color={Theme.colors.primary} />
                  </View>
                  <Text style={styles.emptyTitulo}>Nenhuma mensagem nesta conversa</Text>
                  <Text style={styles.emptySubtexto}>
                    As mensagens enviadas aparecerão aqui.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const souEu = item.remetenteId === usuarioId;
                return (
                  <View style={[styles.bubbleWrapper, souEu ? styles.bubbleEuWrapper : styles.bubbleOutroWrapper]}>
                    <View style={[styles.bubble, souEu ? styles.bubbleEu : styles.bubbleOutro]}>
                      {!souEu && <Text style={styles.nomeRemetente}>{item.remetenteNome}</Text>}
                      
                      <Text style={[styles.textoMensagem, souEu ? styles.textoEu : styles.textoOutro]}>
                        {item.conteudo}
                      </Text>

                      {/* Card de Anexo caso exista */}
                      {item.anexoTipo && (
                        <View style={[styles.cardAnexoMensagem, souEu ? styles.cardAnexoEu : styles.cardAnexoOutro]}>
                          <Feather 
                            name={item.anexoTipo === "imagem" ? "image" : item.anexoTipo === "documento" ? "file-text" : "link"} 
                            size={14} 
                            color={souEu ? "#FFFFFF" : Theme.colors.primary} 
                          />
                          <Text style={[styles.textoAnexo, souEu ? { color: "#FFFFFF" } : { color: "#0F172A" }]}>
                            {item.anexoNome || "Arquivo anexado"}
                          </Text>
                        </View>
                      )}

                      <View style={styles.metaRow}>
                        <Text style={[styles.horaTexto, souEu ? styles.horaEu : styles.horaOutro]}>
                          {formatarHora(item.enviadaEm)}
                        </Text>
                        {souEu && (
                          <MaterialIcons
                            name={item.lida ? "done-all" : "done"}
                            size={14}
                            color={item.lida ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* MENU FLUTUANTE DE ANEXOS */}
          {menuAnexosAberto && (
            <View style={styles.menuAnexosContainer}>
              <TouchableOpacity
                style={styles.opcaoAnexoBtn}
                onPress={handleEnviarAnexo}
              >
                <View style={[styles.opcaoAnexoIcone, { backgroundColor: "#EFF6FF" }]}>
                  <Feather name="image" size={16} color="#2563EB" />
                </View>
                <Text style={styles.opcaoAnexoTexto}>Enviar Foto da Dúvida</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.opcaoAnexoBtn}
                onPress={handleEnviarAnexo}
              >
                <View style={[styles.opcaoAnexoIcone, { backgroundColor: "#FFF7ED" }]}>
                  <Feather name="file-text" size={16} color={Theme.colors.primary} />
                </View>
                <Text style={styles.opcaoAnexoTexto}>Documento PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.opcaoAnexoBtn}
                onPress={handleEnviarAnexo}
              >
                <View style={[styles.opcaoAnexoIcone, { backgroundColor: "#ECFDF5" }]}>
                  <Feather name="link" size={16} color="#059669" />
                </View>
                <Text style={styles.opcaoAnexoTexto}>Link da Sala Virtual</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* BARRA DE ENTRADA DE MENSAGEM (LIGHT THEME) */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[styles.botaoAnexo, menuAnexosAberto && styles.botaoAnexoAtivo]}
              onPress={() => setMenuAnexosAberto(!menuAnexosAberto)}
              activeOpacity={0.7}
            >
              <Feather name={menuAnexosAberto ? "x" : "plus"} size={18} color={menuAnexosAberto ? "#DC2626" : Theme.colors.primary} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={novoTexto}
              onChangeText={setNovoTexto}
              placeholder="Escreva sua mensagem..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={2000}
            />

            <TouchableOpacity
              style={[styles.botaoEnviar, (!novoTexto.trim() || enviando) && styles.botaoEnviarDesabilitado]}
              onPress={handleEnviar}
              disabled={!novoTexto.trim() || enviando}
              activeOpacity={0.85}
            >
              <Feather name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* MODAL DO CANAL DE DENÚNCIAS E MODERAÇÃO (LIGHT THEME) */}
          <Modal visible={modalDenunciaVisivel} transparent animationType="fade">
            <View style={styles.modalFundo}>
              <View style={styles.modalCard}>
                {protocoloGerado ? (
                  /* Tela de Sucesso com Protocolo */
                  <View style={styles.sucessoDenunciaContainer}>
                    <View style={styles.sucessoIconBox}>
                      <Feather name="check-circle" size={32} color="#059669" />
                    </View>
                    <Text style={styles.sucessoTitulo}>Denúncia Registrada</Text>
                    <Text style={styles.sucessoSubtitulo}>
                      Seu relato foi enviado para a equipe de moderação.
                    </Text>

                    <View style={styles.protocoloBox}>
                      <Text style={styles.protocoloLabel}>PROTOCOLO OFICIAL DE AUDITORIA:</Text>
                      <Text style={styles.protocoloNumero}>{protocoloGerado}</Text>
                    </View>

                    <Text style={styles.sucessoPrazo}>
                      Guarde o protocolo para acompanhar o andamento.
                    </Text>

                    <TouchableOpacity
                      style={styles.botaoFecharSucesso}
                      onPress={() => setModalDenunciaVisivel(false)}
                    >
                      <Text style={styles.botaoFecharSucessoTexto}>Entendido</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Formulário de Abertura de Denúncia */
                  <View>
                    <View style={styles.modalHeaderRow}>
                      <View style={styles.modalIconWrapVermelho}>
                        <Feather name="shield" size={18} color="#DC2626" />
                      </View>
                      <Text style={styles.modalTitulo}>Canal de Denúncias</Text>
                      <TouchableOpacity onPress={() => setModalDenunciaVisivel(false)}>
                        <Feather name="x" size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.modalSubtitulo}>
                      Denuncie violações éticas, abusos ou descumprimento de acordos cometidos por <Text style={{ fontWeight: "700", color: "#0F172A" }}>{nomeExibicao}</Text>.
                    </Text>

                    <Text style={styles.inputLabel}>Categoria da ocorrência:</Text>
                    <View style={styles.listaCategorias}>
                      {categoriasDenunciaList.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.categoriaItem, categoriaDenuncia === cat.id && styles.categoriaItemAtiva]}
                          onPress={() => setCategoriaDenuncia(cat.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.radioCirculo, categoriaDenuncia === cat.id && styles.radioCirculoAtivo]}>
                            {categoriaDenuncia === cat.id && <View style={styles.radioPonto} />}
                          </View>
                          <Text style={[styles.categoriaItemTexto, categoriaDenuncia === cat.id && styles.categoriaItemTextoAtivo]}>
                            {cat.titulo}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Detalhes dos fatos:</Text>
                    <TextInput
                      style={styles.modalInputArea}
                      value={descricaoDenuncia}
                      onChangeText={setDescricaoDenuncia}
                      placeholder="Descreva detalhadamente o ocorrido..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      maxLength={1000}
                    />

                    <View style={styles.modalBotoes}>
                      <TouchableOpacity
                        style={styles.modalBotaoCancelar}
                        onPress={() => setModalDenunciaVisivel(false)}
                      >
                        <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalBotaoEnviarDenuncia}
                        onPress={handleEnviarDenuncia}
                        disabled={enviandoDenuncia}
                      >
                        <Text style={styles.modalBotaoEnviarTexto}>
                          {enviandoDenuncia ? "Registrando..." : "Enviar Denúncia"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 10,
  },
  botaoVoltar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatarCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: {
    color: Theme.colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  pontoOnline: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
  },
  headerNomeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitulo: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  botaoDenuncia: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  faixaContexto: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  faixaContextoEsquerda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  faixaContextoTexto: {
    color: "#475569",
    fontSize: 12,
  },
  erroMensagens: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FEF2F2",
  },
  erroMensagensTexto: {
    color: "#991B1B",
    fontSize: 12,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingTexto: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10,
    fontWeight: "500",
  },
  listaMensagens: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD8B5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitulo: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtexto: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  bubbleWrapper: {
    marginVertical: 4,
    maxWidth: "82%",
  },
  bubbleEuWrapper: {
    alignSelf: "flex-end",
  },
  bubbleOutroWrapper: {
    alignSelf: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleEu: {
    backgroundColor: Theme.colors.primary,
    borderBottomRightRadius: 4,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(255, 90, 31, 0.2)" },
      default: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  bubbleOutro: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      web: { boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  nomeRemetente: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.primary,
    marginBottom: 3,
  },
  textoMensagem: {
    fontSize: 14,
    lineHeight: 20,
  },
  textoEu: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  textoOutro: {
    color: "#0F172A",
  },
  cardAnexoMensagem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  cardAnexoEu: {
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  cardAnexoOutro: {
    backgroundColor: "#F1F5F9",
  },
  textoAnexo: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  horaTexto: {
    fontSize: 10,
    fontWeight: "500",
  },
  horaEu: {
    color: "rgba(255,255,255,0.8)",
  },
  horaOutro: {
    color: "#94A3B8",
  },
  menuAnexosContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  opcaoAnexoBtn: {
    alignItems: "center",
    gap: 4,
  },
  opcaoAnexoIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  opcaoAnexoTexto: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 8,
  },
  botaoAnexo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD8B5",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoAnexoAtivo: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    color: "#0F172A",
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  botaoEnviar: {
    backgroundColor: Theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(255, 90, 31, 0.3)" },
      default: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  botaoEnviarDesabilitado: {
    backgroundColor: "#CBD5E1",
    opacity: 0.7,
  },

  // MODAL DE DENÚNCIA
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 440,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      web: { boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  modalIconWrapVermelho: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  modalSubtitulo: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 14,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  listaCategorias: {
    gap: 6,
    marginBottom: 12,
  },
  categoriaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  categoriaItemAtiva: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
  },
  radioCirculo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCirculoAtivo: {
    borderColor: "#DC2626",
  },
  radioPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  categoriaItemTexto: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
  },
  categoriaItemTextoAtivo: {
    color: "#0F172A",
    fontWeight: "700",
  },
  modalInputArea: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 12,
    minHeight: 65,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  modalBotoes: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalBotaoCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalBotaoCancelarTexto: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  modalBotaoEnviarDenuncia: {
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalBotaoEnviarTexto: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // SUCESSO DE DENÚNCIA
  sucessoDenunciaContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  sucessoIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  sucessoTitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  sucessoSubtitulo: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  protocoloBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  protocoloLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  protocoloNumero: {
    fontSize: 18,
    fontWeight: "900",
    color: Theme.colors.primary,
    fontFamily: Platform.select({ web: "monospace", default: "Courier" }),
    letterSpacing: 1,
  },
  sucessoPrazo: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 16,
  },
  botaoFecharSucesso: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  botaoFecharSucessoTexto: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default ChatModal;
