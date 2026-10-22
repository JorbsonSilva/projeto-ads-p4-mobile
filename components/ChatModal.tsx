import React, { useState, useEffect, useRef } from "react";
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
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { chatApi, suporteApi } from "../config/api";

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  agendamentoId: number;
  usuarioId: number;
  outroUsuarioId?: number;
  outroUsuarioNome?: string;
  outroParticipanteNome?: string;
  assunto?: string;
  disciplinaNome?: string;
  agendamentoStatus?: string;
}

interface MensagemItem {
  id: number;
  remetenteId: number;
  remetenteNome: string;
  conteudo: string;
  lida: boolean;
  enviadaEm: string;
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
  agendamentoStatus,
}) => {
  const nomeExibicao = outroUsuarioNome || outroParticipanteNome || "Participante";
  const assuntoExibicao = assunto || disciplinaNome || "Mentoria";
  const [mensagens, setMensagens] = useState<MensagemItem[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [modalDenunciaVisivel, setModalDenunciaVisivel] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState("");
  const [descricaoDenuncia, setDescricaoDenuncia] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const carregarMensagens = async () => {
    try {
      const res = await chatApi.listarMensagens(agendamentoId, usuarioId);
      if (res.data) {
        setMensagens(res.data);
      }
    } catch (e: any) {
      console.warn("Erro ao buscar mensagens do chat:", e.response?.data?.message || e.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (visible && agendamentoId) {
      setCarregando(true);
      carregarMensagens();
      const interval = setInterval(carregarMensagens, 3000);
      return () => clearInterval(interval);
    }
  }, [visible, agendamentoId]);

  const handleEnviar = async () => {
    if (!novoTexto.trim() || enviando) return;
    const textoParaEnviar = novoTexto.trim();
    setNovoTexto("");
    setEnviando(true);

    try {
      const res = await chatApi.enviarMensagem(agendamentoId, usuarioId, textoParaEnviar);
      if (res.data) {
        setMensagens((prev) => [...prev, res.data]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e: any) {
      Alert.alert("Erro ao Enviar", e.response?.data?.message || "Não foi possível enviar a mensagem.");
      setNovoTexto(textoParaEnviar);
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarDenuncia = async () => {
    if (!motivoDenuncia.trim() || !descricaoDenuncia.trim()) {
      Alert.alert("Atenção", "Preencha o motivo e a descrição da denúncia.");
      return;
    }
    if (!outroUsuarioId) {
      Alert.alert("Atenção", "Não foi possível identificar o usuário denunciado.");
      return;
    }

    try {
      await suporteApi.enviarDenuncia(usuarioId, {
        denunciadoId: outroUsuarioId,
        agendamentoId,
        motivo: motivoDenuncia,
        descricao: descricaoDenuncia,
      });
      Alert.alert("Denúncia Registrada", "Nossa moderação avaliará o caso com rigor e confidencialidade.");
      setModalDenunciaVisivel(false);
      setMotivoDenuncia("");
      setDescricaoDenuncia("");
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.message || "Erro ao registrar denúncia.");
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.botaoVoltar}>
              <FontAwesome5 name="arrow-left" size={18} color="#F8FAFC" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitulo} numberOfLines={1}>
                {nomeExibicao}
              </Text>
              <Text style={styles.headerSubtitulo} numberOfLines={1}>
                {assuntoExibicao ? `${assuntoExibicao} • Comunicação Segura` : "Comunicação Segura Orienta"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setModalDenunciaVisivel(true)}
              style={styles.botaoDenuncia}
              title="Denunciar conduta"
            >
              <FontAwesome5 name="flag" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Mensagens */}
          {carregando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#F97316" />
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
                  <FontAwesome5 name="comments" size={40} color="#475569" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyTitulo}>Nenhuma mensagem ainda</Text>
                  <Text style={styles.emptySubtexto}>
                    Tire dúvidas sobre o material ou combine detalhes do ponto de encontro.
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
                      <View style={styles.metaRow}>
                        <Text style={[styles.horaTexto, souEu ? styles.horaEu : styles.horaOutro]}>
                          {formatarHora(item.enviadaEm)}
                        </Text>
                        {souEu && (
                          <FontAwesome5
                            name={item.lida ? "check-double" : "check"}
                            size={10}
                            color={item.lida ? "#38BDF8" : "rgba(255,255,255,0.7)"}
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

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={novoTexto}
              onChangeText={setNovoTexto}
              placeholder="Digite uma mensagem..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.botaoEnviar, (!novoTexto.trim() || enviando) && styles.botaoEnviarDesabilitado]}
              onPress={handleEnviar}
              disabled={!novoTexto.trim() || enviando}
            >
              <FontAwesome5 name="paper-plane" size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Modal de Denúncia */}
          <Modal visible={modalDenunciaVisivel} transparent animationType="fade">
            <View style={styles.modalFundo}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitulo}>Denunciar Conduta</Text>
                <Text style={styles.modalSubtitulo}>
                  Denuncie abusos, linguagem ofensiva ou quebra de acordos.
                </Text>

                <Text style={styles.inputLabel}>Motivo:</Text>
                <TextInput
                  style={styles.modalInput}
                  value={motivoDenuncia}
                  onChangeText={setMotivoDenuncia}
                  placeholder="Ex: Desrespeito, ausência sem aviso..."
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>Detalhes do ocorrido:</Text>
                <TextInput
                  style={[styles.modalInput, { height: 90, textAlignVertical: "top" }]}
                  value={descricaoDenuncia}
                  onChangeText={setDescricaoDenuncia}
                  placeholder="Descreva com clareza o que aconteceu..."
                  placeholderTextColor="#94A3B8"
                  multiline
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
                  >
                    <Text style={styles.modalBotaoEnviarTexto}>Enviar Denúncia</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  botaoVoltar: {
    padding: 8,
    marginRight: 6,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  headerSubtitulo: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  botaoDenuncia: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingTexto: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
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
  emptyTitulo: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  emptySubtexto: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  bubbleWrapper: {
    marginVertical: 4,
    maxWidth: "80%",
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
    borderRadius: 16,
  },
  bubbleEu: {
    backgroundColor: "#F97316",
    borderBottomRightRadius: 2,
  },
  bubbleOutro: {
    backgroundColor: "#1E293B",
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: "#334155",
  },
  nomeRemetente: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F97316",
    marginBottom: 2,
  },
  textoMensagem: {
    fontSize: 14,
    lineHeight: 20,
  },
  textoEu: {
    color: "#0F172A",
    fontWeight: "500",
  },
  textoOutro: {
    color: "#F8FAFC",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  horaTexto: {
    fontSize: 10,
  },
  horaEu: {
    color: "rgba(15,23,42,0.7)",
  },
  horaOutro: {
    color: "#64748B",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#F8FAFC",
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#334155",
  },
  botaoEnviar: {
    backgroundColor: "#F97316",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoEnviarDesabilitado: {
    backgroundColor: "#475569",
    opacity: 0.5,
  },
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#1E293B",
    width: "100%",
    maxWidth: 400,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  modalSubtitulo: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#CBD5E1",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F8FAFC",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 14,
  },
  modalBotoes: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  modalBotaoCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalBotaoCancelarTexto: {
    color: "#94A3B8",
    fontSize: 13,
  },
  modalBotaoEnviarDenuncia: {
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalBotaoEnviarTexto: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
});
