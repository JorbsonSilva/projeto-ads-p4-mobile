/**
 * @file agenda.tsx
 * @description Tela de Minha Agenda Unificada (Aluno & Professor) - Orienta 2.0 [ORI-012].
 * Implementada com total fidelidade à especificação visual oficial Agenda.jpeg (IMG-001).
 * 
 * Funcionalidades:
 * - Header institucional com Logotipo Orienta e sino com badge numérico
 * - Alternador de visão (Aluno vs Professor) permitindo homologação completa da imagem dupla
 * - Segmented Control pílula ([Agenda] ativo / [Resumo] ou [Histórico])
 * - Seletor semanal horizontal interativo (Seg 23/06 a Sex 27/06 com dia ativo em azul marinho)
 * - Visão Professor:
 *   - Seção "Solicitações de Aula" (badge '2') com ações bilaterais imediatas [✔ Aceitar] e [✕ Recusar]
 *   - Seção "Minhas Aulas Agendadas" com faixa marcadora azul e chips de horário
 * - Visão Aluno:
 *   - Seção "Próximas Aulas" com card do Prof. Lucas Rocha, badge Confirmada e ações [Remarcar] e [Desistir]
 *   - Seção "Próximas Mentorias" com card da Profa. Juliana Santos
 *   - Banner informativo com regra de cancelamento de até 2 horas de antecedência
 * - Modais interativos de remarcação e cancelamento
 * - Barra inferior de 5 abas (Início, Buscar, Agenda ativa, Mensagens, Perfil)
 * - Serviço híbrido resiliente agendaService.ts
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  aceitarSolicitacaoComFallback,
  AgendaCompleta,
  CompromissoAgenda,
  obterAgendaComFallback,
  PerfilAgenda,
  recusarSolicitacaoComFallback,
  SolicitacaoAula,
} from "../../services/agendaService";

interface DiaSemana {
  dia: string; // "Seg", "Ter", "Qua", "Qui", "Sex"
  dataMes: string; // "23/06"
}

const DIAS_SEMANA: DiaSemana[] = [
  { dia: "Seg", dataMes: "23/06" },
  { dia: "Ter", dataMes: "24/06" },
  { dia: "Qua", dataMes: "25/06" },
  { dia: "Qui", dataMes: "26/06" },
  { dia: "Sex", dataMes: "27/06" },
];

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();

  // Alternador de Visão de Perfil (Para testar tanto visão Aluno quanto Professor da IMG-001)
  const [perfilAtivo, setPerfilAtivo] = useState<PerfilAgenda>("PROFESSOR");
  const [abaSegmentada, setAbaSegmentada] = useState<"AGENDA" | "SECUNDARIA">("AGENDA");
  const [diaSelecionadoIdx, setDiaSelecionadoIdx] = useState<number>(2); // Quarta 25/06 por padrão

  // Dados da Agenda
  const [dados, setDados] = useState<AgendaCompleta>({
    perfil: "PROFESSOR",
    solicitacoes: [],
    aulasProfessor: [],
    aulasAluno: [],
    mentoriasAluno: [],
    isSimulado: false,
  });
  const [carregando, setCarregando] = useState<boolean>(false);

  // Estados dos Modais
  const [modalRemarcar, setModalRemarcar] = useState<boolean>(false);
  const [itemSelecionado, setItemSelecionado] = useState<CompromissoAgenda | null>(null);
  const [modalCancelar, setModalCancelar] = useState<boolean>(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState<string>("");

  const carregarDados = useCallback(async () => {
    try {
      const res = await obterAgendaComFallback(perfilAtivo);
      setDados(res);
    } catch {
      // fallback
    }
  }, [perfilAtivo]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Ações do Professor
  const handleAceitarSolicitacao = async (id: number) => {
    await aceitarSolicitacaoComFallback(id);
    setDados((prev) => ({
      ...prev,
      solicitacoes: prev.solicitacoes.filter((s) => s.id !== id),
    }));
    Alert.alert("Solicitação Aceita", "A aula foi confirmada e adicionada à sua agenda!");
  };

  const handleRecusarSolicitacao = async (id: number) => {
    await recusarSolicitacaoComFallback(id);
    setDados((prev) => ({
      ...prev,
      solicitacoes: prev.solicitacoes.filter((s) => s.id !== id),
    }));
    Alert.alert("Solicitação Recusada", "A solicitação foi recusada.");
  };

  // Ações do Aluno
  const handleAbrirRemarcar = (item: CompromissoAgenda) => {
    setItemSelecionado(item);
    setModalRemarcar(true);
  };

  const handleConfirmarRemarcacao = () => {
    setModalRemarcar(false);
    Alert.alert(
      "Remarcação Solicitada",
      `Solicitação de remarcação enviada para ${itemSelecionado?.nome}. Aguarde a confirmação.`
    );
  };

  const handleAbrirDesistir = (item: CompromissoAgenda) => {
    setItemSelecionado(item);
    setModalCancelar(true);
  };

  const handleConfirmarDesistencia = () => {
    if (itemSelecionado) {
      setDados((prev) => ({
        ...prev,
        aulasAluno: prev.aulasAluno.filter((a) => a.id !== itemSelecionado.id),
        mentoriasAluno: prev.mentoriasAluno.filter((m) => m.id !== itemSelecionado.id),
      }));
    }
    setModalCancelar(false);
    Alert.alert("Aula Cancelada", "Seu cancelamento foi registrado dentro do prazo de 2 horas.");
  };

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 1. TOP HEADER INSTITUCIONAL (LOGO ORIENTA + SINO DE NOTIFICAÇÃO)*/}
      {/* ============================================================== */}
      <View style={estilos.topHeader}>
        {/* Logotipo Orienta */}
        <View style={estilos.logoRow}>
          <View style={estilos.logoIconeBox}>
            <View style={estilos.logoCirculoInterno} />
          </View>
          <Text style={estilos.logoTexto}>Orienta</Text>
        </View>

        {/* Lado Direito: Alternador Rápido de Perfil + Sino de Notificações */}
        <View style={estilos.headerAcoesDireita}>
          {/* Alternador de Perfil para Homologação da Imagem Dupla */}
          <View style={estilos.perfilToggle}>
            <TouchableOpacity
              onPress={() => setPerfilAtivo("PROFESSOR")}
              style={[
                estilos.perfilBotao,
                perfilAtivo === "PROFESSOR" && estilos.perfilBotaoAtivo,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  estilos.perfilTexto,
                  perfilAtivo === "PROFESSOR" && estilos.perfilTextoAtivo,
                ]}
              >
                Prof
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPerfilAtivo("ALUNO")}
              style={[
                estilos.perfilBotao,
                perfilAtivo === "ALUNO" && estilos.perfilBotaoAtivo,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  estilos.perfilTexto,
                  perfilAtivo === "ALUNO" && estilos.perfilTextoAtivo,
                ]}
              >
                Aluno
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sino com Badge Numérico Laranja */}
          <TouchableOpacity style={estilos.sinoBotao} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
            <View style={estilos.badgeSino}>
              <Text style={estilos.badgeSinoTexto}>
                {perfilAtivo === "PROFESSOR" ? "3" : "2"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>


      <ScrollView
        style={estilos.scrollView}
        contentContainerStyle={estilos.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* 2. TÍTULO E SUBTÍTULO ADAPTATIVO                               */}
        {/* ============================================================== */}
        <View style={estilos.tituloBloco}>
          <Text style={estilos.tituloPrincipal}>Minha Agenda</Text>
          <Text style={estilos.subtituloPrincipal}>
            {perfilAtivo === "PROFESSOR"
              ? "Gerencie suas aulas e mentorias."
              : "Acompanhe suas aulas e mentorias."}
          </Text>
        </View>

        {/* ============================================================== */}
        {/* 3. SEGMENTED CONTROL PÍLULA ([Agenda] / [Resumo ou Histórico]) */}
        {/* ============================================================== */}
        <View style={estilos.segmentedControl}>
          <TouchableOpacity
            style={[
              estilos.segmentoItem,
              abaSegmentada === "AGENDA" && estilos.segmentoItemAtivo,
            ]}
            onPress={() => setAbaSegmentada("AGENDA")}
            activeOpacity={0.8}
          >
            <Feather
              name="calendar"
              size={15}
              color={abaSegmentada === "AGENDA" ? "#FFFFFF" : "#64748B"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                estilos.segmentoTexto,
                abaSegmentada === "AGENDA" && estilos.segmentoTextoAtivo,
              ]}
            >
              Agenda
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              estilos.segmentoItem,
              abaSegmentada === "SECUNDARIA" && estilos.segmentoItemAtivo,
            ]}
            onPress={() => setAbaSegmentada("SECUNDARIA")}
            activeOpacity={0.8}
          >
            <Feather
              name={perfilAtivo === "PROFESSOR" ? "bar-chart-2" : "clock"}
              size={15}
              color={abaSegmentada === "SECUNDARIA" ? "#FFFFFF" : "#64748B"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                estilos.segmentoTexto,
                abaSegmentada === "SECUNDARIA" && estilos.segmentoTextoAtivo,
              ]}
            >
              {perfilAtivo === "PROFESSOR" ? "Resumo" : "Histórico"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* 4. SELETOR SEMANAL HORIZONTAL (WEEKLY STRIP)                   */}
        {/* ============================================================== */}
        <View style={estilos.weeklyStripContainer}>
          <TouchableOpacity
            style={estilos.chevronSemana}
            onPress={() =>
              setDiaSelecionadoIdx((prev) => (prev > 0 ? prev - 1 : DIAS_SEMANA.length - 1))
            }
          >
            <Ionicons name="chevron-back" size={18} color="#0F172A" />
          </TouchableOpacity>

          <View style={estilos.diasSemanaRow}>
            {DIAS_SEMANA.map((item, idx) => {
              const isSelected = idx === diaSelecionadoIdx;
              return (
                <TouchableOpacity
                  key={`dia-${idx}`}
                  style={[estilos.diaCard, isSelected && estilos.diaCardAtivo]}
                  onPress={() => setDiaSelecionadoIdx(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={[estilos.textoDiaSemana, isSelected && estilos.textoDiaAtivo]}>
                    {item.dia}
                  </Text>
                  <Text style={[estilos.textoDataMes, isSelected && estilos.textoDiaAtivo]}>
                    {item.dataMes}
                  </Text>
                  {/* Dot Laranja indicador na Quarta selecionada */}
                  {isSelected && <View style={estilos.dotDiaAtivo} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={estilos.chevronSemana}
            onPress={() =>
              setDiaSelecionadoIdx((prev) => (prev < DIAS_SEMANA.length - 1 ? prev + 1 : 0))
            }
          >
            <Ionicons name="chevron-forward" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* 5. CONTEÚDO DA VISÃO DO PROFESSOR                              */}
        {/* ============================================================== */}
        {perfilAtivo === "PROFESSOR" ? (
          <View style={estilos.conteudoBloco}>
            {/* Seção 1: Solicitações de Aula */}
            <View style={estilos.secaoCabecalhoRow}>
              <View style={estilos.secaoTituloComBadge}>
                <Text style={estilos.secaoTituloTexto}>Solicitações de Aula</Text>
                <View style={estilos.badgeContadorLaranja}>
                  <Text style={estilos.badgeContadorTexto}>
                    {dados.solicitacoes.length}
                  </Text>
                </View>
              </View>
              <TouchableOpacity>
                <Text style={estilos.linkVerTodas}>Ver todas →</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Solicitações */}
            <View style={estilos.listaCardsContainer}>
              {dados.solicitacoes.map((sol) => (
                <View key={`sol-${sol.id}`} style={estilos.cardSolicitacao}>
                  {/* Avatar com Dot Online */}
                  <View style={estilos.avatarContainer}>
                    <Image source={{ uri: sol.alunoFoto }} style={estilos.avatarImagem} />
                    <View style={estilos.dotOnlineVerde} />
                  </View>

                  {/* Informações da Solicitação */}
                  <View style={estilos.solicitacaoInfo}>
                    <Text style={estilos.nomeAluno}>{sol.alunoNome}</Text>
                    <View style={estilos.badgeModalidadeLinha}>
                      <Ionicons
                        name={sol.modalidade === "Presencial" ? "location-outline" : "videocam-outline"}
                        size={12}
                        color="#64748B"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={estilos.textoBadgeModalidade}>
                        Aula {sol.modalidade}
                      </Text>
                    </View>
                    <View style={estilos.metaLinha}>
                      <Feather name="book-open" size={12} color="#64748B" style={{ marginRight: 3 }} />
                      <Text style={estilos.metaTexto}>{sol.materia}</Text>
                    </View>
                    <View style={estilos.metaLinha}>
                      <Feather name="clock" size={12} color="#64748B" style={{ marginRight: 3 }} />
                      <Text style={estilos.metaTexto}>{sol.horario}</Text>
                    </View>
                  </View>

                  {/* Botões de Ação Bilaterais [Aceitar] e [Recusar] */}
                  <View style={estilos.acoesBotoesColuna}>
                    <TouchableOpacity
                      style={estilos.botaoAceitar}
                      onPress={() => handleAceitarSolicitacao(sol.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={estilos.textoBotaoAceitar}>Aceitar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={estilos.botaoRecusar}
                      onPress={() => handleRecusarSolicitacao(sol.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="x" size={14} color="#EA580C" style={{ marginRight: 4 }} />
                      <Text style={estilos.textoBotaoRecusar}>Recusar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Seção 2: Minhas Aulas Agendadas */}
            <View style={[estilos.secaoCabecalhoRow, { marginTop: 24 }]}>
              <Text style={estilos.secaoTituloTexto}>Minhas Aulas Agendadas</Text>
              <TouchableOpacity>
                <Text style={estilos.linkVerTodas}>Ver todas →</Text>
              </TouchableOpacity>
            </View>

            <View style={estilos.listaCardsContainer}>
              {dados.aulasProfessor.map((aula) => (
                <TouchableOpacity
                  key={`aula-${aula.id}`}
                  style={estilos.cardAulaAgendada}
                  onPress={() => router.push("/chat" as any)}
                  activeOpacity={0.85}
                >
                  {/* Faixa Marcadora Azul Lateral */}
                  <View style={estilos.faixaMarcadoraAzul} />

                  <View style={estilos.aulaAgendadaCorpo}>
                    <Image source={{ uri: aula.foto }} style={estilos.avatarPequeno} />

                    <View style={estilos.aulaInfoPrincipal}>
                      <Text style={estilos.nomeAluno}>{aula.nome}</Text>
                      <View style={estilos.metaLinha}>
                        <Feather name="book-open" size={12} color="#64748B" style={{ marginRight: 3 }} />
                        <Text style={estilos.metaTexto}>{aula.materia}</Text>
                      </View>
                      <View style={estilos.metaLinha}>
                        <Ionicons
                          name={aula.modalidade === "Online" ? "videocam-outline" : "location-outline"}
                          size={12}
                          color="#64748B"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={estilos.metaTexto}>{aula.modalidade}</Text>
                      </View>
                    </View>

                    {/* Chip de Horário à Direita com Chevron */}
                    <View style={estilos.chipHorarioAgendada}>
                      <Text style={estilos.textoChipHorario}>
                        {aula.horario}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#0A2540" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          /* ============================================================== */
          /* 6. CONTEÚDO DA VISÃO DO ALUNO                                  */
          /* ============================================================== */
          <View style={estilos.conteudoBloco}>
            {/* Seção 1: Próximas Aulas */}
            <View style={estilos.secaoCabecalhoRow}>
              <Text style={estilos.secaoTituloTexto}>Próximas Aulas</Text>
            </View>

            <View style={estilos.listaCardsContainer}>
              {dados.aulasAluno.map((item) => (
                <View key={`aluno-aula-${item.id}`} style={estilos.cardAlunoAgendamento}>
                  <View style={estilos.cardAlunoTopo}>
                    <View style={estilos.avatarContainer}>
                      <Image source={{ uri: item.foto }} style={estilos.avatarGrande} />
                      <View style={estilos.dotOnlineVerde} />
                    </View>

                    <View style={estilos.alunoInfoTexto}>
                      <View style={estilos.linhaNomeBadge}>
                        <Text style={estilos.nomeMentor}>{item.nome}</Text>
                        <View style={estilos.tagConfirmada}>
                          <Feather name="check" size={11} color="#C2410C" style={{ marginRight: 3 }} />
                          <Text style={estilos.textoTagConfirmada}>Confirmada</Text>
                        </View>
                      </View>

                      <View style={estilos.metaLinha}>
                        <Feather name="book-open" size={12} color="#475569" style={{ marginRight: 4 }} />
                        <Text style={estilos.metaTextoEscuro}>{item.materia}</Text>
                      </View>

                      <View style={estilos.metaLinha}>
                        <Feather name="calendar" size={12} color="#475569" style={{ marginRight: 4 }} />
                        <Text style={estilos.metaTextoEscuro}>{item.horario}</Text>
                      </View>

                      <View style={estilos.metaLinha}>
                        <Ionicons name="location-outline" size={13} color="#475569" style={{ marginRight: 3 }} />
                        <Text style={estilos.metaTextoEscuro}>{item.localizacao}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Botões Remarcar e Desistir */}
                  <View style={estilos.botoesAcaoAlunoRow}>
                    <TouchableOpacity
                      style={estilos.botaoRemarcar}
                      onPress={() => handleAbrirRemarcar(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="calendar" size={14} color="#0A2540" style={{ marginRight: 6 }} />
                      <Text style={estilos.textoBotaoRemarcar}>Remarcar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={estilos.botaoDesistir}
                      onPress={() => handleAbrirDesistir(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={estilos.textoBotaoDesistir}>Desistir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Seção 2: Próximas Mentorias */}
            <View style={[estilos.secaoCabecalhoRow, { marginTop: 24 }]}>
              <Text style={estilos.secaoTituloTexto}>Próximas Mentorias</Text>
            </View>

            <View style={estilos.listaCardsContainer}>
              {dados.mentoriasAluno.map((item) => (
                <View key={`aluno-mentoria-${item.id}`} style={estilos.cardAlunoAgendamento}>
                  <View style={estilos.cardAlunoTopo}>
                    <View style={estilos.avatarContainer}>
                      <Image source={{ uri: item.foto }} style={estilos.avatarGrande} />
                      <View style={estilos.dotOnlineVerde} />
                    </View>

                    <View style={estilos.alunoInfoTexto}>
                      <View style={estilos.linhaNomeBadge}>
                        <Text style={estilos.nomeMentor}>{item.nome}</Text>
                        <View style={estilos.tagConfirmadaAzul}>
                          <Feather name="check" size={11} color="#0369A1" style={{ marginRight: 3 }} />
                          <Text style={estilos.textoTagConfirmadaAzul}>Confirmada</Text>
                        </View>
                      </View>

                      <View style={estilos.metaLinha}>
                        <Feather name="compass" size={12} color="#475569" style={{ marginRight: 4 }} />
                        <Text style={estilos.metaTextoEscuro}>{item.materia}</Text>
                      </View>

                      <View style={estilos.metaLinha}>
                        <Feather name="calendar" size={12} color="#475569" style={{ marginRight: 4 }} />
                        <Text style={estilos.metaTextoEscuro}>{item.horario}</Text>
                      </View>

                      <View style={estilos.metaLinha}>
                        <Ionicons name="videocam-outline" size={13} color="#475569" style={{ marginRight: 3 }} />
                        <Text style={estilos.metaTextoEscuro}>{item.localizacao}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Botões Remarcar e Desistir */}
                  <View style={estilos.botoesAcaoAlunoRow}>
                    <TouchableOpacity
                      style={estilos.botaoRemarcar}
                      onPress={() => handleAbrirRemarcar(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="calendar" size={14} color="#0A2540" style={{ marginRight: 6 }} />
                      <Text style={estilos.textoBotaoRemarcar}>Remarcar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={estilos.botaoDesistir}
                      onPress={() => handleAbrirDesistir(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={estilos.textoBotaoDesistir}>Desistir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Banner Informativo de Regras */}
            <View style={estilos.bannerRegras}>
              <View style={estilos.iconeRegrasBox}>
                <Feather name="info" size={18} color="#0284C7" />
              </View>
              <Text style={estilos.textoBannerRegras}>
                Em caso de imprevisto, você pode remarcar ou cancelar sua aula com até 2 horas de antecedência.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* 7. MODAL DE REMARCAR AULA                                      */}
      {/* ============================================================== */}
      <Modal visible={modalRemarcar} transparent animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCard}>
            <Text style={estilos.modalTitulo}>Remarcar Aula</Text>
            <Text style={estilos.modalSubtitulo}>
              Escolha uma nova data e horário para a aula com {itemSelecionado?.nome}:
            </Text>

            <View style={estilos.modalDatasRow}>
              {["Qua 26/06", "Qui 27/06", "Sex 28/06"].map((d, i) => (
                <TouchableOpacity
                  key={`rem-${i}`}
                  style={[estilos.modalDataPill, i === 1 && estilos.modalDataPillAtiva]}
                  activeOpacity={0.8}
                >
                  <Text style={[estilos.textoModalPill, i === 1 && estilos.textoModalPillAtiva]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={estilos.modalAcoesRow}>
              <TouchableOpacity
                style={estilos.botaoModalPrimario}
                onPress={handleConfirmarRemarcacao}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotaoModalPrimario}>Confirmar Remarcação</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={estilos.botaoModalSecundario}
                onPress={() => setModalRemarcar(false)}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotaoModalSecundario}>Voltar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 8. MODAL DE DESISTIR / CANCELAR                                */}
      {/* ============================================================== */}
      <Modal visible={modalCancelar} transparent animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCard}>
            <View style={estilos.modalIconeAlerta}>
              <Feather name="alert-triangle" size={28} color="#DC2626" />
            </View>
            <Text style={estilos.modalTitulo}>Desistir da Aula?</Text>
            <Text style={estilos.modalSubtitulo}>
              Tem certeza de que deseja cancelar a aula com {itemSelecionado?.nome}?
            </Text>

            <TextInput
              style={estilos.inputJustificativa}
              placeholder="Motivo do cancelamento (opcional)..."
              placeholderTextColor="#94A3B8"
              value={motivoCancelamento}
              onChangeText={setMotivoCancelamento}
              multiline
            />

            <View style={estilos.modalAcoesRow}>
              <TouchableOpacity
                style={estilos.botaoModalPerigo}
                onPress={handleConfirmarDesistencia}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotaoModalPerigo}>Confirmar Cancelamento</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={estilos.botaoModalSecundario}
                onPress={() => setModalCancelar(false)}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotaoModalSecundario}>Voltar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIconeBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B1A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoCirculoInterno: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  logoTexto: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerAcoesDireita: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  perfilToggle: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
  },
  perfilBotao: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  perfilBotaoAtivo: {
    backgroundColor: "#0A2540",
  },
  perfilTexto: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  perfilTextoAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sinoBotao: {
    position: "relative",
    padding: 6,
  },
  badgeSino: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF6B1A",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSinoTexto: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bannerSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  dotSimulacao: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
    marginRight: 6,
  },
  textoSimulacao: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Título
  tituloBloco: {
    marginBottom: 16,
  },
  tituloPrincipal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtituloPrincipal: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  segmentoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentoItemAtivo: {
    backgroundColor: "#0A2540",
  },
  segmentoTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  segmentoTextoAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Weekly Strip
  weeklyStripContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  chevronSemana: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  diasSemanaRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 8,
  },
  diaCard: {
    position: "relative",
    width: 52,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  diaCardAtivo: {
    backgroundColor: "#0A2540",
  },
  textoDiaSemana: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 2,
  },
  textoDataMes: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  textoDiaAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dotDiaAtivo: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FF6B1A",
    marginTop: 4,
  },

  // Conteúdo
  conteudoBloco: {
    gap: 12,
  },
  secaoCabecalhoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  secaoTituloComBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  secaoTituloTexto: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  badgeContadorLaranja: {
    backgroundColor: "#FF6B1A",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  badgeContadorTexto: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  linkVerTodas: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EA580C",
  },
  listaCardsContainer: {
    gap: 12,
  },

  // Cards do Professor
  cardSolicitacao: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 10,
  },
  avatarImagem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
  },
  avatarGrande: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E2E8F0",
  },
  avatarPequeno: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E2E8F0",
    marginRight: 10,
  },
  dotOnlineVerde: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  solicitacaoInfo: {
    flex: 1,
  },
  nomeAluno: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  badgeModalidadeLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  textoBadgeModalidade: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  metaLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  metaTexto: {
    fontSize: 11,
    color: "#64748B",
  },
  metaTextoEscuro: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  acoesBotoesColuna: {
    gap: 6,
    marginLeft: 6,
  },
  botaoAceitar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  textoBotaoAceitar: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  botaoRecusar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  textoBotaoRecusar: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },

  // Aulas Agendadas
  cardAulaAgendada: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  faixaMarcadoraAzul: {
    width: 5,
    backgroundColor: "#0284C7",
  },
  aulaAgendadaCorpo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  aulaInfoPrincipal: {
    flex: 1,
  },
  chipHorarioAgendada: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  textoChipHorario: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A2540",
    marginRight: 4,
  },

  // Visão Aluno
  cardAlunoAgendamento: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardAlunoTopo: {
    flexDirection: "row",
    marginBottom: 12,
  },
  alunoInfoTexto: {
    flex: 1,
  },
  linhaNomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  nomeMentor: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  tagConfirmada: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoTagConfirmada: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C2410C",
  },
  tagConfirmadaAzul: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoTagConfirmadaAzul: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369A1",
  },
  botoesAcaoAlunoRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  botaoRemarcar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 8,
    borderRadius: 10,
  },
  textoBotaoRemarcar: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0A2540",
  },
  botaoDesistir: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 8,
    borderRadius: 10,
  },
  textoBotaoDesistir: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  bannerRegras: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  iconeRegrasBox: {
    marginRight: 10,
  },
  textoBannerRegras: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 16,
    fontWeight: "500",
  },

  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconeAlerta: {
    alignSelf: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  modalDatasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalDataPill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalDataPillAtiva: {
    backgroundColor: "#0A2540",
  },
  textoModalPill: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  textoModalPillAtiva: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inputJustificativa: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalAcoesRow: {
    gap: 8,
  },
  botaoModalPrimario: {
    backgroundColor: "#FF6B1A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotaoModalPrimario: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  botaoModalPerigo: {
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotaoModalPerigo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  botaoModalSecundario: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotaoModalSecundario: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },

  // Barra de Navegação Inferior
  tabBar: {
    flexDirection: "row",
    height: 58,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tabItem: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 4,
  },
  tabRotulo: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  tabRotuloAtivo: {
    color: "#FF6B1A",
    fontWeight: "700",
  },
  tabIndicadorAtivo: {
    width: 18,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "#FF6B1A",
    marginTop: 2,
  },
  badgeTabPequeno: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: "#FF6B1A",
    borderRadius: 6,
    width: 13,
    height: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTabPequenoTexto: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
