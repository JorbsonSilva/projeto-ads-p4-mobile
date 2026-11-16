/**
 * @file sala-aula.tsx
 * @description Sala de Aula Ao Vivo com Temporizador Bilateral e Videoconferência - Orienta 2.0 [ORI-026].
 * Rota Expo Router: /sala-aula
 * Padrão Visual: Design System Claro Oficial (Light Theme Standard).
 * 
 * Funcionalidades:
 * - Painel de controle da aula ao vivo em tempo real sobre canvas claro (#F8FAFC).
 * - Integração oficial com CronometroAula (Check-in mútuo, Pausa, +Tempo, Término e Avaliação).
 * - Acesso à sala virtual Google Meet com link direto, cópia rápida e controles de mídia.
 * - Cards de participantes (Professor e Aluno com microfone e status online).
 * - Pauta pedagógica, anotações de aula e materiais complementares anexados em segmented control claro (#F1F5F9).
 * - Barra de navegação inferior canônica dockada (TabBarRN001 - RN-001).
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Feather, 
  FontAwesome5, 
} from "@expo/vector-icons";
import { Theme } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import TabBarRN001 from "../components/navigation/TabBarRN001";
import CronometroAula from "../components/CronometroAula";
import ChatModal from "../components/ChatModal";
import { getApiErrorMessage, agendamentoApi } from "../config/api";
import { Agendamento } from "../types/agendamento";

export default function SalaAulaScreen() {
  const { perfilAtivo, usuarioId } = useAuth();
  const isProfessor = perfilAtivo === "Professor";
  const params = useLocalSearchParams<{ agendamentoId?: string | string[]; id?: string | string[] }>();
  const rawId = params.agendamentoId ?? params.id;
  const agendamentoId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  const idValido = Number.isSafeInteger(agendamentoId) && agendamentoId > 0;

  const [abaRecursos, setAbaRecursos] = useState<"pauta" | "materiais" | "anotacoes">("pauta");
  const [chatModalAberto, setChatModalAberto] = useState<boolean>(false);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    const carregarAgendamento = async () => {
      setAgendamento(null);
      setErro(null);
      if (!idValido) {
        setErro("Abra a sala a partir de um agendamento válido.");
        setCarregando(false);
        return;
      }

      try {
        const resposta = await agendamentoApi.buscarPorId(agendamentoId);
        if (!resposta.success || !resposta.data) {
          throw new Error(resposta.message || "A API não retornou os dados do agendamento.");
        }
        if (ativo) {
          setAgendamento(resposta.data);
          setErro(null);
        }
      } catch (error) {
        if (ativo) setErro(getApiErrorMessage(error));
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    setCarregando(true);
    carregarAgendamento();
    return () => {
      ativo = false;
    };
  }, [agendamentoId, idValido, tentativa]);

  const nomeProfessor = agendamento?.professorNome || "";
  const nomeAluno = agendamento?.alunoNome || "";
  const nomeOutroParticipante = isProfessor ? nomeAluno : nomeProfessor;
  const idOutroParticipante = isProfessor ? agendamento?.alunoId : agendamento?.professorId;
  const usuarioIdValido = Number.isSafeInteger(Number(usuarioId)) && Number(usuarioId) > 0;
  const nomeDisciplina = agendamento?.saberNome || agendamento?.assunto || "Aula";
  const dataHora = agendamento
    ? `${agendamento.data} • ${agendamento.hora.slice(0, 5)}`
    : "";
  const iniciais = (nome: string) =>
    nome.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0] || "").join("").toUpperCase();

  if (carregando) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.estadoContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.estadoTexto}>Carregando dados da aula...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!agendamento || !usuarioIdValido || !idOutroParticipante) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.estadoContainer}>
          <Feather name="alert-circle" size={32} color="#DC2626" />
          <Text style={styles.estadoTexto}>{erro || "Não foi possível carregar os dados desta aula."}</Text>
          <TouchableOpacity style={styles.botaoVoltarErro} onPress={() => setTentativa((valor) => valor + 1)}>
            <Text style={styles.botaoVoltarErroTexto}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoVoltarErro} onPress={() => router.back()}>
            <Text style={styles.botaoVoltarErroTexto}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* CABEÇALHO DA SALA AO VIVO (LIGHT THEME) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={() => router.push("/(tabs)" as any)}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCentro}>
          <View style={styles.aoVivoBadge}>
            <View style={[styles.pontoAoVivo, agendamento.status !== "EM_ANDAMENTO" && styles.pontoNaoAoVivo]} />
            <Text style={[styles.aoVivoTexto, agendamento.status !== "EM_ANDAMENTO" && styles.textoNaoAoVivo]}>
              {agendamento.status === "EM_ANDAMENTO" ? "AO VIVO" : "AULA"}
            </Text>
          </View>
          <Text style={styles.headerTitulo} numberOfLines={1}>
            {nomeDisciplina}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.botaoChatAtalho}
          onPress={() => setChatModalAberto(true)}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={18} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BANNER DE ACESSO À SALA VIRTUAL (LIGHT CARD) */}
        <View style={styles.cardMeet}>
          <View style={styles.cardMeetHeader}>
            <View style={styles.meetIconBox}>
              <FontAwesome5 name="video" size={15} color="#2563EB" />
            </View>
            <View style={styles.meetInfo}>
              <Text style={styles.meetTitulo}>Videoconferência</Text>
              <Text style={styles.meetSubtitulo}>{dataHora}</Text>
            </View>
            <View style={styles.meetBadgeStatus}>
              <Text style={styles.meetBadgeStatusTexto}>Indisponível</Text>
            </View>
          </View>

          <View style={styles.meetLinkRow}>
            <Text style={styles.meetLinkTexto} numberOfLines={2}>
              A API ainda não disponibiliza um link de videoconferência para esta aula.
            </Text>
          </View>

          <View style={styles.meetAcoesRow}>
            <TouchableOpacity 
              style={[styles.botaoEntrarMeet, styles.botaoDesabilitado]}
              disabled
            >
              <FontAwesome5 name="external-link-alt" size={13} color="#FFFFFF" />
              <Text style={styles.botaoEntrarMeetTexto}>Link não configurado</Text>
            </TouchableOpacity>

            <View style={styles.controlesMidiaRow}>
              <View style={[styles.botaoMidia, styles.botaoDesabilitado]}>
                <Feather name="mic-off" size={16} color="#64748B" />
              </View>

              <View style={[styles.botaoMidia, styles.botaoDesabilitado]}>
                <Feather name="video-off" size={16} color="#64748B" />
              </View>
            </View>
          </View>
        </View>

        {/* CARDS DOS PARTICIPANTES (LIGHT THEME) */}
        <View style={styles.participantesContainer}>
          {/* Card Professor */}
          <View style={styles.cardParticipante}>
            <View style={styles.avatarParticipanteProf}>
            <Text style={styles.avatarTextoProf}>{iniciais(nomeProfessor)}</Text>
            </View>
            <View style={styles.participanteInfo}>
              <View style={styles.participanteTagRow}>
                <Text style={styles.participanteNome}>{nomeProfessor}</Text>
                <View style={styles.badgeProfessorTag}>
                  <Text style={styles.badgeProfessorTagTexto}>Docente</Text>
                </View>
              </View>
              <Text style={styles.participanteDetalhe}>Professor da aula</Text>
            </View>
          </View>

          {/* Card Aluno */}
          <View style={styles.cardParticipante}>
            <View style={styles.avatarParticipanteAluno}>
              <Text style={styles.avatarTextoAluno}>{iniciais(nomeAluno)}</Text>
            </View>
            <View style={styles.participanteInfo}>
              <View style={styles.participanteTagRow}>
                <Text style={styles.participanteNome}>{nomeAluno}</Text>
                <View style={styles.badgeAlunoTag}>
                  <Text style={styles.badgeAlunoTagTexto}>Aluno</Text>
                </View>
              </View>
              <Text style={styles.participanteDetalhe}>Aluno da aula</Text>
            </View>
          </View>
        </View>

        {/* COMPONENTE PRINCIPAL: CRONÔMETRO OFICIAL DE AULA (ORI-026 - LIGHT THEME) */}
        <CronometroAula
          agendamentoId={agendamento.id}
          usuarioId={Number(usuarioId)}
          isProfessor={isProfessor}
          duracaoTotalMinutos={60}
          tituloAula={nomeDisciplina}
          onAulaConcluida={() => {
            Alert.alert("Aula concluída", "O servidor confirmou a conclusão da aula.");
          }}
        />

        {/* SEÇÃO DE RECURSOS PEDAGÓGICOS DA AULA (LIGHT THEME) */}
        <View style={styles.cardRecursos}>
          <View style={styles.segmentedContainer}>
            <TouchableOpacity 
              style={[styles.segmentBtn, abaRecursos === "pauta" && styles.segmentBtnAtivo]}
              onPress={() => setAbaRecursos("pauta")}
              activeOpacity={0.8}
            >
              <Feather name="list" size={13} color={abaRecursos === "pauta" ? Theme.colors.primary : "#64748B"} />
              <Text style={[styles.segmentTexto, abaRecursos === "pauta" && styles.segmentTextoAtivo]}>
                Pauta da Aula
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.segmentBtn, abaRecursos === "materiais" && styles.segmentBtnAtivo]}
              onPress={() => setAbaRecursos("materiais")}
              activeOpacity={0.8}
            >
              <Feather name="folder" size={13} color={abaRecursos === "materiais" ? Theme.colors.primary : "#64748B"} />
              <Text style={[styles.segmentTexto, abaRecursos === "materiais" && styles.segmentTextoAtivo]}>
                Materiais (0)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.segmentBtn, abaRecursos === "anotacoes" && styles.segmentBtnAtivo]}
              onPress={() => setAbaRecursos("anotacoes")}
              activeOpacity={0.8}
            >
              <Feather name="edit-3" size={13} color={abaRecursos === "anotacoes" ? Theme.colors.primary : "#64748B"} />
              <Text style={[styles.segmentTexto, abaRecursos === "anotacoes" && styles.segmentTextoAtivo]}>
                Anotações
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo da Aba Pauta */}
          {abaRecursos === "pauta" && (
            <View style={styles.conteudoAba}>
              <View style={styles.itemPauta}>
                <Feather name="book-open" size={14} color="#64748B" />
                <Text style={styles.itemPautaTextoPendente}>
                  {agendamento.assunto || "Nenhuma pauta foi cadastrada para esta aula."}
                </Text>
              </View>
            </View>
          )}

          {/* Conteúdo da Aba Materiais */}
          {abaRecursos === "materiais" && (
            <View style={styles.conteudoAba}>
              <Text style={styles.itemPautaTextoPendente}>
                Nenhum material foi cadastrado para esta aula.
              </Text>
            </View>
          )}

          {/* Conteúdo da Aba Anotações */}
          {abaRecursos === "anotacoes" && (
            <View style={styles.conteudoAba}>
              <View style={styles.blocoAnotacao}>
                <Text style={styles.blocoAnotacaoTitulo}>📌 Anotações da Mentoria:</Text>
                <Text style={styles.blocoAnotacaoTexto}>
                  Nenhuma anotação foi cadastrada para esta aula.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ESPAÇAMENTO INFERIOR PARA SCROLL LIMPO ACIMA DA TABBAR */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL DE CHAT EM TEMPO REAL E CANAL DE DENÚNCIAS (ORI-027) */}
      <ChatModal
        visible={chatModalAberto}
        onClose={() => setChatModalAberto(false)}
        agendamentoId={agendamento.id}
        usuarioId={Number(usuarioId)}
        outroUsuarioId={idOutroParticipante}
        outroUsuarioNome={nomeOutroParticipante}
        disciplinaNome={nomeDisciplina}
        agendamentoStatus={agendamento.status}
        avatarIniciais={iniciais(nomeOutroParticipante)}
      />

      {/* BARRA INFERIOR DE 5 ABAS FIXA (RN-001) */}
      <TabBarRN001 abaAtiva="agenda" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  estadoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  estadoTexto: {
    color: "#475569",
    fontSize: 14,
    textAlign: "center",
  },
  botaoVoltarErro: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  botaoVoltarErroTexto: {
    color: "#FFFFFF",
    fontWeight: "700",
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
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCentro: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  aoVivoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 2,
    gap: 4,
  },
  pontoAoVivo: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
  },
  pontoNaoAoVivo: {
    backgroundColor: "#64748B",
  },
  aoVivoTexto: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  textoNaoAoVivo: {
    color: "#64748B",
  },
  headerTitulo: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  botaoChatAtalho: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD8B5",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeMensagemPonto: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  cardMeet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  cardMeetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  meetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  meetInfo: {
    flex: 1,
  },
  meetTitulo: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },
  meetSubtitulo: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 1,
  },
  meetBadgeStatus: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  meetBadgeStatusTexto: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },
  meetLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  meetLinkTexto: {
    color: "#475569",
    fontSize: 12,
    flex: 1,
    fontFamily: Platform.select({ web: "monospace", default: "Courier" }),
  },
  botaoCopiarLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 8,
  },
  botaoCopiarTexto: {
    color: Theme.colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  meetAcoesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  botaoEntrarMeet: {
    flex: 1,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  botaoDesabilitado: {
    opacity: 0.55,
  },
  botaoEntrarMeetTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  controlesMidiaRow: {
    flexDirection: "row",
    gap: 6,
  },
  botaoMidia: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoMidiaDesativado: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  participantesContainer: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  cardParticipante: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    ...Platform.select({
      web: { boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  avatarParticipanteProf: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarTextoProf: {
    color: Theme.colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  avatarParticipanteAluno: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarTextoAluno: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
  },
  pontoOnline: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  participanteInfo: {
    flex: 1,
  },
  participanteTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  participanteNome: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },
  badgeProfessorTag: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFD8B5",
  },
  badgeProfessorTagTexto: {
    color: Theme.colors.primary,
    fontSize: 9,
    fontWeight: "700",
  },
  badgeAlunoTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  badgeAlunoTagTexto: {
    color: "#2563EB",
    fontSize: 9,
    fontWeight: "700",
  },
  participanteDetalhe: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  cardRecursos: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  segmentBtnAtivo: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      web: { boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  segmentTexto: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  segmentTextoAtivo: {
    color: Theme.colors.primary,
    fontWeight: "700",
  },
  conteudoAba: {
    marginTop: 14,
    gap: 10,
  },
  itemPauta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  checkPautaOK: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkPautaAtivo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  pontoLaranja: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primary,
  },
  checkPautaPendente: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginTop: 1,
    backgroundColor: "#F8FAFC",
  },
  itemPautaTextoConcluido: {
    color: "#94A3B8",
    fontSize: 12,
    textDecorationLine: "line-through",
    flex: 1,
  },
  itemPautaTextoAtivo: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  itemPautaTextoPendente: {
    color: "#64748B",
    fontSize: 12,
    flex: 1,
  },
  itemMaterial: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  itemMaterialIcone: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD8B5",
    alignItems: "center",
    justifyContent: "center",
  },
  itemMaterialInfo: {
    flex: 1,
  },
  itemMaterialNome: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600",
  },
  itemMaterialTamanho: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 1,
  },
  botaoDownloadMaterial: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  blocoAnotacao: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  blocoAnotacaoTitulo: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  blocoAnotacaoTexto: {
    color: "#78350F",
    fontSize: 12,
    lineHeight: 18,
  },
});
