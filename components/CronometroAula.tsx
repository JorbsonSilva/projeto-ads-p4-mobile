import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  TextInput 
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { api, ApiResponse } from "../config/api";

interface CronometroAulaProps {
  agendamentoId: number;
  usuarioId: number;
  isProfessor: boolean;
  onAulaConcluida?: () => void;
}

interface SessaoData {
  id: number;
  alunoCheckin: boolean;
  professorCheckin: boolean;
  statusSessao: 'AGUARDANDO_CHECKIN' | 'EM_ANDAMENTO' | 'PAUSADA' | 'AGUARDANDO_CONFIRMACAO' | 'CONCLUIDA';
  segundosDecorridos: number;
  alunoConfirmouFim: boolean;
  professorConfirmouFim: boolean;
}

export const CronometroAula: React.FC<CronometroAulaProps> = ({
  agendamentoId,
  usuarioId,
  isProfessor,
  onAulaConcluida,
}) => {
  const [sessao, setSessao] = useState<SessaoData | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [segundosLocais, setSegundosLocais] = useState<number>(0);
  const [modalAvaliacao, setModalAvaliacao] = useState<boolean>(false);
  const [nota, setNota] = useState<number>(5);
  const [comentario, setComentario] = useState<string>("");
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState<boolean>(false);

  // Consulta status oficial no servidor a cada 5 segundos
  const carregarSessao = async () => {
    try {
      const res = await api.get<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/sessao`);
      if (res.data?.data) {
        setSessao(res.data.data);
        setSegundosLocais(res.data.data.segundosDecorridos || 0);

        if (res.data.data.statusSessao === "CONCLUIDA") {
          onAulaConcluida?.();
        }
      }
    } catch (e: any) {
      console.warn("Erro ao buscar sessão de aula:", e.response?.data?.message || e.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarSessao();
    const intervaloSync = setInterval(carregarSessao, 5000);
    return () => clearInterval(intervaloSync);
  }, [agendamentoId]);

  // Cronômetro local avança segundo a segundo apenas quando EM_ANDAMENTO
  useEffect(() => {
    let timer: any;
    if (sessao?.statusSessao === "EM_ANDAMENTO") {
      timer = setInterval(() => {
        setSegundosLocais((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sessao?.statusSessao]);

  const handleCheckin = async () => {
    try {
      setCarregando(true);
      const res = await api.post<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/checkin`, {
        usuarioId,
      });
      if (res.data?.data) {
        setSessao(res.data.data);
        Alert.alert("Check-in Confirmado", "Seu check-in foi registrado. A aula iniciará quando ambas as partes confirmarem.");
      }
    } catch (e: any) {
      Alert.alert("Atenção", e.response?.data?.message || "Não foi possível realizar o check-in.");
    } finally {
      setCarregando(false);
    }
  };

  const handlePausar = async () => {
    try {
      const res = await api.post<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/pausar`, {
        usuarioId,
        motivo: "Pausa solicitada pelo usuário",
      });
      if (res.data?.data) setSessao(res.data.data);
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.message || "Erro ao pausar aula.");
    }
  };

  const handleRetomar = async () => {
    try {
      const res = await api.post<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/retomar`, {
        usuarioId,
      });
      if (res.data?.data) setSessao(res.data.data);
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.message || "Erro ao retomar aula.");
    }
  };

  const handleFinalizar = async () => {
    Alert.alert(
      "Encerrar Aula",
      "Deseja confirmar o término desta aula?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              const res = await api.post<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/finalizar`, {
                usuarioId,
              });
              if (res.data?.data) {
                setSessao(res.data.data);
                if (res.data.data.statusSessao === "CONCLUIDA") {
                  Alert.alert("Aula Concluída!", "Ambas as partes confirmaram o encerramento. Por favor, envie sua avaliação.");
                  setModalAvaliacao(true);
                } else {
                  Alert.alert("Aguardando Confirmação", "Você confirmou o fim. Aguardando a confirmação da outra parte.");
                }
              }
            } catch (e: any) {
              Alert.alert("Erro", e.response?.data?.message || "Erro ao finalizar aula.");
            }
          },
        },
      ]
    );
  };

  const handleEnviarAvaliacao = async () => {
    try {
      setEnviandoAvaliacao(true);
      await api.post(`/aulas/${agendamentoId}/avaliar?avaliadorId=${usuarioId}`, {
        nota,
        pontualidade: nota,
        didatica: nota,
        comentario,
      });
      Alert.alert("Avaliação Enviada", "Muito obrigado pelo seu feedback!");
      setModalAvaliacao(false);
      onAulaConcluida?.();
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.message || "Não foi possível enviar a avaliação.");
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const formatarTempo = (totalSegundos: number) => {
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    return `${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
  };

  if (carregando && !sessao) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#F97316" />
        <Text style={styles.loadingText}>Sincronizando com relógio do servidor...</Text>
      </View>
    );
  }

  const meuCheckin = isProfessor ? sessao?.professorCheckin : sessao?.alunoCheckin;
  const outroCheckin = isProfessor ? sessao?.alunoCheckin : sessao?.professorCheckin;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeStatus}>
          <View style={[styles.ponto, sessao?.statusSessao === "EM_ANDAMENTO" ? styles.pontoVerde : styles.pontoAmarelo]} />
          <Text style={styles.statusTexto}>{sessao?.statusSessao?.replace(/_/g, " ")}</Text>
        </View>
        <Text style={styles.relogioOficialTexto}>Relógio Servidor P4</Text>
      </View>

      {/* Cronômetro Oficial */}
      <View style={styles.displayContainer}>
        <FontAwesome5 name="stopwatch" size={28} color="#F97316" style={{ marginBottom: 4 }} />
        <Text style={styles.displayTempo}>{formatarTempo(segundosLocais)}</Text>
        <Text style={styles.displaySubtexto}>
          {sessao?.statusSessao === "EM_ANDAMENTO"
            ? "Tempo oficial em contagem ativa"
            : sessao?.statusSessao === "PAUSADA"
            ? "Aula pausada por comum acordo"
            : "Aguardando início bilateral"}
        </Text>
      </View>

      {/* Indicadores de Check-in Bilateral */}
      <View style={styles.checkinRow}>
        <View style={styles.checkinBadge}>
          <FontAwesome5 
            name={meuCheckin ? "check-circle" : "clock"} 
            size={14} 
            color={meuCheckin ? "#10B981" : "#94A3B8"} 
          />
          <Text style={[styles.checkinTexto, meuCheckin && styles.checkinAtivo]}>
            Você ({meuCheckin ? "Check-in OK" : "Pendente"})
          </Text>
        </View>

        <View style={styles.checkinBadge}>
          <FontAwesome5 
            name={outroCheckin ? "check-circle" : "clock"} 
            size={14} 
            color={outroCheckin ? "#10B981" : "#94A3B8"} 
          />
          <Text style={[styles.checkinTexto, outroCheckin && styles.checkinAtivo]}>
            {isProfessor ? "Aluno" : "Professor"} ({outroCheckin ? "Check-in OK" : "Pendente"})
          </Text>
        </View>
      </View>

      {/* Ações de Controle */}
      <View style={styles.actionsContainer}>
        {sessao?.statusSessao === "AGUARDANDO_CHECKIN" && (
          <TouchableOpacity 
            style={[styles.botaoPrincipal, meuCheckin && styles.botaoDesabilitado]} 
            onPress={handleCheckin}
            disabled={meuCheckin}
          >
            <FontAwesome5 name="user-check" size={16} color="#0F172A" />
            <Text style={styles.botaoPrincipalTexto}>
              {meuCheckin ? "Aguardando outra parte..." : "Dar Meu Check-in"}
            </Text>
          </TouchableOpacity>
        )}

        {sessao?.statusSessao === "EM_ANDAMENTO" && (
          <View style={styles.botoesRow}>
            <TouchableOpacity style={styles.botaoPausa} onPress={handlePausar}>
              <FontAwesome5 name="pause" size={14} color="#F1F5F9" />
              <Text style={styles.botaoTextoBranco}>Pausar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoFinalizar} onPress={handleFinalizar}>
              <FontAwesome5 name="flag-checkered" size={14} color="#F1F5F9" />
              <Text style={styles.botaoTextoBranco}>Finalizar Aula</Text>
            </TouchableOpacity>
          </View>
        )}

        {sessao?.statusSessao === "PAUSADA" && (
          <View style={styles.botoesRow}>
            <TouchableOpacity style={styles.botaoRetomar} onPress={handleRetomar}>
              <FontAwesome5 name="play" size={14} color="#0F172A" />
              <Text style={styles.botaoPrincipalTexto}>Retomar Aula</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoFinalizar} onPress={handleFinalizar}>
              <FontAwesome5 name="flag-checkered" size={14} color="#F1F5F9" />
              <Text style={styles.botaoTextoBranco}>Finalizar</Text>
            </TouchableOpacity>
          </View>
        )}

        {sessao?.statusSessao === "AGUARDANDO_CONFIRMACAO" && (
          <TouchableOpacity style={styles.botaoConfirmarFim} onPress={handleFinalizar}>
            <FontAwesome5 name="check-double" size={16} color="#F1F5F9" />
            <Text style={styles.botaoTextoBranco}>Confirmar Conclusão Mútua</Text>
          </TouchableOpacity>
        )}

        {sessao?.statusSessao === "CONCLUIDA" && (
          <TouchableOpacity style={styles.botaoAvaliar} onPress={() => setModalAvaliacao(true)}>
            <FontAwesome5 name="star" size={16} color="#0F172A" />
            <Text style={styles.botaoPrincipalTexto}>Avaliar Esta Aula ⭐</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de Avaliação Pós-Aula */}
      <Modal visible={modalAvaliacao} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Avaliar Mentoria</Text>
            <Text style={styles.modalSubtitulo}>Sua opinião garante a qualidade da comunidade Orienta.</Text>

            {/* Estrelas de Nota */}
            <View style={styles.estrelasRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNota(star)}>
                  <FontAwesome5 
                    name="star" 
                    solid={star <= nota} 
                    size={28} 
                    color={star <= nota ? "#F59E0B" : "#475569"} 
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.inputComentario}
              placeholder="Escreva um comentário sobre a didática ou aprendizado..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={comentario}
              onChangeText={setComentario}
            />

            <View style={styles.modalBotoesRow}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalAvaliacao(false)}>
                <Text style={styles.botaoCancelarTexto}>Depois</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.botaoEnviarAvaliacao} onPress={handleEnviarAvaliacao} disabled={enviandoAvaliacao}>
                <Text style={styles.botaoEnviarTexto}>
                  {enviandoAvaliacao ? "Enviando..." : "Enviar Avaliação"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginVertical: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badgeStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  pontoVerde: {
    backgroundColor: "#10B981",
  },
  pontoAmarelo: {
    backgroundColor: "#F59E0B",
  },
  statusTexto: {
    color: "#F1F5F9",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  relogioOficialTexto: {
    color: "#94A3B8",
    fontSize: 11,
  },
  displayContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
  },
  displayTempo: {
    fontSize: 34,
    fontWeight: "900",
    color: "#F8FAFC",
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  displaySubtexto: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  checkinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },
  checkinBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  checkinTexto: {
    color: "#94A3B8",
    fontSize: 11,
    marginLeft: 6,
  },
  checkinAtivo: {
    color: "#10B981",
    fontWeight: "bold",
  },
  actionsContainer: {
    marginTop: 4,
  },
  botoesRow: {
    flexDirection: "row",
    gap: 8,
  },
  botaoPrincipal: {
    backgroundColor: "#F97316",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  botaoPrincipalTexto: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "bold",
  },
  botaoDesabilitado: {
    backgroundColor: "#64748B",
  },
  botaoPausa: {
    flex: 1,
    backgroundColor: "#475569",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  botaoRetomar: {
    flex: 1,
    backgroundColor: "#F97316",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  botaoFinalizar: {
    flex: 1,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  botaoConfirmarFim: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  botaoAvaliar: {
    backgroundColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  botaoTextoBranco: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F8FAFC",
    textAlign: "center",
  },
  modalSubtitulo: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  estrelasRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  inputComentario: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 12,
    color: "#F8FAFC",
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalBotoesRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  botaoCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  botaoCancelarTexto: {
    color: "#94A3B8",
    fontSize: 13,
  },
  botaoEnviarAvaliacao: {
    backgroundColor: "#F97316",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  botaoEnviarTexto: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "bold",
  },
});
export default CronometroAula;
