/**
 * @file agenda.tsx
 * @description Agenda autenticada de aluno e professor, sincronizada com a API Orienta.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
  aceitarSolicitacao,
  AgendaCompleta,
  cancelarAgendamento,
  CompromissoAgenda,
  obterAgenda,
  PerfilAgenda,
  recusarSolicitacao,
  remarcarAgendamento,
} from "../../services/agendaService";
import AvatarPerfil from "../../components/AvatarPerfil";
import { getApiErrorMessage } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { obterNotificacoes } from "../../services/notificacoesService";

interface DiaSemana {
  dia: string;
  dataMes: string;
  dataIso: string;
}

function obterInicioSemana(data: Date): Date {
  const inicio = new Date(data);
  inicio.setHours(12, 0, 0, 0);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  return inicio;
}

function adicionarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function dataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function gerarDiasSemana(inicio: Date): DiaSemana[] {
  return Array.from({ length: 7 }, (_, indice) => {
    const data = adicionarDias(inicio, indice);
    return {
      dia: data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      dataMes: data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      dataIso: dataIso(data),
    };
  });
}

function rotuloStatus(status: CompromissoAgenda["status"]): string {
  const rotulos: Record<CompromissoAgenda["status"], string> = {
    PENDENTE: "Pendente",
    CONFIRMADO: "Confirmada",
    RECUSADO: "Recusada",
    CANCELADO: "Cancelada",
    EM_ANDAMENTO: "Em andamento",
    AGUARDANDO_CONFIRMACAO: "Aguardando confirmação",
    REALIZADA: "Realizada",
  };
  return rotulos[status];
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const { usuarioId, perfilAtivo: perfilSessao, trocarPerfil, carregandoAuth } = useAuth();

  const perfilAtivo: PerfilAgenda = perfilSessao === "Professor" ? "PROFESSOR" : "ALUNO";
  const [abaSegmentada, setAbaSegmentada] = useState<"AGENDA" | "SECUNDARIA">("AGENDA");
  const [diaSelecionadoIdx, setDiaSelecionadoIdx] = useState<number>(() => {
    const hoje = new Date().getDay();
    return (hoje + 6) % 7;
  });
  const [inicioSemana, setInicioSemana] = useState<Date>(() => obterInicioSemana(new Date()));
  const diaEscolhidoManualmente = useRef(false);
  const diasSemana = useMemo(() => gerarDiasSemana(inicioSemana), [inicioSemana]);
  const diaSelecionado = diasSemana[diaSelecionadoIdx];

  // Dados da Agenda
  const [dados, setDados] = useState<AgendaCompleta>({
    perfil: perfilAtivo,
    solicitacoes: [],
    aulasProfessor: [],
    aulasAluno: [],
  });
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [totalNotificacoesNaoLidas, setTotalNotificacoesNaoLidas] = useState<number | null>(null);
  const [processandoAcao, setProcessandoAcao] = useState<boolean>(false);

  // Estados dos Modais
  const [modalRemarcar, setModalRemarcar] = useState<boolean>(false);
  const [itemSelecionado, setItemSelecionado] = useState<CompromissoAgenda | null>(null);
  const [modalCancelar, setModalCancelar] = useState<boolean>(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState<string>("");
  const [novaData, setNovaData] = useState<string>("");
  const [novoHorario, setNovoHorario] = useState<string>("");
  const [motivoRemarcacao, setMotivoRemarcacao] = useState<string>("");

  const carregarDados = useCallback(async () => {
    if (carregandoAuth) return;
    const id = Number(usuarioId);
    if (!Number.isInteger(id) || id <= 0) {
      setErro("Entre novamente para consultar sua agenda.");
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      const res = await obterAgenda(perfilAtivo, id);
      setDados(res);
      setErro(null);
      if (!diaEscolhidoManualmente.current) {
        const compromissos = perfilAtivo === "PROFESSOR"
          ? [
              ...res.solicitacoes.map((item) => ({
                dataIso: item.dataIso,
                status: item.status,
              })),
              ...res.aulasProfessor,
            ]
          : res.aulasAluno;
        const hoje = dataIso(new Date());
        const proximaData = compromissos
          .filter((item) =>
            item.dataIso >= hoje &&
            ["PENDENTE", "CONFIRMADO", "EM_ANDAMENTO", "AGUARDANDO_CONFIRMACAO"]
              .includes(item.status),
          )
          .map((item) => item.dataIso)
          .sort()[0];
        if (proximaData) {
          const dataCompromisso = new Date(`${proximaData}T12:00:00`);
          setInicioSemana(obterInicioSemana(dataCompromisso));
          setDiaSelecionadoIdx((dataCompromisso.getDay() + 6) % 7);
        }
      }
      try {
        const notificacoes = await obterNotificacoes(id);
        setTotalNotificacoesNaoLidas(notificacoes.totalNaoLidas);
      } catch {
        setTotalNotificacoesNaoLidas(null);
      }
    } catch (error) {
      setErro(getApiErrorMessage(error));
    }
    finally {
      setCarregando(false);
    }
  }, [carregandoAuth, perfilAtivo, usuarioId]);

  useFocusEffect(useCallback(() => {
    carregarDados();
  }, [carregarDados]));

  const aulasProfessorDoDia = dados.aulasProfessor.filter(
    (item) => item.dataIso === diaSelecionado?.dataIso,
  );
  const aulasAlunoDoDia = dados.aulasAluno.filter(
    (item) => item.dataIso === diaSelecionado?.dataIso,
  );
  // Ações do Professor
  const handleAceitarSolicitacao = async (id: number) => {
    setProcessandoAcao(true);
    try {
      await aceitarSolicitacao(id);
      await carregarDados();
      Alert.alert("Solicitação aceita", "A aula foi confirmada e adicionada à sua agenda.");
    } catch (error) {
      Alert.alert("Não foi possível aceitar", getApiErrorMessage(error));
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleRecusarSolicitacao = async (id: number) => {
    setProcessandoAcao(true);
    try {
      await recusarSolicitacao(id, "Indisponibilidade de horário na agenda");
      await carregarDados();
      Alert.alert("Solicitação recusada", "A solicitação foi recusada.");
    } catch (error) {
      Alert.alert("Não foi possível recusar", getApiErrorMessage(error));
    } finally {
      setProcessandoAcao(false);
    }
  };

  // Ações do Aluno
  const handleAbrirRemarcar = (item: CompromissoAgenda) => {
    setItemSelecionado(item);
    setNovaData("");
    setNovoHorario("");
    setMotivoRemarcacao("");
    setModalRemarcar(true);
  };

  const handleConfirmarRemarcacao = async () => {
    if (!itemSelecionado || !/^\d{4}-\d{2}-\d{2}$/.test(novaData) || !/^\d{2}:\d{2}$/.test(novoHorario)) {
      Alert.alert("Dados inválidos", "Informe uma data no formato AAAA-MM-DD e um horário HH:MM.");
      return;
    }
    setProcessandoAcao(true);
    try {
      await remarcarAgendamento(itemSelecionado.id, {
        data: novaData,
        hora: `${novoHorario}:00`,
        motivo: motivoRemarcacao.trim() || undefined,
      });
      setModalRemarcar(false);
      await carregarDados();
      Alert.alert("Aula remarcada", "A nova data e horário foram enviados para a agenda.");
    } catch (error) {
      Alert.alert("Não foi possível remarcar", getApiErrorMessage(error));
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleAbrirDesistir = (item: CompromissoAgenda) => {
    setItemSelecionado(item);
    setMotivoCancelamento("");
    setModalCancelar(true);
  };

  const handleConfirmarDesistencia = async () => {
    if (!itemSelecionado) return;
    if (motivoCancelamento.trim().length < 5) {
      Alert.alert("Informe o motivo", "A justificativa deve ter pelo menos 5 caracteres.");
      return;
    }
    setProcessandoAcao(true);
    try {
      await cancelarAgendamento(itemSelecionado.id, motivoCancelamento.trim());
      setModalCancelar(false);
      await carregarDados();
      Alert.alert("Aula cancelada", "O cancelamento foi registrado.");
    } catch (error) {
      Alert.alert("Não foi possível cancelar", getApiErrorMessage(error));
    } finally {
      setProcessandoAcao(false);
    }
  };

  const alternarPerfil = async (perfil: PerfilAgenda) => {
    const nomePerfil = perfil === "PROFESSOR" ? "Professor" : "Aluno";
    if (perfil === perfilAtivo) return;
    try {
      await trocarPerfil(nomePerfil);
    } catch (error) {
      Alert.alert("Não foi possível trocar de perfil", getApiErrorMessage(error));
    }
  };

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 1. TOP HEADER INSTITUCIONAL (LOGO ORIENTA + SINO DE NOTIFICAÇÃO)*/}
      {/* ============================================================== */}
      <View style={estilos.topHeader}>
        <View style={estilos.logoRow}>
          <Image
            source={require("../../assets/images/branding/logo.png")}
            style={estilos.logoImagem}
            resizeMode="contain"
            accessibilityLabel="Orienta"
          />
        </View>

        <View style={estilos.headerAcoesDireita}>
          <View style={estilos.perfilToggle}>
            <TouchableOpacity
              onPress={() => alternarPerfil("PROFESSOR")}
              disabled={processandoAcao}
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
              onPress={() => alternarPerfil("ALUNO")}
              disabled={processandoAcao}
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

          <TouchableOpacity
            style={estilos.sinoBotao}
            activeOpacity={0.7}
            onPress={() => router.push("/notificacoes" as any)}
            accessibilityLabel="Abrir notificações"
          >
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
            {totalNotificacoesNaoLidas !== null && totalNotificacoesNaoLidas > 0 && (
              <View style={estilos.badgeSino}>
                <Text style={estilos.badgeSinoTexto}>
                  {totalNotificacoesNaoLidas > 9 ? "9+" : totalNotificacoesNaoLidas}
                </Text>
              </View>
            )}
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
            onPress={() => {
              diaEscolhidoManualmente.current = true;
              setInicioSemana((prev) => adicionarDias(prev, -7));
            }}
            accessibilityLabel="Semana anterior"
          >
            <Ionicons name="chevron-back" size={18} color="#0F172A" />
          </TouchableOpacity>

          <View style={estilos.diasSemanaRow}>
            {diasSemana.map((item, idx) => {
              const isSelected = idx === diaSelecionadoIdx;
              const temCompromisso = [
                ...dados.aulasProfessor,
                ...dados.aulasAluno,
              ].some((compromisso) => compromisso.dataIso === item.dataIso);
              return (
                <TouchableOpacity
                  key={item.dataIso}
                  style={[estilos.diaCard, isSelected && estilos.diaCardAtivo]}
                  onPress={() => {
                    diaEscolhidoManualmente.current = true;
                    setDiaSelecionadoIdx(idx);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[estilos.textoDiaSemana, isSelected && estilos.textoDiaAtivo]}>
                    {item.dia}
                  </Text>
                  <Text style={[estilos.textoDataMes, isSelected && estilos.textoDiaAtivo]}>
                    {item.dataMes}
                  </Text>
                  {temCompromisso && <View style={estilos.dotDiaAtivo} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={estilos.chevronSemana}
            onPress={() => {
              diaEscolhidoManualmente.current = true;
              setInicioSemana((prev) => adicionarDias(prev, 7));
            }}
            accessibilityLabel="Próxima semana"
          >
            <Ionicons name="chevron-forward" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* 5. CONTEÚDO DA VISÃO DO PROFESSOR                              */}
        {/* ============================================================== */}
        {carregando ? (
          <View style={estilos.estadoAgenda}>
            <ActivityIndicator size="large" color="#FF6B1A" />
            <Text style={estilos.estadoAgendaTexto}>Carregando sua agenda...</Text>
          </View>
        ) : erro ? (
          <View style={estilos.estadoAgenda}>
            <Feather name="wifi-off" size={28} color="#DC2626" />
            <Text style={estilos.erroAgendaTexto}>{erro}</Text>
            <TouchableOpacity style={estilos.botaoTentarNovamente} onPress={carregarDados}>
              <Text style={estilos.textoTentarNovamente}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : abaSegmentada === "SECUNDARIA" ? (
          <View style={estilos.conteudoBloco}>
            <Text style={estilos.secaoTituloTexto}>
              {perfilAtivo === "PROFESSOR" ? "Resumo da agenda" : "Histórico de aulas"}
            </Text>
            <View style={estilos.resumoCard}>
              {perfilAtivo === "PROFESSOR" ? (
                <>
                  <View style={estilos.resumoLinha}>
                    <Text style={estilos.resumoRotulo}>Solicitações pendentes</Text>
                    <Text style={estilos.resumoValor}>{dados.solicitacoes.length}</Text>
                  </View>
                  <View style={estilos.resumoLinha}>
                    <Text style={estilos.resumoRotulo}>Aulas agendadas</Text>
                    <Text style={estilos.resumoValor}>
                      {dados.aulasProfessor.filter((item) =>
                        item.dataIso >= dataIso(new Date()) &&
                        ["CONFIRMADO", "PENDENTE", "EM_ANDAMENTO", "AGUARDANDO_CONFIRMACAO"]
                          .includes(item.status),
                      ).length}
                    </Text>
                  </View>
                  <View style={estilos.resumoLinha}>
                    <Text style={estilos.resumoRotulo}>Aulas realizadas</Text>
                    <Text style={estilos.resumoValor}>
                      {dados.aulasProfessor.filter((item) => item.status === "REALIZADA").length}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={estilos.resumoLinha}>
                    <Text style={estilos.resumoRotulo}>Próximas aulas</Text>
                    <Text style={estilos.resumoValor}>
                      {dados.aulasAluno.filter((item) =>
                        item.dataIso >= dataIso(new Date()) &&
                        ["CONFIRMADO", "PENDENTE", "EM_ANDAMENTO", "AGUARDANDO_CONFIRMACAO"]
                          .includes(item.status),
                      ).length}
                    </Text>
                  </View>
                  <View style={estilos.resumoLinha}>
                    <Text style={estilos.resumoRotulo}>Aulas realizadas</Text>
                    <Text style={estilos.resumoValor}>
                      {dados.aulasAluno.filter((item) => item.status === "REALIZADA").length}
                    </Text>
                  </View>
                  <View style={estilos.resumoLinha}>
                    <Text style={estilos.resumoRotulo}>Canceladas ou recusadas</Text>
                    <Text style={estilos.resumoValor}>
                      {dados.aulasAluno.filter((item) =>
                        ["CANCELADO", "RECUSADO"].includes(item.status),
                      ).length}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        ) : perfilAtivo === "PROFESSOR" ? (
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
              <TouchableOpacity onPress={() => router.push("/todas-mentorias" as any)}>
                <Text style={estilos.linkVerTodas}>Ver todas →</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Solicitações */}
            <View style={estilos.listaCardsContainer}>
              {dados.solicitacoes.length === 0 && (
                <Text style={estilos.estadoListaTexto}>Nenhuma solicitação pendente.</Text>
              )}
              {dados.solicitacoes.map((sol) => (
                <View key={`sol-${sol.id}`} style={estilos.cardSolicitacao}>
                  <View style={estilos.avatarContainer}>
                    <AvatarPerfil nome={sol.alunoNome} tamanho={48} />
                  </View>

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

                  <View style={estilos.acoesBotoesColuna}>
                    <TouchableOpacity
                      style={estilos.botaoAceitar}
                      onPress={() => handleAceitarSolicitacao(sol.id)}
                      disabled={processandoAcao}
                      activeOpacity={0.8}
                    >
                      <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={estilos.textoBotaoAceitar}>Aceitar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={estilos.botaoRecusar}
                      onPress={() => handleRecusarSolicitacao(sol.id)}
                      disabled={processandoAcao}
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
              <TouchableOpacity onPress={() => router.push("/todas-mentorias" as any)}>
                <Text style={estilos.linkVerTodas}>Ver todas →</Text>
              </TouchableOpacity>
            </View>

            <View style={estilos.listaCardsContainer}>
              {aulasProfessorDoDia.length === 0 && (
                <Text style={estilos.estadoListaTexto}>
                  Nenhuma aula agendada para {diaSelecionado?.dataMes ?? "esta data"}.
                </Text>
              )}
              {aulasProfessorDoDia.map((aula) => (
                <TouchableOpacity
                  key={`aula-${aula.id}`}
                  style={estilos.cardAulaAgendada}
                  onPress={() => router.push("/chat" as any)}
                  activeOpacity={0.85}
                >
                  {/* Faixa Marcadora Azul Lateral */}
                  <View style={estilos.faixaMarcadoraAzul} />

                  <View style={estilos.aulaAgendadaCorpo}>
                    <AvatarPerfil nome={aula.nome} fotoUrl={aula.foto} tamanho={38} />

                    <View style={estilos.aulaInfoPrincipal}>
                      <Text style={estilos.nomeAluno}>{aula.nome}</Text>
                      <View style={estilos.metaLinha}>
                        <Feather name="book-open" size={12} color="#64748B" style={{ marginRight: 3 }} />
                        <Text style={estilos.metaTexto}>{aula.materia}</Text>
                      </View>
                      <View style={estilos.metaLinha}>
                        <Feather name="check-circle" size={12} color="#64748B" style={{ marginRight: 3 }} />
                        <Text style={estilos.metaTexto}>{rotuloStatus(aula.status)}</Text>
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
              <Text style={estilos.secaoTituloTexto}>Aulas do dia</Text>
            </View>

            <View style={estilos.listaCardsContainer}>
              {aulasAlunoDoDia.length === 0 && (
                <Text style={estilos.estadoListaTexto}>
                  Nenhuma aula para {diaSelecionado?.dataMes ?? "esta data"}.
                </Text>
              )}
              {aulasAlunoDoDia.map((item) => (
                <View key={`aluno-aula-${item.id}`} style={estilos.cardAlunoAgendamento}>
                  <View style={estilos.cardAlunoTopo}>
                    <View style={estilos.avatarContainer}>
                      <AvatarPerfil nome={item.nome} fotoUrl={item.foto} tamanho={54} />
                    </View>

                    <View style={estilos.alunoInfoTexto}>
                      <View style={estilos.linhaNomeBadge}>
                        <Text style={estilos.nomeMentor}>{item.nome}</Text>
                        <View style={estilos.tagConfirmada}>
                          <Feather name="check" size={11} color="#C2410C" style={{ marginRight: 3 }} />
                          <Text style={estilos.textoTagConfirmada}>{rotuloStatus(item.status)}</Text>
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
                        <Ionicons
                          name={item.online ? "videocam-outline" : "location-outline"}
                          size={13}
                          color="#475569"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={estilos.metaTextoEscuro}>{item.localizacao}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Botões Remarcar e Desistir */}
                  <View style={estilos.botoesAcaoAlunoRow}>
                    <TouchableOpacity
                      style={estilos.botaoRemarcar}
                      onPress={() => handleAbrirRemarcar(item)}
                      disabled={processandoAcao || item.status !== "CONFIRMADO"}
                      activeOpacity={0.8}
                    >
                      <Feather name="calendar" size={14} color="#0A2540" style={{ marginRight: 6 }} />
                      <Text style={estilos.textoBotaoRemarcar}>Remarcar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={estilos.botaoDesistir}
                      onPress={() => handleAbrirDesistir(item)}
                      disabled={processandoAcao || ["CANCELADO", "RECUSADO", "REALIZADA"].includes(item.status)}
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

            <TextInput
              style={estilos.inputModal}
              placeholder="Nova data (AAAA-MM-DD)"
              placeholderTextColor="#94A3B8"
              value={novaData}
              onChangeText={setNovaData}
              autoCapitalize="none"
            />
            <TextInput
              style={estilos.inputModal}
              placeholder="Novo horário (HH:MM)"
              placeholderTextColor="#94A3B8"
              value={novoHorario}
              onChangeText={setNovoHorario}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            <TextInput
              style={estilos.inputModal}
              placeholder="Motivo (opcional)"
              placeholderTextColor="#94A3B8"
              value={motivoRemarcacao}
              onChangeText={setMotivoRemarcacao}
            />

            <View style={estilos.modalAcoesRow}>
              <TouchableOpacity
                style={estilos.botaoModalPrimario}
                onPress={handleConfirmarRemarcacao}
                disabled={processandoAcao}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotaoModalPrimario}>
                  {processandoAcao ? "Salvando..." : "Confirmar Remarcação"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={estilos.botaoModalSecundario}
                onPress={() => setModalRemarcar(false)}
                disabled={processandoAcao}
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
              placeholder="Motivo do cancelamento (obrigatório)..."
              placeholderTextColor="#94A3B8"
              value={motivoCancelamento}
              onChangeText={setMotivoCancelamento}
              multiline
            />

            <View style={estilos.modalAcoesRow}>
              <TouchableOpacity
                style={estilos.botaoModalPerigo}
                onPress={handleConfirmarDesistencia}
                disabled={processandoAcao}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotaoModalPerigo}>
                  {processandoAcao ? "Cancelando..." : "Confirmar Cancelamento"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={estilos.botaoModalSecundario}
                onPress={() => setModalCancelar(false)}
                disabled={processandoAcao}
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
    paddingVertical: 4,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImagem: {
    width: 56,
    height: 56,
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
    width: 34,
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
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 2,
  },
  textoDataMes: {
    fontSize: 10,
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
  estadoAgenda: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 10,
  },
  estadoAgendaTexto: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
  },
  erroAgendaTexto: {
    color: "#991B1B",
    fontSize: 14,
    textAlign: "center",
  },
  botaoTentarNovamente: {
    backgroundColor: "#0A2540",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
  },
  textoTentarNovamente: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  resumoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
  },
  resumoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  resumoRotulo: {
    color: "#475569",
    fontSize: 14,
  },
  resumoValor: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  estadoListaTexto: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 18,
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
  inputModal: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
    marginBottom: 10,
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
