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

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Feather, 
  FontAwesome5, 
} from "@expo/vector-icons";
import { Theme } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import TabBarRN001 from "../components/navigation/TabBarRN001";
import CronometroAula from "../components/CronometroAula";

export default function SalaAulaScreen() {
  const { perfilAtivo, usuarioId } = useAuth();
  const isProfessor = perfilAtivo === "Professor";

  const [abaRecursos, setAbaRecursos] = useState<"pauta" | "materiais" | "anotacoes">("pauta");
  const [copiado, setCopiado] = useState<boolean>(false);
  const [audioMutado, setAudioMutado] = useState<boolean>(false);
  const [cameraLigada, setCameraLigada] = useState<boolean>(true);

  const linkSalaVirtual = "https://meet.google.com/ori-calc-2026";

  const handleCopiarLink = () => {
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(linkSalaVirtual);
    }
  };

  const handleAbrirMeet = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(linkSalaVirtual, "_blank");
    } else {
      Alert.alert("Sala Virtual", `Abrir link no navegador:\n${linkSalaVirtual}`);
    }
  };

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
            <View style={styles.pontoAoVivo} />
            <Text style={styles.aoVivoTexto}>AO VIVO</Text>
          </View>
          <Text style={styles.headerTitulo} numberOfLines={1}>
            Cálculo Diferencial e Integral I
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.botaoChatAtalho}
          onPress={() => router.push("/chat" as any)}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={18} color={Theme.colors.primary} />
          <View style={styles.badgeMensagemPonto} />
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
              <Text style={styles.meetTitulo}>Sala de Videoconferência Google Meet</Text>
              <Text style={styles.meetSubtitulo}>Sessão criptografada ponta a ponta</Text>
            </View>
            <View style={styles.meetBadgeStatus}>
              <Text style={styles.meetBadgeStatusTexto}>Conectada</Text>
            </View>
          </View>

          <View style={styles.meetLinkRow}>
            <Text style={styles.meetLinkTexto} numberOfLines={1}>
              {linkSalaVirtual}
            </Text>
            <TouchableOpacity 
              style={styles.botaoCopiarLink} 
              onPress={handleCopiarLink}
              activeOpacity={0.7}
            >
              <Feather name={copiado ? "check" : "copy"} size={14} color={copiado ? "#059669" : Theme.colors.primary} />
              <Text style={[styles.botaoCopiarTexto, copiado && { color: "#059669" }]}>
                {copiado ? "Copiado!" : "Copiar"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.meetAcoesRow}>
            <TouchableOpacity 
              style={styles.botaoEntrarMeet} 
              onPress={handleAbrirMeet}
              activeOpacity={0.85}
            >
              <FontAwesome5 name="external-link-alt" size={13} color="#FFFFFF" />
              <Text style={styles.botaoEntrarMeetTexto}>Abrir no Google Meet</Text>
            </TouchableOpacity>

            <View style={styles.controlesMidiaRow}>
              <TouchableOpacity 
                style={[styles.botaoMidia, audioMutado && styles.botaoMidiaDesativado]}
                onPress={() => setAudioMutado(!audioMutado)}
                activeOpacity={0.7}
              >
                <Feather name={audioMutado ? "mic-off" : "mic"} size={16} color={audioMutado ? "#DC2626" : "#334155"} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.botaoMidia, !cameraLigada && styles.botaoMidiaDesativado]}
                onPress={() => setCameraLigada(!cameraLigada)}
                activeOpacity={0.7}
              >
                <Feather name={cameraLigada ? "video" : "video-off"} size={16} color={!cameraLigada ? "#DC2626" : "#334155"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* CARDS DOS PARTICIPANTES (LIGHT THEME) */}
        <View style={styles.participantesContainer}>
          {/* Card Professor */}
          <View style={styles.cardParticipante}>
            <View style={styles.avatarParticipanteProf}>
              <Text style={styles.avatarTextoProf}>RS</Text>
              <View style={styles.pontoOnline} />
            </View>
            <View style={styles.participanteInfo}>
              <View style={styles.participanteTagRow}>
                <Text style={styles.participanteNome}>Prof. Ricardo Santos</Text>
                <View style={styles.badgeProfessorTag}>
                  <Text style={styles.badgeProfessorTagTexto}>Docente</Text>
                </View>
              </View>
              <Text style={styles.participanteDetalhe}>Doutor em Eng. Mecânica (USP)</Text>
            </View>
            <Feather name="mic" size={15} color="#059669" />
          </View>

          {/* Card Aluno */}
          <View style={styles.cardParticipante}>
            <View style={styles.avatarParticipanteAluno}>
              <Text style={styles.avatarTextoAluno}>LS</Text>
              <View style={styles.pontoOnline} />
            </View>
            <View style={styles.participanteInfo}>
              <View style={styles.participanteTagRow}>
                <Text style={styles.participanteNome}>Lucas Silveira</Text>
                <View style={styles.badgeAlunoTag}>
                  <Text style={styles.badgeAlunoTagTexto}>Aluno</Text>
                </View>
              </View>
              <Text style={styles.participanteDetalhe}>Engenharia Mecânica - 4º Semestre</Text>
            </View>
            <Feather name="mic" size={15} color="#059669" />
          </View>
        </View>

        {/* COMPONENTE PRINCIPAL: CRONÔMETRO OFICIAL DE AULA (ORI-026 - LIGHT THEME) */}
        <CronometroAula
          agendamentoId={2026}
          usuarioId={usuarioId ? Number(usuarioId) : 1}
          isProfessor={isProfessor}
          duracaoTotalMinutos={60}
          tituloAula="Cálculo Diferencial e Integral I"
          onAulaConcluida={() => {
            Alert.alert("Parabéns!", "A mentoria foi finalizada e arquivada com sucesso.");
          }}
          onReportarProblema={(motivo) => {
            Alert.alert("Suporte Notificado", `Seu chamado para '${motivo}' foi aberto na Central Orienta.`);
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
                Materiais (3)
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
                <View style={styles.checkPautaOK}>
                  <Feather name="check" size={12} color="#059669" />
                </View>
                <Text style={styles.itemPautaTextoConcluido}>
                  1. Revisão do Teorema do Valor Médio e Derivadas Fundamentais
                </Text>
              </View>

              <View style={styles.itemPauta}>
                <View style={styles.checkPautaAtivo}>
                  <View style={styles.pontoLaranja} />
                </View>
                <Text style={styles.itemPautaTextoAtivo}>
                  2. Regra da Cadeia aplicada a Funções Multivariáveis
                </Text>
              </View>

              <View style={styles.itemPauta}>
                <View style={styles.checkPautaPendente} />
                <Text style={styles.itemPautaTextoPendente}>
                  3. Resolução da Lista 04 de Otimização e Máximos/Mínimos
                </Text>
              </View>
            </View>
          )}

          {/* Conteúdo da Aba Materiais */}
          {abaRecursos === "materiais" && (
            <View style={styles.conteudoAba}>
              {[
                { nome: "Lista_04_Derivadas_Parciais.pdf", tamanho: "2.4 MB", icone: "file-text" },
                { nome: "Formulario_Resumido_Calculo1.pdf", tamanho: "850 KB", icone: "book-open" },
                { nome: "Exercicios_Gabaritados_Otimizacao.pdf", tamanho: "1.8 MB", icone: "check-square" },
              ].map((arq, idx) => (
                <View key={idx} style={styles.itemMaterial}>
                  <View style={styles.itemMaterialIcone}>
                    <Feather name={arq.icone as any} size={15} color={Theme.colors.primary} />
                  </View>
                  <View style={styles.itemMaterialInfo}>
                    <Text style={styles.itemMaterialNome}>{arq.nome}</Text>
                    <Text style={styles.itemMaterialTamanho}>{arq.tamanho} • PDF</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.botaoDownloadMaterial}
                    onPress={() => Alert.alert("Download", `Baixando arquivo ${arq.nome}`)}
                  >
                    <Feather name="download" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Conteúdo da Aba Anotações */}
          {abaRecursos === "anotacoes" && (
            <View style={styles.conteudoAba}>
              <View style={styles.blocoAnotacao}>
                <Text style={styles.blocoAnotacaoTitulo}>📌 Anotações da Mentoria:</Text>
                <Text style={styles.blocoAnotacaoTexto}>
                  • Lembrar de revisar o conceito de Jacobiano na próxima aula.{"\n"}
                  • Exercício 7 da Lista 04: atentar para as restrições de domínio nas variáveis x e y.{"\n"}
                  • Próxima mentoria sugerida: Terça-feira às 19h00.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ESPAÇAMENTO INFERIOR PARA SCROLL LIMPO ACIMA DA TABBAR */}
        <View style={{ height: 100 }} />
      </ScrollView>

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
  aoVivoTexto: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
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
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  meetBadgeStatusTexto: {
    color: "#059669",
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
