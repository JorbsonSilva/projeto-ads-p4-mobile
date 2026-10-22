import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { suporteApi } from "../config/api";

interface ModalSuporteTicketProps {
  visible: boolean;
  onClose: () => void;
  usuarioId: number;
}

interface TicketItem {
  id: number;
  protocolo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  resposta?: string;
  criadoEm: string;
}

const CATEGORIAS = [
  { id: "DUVIDA", label: "Dúvida Geral" },
  { id: "FINANCEIRO", label: "Preço Congelado / Pagamento" },
  { id: "PROBLEMA_TECNICO", label: "Problema Técnico" },
  { id: "CONDUTA", label: "Conduta ou Moderação" },
  { id: "OUTRO", label: "Outro" },
];

export const ModalSuporteTicket: React.FC<ModalSuporteTicketProps> = ({
  visible,
  onClose,
  usuarioId,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<"novo" | "meus">("novo");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Form
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("DUVIDA");
  const [descricao, setDescricao] = useState("");

  const carregarTickets = async () => {
    try {
      setCarregando(true);
      const res = await suporteApi.listarMeusTickets(usuarioId);
      if (res.data) {
        setTickets(res.data);
      }
    } catch (e: any) {
      console.warn("Erro ao buscar tickets:", e.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (visible && usuarioId) {
      if (abaAtiva === "meus") {
        carregarTickets();
      }
    }
  }, [visible, abaAtiva, usuarioId]);

  const handleCriarTicket = async () => {
    if (!titulo.trim() || !descricao.trim()) {
      Alert.alert("Atenção", "Preencha o título e a descrição da sua solicitação.");
      return;
    }

    try {
      setEnviando(true);
      const res = await suporteApi.criarTicket(usuarioId, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria,
      });

      if (res.data) {
        Alert.alert(
          "Ticket Criado!",
          `Seu chamado foi registrado sob o protocolo ${res.data.protocolo}. Você será notificado assim que respondermos.`
        );
        setTitulo("");
        setDescricao("");
        setAbaAtiva("meus");
      }
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.message || "Não foi possível criar o ticket.");
    } finally {
      setEnviando(false);
    }
  };

  const getStatusCor = (status: string) => {
    switch (status) {
      case "ABERTO":
        return { bg: "#FEF3C7", text: "#B45309" };
      case "EM_ATENDIMENTO":
        return { bg: "#DBEAFE", text: "#1D4ED8" };
      case "RESOLVIDO":
        return { bg: "#DCFCE7", text: "#15803D" };
      case "FECHADO":
        return { bg: "#F1F5F9", text: "#475569" };
      default:
        return { bg: "#F1F5F9", text: "#475569" };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.botaoVoltar}>
            <FontAwesome5 name="arrow-left" size={18} color="#F8FAFC" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitulo}>Suporte Acadêmico Orienta</Text>
            <Text style={styles.headerSubtitulo}>Atendimento interno e resolução de dúvidas</Text>
          </View>
        </View>

        {/* Abas */}
        <View style={styles.abasContainer}>
          <TouchableOpacity
            style={[styles.aba, abaAtiva === "novo" && styles.abaAtiva]}
            onPress={() => setAbaAtiva("novo")}
          >
            <FontAwesome5
              name="plus-circle"
              size={14}
              color={abaAtiva === "novo" ? "#F97316" : "#94A3B8"}
            />
            <Text style={[styles.abaTexto, abaAtiva === "novo" && styles.abaTextoAtivo]}>
              Novo Chamado
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aba, abaAtiva === "meus" && styles.abaAtiva]}
            onPress={() => setAbaAtiva("meus")}
          >
            <FontAwesome5
              name="history"
              size={14}
              color={abaAtiva === "meus" ? "#F97316" : "#94A3B8"}
            />
            <Text style={[styles.abaTexto, abaAtiva === "meus" && styles.abaTextoAtivo]}>
              Meus Tickets ({tickets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {abaAtiva === "novo" ? (
          <View style={styles.formulario}>
            <Text style={styles.label}>Título da Solicitação:</Text>
            <TextInput
              style={styles.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex: Dúvida sobre agendamento cancelado..."
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Categoria:</Text>
            <View style={styles.categoriaGrid}>
              {CATEGORIAS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoriaItem,
                    categoria === cat.id && styles.categoriaItemSelecionado,
                  ]}
                  onPress={() => setCategoria(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoriaTexto,
                      categoria === cat.id && styles.categoriaTextoSelecionado,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Descrição detalhada:</Text>
            <TextInput
              style={[styles.input, styles.inputDescricao]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Explique o que aconteceu com todos os detalhes..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.botaoSalvar, enviando && styles.botaoDesabilitado]}
              onPress={handleCriarTicket}
              disabled={enviando}
            >
              <FontAwesome5 name="paper-plane" size={14} color="#0F172A" />
              <Text style={styles.botaoSalvarTexto}>
                {enviando ? "Enviando..." : "Abrir Chamado"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : carregando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#F97316" />
            <Text style={styles.loadingTexto}>Carregando chamados...</Text>
          </View>
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="ticket-alt" size={40} color="#475569" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitulo}>Nenhum ticket aberto</Text>
                <Text style={styles.emptySubtexto}>
                  Quando você precisar de ajuda, abra um chamado pela aba "Novo Chamado".
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const cor = getStatusCor(item.status);
              return (
                <View style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketProtocolo}>{item.protocolo}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: cor.bg }]}>
                      <Text style={[styles.statusBadgeTexto, { color: cor.text }]}>
                        {item.status.replace(/_/g, " ")}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketTitulo}>{item.titulo}</Text>
                  <Text style={styles.ticketDescricao}>{item.descricao}</Text>

                  {item.resposta && (
                    <View style={styles.respostaBox}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <FontAwesome5 name="user-shield" size={12} color="#10B981" />
                        <Text style={styles.respostaAutor}>Resposta do Atendimento:</Text>
                      </View>
                      <Text style={styles.respostaTexto}>{item.resposta}</Text>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
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
    paddingVertical: 14,
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
  abasContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  aba: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  abaAtiva: {
    borderBottomColor: "#F97316",
  },
  abaTexto: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
  abaTextoAtivo: {
    color: "#F8FAFC",
    fontWeight: "bold",
  },
  formulario: {
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#CBD5E1",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#F8FAFC",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#334155",
  },
  inputDescricao: {
    height: 100,
    textAlignVertical: "top",
  },
  categoriaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoriaItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  categoriaItemSelecionado: {
    backgroundColor: "rgba(249,115,22,0.15)",
    borderColor: "#F97316",
  },
  categoriaTexto: {
    fontSize: 11,
    color: "#94A3B8",
  },
  categoriaTextoSelecionado: {
    color: "#F97316",
    fontWeight: "bold",
  },
  botaoSalvar: {
    backgroundColor: "#F97316",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
  },
  botaoSalvarTexto: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "bold",
  },
  botaoDesabilitado: {
    backgroundColor: "#475569",
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
  lista: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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
  ticketCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ticketProtocolo: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#F97316",
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeTexto: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  ticketTitulo: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  ticketDescricao: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 18,
  },
  respostaBox: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  respostaAutor: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "bold",
  },
  respostaTexto: {
    fontSize: 12,
    color: "#E2E8F0",
    lineHeight: 18,
  },
});
