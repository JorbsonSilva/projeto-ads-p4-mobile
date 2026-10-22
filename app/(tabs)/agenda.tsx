import { API_URL } from "@/config/api";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useFocusEffect } from "expo-router"; // 🟢 1. Importação Nova
import React, { useCallback, useState } from "react"; // 🟢 2. useCallback Adicionado
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function Agenda() {
  const dataHoje = new Date();
  const [mesVisivel, setMesVisivel] = useState(dataHoje.getMonth());
  const [anoVisivel, setAnoVisivel] = useState(dataHoje.getFullYear());

  const { usuarioId, perfilAtivo } = useAuth() as any;

  const formatarData = (ano: number, mes: number, dia: number) => {
    return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  };
  const [dataSelecionada, setDataSelecionada] = useState(
    formatarData(
      dataHoje.getFullYear(),
      dataHoje.getMonth(),
      dataHoje.getDate(),
    ),
  );

  const [meusAgendamentos, setMeusAgendamentos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [aulaSelecionada, setAulaSelecionada] = useState<any>(null);
  const [modalRemarcarVisivel, setModalRemarcarVisivel] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [modalCancelarVisivel, setModalCancelarVisivel] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  const apiUrl = `${API_URL}/agendamentos`;

  const buscarAgendamentos = async () => {
    if (!usuarioId) return;
    setCarregando(true);
    try {
      const endpoint =
        perfilAtivo === "Professor"
          ? `${apiUrl}/professor/${usuarioId}`
          : `${apiUrl}/aluno/${usuarioId}`;

      const response = await axios.get(endpoint);
      setMeusAgendamentos(response.data);
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Aviso",
        "Não foi possível carregar as aulas. O servidor pode estar atualizando.",
      );
    } finally {
      setCarregando(false);
    }
  };

  // 🟢 3. A MÁGICA AQUI: Atualiza sempre que o usuário olhar para a tela de Agenda!
  useFocusEffect(
    useCallback(() => {
      buscarAgendamentos();
    }, [usuarioId, perfilAtivo]),
  );

  const confirmarCancelamento = async () => {
    if (justificativa.trim() === "") {
      Alert.alert("Atenção", "Você precisa escrever um motivo para cancelar.");
      return;
    }

    try {
      await axios.put(`${apiUrl}/${aulaSelecionada.id}/cancelar`, {
        justificativa: justificativa,
      });
      Alert.alert("Sucesso", "Aula recusada/cancelada!");
      setModalCancelarVisivel(false);
      setJustificativa("");
      buscarAgendamentos();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível cancelar a aula.");
    }
  };

  const requisitarRemarcacao = async () => {
    try {
      const horaFormatada = novaHora.length === 5 ? `${novaHora}:00` : novaHora;
      const dadosAtualizados = {
        ...aulaSelecionada,
        data: novaData,
        hora: horaFormatada,
      };

      await axios.put(
        `${apiUrl}/${aulaSelecionada.id}/remarcar`,
        dadosAtualizados,
      );
      Alert.alert("Sucesso", "Aula remarcada!");
      setModalRemarcarVisivel(false);
      buscarAgendamentos();
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível remarcar. O horário pode estar ocupado.",
      );
    }
  };

  const aceitarAula = async (id: number) => {
    try {
      await axios.put(`${apiUrl}/${id}/aceitar`);
      Alert.alert("Sucesso", "Aula confirmada!");
      buscarAgendamentos();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível confirmar a aula.");
    }
  };

  const abrirOpcoesAula = (agendamento: any) => {
    if (agendamento.status === "CANCELADO") {
      Alert.alert(
        "Aviso",
        `Cancelado pelo motivo: ${agendamento.justificativaCancelamento || "Não informado"}`,
      );
      return;
    }

    if (agendamento.status === "PENDENTE" && perfilAtivo === "Professor") {
      Alert.alert(
        "Solicitação de Aula",
        `O aluno ${agendamento.aluno?.nome || "Desconhecido"} solicitou esta aula.`,
        [
          { text: "Aceitar", onPress: () => aceitarAula(agendamento.id) },
          {
            text: "Recusar",
            style: "destructive",
            onPress: () => {
              setAulaSelecionada(agendamento);
              setJustificativa("");
              setModalCancelarVisivel(true);
            },
          },
          { text: "Voltar", style: "cancel" },
        ],
      );
      return;
    }

    const nomeOutraPessoa =
      perfilAtivo === "Professor"
        ? agendamento.aluno?.nome
        : agendamento.professor?.nome;

    Alert.alert(
      "Opções da Aula",
      `O que deseja fazer com a aula de ${nomeOutraPessoa || "ID Desconhecido"}?`,
      [
        {
          text: "Cancelar Aula",
          style: "destructive",
          onPress: () => {
            setAulaSelecionada(agendamento);
            setJustificativa("");
            setModalCancelarVisivel(true);
          },
        },
        {
          text: "Remarcar",
          onPress: () => {
            setAulaSelecionada(agendamento);
            setNovaData(agendamento.data);
            setNovaHora(agendamento.hora.substring(0, 5));
            setModalRemarcarVisivel(true);
          },
        },
        { text: "Fechar", style: "cancel" },
      ],
    );
  };

  const totalDiasMes = new Date(anoVisivel, mesVisivel + 1, 0).getDate();
  const primeiroDiaSemana = new Date(anoVisivel, mesVisivel, 1).getDay();

  const mudarMes = (delta: number) => {
    let novoMes = mesVisivel + delta;
    let novoAno = anoVisivel;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    } else if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    }
    setMesVisivel(novoMes);
    setAnoVisivel(novoAno);
  };

  const aulasDoDia = meusAgendamentos.filter(
    (aula) => aula.data === dataSelecionada,
  );
  const [, mesSelecionado, diaSelecionado] = dataSelecionada.split("-");

  return (
    <SafeAreaView style={estilos.recipientePrincipal}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.conteudo}
      >
        <Text style={estilos.textoTitulo}>
          {perfilAtivo === "Professor" ? "Agenda do Professor" : "Minha Agenda"}
        </Text>

        <View style={estilos.cartaoCalendario}>
          <View style={estilos.cabecalhoMes}>
            <TouchableOpacity
              onPress={() => mudarMes(-1)}
              style={estilos.botaoSeta}
            >
              <Text style={estilos.seta}>{"<"}</Text>
            </TouchableOpacity>
            <Text style={estilos.textoMes}>
              {nomesMeses[mesVisivel]} {anoVisivel}
            </Text>
            <TouchableOpacity
              onPress={() => mudarMes(1)}
              style={estilos.botaoSeta}
            >
              <Text style={estilos.seta}>{">"}</Text>
            </TouchableOpacity>
          </View>

          <View style={estilos.linhaDiasSemana}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
              (dia, index) => (
                <Text key={index} style={estilos.diaSemana}>
                  {dia}
                </Text>
              ),
            )}
          </View>

          <View style={estilos.gridDias}>
            {Array.from({ length: primeiroDiaSemana }).map((_, index) => (
              <View key={`vazio-${index}`} style={estilos.bolinhaDia} />
            ))}
            {Array.from({ length: totalDiasMes }).map((_, i) => {
              const dia = i + 1;
              const dataDesteBotao = formatarData(anoVisivel, mesVisivel, dia);
              const isSelecionado = dataDesteBotao === dataSelecionada;
              const temAulaAtiva = meusAgendamentos.some(
                (aula) =>
                  aula.data === dataDesteBotao && aula.status !== "CANCELADO",
              );

              return (
                <TouchableOpacity
                  key={dia}
                  style={[
                    estilos.bolinhaDia,
                    isSelecionado && estilos.diaSelecionado,
                  ]}
                  onPress={() => setDataSelecionada(dataDesteBotao)}
                >
                  <Text
                    style={[
                      estilos.textoDia,
                      isSelecionado && estilos.textoDiaSelecionado,
                    ]}
                  >
                    {dia}
                  </Text>
                  {temAulaAtiva && (
                    <View
                      style={[
                        estilos.pontoIndicador,
                        isSelecionado && estilos.pontoIndicadorSelecionado,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={estilos.subtitulo}>
          Aulas Marcadas ({diaSelecionado}/{mesSelecionado})
        </Text>

        {carregando ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: 20 }}
          />
        ) : aulasDoDia.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 20, color: "#888" }}>
            Nenhuma aula para este dia.
          </Text>
        ) : (
          aulasDoDia.map((agendamento) => {
            const isCancelado = agendamento.status === "CANCELADO";
            const isPendente = agendamento.status === "PENDENTE";

            const nomeCard =
              perfilAtivo === "Professor"
                ? `Aluno: ${agendamento.aluno?.nome || agendamento.aluno?.id}`
                : `Prof. ${agendamento.professor?.nome || agendamento.professor?.id}`;

            return (
              <TouchableOpacity
                key={agendamento.id}
                style={[
                  estilos.cartaoAgendamento,
                  isCancelado && estilos.cartaoCancelado,
                  isPendente && estilos.cartaoPendente,
                ]}
                onPress={() => abrirOpcoesAula(agendamento)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      estilos.nomeProfessor,
                      isCancelado && estilos.textoCancelado,
                      isPendente && estilos.textoPendenteDestaque,
                    ]}
                    numberOfLines={1}
                  >
                    {nomeCard}
                  </Text>
                  <Text
                    style={[
                      estilos.materia,
                      isCancelado && estilos.textoCancelado,
                    ]}
                  >
                    Status: {agendamento.status}
                  </Text>
                </View>
                <View
                  style={[
                    estilos.tagHorario,
                    isCancelado && estilos.tagHorarioCancelado,
                    isPendente && estilos.tagHorarioPendente,
                  ]}
                >
                  <Text
                    style={[
                      estilos.textoHorario,
                      isCancelado && estilos.textoCancelado,
                      isPendente && estilos.textoPendenteDestaque,
                    ]}
                  >
                    {agendamento.hora.substring(0, 5)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* MODAIS (MANTIDOS INTACTOS) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalRemarcarVisivel}
        onRequestClose={() => setModalRemarcarVisivel(false)}
      >
        <View style={estilos.modalFundo}>
          <View style={estilos.modalCartao}>
            <Text style={estilos.modalTitulo}>Remarcar Aula</Text>
            <Text style={estilos.modalLabel}>Nova Data (YYYY-MM-DD):</Text>
            <TextInput
              style={estilos.modalInput}
              value={novaData}
              onChangeText={setNovaData}
              placeholder="Ex: 2026-05-20"
            />
            <Text style={estilos.modalLabel}>Novo Horário (HH:MM):</Text>
            <TextInput
              style={estilos.modalInput}
              value={novaHora}
              onChangeText={setNovaHora}
              placeholder="Ex: 15:30"
            />
            <View style={estilos.modalBotoes}>
              <TouchableOpacity
                style={estilos.modalBotaoCancelar}
                onPress={() => setModalRemarcarVisivel(false)}
              >
                <Text style={estilos.modalTextoBotaoCancelar}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={estilos.modalBotaoSalvar}
                onPress={requisitarRemarcacao}
              >
                <Text style={estilos.modalTextoBotaoSalvar}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalCancelarVisivel}
        onRequestClose={() => setModalCancelarVisivel(false)}
      >
        <View style={estilos.modalFundo}>
          <View style={estilos.modalCartao}>
            <Text style={estilos.modalTitulo}>Motivo do Cancelamento</Text>
            <Text style={estilos.modalLabel}>Justificativa (Obrigatório):</Text>
            <TextInput
              style={[
                estilos.modalInput,
                { height: 80, textAlignVertical: "top" },
              ]}
              value={justificativa}
              onChangeText={setJustificativa}
              placeholder="Explique o motivo..."
              multiline={true}
            />
            <View style={estilos.modalBotoes}>
              <TouchableOpacity
                style={estilos.modalBotaoCancelar}
                onPress={() => setModalCancelarVisivel(false)}
              >
                <Text style={estilos.modalTextoBotaoCancelar}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  estilos.modalBotaoSalvar,
                  justificativa.trim() === "" && { backgroundColor: "#A0A0A0" },
                ]}
                onPress={confirmarCancelamento}
              >
                <Text style={estilos.modalTextoBotaoSalvar}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipientePrincipal: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: 20, paddingBottom: 40 },
  textoTitulo: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 20,
  },
  cartaoCalendario: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderColor: Colors.border,
    borderWidth: 1,
    elevation: 2,
  },
  cabecalhoMes: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  textoMes: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    textTransform: "capitalize",
  },
  botaoSeta: { padding: 5 },
  seta: { fontSize: 20, color: Colors.secondary, fontWeight: "bold" },
  linhaDiasSemana: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  diaSemana: {
    width: "13%",
    textAlign: "center",
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  gridDias: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  bolinhaDia: {
    width: "14.2%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    marginVertical: 2,
  },
  diaSelecionado: { backgroundColor: Colors.primary },
  textoDia: { fontSize: 16, color: Colors.text },
  textoDiaSelecionado: { color: Colors.card, fontWeight: "bold" },
  pontoIndicador: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  pontoIndicadorSelecionado: { backgroundColor: Colors.card },
  subtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 15,
  },

  cartaoAgendamento: {
    backgroundColor: Colors.card,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderColor: Colors.border,
    borderWidth: 1,
    elevation: 1,
  },
  nomeProfessor: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    paddingRight: 10,
  },
  materia: { fontSize: 14, color: "#888", marginTop: 4 },
  tagHorario: {
    backgroundColor: Colors.input,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  textoHorario: { color: Colors.primary, fontWeight: "bold", fontSize: 14 },

  cartaoCancelado: {
    backgroundColor: "#F0F0F0",
    borderColor: "#E0E0E0",
    elevation: 0,
  },
  textoCancelado: { color: "#A0A0A0", textDecorationLine: "line-through" },
  tagHorarioCancelado: { backgroundColor: "#E0E0E0" },

  cartaoPendente: { backgroundColor: "#FFF7ED", borderColor: "#FFE4C4" },
  textoPendenteDestaque: { color: "#D88400" },
  tagHorarioPendente: { backgroundColor: "#FFE4C4" },

  modalFundo: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalCartao: {
    backgroundColor: Colors.card,
    width: "85%",
    padding: 25,
    borderRadius: 20,
    elevation: 5,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 5,
    fontWeight: "bold",
  },
  modalInput: {
    backgroundColor: Colors.input,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    color: Colors.text,
  },
  modalBotoes: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalBotaoCancelar: {
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
    backgroundColor: "#E0E0E0",
  },
  modalTextoBotaoCancelar: { color: "#555", fontWeight: "bold" },
  modalBotaoSalvar: {
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  modalTextoBotaoSalvar: { color: Colors.card, fontWeight: "bold" },
});
