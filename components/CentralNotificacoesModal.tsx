import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { notificacaoApi } from "../config/api";

interface CentralNotificacoesModalProps {
  visible: boolean;
  onClose: () => void;
  usuarioId: number;
  onNotificacaoLida?: () => void;
}

interface NotificacaoItem {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: "AGENDAMENTO" | "CHAT" | "SUPORTE" | "SISTEMA" | "AVALIACAO";
  lida: boolean;
  dataHora: string;
}

export const CentralNotificacoesModal: React.FC<CentralNotificacoesModalProps> = ({
  visible,
  onClose,
  usuarioId,
  onNotificacaoLida,
}) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarNotificacoes = async () => {
    try {
      const res = await notificacaoApi.listar(usuarioId);
      if (res.data) {
        setNotificacoes(res.data);
      }
    } catch (e: any) {
      console.warn("Erro ao buscar notificações:", e.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (visible && usuarioId) {
      setCarregando(true);
      carregarNotificacoes();
    }
  }, [visible, usuarioId]);

  const handleMarcarComoLida = async (id: number) => {
    try {
      await notificacaoApi.marcarComoLida(id, usuarioId);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
      onNotificacaoLida?.();
    } catch (e) {
      console.warn("Erro ao marcar lida:", e);
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    try {
      await notificacaoApi.marcarTodasComoLidas(usuarioId);
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      onNotificacaoLida?.();
    } catch (e) {
      console.warn("Erro ao marcar todas como lidas:", e);
    }
  };

  const getIconeTipo = (tipo: string) => {
    switch (tipo) {
      case "CHAT":
        return { name: "comment-alt", color: "#38BDF8" };
      case "AGENDAMENTO":
        return { name: "calendar-check", color: "#10B981" };
      case "SUPORTE":
        return { name: "headset", color: "#F59E0B" };
      case "AVALIACAO":
        return { name: "star", color: "#EAB308" };
      default:
        return { name: "bell", color: "#94A3B8" };
    }
  };

  const formatarData = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const naoLidasCount = notificacoes.filter((n) => !n.lida).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.botaoVoltar}>
            <FontAwesome5 name="arrow-left" size={18} color="#F8FAFC" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitulo}>Central de Avisos</Text>
            <Text style={styles.headerSubtitulo}>
              {naoLidasCount > 0 ? `${naoLidasCount} nova(s) notificação(ões)` : "Tudo atualizado"}
            </Text>
          </View>

          {naoLidasCount > 0 && (
            <TouchableOpacity onPress={handleMarcarTodasComoLidas} style={styles.botaoLimpar}>
              <Text style={styles.botaoLimparTexto}>Ler todas</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista */}
        {carregando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#F97316" />
            <Text style={styles.loadingTexto}>Buscando notificações...</Text>
          </View>
        ) : (
          <FlatList
            data={notificacoes}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="bell-slash" size={40} color="#475569" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitulo}>Nenhuma notificação</Text>
                <Text style={styles.emptySubtexto}>
                  Você receberá avisos sobre mensagens de chat, confirmações de mentoria e respostas de suporte aqui.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const icone = getIconeTipo(item.tipo);
              return (
                <TouchableOpacity
                  style={[styles.itemCard, !item.lida && styles.itemCardNaoLido]}
                  onPress={() => !item.lida && handleMarcarComoLida(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconeBox, { backgroundColor: `${icone.color}15` }]}>
                    <FontAwesome5 name={icone.name} size={16} color={icone.color} />
                  </View>

                  <View style={styles.itemConteudo}>
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemTitulo, !item.lida && styles.itemTituloNaoLido]}>
                        {item.titulo}
                      </Text>
                      {!item.lida && <View style={styles.bolinhaNaoLida} />}
                    </View>

                    <Text style={styles.itemMensagem}>{item.mensagem}</Text>
                    <Text style={styles.itemData}>{formatarData(item.dataHora)}</Text>
                  </View>
                </TouchableOpacity>
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
  botaoLimpar: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(249,115,22,0.1)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.3)",
  },
  botaoLimparTexto: {
    color: "#F97316",
    fontSize: 11,
    fontWeight: "bold",
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
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  itemCardNaoLido: {
    borderColor: "#F97316",
    backgroundColor: "#1E293B",
  },
  iconeBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  itemConteudo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemTitulo: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E2E8F0",
    flex: 1,
  },
  itemTituloNaoLido: {
    color: "#F8FAFC",
    fontWeight: "bold",
  },
  bolinhaNaoLida: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
    marginLeft: 6,
  },
  itemMensagem: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 18,
    marginBottom: 6,
  },
  itemData: {
    fontSize: 11,
    color: "#64748B",
  },
});
