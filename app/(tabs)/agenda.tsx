import { CentralNotificacoesModal } from "@/components/CentralNotificacoesModal";
import { ChatModal } from "@/components/ChatModal";
import { CronometroAula } from "@/components/CronometroAula";
import { ModalSuporteTicket } from "@/components/ModalSuporteTicket";
import { API_URL, notificacaoApi } from "@/config/api";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
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
  const [modalSalaAulaVisivel, setModalSalaAulaVisivel] = useState(false);
  const [aulaSalaAoVivo, setAulaSalaAoVivo] = useState<any>(null);

  // Fase 7: Chat, Notificações Internas e Suporte
  const [modalChatVisivel, setModalChatVisivel] = useState(false);
  const [aulaChatSelecionada, setAulaChatSelecionada] = useState<any>(null);
  const [modalNotificacoesVisivel, setModalNotificacoesVisivel] =
    useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [modalSuporteVisivel, setModalSuporteVisivel] = useState(false);

  const apiUrl = `${API_URL}/agendamentos`;

  const carregarNaoLidas = async () => {
    if (!usuarioId) return;
    try {
      const resp = await notificacaoApi.contarNaoLidas(Number(usuarioId));
      const count =
        (resp.data as any)?.totalNaoLidas ?? (resp.data as any)?.total ?? 0;
      setNotificacoesNaoLidas(count);
    } catch (e) {
      // Silencioso se backend offline
    }
  };

  const abrirChat = (agendamento: any) => {
    setAulaChatSelecionada(agendamento);
    setModalChatVisivel(true);
  };

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

  // 🟢 Atualiza sempre que o usuário olhar para a tela de Agenda!
  useFocusEffect(
    useCallback(() => {
      buscarAgendamentos();
      carregarNaoLidas();
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

    const podeEntrarAoVivo =
      agendamento.status === "CONFIRMADO" ||
      agendamento.status === "EM_ANDAMENTO" ||
      agendamento.status === "AGUARDANDO_CONFIRMACAO" ||
      agendamento.status === "REALIZADA";

    const botoesOpcoes: any[] = [];

    if (podeEntrarAoVivo) {
      botoesOpcoes.push({
        text:
          agendamento.status === "REALIZADA"
            ? "Ver Resumo / Avaliação"
            : "Entrar na Sala Ao Vivo ⏱️",
        onPress: () => {
          setAulaSalaAoVivo(agendamento);
          setModalSalaAulaVisivel(true);
        },
      });
    }

    if (
      agendamento.status !== "REALIZADA" &&
      agendamento.status !== "EM_ANDAMENTO"
    ) {
      botoesOpcoes.push({
        text: "Remarcar",
        onPress: () => {
          setAulaSelecionada(agendamento);
          setNovaData(agendamento.data);
          setNovaHora(agendamento.hora.substring(0, 5));
          setModalRemarcarVisivel(true);
        },
      });

      botoesOpcoes.push({
        text: "Cancelar Aula",
        style: "destructive",
        onPress: () => {
          setAulaSelecionada(agendamento);
          setJustificativa("");
          setModalCancelarVisivel(true);
        },
      });
    }

    botoesOpcoes.push({ text: "Fechar", style: "cancel" });

    Alert.alert(
      "Opções da Aula",
      `Mentoria com ${nomeOutraPessoa || "Participante"} (Status: ${agendamento.status})`,
      botoesOpcoes,
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={[estilos.textoTitulo, { marginBottom: 0 }]}>
            {perfilAtivo === "Professor"
              ? "Agenda do Professor"
              : "Minha Agenda"}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setModalSuporteVisivel(true)}
              accessibilityLabel="Abrir Central de Suporte"
            >
              <FontAwesome5 name="headset" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
              onPress={() => setModalNotificacoesVisivel(true)}
              accessibilityLabel="Abrir Notificações"
            >
              <FontAwesome5 name="bell" size={18} color="#475569" />
              {notificacoesNaoLidas > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    backgroundColor: "#EF4444",
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {notificacoesNaoLidas > 99 ? "99+" : notificacoesNaoLidas}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

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
            const isEmAndamento = agendamento.status === "EM_ANDAMENTO";
            const isConfirmado = agendamento.status === "CONFIRMADO";
            const isAguardando =
              agendamento.status === "AGUARDANDO_CONFIRMACAO";
            const isRealizada = agendamento.status === "REALIZADA";

            const nomeCard =
              perfilAtivo === "Professor"
                ? `Aluno: ${agendamento.aluno?.nome || agendamento.aluno?.id}`
                : `Prof. ${agendamento.professor?.nome || agendamento.professor?.id}`;

            const assunto =
              agendamento.assunto ||
              agendamento.saber?.nome ||
              "Mentoria Orienta";

            return (
              <View
                key={agendamento.id}
                style={[
                  estilos.cartaoAgendamento,
                  isCancelado && estilos.cartaoCancelado,
                  isPendente && estilos.cartaoPendente,
                  isEmAndamento && estilos.cartaoEmAndamento,
                  isRealizada && estilos.cartaoRealizada,
                ]}
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => abrirOpcoesAula(agendamento)}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={[
                        estilos.nomeProfessor,
                        isCancelado && estilos.textoCancelado,
                        isPendente && estilos.textoPendenteDestaque,
                        isEmAndamento && { color: "#10B981" },
                      ]}
                      numberOfLines={1}
                    >
                      {nomeCard}
                    </Text>

                    <View
                      style={[
                        estilos.tagHorario,
                        isCancelado && estilos.tagHorarioCancelado,
                        isPendente && estilos.tagHorarioPendente,
                        isEmAndamento && { backgroundColor: "#DCFCE7" },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.textoHorario,
                          isCancelado && estilos.textoCancelado,
                          isPendente && estilos.textoPendenteDestaque,
                          isEmAndamento && { color: "#16A34A" },
                        ]}
                      >
                        {agendamento.hora.substring(0, 5)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      estilos.materia,
                      isCancelado && estilos.textoCancelado,
                    ]}
                  >
                    {assunto} • {agendamento.modalidade || "ONLINE"}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 8,
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <View
                      style={[
                        estilos.badgeStatusPequeno,
                        isEmAndamento && { backgroundColor: "#DCFCE7" },
                        isConfirmado && { backgroundColor: "#DBEAFE" },
                        isAguardando && { backgroundColor: "#FEF3C7" },
                        isRealizada && { backgroundColor: "#F3E8FF" },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.badgeStatusTexto,
                          isEmAndamento && { color: "#15803D" },
                          isConfirmado && { color: "#1D4ED8" },
                          isAguardando && { color: "#B45309" },
                          isRealizada && { color: "#7E22CE" },
                        ]}
                      >
                        {isEmAndamento ? "🔴 EM ANDAMENTO" : agendamento.status}
                      </Text>
                    </View>

                    {!isCancelado && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#0284C7",
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          gap: 5,
                        }}
                        onPress={() => abrirChat(agendamento)}
                      >
                        <FontAwesome5
                          name="comments"
                          size={12}
                          color="#FFFFFF"
                        />
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: "bold",
                          }}
                        >
                          Chat
                        </Text>
                      </TouchableOpacity>
                    )}

                    {(isConfirmado ||
                      isEmAndamento ||
                      isAguardando ||
                      isRealizada) && (
                      <TouchableOpacity
                        style={[
                          estilos.botaoAcessarAoVivo,
                          isEmAndamento && { backgroundColor: "#10B981" },
                          isRealizada && { backgroundColor: "#8B5CF6" },
                        ]}
                        onPress={() => {
                          setAulaSalaAoVivo(agendamento);
                          setModalSalaAulaVisivel(true);
                        }}
                      >
                        <FontAwesome5
                          name={isRealizada ? "star" : "stopwatch"}
                          size={12}
                          color="#FFFFFF"
                        />
                        <Text style={estilos.botaoAcessarAoVivoTexto}>
                          {isEmAndamento
                            ? "Acessar Sala Ao Vivo"
                            : isConfirmado
                              ? "Entrar na Sala"
                              : isAguardando
                                ? "Confirmar Fim"
                                : "Ver / Avaliar"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
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

      {/* MODAL SALA DE AULA AO VIVO & CRONÔMETRO BILATERAL */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalSalaAulaVisivel}
        onRequestClose={() => setModalSalaAulaVisivel(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
          {/* Header da Sala */}
          <View style={estilos.salaHeader}>
            <TouchableOpacity
              style={estilos.botaoVoltarSala}
              onPress={() => setModalSalaAulaVisivel(false)}
            >
              <FontAwesome5 name="arrow-left" size={18} color="#F8FAFC" />
              <Text style={estilos.textoVoltarSala}>Agenda</Text>
            </TouchableOpacity>

            <View style={{ alignItems: "center" }}>
              <Text style={estilos.salaTitulo}>Sala de Aula Ao Vivo</Text>
              <Text style={estilos.salaSubtitulo}>
                Sincronização em Tempo Real
              </Text>
            </View>

            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            contentContainerStyle={estilos.salaConteudo}
            showsVerticalScrollIndicator={false}
          >
            {aulaSalaAoVivo && (
              <View style={estilos.salaInfoCard}>
                <View style={estilos.salaBadgeModalidade}>
                  <Text style={estilos.salaBadgeModalidadeTexto}>
                    {aulaSalaAoVivo.modalidade || "ONLINE"}
                  </Text>
                </View>

                <Text style={estilos.salaDisciplina}>
                  {aulaSalaAoVivo.assunto ||
                    aulaSalaAoVivo.saber?.nome ||
                    "Mentoria Orienta"}
                </Text>

                <Text style={estilos.salaParticipante}>
                  {perfilAtivo === "Professor"
                    ? `Aluno: ${aulaSalaAoVivo.aluno?.nome || aulaSalaAoVivo.aluno?.id}`
                    : `Professor: ${aulaSalaAoVivo.professor?.nome || aulaSalaAoVivo.professor?.id}`}
                </Text>

                <View style={estilos.salaMetaRow}>
                  <View style={estilos.salaMetaItem}>
                    <FontAwesome5
                      name="calendar-day"
                      size={12}
                      color="#94A3B8"
                    />
                    <Text style={estilos.salaMetaTexto}>
                      {aulaSalaAoVivo.data}
                    </Text>
                  </View>
                  <View style={estilos.salaMetaItem}>
                    <FontAwesome5 name="clock" size={12} color="#94A3B8" />
                    <Text style={estilos.salaMetaTexto}>
                      {aulaSalaAoVivo.hora?.substring(0, 5)}
                    </Text>
                  </View>
                  {aulaSalaAoVivo.valorAplicado && (
                    <View style={estilos.salaMetaItem}>
                      <FontAwesome5 name="tag" size={12} color="#10B981" />
                      <Text
                        style={[
                          estilos.salaMetaTexto,
                          { color: "#10B981", fontWeight: "bold" },
                        ]}
                      >
                        R$ {Number(aulaSalaAoVivo.valorAplicado).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Botão de Chat na Sala Ao Vivo */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "#0284C7",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderRadius: 8,
                    gap: 8,
                    marginTop: 12,
                  }}
                  onPress={() => abrirChat(aulaSalaAoVivo)}
                >
                  <FontAwesome5 name="comments" size={14} color="#FFFFFF" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: "bold",
                    }}
                  >
                    Abrir Chat com{" "}
                    {perfilAtivo === "Professor" ? "Aluno" : "Professor"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {aulaSalaAoVivo && (
              <CronometroAula
                agendamentoId={aulaSalaAoVivo.id}
                usuarioId={Number(usuarioId)}
                isProfessor={perfilAtivo === "Professor"}
                onAulaConcluida={() => {
                  buscarAgendamentos();
                }}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL DO CHAT (FASE 7) */}
      <ChatModal
        visible={modalChatVisivel}
        onClose={() => setModalChatVisivel(false)}
        agendamentoId={aulaChatSelecionada?.id || 0}
        usuarioId={Number(usuarioId)}
        outroUsuarioId={
          aulaChatSelecionada
            ? perfilAtivo === "Professor"
              ? aulaChatSelecionada.aluno?.id
              : aulaChatSelecionada.professor?.id
            : undefined
        }
        outroParticipanteNome={
          aulaChatSelecionada
            ? perfilAtivo === "Professor"
              ? aulaChatSelecionada.aluno?.nome ||
                `Aluno #${aulaChatSelecionada.aluno?.id}`
              : aulaChatSelecionada.professor?.nome ||
                `Prof. #${aulaChatSelecionada.professor?.id}`
            : "Participante"
        }
        disciplinaNome={
          aulaChatSelecionada?.saber?.nome ||
          aulaChatSelecionada?.assunto ||
          "Mentoria"
        }
        agendamentoStatus={aulaChatSelecionada?.status}
      />

      {/* CENTRAL DE NOTIFICAÇÕES (FASE 7) */}
      <CentralNotificacoesModal
        visible={modalNotificacoesVisivel}
        onClose={() => {
          setModalNotificacoesVisivel(false);
          carregarNaoLidas();
        }}
        usuarioId={Number(usuarioId)}
      />

      {/* SUPORTE E TICKETS (FASE 7) */}
      <ModalSuporteTicket
        visible={modalSuporteVisivel}
        onClose={() => setModalSuporteVisivel(false)}
        usuarioId={Number(usuarioId)}
      />
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
  cartaoEmAndamento: {
    borderColor: "#10B981",
    borderWidth: 1.5,
    backgroundColor: "#F0FDF4",
  },
  cartaoRealizada: {
    borderColor: "#C084FC",
    borderWidth: 1,
    backgroundColor: "#FAF5FF",
  },
  badgeStatusPequeno: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  badgeStatusTexto: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  botaoAcessarAoVivo: {
    backgroundColor: "#F97316",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  botaoAcessarAoVivoTexto: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  salaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  botaoVoltarSala: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  textoVoltarSala: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  salaTitulo: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "bold",
  },
  salaSubtitulo: {
    color: "#94A3B8",
    fontSize: 11,
  },
  salaConteudo: {
    padding: 16,
    paddingBottom: 40,
  },
  salaInfoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
  },
  salaBadgeModalidade: {
    alignSelf: "flex-start",
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  salaBadgeModalidadeTexto: {
    color: "#F97316",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  salaDisciplina: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  salaParticipante: {
    color: "#CBD5E1",
    fontSize: 14,
    marginBottom: 12,
  },
  salaMetaRow: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 10,
  },
  salaMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  salaMetaTexto: {
    color: "#94A3B8",
    fontSize: 12,
  },
});
