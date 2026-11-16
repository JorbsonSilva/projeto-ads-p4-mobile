/**
 * @file marcar-aula.tsx
 * @description Solicitação de agendamento vinculada ao professor e aos dados reais da API.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getApiErrorMessage } from "../config/api";
import { useAuth } from "../context/AuthContext";
import AvatarPerfil from "../components/AvatarPerfil";
import {
  obterPerfilProfessor,
  PerfilProfessorPublico,
} from "../services/professorService";
import {
  AgendamentoSolicitado,
  solicitarAgendamento,
} from "../services/agendamentoService";

interface DiaOpcao {
  diaSemana: string;
  diaMes: string;
  dataIso: string;
  dataCompleta: string;
  horarios: string[];
}

const DIAS_API = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];

function normalizarDia(dia: string): string {
  return dia.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    .replace(/-FEIRA$/, "");
}

function minutosDoHorario(horario: string): number | null {
  const resultado = horario.match(/^(\d{1,2}):(\d{2})/);
  if (!resultado) return null;
  return Number(resultado[1]) * 60 + Number(resultado[2]);
}

function horarioFormatado(minutos: number): string {
  const hora = Math.floor(minutos / 60).toString().padStart(2, "0");
  const minuto = (minutos % 60).toString().padStart(2, "0");
  return `${hora}:${minuto}`;
}

function horariosDaData(
  diaSemana: string,
  disponibilidades: PerfilProfessorPublico["disponibilidades"],
): string[] {
  const horarios = new Set<string>();
  const nomeDia = normalizarDia(diaSemana);

  disponibilidades
    .filter((disponibilidade) => normalizarDia(disponibilidade.diaSemana) === nomeDia)
    .forEach((disponibilidade) => {
      const inicio = minutosDoHorario(disponibilidade.horaInicio);
      const fim = minutosDoHorario(disponibilidade.horaFim);
      if (inicio === null || fim === null) return;

      for (let horario = inicio; horario + 60 <= fim; horario += 60) {
        horarios.add(horarioFormatado(horario));
      }
    });

  return Array.from(horarios).sort();
}

function gerarDiasDisponiveis(
  disponibilidades: PerfilProfessorPublico["disponibilidades"],
): DiaOpcao[] {
  const dias: DiaOpcao[] = [];

  for (let deslocamento = 2; deslocamento <= 30 && dias.length < 5; deslocamento += 1) {
    const data = new Date();
    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() + deslocamento);

    const dia = data.toLocaleDateString("pt-BR", { weekday: "short" })
      .replace(".", "");
    const nomeDia = DIAS_API[data.getDay()];
    const horarios = horariosDaData(nomeDia, disponibilidades);
    if (horarios.length === 0) continue;

    dias.push({
      diaSemana: dia.charAt(0).toUpperCase() + dia.slice(1),
      diaMes: data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      dataIso: [
        data.getFullYear(),
        (data.getMonth() + 1).toString().padStart(2, "0"),
        data.getDate().toString().padStart(2, "0"),
      ].join("-"),
      dataCompleta: data.toLocaleDateString("pt-BR"),
      horarios,
    });
  }

  return dias;
}

export default function MarcarAulaScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    professorId?: string | string[];
    modalidade?: string | string[];
  }>();
  const { usuarioId, perfilAtivo, carregandoAuth } = useAuth();
  const professorId = Array.isArray(params.professorId)
    ? params.professorId[0]
    : params.professorId;
  const modalidadeParam = Array.isArray(params.modalidade)
    ? params.modalidade[0]
    : params.modalidade;

  const [professor, setProfessor] = useState<PerfilProfessorPublico | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const [erroAgendamento, setErroAgendamento] = useState<string | null>(null);
  const [modalidade, setModalidade] = useState<"ONLINE" | "PRESENCIAL">("ONLINE");
  const [aptidaoSelecionadaId, setAptidaoSelecionadaId] = useState<number | null>(null);
  const [diaSelecionadoIdx, setDiaSelecionadoIdx] = useState<number>(0);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>("");
  const [agendamentoCriado, setAgendamentoCriado] = useState<AgendamentoSolicitado | null>(null);
  const [modalSucesso, setModalSucesso] = useState<boolean>(false);
  const [processando, setProcessando] = useState<boolean>(false);

  const diasDisponiveis = useMemo(
    () => gerarDiasDisponiveis(professor?.disponibilidades ?? []),
    [professor],
  );
  const diaAtual = diasDisponiveis[diaSelecionadoIdx];
  const horariosDisponiveis = diaAtual?.horarios ?? [];
  const aptidoesComPreco = professor?.aptidoes.filter(
    (aptidao) => aptidao.saberId !== null && aptidao.precoHora !== null && aptidao.precoHora > 0,
  ) ?? [];
  const aptidaoSelecionada = aptidoesComPreco.find(
    (aptidao) => aptidao.saberId === aptidaoSelecionadaId,
  ) ?? aptidoesComPreco[0];

  useEffect(() => {
    if (carregandoAuth) return;
    if (!professorId || !/^\d+$/.test(professorId)) {
      setErroPerfil("Identificador de professor inválido.");
      setCarregandoPerfil(false);
      return;
    }

    const controller = new AbortController();
    setCarregandoPerfil(true);
    setErroPerfil(null);
    obterPerfilProfessor(professorId, controller.signal)
      .then((perfil) => {
        if (controller.signal.aborted) return;
        setProfessor(perfil);
        const modalidadeSolicitada = modalidadeParam === "PRESENCIAL"
          ? "PRESENCIAL"
          : "ONLINE";
        setModalidade(
          modalidadeSolicitada === "ONLINE" && perfil.aceitaOnline
            || modalidadeSolicitada === "PRESENCIAL" && perfil.oferecePresencial
            ? modalidadeSolicitada
            : perfil.aceitaOnline
              ? "ONLINE"
              : "PRESENCIAL",
        );
        const primeiraAptidaoComPreco = perfil.aptidoes.find(
          (aptidao) => aptidao.saberId !== null && aptidao.precoHora !== null && aptidao.precoHora > 0,
        );
        setAptidaoSelecionadaId(primeiraAptidaoComPreco?.saberId ?? null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setProfessor(null);
          setErroPerfil(getApiErrorMessage(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoPerfil(false);
      });

    return () => controller.abort();
  }, [carregandoAuth, professorId, modalidadeParam]);

  useEffect(() => {
    setDiaSelecionadoIdx(0);
    setHorarioSelecionado(diasDisponiveis[0]?.horarios[0] ?? "");
  }, [diasDisponiveis]);

  const handleConfirmarSolicitacao = async () => {
    if (
      !professor
      || !diaAtual
      || !horarioSelecionado
      || !aptidaoSelecionada
      || aptidaoSelecionada.saberId === null
    ) return;
    if (!usuarioId || perfilAtivo !== "Aluno") {
      setErroAgendamento("Entre em uma conta de aluno para solicitar uma aula.");
      return;
    }
    if (Number(usuarioId) === professor.id) {
      setErroAgendamento("Não é possível agendar uma aula com seu próprio perfil.");
      return;
    }

    setProcessando(true);
    setErroAgendamento(null);
    try {
      const resultado = await solicitarAgendamento({
        idAluno: Number(usuarioId),
        idProfessor: professor.id,
        idDisciplina: aptidaoSelecionada.saberId,
        data: diaAtual.dataIso,
        hora: `${horarioSelecionado}:00`,
        modalidade,
        assunto: aptidaoSelecionada.nome,
      });
      setAgendamentoCriado(resultado);
      setModalSucesso(true);
    } catch (error) {
      setErroAgendamento(getApiErrorMessage(error));
    } finally {
      setProcessando(false);
    }
  };

  const handleIrParaAgenda = () => {
    setModalSucesso(false);
    router.push("/agenda" as any);
  };

  if (carregandoAuth || carregandoPerfil) {
    return (
      <View style={[estilos.container, estilos.estadoContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={estilos.textoEstado}>Carregando os dados do professor...</Text>
      </View>
    );
  }

  if (erroPerfil || !professor) {
    return (
      <View style={[estilos.container, estilos.estadoContainer, { paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={42} color="#DC2626" />
        <Text style={estilos.textoEstado}>{erroPerfil ?? "Professor não encontrado."}</Text>
        <TouchableOpacity style={estilos.botaoVoltar} onPress={() => router.back()}>
          <Text>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 1. TOP HEADER (VOLTAR + TÍTULO CENTRALIZADO)                   */}
      {/* ============================================================== */}
      <View style={estilos.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={estilos.botaoVoltar}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeader}>Marcar aula</Text>
        <View style={{ width: 36 }} />
      </View>


      <ScrollView
        style={estilos.scrollView}
        contentContainerStyle={estilos.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* 2. ETAPAS REAIS DA SOLICITAÇÃO                                 */}
        {/* ============================================================== */}
        <View style={estilos.stepperContainer}>
          <View style={estilos.stepItem}>
            <View style={estilos.stepCirculoConcluido}>
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <Text style={estilos.stepRotuloConcluido}>Professor</Text>
          </View>
          <View style={[estilos.linhaConectora, estilos.linhaAtiva]} />
          <View style={estilos.stepItem}>
            <View style={estilos.stepCirculoAtivo}>
              <Text style={estilos.stepNumeroAtivo}>2</Text>
            </View>
            <Text style={estilos.stepRotuloAtivo}>Data e Hora</Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 3. CARD RESUMO DO PROFESSOR SELECIONADO                        */}
        {/* ============================================================== */}
        <View style={estilos.cardProfessor}>
          <View style={estilos.fotoContainer}>
            <AvatarPerfil
              nome={professor.nome}
              fotoUrl={professor.fotoUrl}
              tamanho={72}
            />
          </View>

          <View style={estilos.infoProfessor}>
            <View style={estilos.linhaNome}>
              <Text style={estilos.nomeProfessor}>{professor.nome}</Text>
            </View>
            <Text style={estilos.materiaProfessor}>
              {aptidaoSelecionada?.nome ?? "Disciplina não selecionada"}
            </Text>
            <View style={estilos.linhaAvaliacao}>
              {professor.notaMedia !== null && (
                <Ionicons name="star" size={14} color="#F59E0B" />
              )}
              <Text style={estilos.textoAvaliacao}>
                {professor.notaMedia !== null
                  ? ` ${professor.notaMedia.toFixed(1).replace(".", ",")} (${professor.totalAvaliacoes} avaliações)`
                  : "Ainda sem avaliações"}
              </Text>
            </View>
            <View style={estilos.badgesRow}>
              <View style={estilos.badgePill}>
                <Feather name="monitor" size={12} color="#0284C7" style={{ marginRight: 3 }} />
                <Text style={estilos.badgePillTexto}>
                  {professor.aceitaOnline && professor.oferecePresencial
                    ? "Online e presencial"
                    : professor.aceitaOnline
                      ? "Online"
                      : professor.oferecePresencial
                        ? "Presencial"
                        : "Modalidade não informada"}
                </Text>
              </View>
            </View>
          </View>

          <View style={estilos.blocoPreco}>
            <Text style={estilos.valorHora}>
              {aptidaoSelecionada?.precoHora !== null && aptidaoSelecionada
                ? `R$ ${aptidaoSelecionada.precoHora.toFixed(2).replace(".", ",")}`
                : "—"}
            </Text>
            {aptidaoSelecionada?.precoHora !== null && aptidaoSelecionada && (
              <Text style={estilos.unidadeHora}>/h</Text>
            )}
          </View>
        </View>

        {aptidoesComPreco.length > 1 && (
          <View style={estilos.secaoContainer}>
            <Text style={estilos.secaoTitulo}>Disciplina</Text>
            <View style={estilos.materiasDisponiveis}>
              {aptidoesComPreco.map((aptidao) => (
                <TouchableOpacity
                  key={aptidao.saberId}
                  onPress={() => setAptidaoSelecionadaId(aptidao.saberId)}
                  style={[
                    estilos.materiaDisponivel,
                    aptidaoSelecionada?.saberId === aptidao.saberId
                      && estilos.materiaDisponivelAtiva,
                  ]}
                >
                  <Text
                    style={[
                      estilos.materiaDisponivelTexto,
                      aptidaoSelecionada?.saberId === aptidao.saberId
                        && estilos.materiaDisponivelTextoAtiva,
                    ]}
                  >
                    {aptidao.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {professor.aceitaOnline && professor.oferecePresencial && (
          <View style={estilos.modalidadeSelecao}>
            <TouchableOpacity
              onPress={() => setModalidade("ONLINE")}
              style={[estilos.modalidadeOpcao, modalidade === "ONLINE" && estilos.modalidadeOpcaoAtiva]}
            >
              <Text style={modalidade === "ONLINE" ? estilos.modalidadeOpcaoTextoAtiva : estilos.modalidadeOpcaoTexto}>
                Online
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalidade("PRESENCIAL")}
              style={[estilos.modalidadeOpcao, modalidade === "PRESENCIAL" && estilos.modalidadeOpcaoAtiva]}
            >
              <Text style={modalidade === "PRESENCIAL" ? estilos.modalidadeOpcaoTextoAtiva : estilos.modalidadeOpcaoTexto}>
                Presencial
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================== */}
        {/* 4. SELETOR SEMANAL DE DATAS ("Escolha a data")                 */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <View style={estilos.secaoTituloRow}>
            <Feather name="calendar" size={18} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.secaoTitulo}>Escolha a data</Text>
          </View>

          {diasDisponiveis.length > 0 ? (
            <View style={estilos.diasContainer}>
              {diasDisponiveis.map((dia, idx) => {
                const isSelected = idx === diaSelecionadoIdx;
                return (
                  <TouchableOpacity
                    key={`dia-${idx}`}
                    onPress={() => {
                      setDiaSelecionadoIdx(idx);
                      setHorarioSelecionado(dia.horarios[0] ?? "");
                    }}
                    style={[estilos.cardDia, isSelected && estilos.cardDiaAtivo]}
                    activeOpacity={0.8}
                  >
                    {/* Badge Check Laranja para o Dia Ativo */}
                    {isSelected && (
                      <View style={estilos.badgeCheckLaranja}>
                        <Feather name="check" size={10} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={[estilos.textoDiaSemana, isSelected && estilos.textoDiaAtivo]}>
                      {dia.diaSemana}
                    </Text>
                    <Text style={[estilos.textoDiaMes, isSelected && estilos.textoDiaAtivo]}>
                      {dia.diaMes}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={estilos.textoSemDisponibilidade}>
              O professor não informou horários disponíveis para os próximos dias.
            </Text>
          )}
        </View>

        {/* ============================================================== */}
        {/* 5. SELETOR DE HORÁRIOS ("Escolha o horário")                   */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <View style={estilos.secaoTituloRow}>
            <Feather name="clock" size={18} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.secaoTitulo}>Escolha o horário</Text>
          </View>

          <View style={estilos.horariosGrid}>
            {horariosDisponiveis.map((hora) => {
              const isSelected = hora === horarioSelecionado;
              return (
                <TouchableOpacity
                  key={`hora-${hora}`}
                  onPress={() => setHorarioSelecionado(hora)}
                  style={[estilos.pillHorario, isSelected && estilos.pillHorarioAtivo]}
                  activeOpacity={0.8}
                >
                  {/* Badge Check Laranja para o Horário Ativo */}
                  {isSelected && (
                    <View style={estilos.badgeCheckLaranja}>
                      <Feather name="check" size={10} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={[estilos.textoHorario, isSelected && estilos.textoHorarioAtivo]}>
                    {hora}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {horariosDisponiveis.length === 0 && (
              <Text style={estilos.textoSemDisponibilidade}>
                Selecione uma data com horário disponível.
              </Text>
            )}
          </View>
        </View>

        {/* ============================================================== */}
        {/* 7. BOX RESUMO DA ESCOLHA                                       */}
        {/* ============================================================== */}
        <View style={estilos.boxResumo}>
          <View style={estilos.resumoHeader}>
            <Feather name="info" size={14} color="#EA580C" style={{ marginRight: 5 }} />
            <Text style={estilos.resumoTitulo}>Resumo da sua escolha</Text>
          </View>

          <View style={estilos.resumoGrid}>
            {/* Coluna 1: Data */}
            <View style={estilos.colunaResumo}>
              <View style={estilos.iconeLinha}>
                <Feather name="calendar" size={13} color="#94A3B8" />
                <Text style={estilos.labelResumo}> Data</Text>
              </View>
              <Text style={estilos.valorResumo}>{diaAtual?.dataCompleta ?? "—"}</Text>
            </View>

            {/* Coluna 2: Horário */}
            <View style={estilos.colunaResumo}>
              <View style={estilos.iconeLinha}>
                <Feather name="clock" size={13} color="#94A3B8" />
                <Text style={estilos.labelResumo}> Horário</Text>
              </View>
              <Text style={estilos.valorResumo}>
                {horarioSelecionado
                  ? `${horarioSelecionado} – ${horarioFormatado((minutosDoHorario(horarioSelecionado) ?? 0) + 60)}`
                  : "—"}
              </Text>
            </View>

            {/* Coluna 3: Professor */}
            <View style={estilos.colunaResumo}>
              <View style={estilos.professorLinhaResumo}>
                <AvatarPerfil nome={professor.nome} fotoUrl={professor.fotoUrl} tamanho={32} />
                <View style={{ marginLeft: 6 }}>
                  <Text style={estilos.labelResumo}>Professor</Text>
                  <Text style={estilos.valorResumo}>{professor.nome}</Text>
                </View>
              </View>
            </View>

            {/* Coluna 4: Valor */}
            <View style={[estilos.colunaResumo, { alignItems: "flex-end" }]}>
              <Text style={estilos.labelResumo}>Valor</Text>
              <Text style={estilos.valorDestaqueLaranja}>
                {aptidaoSelecionada?.precoHora != null
                  ? `R$ ${aptidaoSelecionada.precoHora.toFixed(2).replace(".", ",")}`
                  : "A consultar"}
              </Text>
            </View>
          </View>
        </View>

        {erroAgendamento && (
          <Text style={estilos.mensagemErro} accessibilityRole="alert">
            {erroAgendamento}
          </Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* 8. STICKY ACTION FOOTER (CONFIRMAR E PAGAR + SELO DE SEGURANÇA)*/}
      {/* ============================================================== */}
      <View style={[estilos.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={handleConfirmarSolicitacao}
          disabled={
            processando
            || !diaAtual
            || !horarioSelecionado
            || !aptidaoSelecionada
            || !usuarioId
            || perfilAtivo !== "Aluno"
          }
          style={[
            estilos.botaoConfirmarPagar,
            (!diaAtual || !horarioSelecionado || !aptidaoSelecionada || perfilAtivo !== "Aluno")
              && estilos.botaoDesabilitado,
          ]}
          activeOpacity={0.85}
        >
          {processando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={estilos.botaoConteudoRow}>
              <Feather name="calendar" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={estilos.textoBotaoConfirmar}>
                Solicitar aula
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Selo Inferior de Pagamento Seguro */}
        <View style={estilos.seloSeguroLinha}>
          <Feather name="info" size={13} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={estilos.textoSeloSeguro}>
            A solicitação aguarda confirmação do professor.
          </Text>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 9. MODAL DE CONFIRMAÇÃO / CHECKOUT SUCESSO                     */}
      {/* ============================================================== */}
      <Modal
        visible={modalSucesso}
        transparent
        animationType="fade"
        onRequestClose={() => setModalSucesso(false)}
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCard}>
            {/* Ícone de Sucesso */}
            <View style={estilos.modalIconeSucesso}>
              <Feather name="check" size={32} color="#FFFFFF" />
            </View>

            <Text style={estilos.modalTitulo}>Solicitação enviada</Text>
            <Text style={estilos.modalSubtitulo}>
              Sua solicitação para {agendamentoCriado?.professorNome ?? professor.nome}
              {" "}em {diaAtual?.dataCompleta} às {horarioSelecionado} foi enviada.
              {" "}A aula só será confirmada após o aceite do professor.
            </Text>

            {agendamentoCriado && (
              <Text style={estilos.statusAgendamento}>
                Solicitação #{agendamentoCriado.id} · {agendamentoCriado.status}
              </Text>
            )}

            <View style={estilos.modalAcoesRow}>
              <TouchableOpacity
                style={estilos.modalBotaoPrimario}
                onPress={handleIrParaAgenda}
                activeOpacity={0.85}
              >
                <Text style={estilos.textoModalBotaoPrimario}>Ver Minha Agenda</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={estilos.modalBotaoSecundario}
                onPress={() => setModalSucesso(false)}
                activeOpacity={0.85}
              >
                <Text style={estilos.textoModalBotaoSecundario}>Fechar</Text>
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
  estadoContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  textoEstado: {
    color: "#475569",
    fontSize: 15,
    textAlign: "center",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  botaoVoltar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  tituloHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
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
  badgeDot: {
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

  // Stepper
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCirculoConcluido: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6B1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepRotuloConcluido: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
  },
  stepCirculoAtivo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6B1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepNumeroAtivo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepRotuloAtivo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  stepCirculoNeutro: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepNumeroNeutro: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  stepRotuloNeutro: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },
  linhaConectora: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
    marginBottom: 16,
  },
  linhaAtiva: {
    backgroundColor: "#FF6B1A",
  },

  // Card Professor
  cardProfessor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  fotoContainer: {
    position: "relative",
    marginRight: 12,
  },
  fotoProfessor: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E2E8F0",
  },
  dotOnline: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  infoProfessor: {
    flex: 1,
  },
  linhaNome: {
    flexDirection: "row",
    alignItems: "center",
  },
  nomeProfessor: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  materiaProfessor: {
    fontSize: 13,
    color: "#475569",
    marginTop: 1,
  },
  linhaAvaliacao: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  textoAvaliacao: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillTexto: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0369A1",
  },
  blocoPreco: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  valorHora: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  unidadeHora: {
    fontSize: 12,
    color: "#64748B",
  },

  // Seção
  secaoContainer: {
    marginBottom: 20,
  },
  secaoTituloRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  materiasDisponiveis: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  materiaDisponivel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
  },
  materiaDisponivelAtiva: {
    backgroundColor: "#FFF1E8",
    borderWidth: 1,
    borderColor: "#FF6B1A",
  },
  materiaDisponivelTexto: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  materiaDisponivelTextoAtiva: {
    color: "#C2410C",
  },
  modalidadeSelecao: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  modalidadeOpcao: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  modalidadeOpcaoAtiva: {
    backgroundColor: "#FFF1E8",
    borderWidth: 1,
    borderColor: "#FF6B1A",
  },
  modalidadeOpcaoTexto: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  modalidadeOpcaoTextoAtiva: {
    color: "#C2410C",
    fontSize: 13,
    fontWeight: "700",
  },

  // Seletor Semanal
  seletorSemanalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  botaoSetaSemana: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  diasContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  cardDia: {
    position: "relative",
    width: 52,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardDiaAtivo: {
    backgroundColor: "#0A2540",
  },
  badgeCheckLaranja: {
    position: "absolute",
    top: -5,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF6B1A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  textoDiaSemana: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 2,
  },
  textoDiaMes: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  textoDiaAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Grid de Horários
  horariosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  textoSemDisponibilidade: {
    width: "100%",
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },
  pillHorario: {
    position: "relative",
    flex: 1,
    minWidth: 58,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pillHorarioAtivo: {
    backgroundColor: "#0A2540",
  },
  textoHorario: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  textoHorarioAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Formas de Pagamento
  pagamentosContainer: {
    gap: 10,
  },
  cardPagamento: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  cardPagamentoAtivo: {
    borderColor: "#FF6B1A",
    backgroundColor: "#FFFFFF",
  },
  iconePixContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconeCartaoContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconeCarteiraContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoPagamento: {
    flex: 1,
  },
  tituloPagamento: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtituloPagamento: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  radioContainer: {
    marginLeft: 8,
  },
  radioVazio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },

  // Box Resumo
  boxResumo: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginTop: 4,
  },
  resumoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  resumoTitulo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A3412",
  },
  resumoGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colunaResumo: {
    flex: 1,
  },
  iconeLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  labelResumo: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  valorResumo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  professorLinhaResumo: {
    flexDirection: "row",
    alignItems: "center",
  },
  fotoMiniaturaResumo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#CBD5E1",
  },
  valorDestaqueLaranja: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EA580C",
  },

  // Sticky Action Footer
  stickyFooter: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 8,
  },
  botaoConfirmarPagar: {
    backgroundColor: "#FF6B1A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B1A",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoConteudoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoConfirmar: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  seloSeguroLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  textoSeloSeguro: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  mensagemErro: {
    color: "#B91C1C",
    fontSize: 13,
    marginTop: 12,
    lineHeight: 19,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconeSucesso: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitulo: {
    fontSize: 18,
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
  statusAgendamento: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalPixBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  modalPixTitulo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  modalPixChave: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#475569",
    marginBottom: 8,
  },
  botaoCopiarPix: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  textoCopiarPix: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  modalAcoesRow: {
    width: "100%",
    gap: 8,
  },
  modalBotaoPrimario: {
    width: "100%",
    backgroundColor: "#FF6B1A",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textoModalBotaoPrimario: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalBotaoSecundario: {
    width: "100%",
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textoModalBotaoSecundario: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
});
